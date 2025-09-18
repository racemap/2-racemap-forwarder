import type { ServerState } from './types';
import { ToRacemapForwarderVersion } from './version';

export const OneHourInMillis = 3600000; // 1 hour in milliseconds
export const OneMinuteInMillis = 60000; // 1 minute in milliseconds
export const OneSecondInMillis = 1000; // 1 second in milliseconds

export const EmptyServerState: ServerState = {
  expertMode: false,
  apiToken: '',
  apiTokenIsValid: false,
  events: [],
  starters: [],
  selectedEvent: null,
  user: null,
  version: ToRacemapForwarderVersion,
  timeZoneOffsetInHours: 0,
  myLapsForwarder: {
    listenHost: '',
    listenPort: -1,
    forwardedReads: 0,
    connections: [],
  },
  chronoTrackForwarder: {
    listenHost: '',
    listenPort: -1,
    forwardedReads: 0,
    connections: [],
  },
};

export const RacemapColors = {
  CloudBlue: '#ced9e3',
  PaleBlue: '#36739a',
  LightBlue: '#f0f5fa',
  DarkRed: '#721c25',
  DangerRed: '#dc3545',
  DustRed1: '#fff1f0',
  DustRed2: '#ffccc7',
  BaseRed: '#ff4646',
  AltRed: '#f53838',
  LightRed: '#f8d7da',
  LightLightRed: '#fef2f2',
  LightYellow: '#fcda9f',
  LightLightYellow: '#fefbea',
  BaseYellow: '#ffff00',
  LightLightGreen: '#f6ffed',
  LightGreen: '#b7eb8f',
  BaseGreen: '#52c41a',
  DarkGreen: '#008000',
  PolarGreen1: '#f6ffed',
  PolarGreen2: '#d9f7be',
  LightGray: '#dee2e6',
  LightLightGray: '#f2f2f2',
  Gray: '#ced4da',
  DarkGray: '#646464',
  DarkYellow: '#d4b106',
  SunriseYellow1: '#feffe6',
  SunriseYellow2: '#ffffb8',
  DarkBlue: '#254a61',
  LightOrange: '#ffa500',
  LightLightOrange: '#fffcf1',
  Orange: '#b4530a',
  DarkDarkGray: '#202020',
  Headline: '#404040',
};
