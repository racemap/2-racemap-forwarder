import fs from 'node:fs';
import pick from 'lodash/pick';
import path from 'node:path';
import APIClient from './api-client';
import { error, info, log, success } from './functions';
import { app, shell } from 'electron';
import { EmptyServerState } from '../consts';
import type { ServerState, UserFeedbackPrototype } from '../types';

const isElectron = !!process.versions?.electron;

const userDataPath = isElectron ? app.getPath('userData') : './';
const storagePath = path.join(userDataPath, 'config.json');

let refToElectronWebContents: Electron.WebContents | null = null;

export let serverState: ServerState = {
  ...EmptyServerState,
  timeZoneOffsetInHours: new Date().getTimezoneOffset() / -60, // get the local timezone offset in hours
  apiToken: process.env.RACEMAP_API_TOKEN ?? null,
};
export const apiClient = new APIClient({ authorization: `Bearer ${serverState.apiToken}` });

function triggerStateChange(): void {
  refToElectronWebContents?.send('onServerStateChange', serverState);
}

export function updateServerState(newState: Partial<ServerState>): void {
  serverState = {
    ...serverState,
    ...newState,
  };
  triggerStateChange();
}

export async function upgradeAPIToken(apiToken: string): Promise<boolean> {
  apiClient.setApiToken(apiToken);

  updateServerState({
    apiToken,
    apiTokenIsValid: (await apiClient.checkToken()) ?? false,
  });

  if (serverState.apiTokenIsValid) {
    success('API token is valid');
    await fetchEvents();
    await fetchUser();
  } else {
    error('API token is invalid');
  }

  return serverState.apiTokenIsValid;
}

async function fetchEvents(): Promise<void> {
  if (serverState.apiTokenIsValid) {
    serverState.events = [...(await apiClient.getMyPredictionEvents('today')), ...(await apiClient.getMyPredictionEvents('future'))].map((e) => ({
      name: e.name,
      id: e.id,
      startTime: e.startTime,
      endTime: e.endTime,
      modules: e.modules,
    }));
  } else {
    serverState.events = [];
    serverState.user = null;
  }
  triggerStateChange();
}

async function fetchUser(): Promise<void> {
  if (serverState.apiTokenIsValid) {
    const user = await apiClient.getDetailsAboutMe();
    serverState.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  } else {
    serverState.user = null;
  }
  triggerStateChange();
}

export function getServerState(): Promise<ServerState> {
  return Promise.resolve(serverState);
}

export function saveServerState(): void {
  fs.writeFileSync(storagePath, JSON.stringify(pick(serverState, ['apiToken', 'expertMode', 'timeZoneOffsetInHours']), null, 2));
}

export async function loadServerState(): Promise<void> {
  if (fs.existsSync(storagePath)) {
    const parsedState = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    serverState = {
      ...serverState,
      ...parsedState,
    };

    info('Try to read/find your RACEMAP API token');
    if (serverState.apiToken === '') {
      error(`No API token found. 
      - Please add your API token in the main form.
      - Or create an .env file and store your token there. 
      - The token should look like this: RACEMAP_API_TOKEN=your-api-token
      - You can get your api token from your racemap account profile section.`);
    } else {
      success('|-> Users api token is availible');
    }

    info('Check if your token is valid');
    apiClient.setApiToken(serverState.apiToken);
    updateServerState({
      apiTokenIsValid: (await apiClient.checkToken()) ?? false,
    });
  }
}

export async function prepareServerState(webContents: Electron.WebContents): Promise<void> {
  refToElectronWebContents = webContents;
  await loadServerState();

  if (serverState.apiTokenIsValid) {
    success('|-> API Token is valid');
    await fetchEvents();
    await fetchUser();
  } else {
    error('|-> API Token is invalid. Please check/update your token and try again.');
  }
}

export async function selectRacemapEvent(eventId?: string): Promise<void> {
  if (eventId) {
    const selectedEvent = await apiClient.getEventById(eventId);
    if (selectedEvent) {
      const starters = await apiClient.getEventStarters(eventId);
      updateServerState({
        starters,
        selectedEvent,
      });
    } else {
      error('No event found with id', eventId);
    }
  } else {
    updateServerState({
      selectedEvent: null,
      starters: [],
    });
  }
}

export function setExpertMode(expertMode: boolean): void {
  updateServerState({
    expertMode,
  });
  triggerStateChange();
}

export function setUserTimezoneOffset(timeZoneOffsetInHours: number): void {
  updateServerState({
    timeZoneOffsetInHours,
  });
  triggerStateChange();
}

export function createUserFeedback(feedback: UserFeedbackPrototype): Promise<void> {
  info('Create user feedback', feedback);
  if (serverState.apiTokenIsValid) {
    return apiClient.createUserFeedback(feedback);
  }
  return Promise.reject(new Error('API token is not valid'));
}

export function callExternalLink(url: string): void {
  log('callExternalLink', url);
  if (isElectron) {
    shell.openExternal(url);
  }
}
