import fs from 'node:fs';
import path from 'node:path';
import { app, safeStorage, shell } from 'electron';
import { EmptyServerState } from '../consts';
import type { ServerState, UserFeedback, UserFeedbackPrototype } from '../types';
import APIClient from './api-client';
import { appVersion } from './build';
import { error, info, log, success, warn } from './functions';
import { Outbox } from './outbox';

const isElectron = !!process.versions?.electron;

export const userDataPath = isElectron ? app.getPath('userData') : './';
const storagePath = path.join(userDataPath, 'config.json');

// Only DPAPI on Windows is reliable enough: libsecret on Linux can lose its key between starts, and the
// macOS keychain asks again after every update of an unsigned app. Elsewhere the file is user-only (0600).
const canEncrypt = () => isElectron && process.platform === 'win32' && safeStorage.isEncryptionAvailable();

type StoredConfig = {
  apiToken?: string; // plain text where canEncrypt() is false
  apiTokenEncrypted?: string; // base64 of safeStorage.encryptString
  expertMode?: boolean;
  timeZoneOffsetInHours?: number;
};

let refToElectronWebContents: Electron.WebContents | null = null;

// The token stays in the main process. The renderer only gets serverState, which holds a hint.
let apiToken = '';

export let serverState: ServerState = {
  ...EmptyServerState,
  version: appVersion,
  timeZoneOffsetInHours: new Date().getTimezoneOffset() / -60, // get the local timezone offset in hours
};

export const apiClient = new APIClient();

export const outbox = new Outbox({
  file: path.join(userDataPath, 'outbox.jsonl'),
  canSend: () => apiToken !== '',
  send: async (reads) => {
    await apiClient.sendTimingReadsAsJSON(reads);
    success(`Forwarded ${reads.length} reads to RACEMAP`);
    // The token check at startup may have failed only because we were offline.
    if (!serverState.apiTokenIsValid) void validateToken();
  },
  onChange: (state) => {
    if (state.lastError && state.lastError !== serverState.outbox.lastError)
      warn(`Upload failed, ${state.queued} reads are queued: ${state.lastError}`);
    updateServerState({ outbox: state });
  },
});

const tokenHint = (token: string) => (token === '' ? '' : `…${token.slice(-4)}`);

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

async function validateToken(): Promise<void> {
  const valid = await apiClient.checkToken();
  if (valid === null) {
    warn('Could not check the API token (offline?). Reads are queued and sent once RACEMAP is reachable.');
    return;
  }
  updateServerState({ apiTokenIsValid: valid });
  if (valid) {
    success('API token is valid');
    await fetchEvents();
    await fetchUser();
  } else {
    error('API token is invalid. Please check/update your token on racemap.com.');
  }
}

function setApiToken(token: string): void {
  apiToken = token;
  apiClient.setApiToken(token);
  updateServerState({ apiTokenHint: tokenHint(token), apiTokenIsValid: false });
}

export async function upgradeAPIToken(newToken: string): Promise<boolean> {
  setApiToken(newToken.trim());
  scheduleSave();
  await validateToken();
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
  const config: StoredConfig = { expertMode: serverState.expertMode, timeZoneOffsetInHours: serverState.timeZoneOffsetInHours };
  if (canEncrypt()) {
    config.apiTokenEncrypted = safeStorage.encryptString(apiToken).toString('base64');
  } else {
    config.apiToken = apiToken;
  }
  fs.writeFileSync(storagePath, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.chmodSync(storagePath, 0o600); // mode only applies when the file is created
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      saveServerState();
    } catch (err) {
      error('Could not save the settings', err);
    }
  }, 500);
}

function readConfig(): StoredConfig {
  if (!fs.existsSync(storagePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
  } catch (err) {
    warn(`${storagePath} is not valid JSON, starting with default settings`, err);
    return {};
  }
}

function tokenFromConfig(config: StoredConfig): string {
  if (config.apiTokenEncrypted && isElectron) {
    try {
      return safeStorage.decryptString(Buffer.from(config.apiTokenEncrypted, 'base64'));
    } catch (err) {
      warn('Could not decrypt the stored API token', err);
      return '';
    }
  }
  return config.apiToken ?? '';
}

export async function loadServerState(apiTokenFromEnv: string | null): Promise<void> {
  const config = readConfig();
  updateServerState({
    expertMode: config.expertMode ?? serverState.expertMode,
    timeZoneOffsetInHours: config.timeZoneOffsetInHours ?? serverState.timeZoneOffsetInHours,
  });

  info('Try to read/find your RACEMAP API token');
  const stored = tokenFromConfig(config);
  if (stored !== '') {
    info('Using api token from config file');
    setApiToken(stored);
  } else if (apiTokenFromEnv) {
    info('Using api token from env variable RACEMAP_API_TOKEN');
    setApiToken(apiTokenFromEnv);
  } else {
    error(`No API token found.
      - Please add your API token in the main form.
      - Or create an .env file and store your token there.
      - The token should look like this: RACEMAP_API_TOKEN=your-api-token
      - You can get your api token from your racemap account profile section.`);
    return;
  }

  // Rewrites a plain-text token from older versions in encrypted form.
  if (config.apiToken && canEncrypt()) scheduleSave();
  await validateToken();
}

export async function prepareServerState(apiTokenFromEnv: string | null, webContents: Electron.WebContents): Promise<void> {
  refToElectronWebContents = webContents;
  await loadServerState(apiTokenFromEnv);
  outbox.start();
  if (serverState.outbox.queued > 0) info(`${serverState.outbox.queued} reads from the last session are queued and will be sent`);
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
  updateServerState({ expertMode });
  scheduleSave();
}

export function setUserTimezoneOffset(timeZoneOffsetInHours: number): void {
  updateServerState({ timeZoneOffsetInHours });
  scheduleSave();
}

export function createUserFeedback(feedback: UserFeedbackPrototype): Promise<UserFeedback> {
  return apiClient.createUserFeedback(feedback);
}

export function callExternalLink(url: string): void {
  log('callExternalLink', url);
  if (isElectron) {
    shell.openExternal(url);
  }
}
