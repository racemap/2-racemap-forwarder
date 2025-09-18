import winIcon from '../../resources/icons/icon.ico?asset';
import macIcon from '../../resources/icons/icon.icns?asset';
import linuxIcon from '../../resources/icons/128x128.png?asset';
import MyLapsForwarder from './mylaps/forwarder';
import { join } from 'node:path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { info, log, prepareLogger } from './functions';
import {
  apiClient,
  setExpertMode,
  getServerState,
  saveServerState,
  upgradeAPIToken,
  prepareServerState,
  selectRacemapEvent,
  createUserFeedback,
  setUserTimezoneOffset,
} from './state';
import ChronoTrackForwarder from './chronoTrack/forwarder';
import { UserFeedbackPrototype } from '../types';
import { envs } from './envs';

async function bootup(mainWindow: BrowserWindow) {
  log('Hello from 2-racemap-forwarder');

  info('Check LISTEN_MODE');
  if (!['private', 'public'].includes(envs.LISTEN_MODE)) {
    throw new Error(`Invalid listen mode. Please use either 'private' or 'public'`);
  }

  prepareLogger(mainWindow.webContents);
  prepareServerState(envs.RACEMAP_API_TOKEN, mainWindow.webContents);

  new MyLapsForwarder(apiClient, envs.MYLAPS_LISTEN_PORT, envs.LISTEN_MODE === 'private');
  new ChronoTrackForwarder(apiClient, envs.CHRONO_LISTEN_PORT, envs.LISTEN_MODE === 'private');
}

const appIcon = {
  win32: winIcon,
  darwin: macIcon,
  linux: linuxIcon,
}[process.platform];

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 770,
    show: false,
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  app.setName('2 RACEMAP Forwarder');

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.2-racemap-forwarder');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on('ping', () => console.log('pong'));

  ipcMain.handle('callExternalLink', async (_invokeEvent, url) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('upgradeAPIToken', async (_invokeEvent, apiToken) => {
    return await upgradeAPIToken(apiToken);
  });

  ipcMain.handle('setExpertMode', async (_invokeEvent, expertMode) => {
    setExpertMode(expertMode);
  });

  ipcMain.handle('setUserTimezoneOffset', async (_invokeEvent, timeZoneOffsetInHours) => {
    setUserTimezoneOffset(timeZoneOffsetInHours);
  });

  ipcMain.handle('createUserFeedback', async (_invokeEvent, feedback: UserFeedbackPrototype) => {
    await createUserFeedback(feedback);
  });

  ipcMain.handle('selectRacemapEvent', async (_invokeEvent, eventId) => {
    await selectRacemapEvent(eventId);
  });

  ipcMain.handle('getServerState', async (_invokeEvent) => {
    return getServerState();
  });

  const mainWindow = createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  await bootup(mainWindow);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  saveServerState();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
