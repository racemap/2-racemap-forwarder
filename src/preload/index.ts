import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { ServerState } from '../types';
import type { getServerState, selectRacemapEvent, setExpertMode } from '../main/state';
import type { callExternalLink, upgradeAPIToken } from '../main/state';

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

  selectRacemapEvent(...params: Parameters<typeof selectRacemapEvent>): ReturnType<typeof selectRacemapEvent> {
    return ipcRenderer.invoke('selectRacemapEvent', ...params);
  },

  onServerStateChange: (callback: (serverState: ServerState) => void) => {
    console.log('onServerStateChange');
    ipcRenderer.on('onServerStateChange', (_event, serverState: ServerState) => {
      callback(serverState);
    });
  },

  removeServerStateChangeListener: (callback) => {
    ipcRenderer.removeListener('onServerStateChange', callback);
  },

  onNewStdOutLine: (callback: (serverState: string) => void) => {
    console.log('onNewStdOutLine');
    ipcRenderer.on('onNewStdOutLine', (_event, line: string) => {
      callback(line);
    });
  },

  removeOnNewStdOutLineListener: (callback) => {
    ipcRenderer.removeListener('onNewStdOutLine', callback);
  },
};

export type API = typeof api;

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  console.log('The Electron context is isolated');
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
