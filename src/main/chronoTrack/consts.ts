import { ToRacemapForwarderVersion } from '../../version';

export const SUPPORTED_PROTOCOL = 'CTP01';
export const ChronoTrackFrameTerminator = '\r\n';
export const MAX_MESSAGE_DATA_DELAY_IN_MS = 500;
export const ChronoTrack2RMServiceName = `ChronoTrack2RMForwarder_${ToRacemapForwarderVersion.gitTag.split('_')[0]}`;
export const ChronoTrackWelcomeMessage = `ChronoTrack2RMForwarder~${ToRacemapForwarderVersion.gitTag.split('_')[0]}`;
export const ChronoTrackDefaultPrefix = 'Chrono_';

export const ChronoTrackFeatures = {
  guntimes: 'true',
  newlocations: 'true',
  'connection-id': 'false',
  'stream-mode': 'push',
  'time-format': 'iso',
};

export const ChronoTrackCommands = {
  ack: 'ack',
  ping: 'ping',
  start: 'start',
  guntime: 'guntime',
  authorize: 'authorize',
  newlocation: 'newlocation',
  getlocations: 'getlocations',
  geteventinfo: 'geteventinfo',
  getconnectionid: 'getconnectionid',
};
