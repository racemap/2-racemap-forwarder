import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';
import type {
  callExternalLink,
  createUserFeedback,
  getServerState,
  selectRacemapEvent,
  setExpertMode,
  setUserTimezoneOffset,
  upgradeAPIToken,
} from '../main/state';
import type { ServerState, UserFeedbackPrototype } from '../types';

// Custom APIs for renderer
const api = {
  upgradeAPIToken(...params: Parameters<typeof upgradeAPIToken>): ReturnType<typeof upgradeAPIToken> {
    return ipcRenderer.invoke('upgradeAPIToken', ...params);
  },

  callExternalLink(...params: Parameters<typeof callExternalLink>): ReturnType<typeof callExternalLink> {
    ipcRenderer.invoke('callExternalLink', ...params);
  },

  getServerState(): ReturnType<typeof getServerState> {
    return ipcRenderer.invoke('getServerState');
  },

  setExpertMode(...params: Parameters<typeof setExpertMode>): ReturnType<typeof setExpertMode> {
    ipcRenderer.invoke('setExpertMode', ...params);
  },

  setUserTimezoneOffset(...params: Parameters<typeof setUserTimezoneOffset>): ReturnType<typeof setUserTimezoneOffset> {
    ipcRenderer.invoke('setUserTimezoneOffset', ...params);
  },

  createUserFeedback(feedback: UserFeedbackPrototype): ReturnType<typeof createUserFeedback> {
    return ipcRenderer.invoke('createUserFeedback', feedback);
  },

  selectRacemapEvent(...params: Parameters<typeof selectRacemapEvent>): ReturnType<typeof selectRacemapEvent> {
    return ipcRenderer.invoke('selectRacemapEvent', ...params);
  },

  openLogFolder(): Promise<void> {
    return ipcRenderer.invoke('openLogFolder');
  },

  // Both return the function that unsubscribes. removeListener(callback) could never work, because
  // ipcRenderer holds the wrapper, not the callback, so StrictMode doubled every listener.
  onServerStateChange: (callback: (serverState: ServerState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, serverState: ServerState) => callback(serverState);
    ipcRenderer.on('onServerStateChange', listener);
    return () => ipcRenderer.removeListener('onServerStateChange', listener);
  },

  onNewStdOutLines: (callback: (lines: Array<string>) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, lines: Array<string>) => callback(lines);
    ipcRenderer.on('onNewStdOutLines', listener);
    return () => ipcRenderer.removeListener('onNewStdOutLines', listener);
  },
};

export type API = typeof api;

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
