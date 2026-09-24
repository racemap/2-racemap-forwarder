import { buildInfo } from '../../version';
import { envs } from '../envs';

export const SUPPORTED_PROTOCOL = 'CTP01';
export const ChronoTrackFrameTerminator = '\r\n';
export const MAX_MESSAGE_DATA_DELAY_IN_MS = 500;
export const ChronoTrack2RMServiceName = `ChronoTrack2RMForwarder_v${buildInfo.version}`;
export const ChronoTrackWelcomeMessage = `ChronoTrack2RMForwarder~v${buildInfo.version}`;
export const ChronoTrackDefaultPrefix = envs.CHRONO_PREFIX_OVERRIDE !== '' ? envs.CHRONO_PREFIX_OVERRIDE : 'Chrono_';

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
