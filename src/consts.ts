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
