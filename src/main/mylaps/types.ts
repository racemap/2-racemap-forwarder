import type { ExtendedSocket } from '../../types';

export type MyLapsClientVersions = 'v1.0' | 'v2.1';

// this can be obtained by calling the getInfo function with the test prefix
// => Send("Test@GetInfo@$")
export type MyLapsLocation = {
  id?: string; // id of the location
  mac?: string; // MAC address of the location
  name: string;
  computerName: string;
  devicesByName: Record<string, MyLapsDevice>;
  lastSeen?: Date | null; // last time the location was seen
  startTimeStamp?: number; // timestamp of the location
  locationName?: string; // name of the location for test
};

export type MyLapsClientMetadata = {
  name: string; // name of the connected client
  version: MyLapsClientVersions; // version of the connected client
  clientRespondedAt: Date; // last time client responded to a ping request
  connectionId?: string;
  locations: Record<string, MyLapsLocation>; // list of connected MyLaps Readers/Hardware/Files
};

export type MyLapsForwarderState = {
  listenHost: string;
  listenPort: number;
  forwardedReads: number;
  connections: Array<{
    id: string;
    userId: string;
    openedAt: Date;
    closedAt: Date | null;
    sourceIP: string;
    sourcePort: number;
    forwardedReads: number;
    identified: boolean;
    locations: Array<MyLapsLocation>;
  }>;
};

export type MyLapsDevice = {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  deviceNumber?: string;
  deviceMac?: string;
  batteryLevel?: string;
  timeBetweenSameChip?: string;
  profile?: string;
  antennaCount?: string;
  firmwareVersion?: string;
  beeperVolume?: string;
  beepType?: string;
  continuousMode?: string;
  gunHoldoff?: string;
  ext1Holdoff?: string;
  ext2Holdoff?: string;
  temperature?: string;
  daylightSavingsTime?: string;
  gPSSatelliteCount?: string;
  gPSLongitude?: string;
  gPSLatitude?: string;
  timezone?: string;
};

export type MyLapsDeviceKeys = keyof MyLapsDevice;
export type MyLapsDeviceShortKeys =
  | 'id'
  | 'n'
  | 'dt'
  | 'nr'
  | 'mac'
  | 'bat'
  | 'tbsc'
  | 'prof'
  | 'ant'
  | 'fwv'
  | 'bvol'
  | 'btyp'
  | 'cont'
  | 'gho'
  | 'ex1ho'
  | 'ex2ho'
  | 'temp'
  | 'dst'
  | 'gpsc'
  | 'gpsx'
  | 'gpsy'
  | 'tz';

export type MyLapsPassing = {
  chipCode?: string;
  chipType?: string;
  date?: string;
  lapNumber?: string;
  deviceNumber?: string;
  readerNumber?: string;
  antennaNumber?: string;
  groupId?: string;
  bibNumber?: string;
  bibText?: string;
  time?: string;
  unixTime?: string;
  utcTime?: string;
  hitCount?: string;
  timeSource?: string;
  batchId?: string;
  amplitude?: string;
  amplitudeDbm?: string;
  macAddress?: string;
  strongestAntenna?: string;
  averageAntenna?: string;
};

export type MyLapsPassingKeys = keyof MyLapsPassing;

export type MyLapsPassingShortKeys =
  | 'c'
  | 'ct'
  | 'd'
  | 'l'
  | 'dv'
  | 're'
  | 'an'
  | 'g'
  | 'b'
  | 'n'
  | 't'
  | 'ut'
  | 'utc'
  | 'h'
  | 'ts'
  | 'bid'
  | 'am'
  | 'amd'
  | 'dm'
  | 'ans'
  | 'ana';

export type MyLapsMarker = {
  markerType?: string;
  time?: string;
  markerName?: string;
};

export type MyLapsMarkerKeys = keyof MyLapsMarker;
export type MyLapsMarkerShortKeys = 'mt' | 't' | 'n';

export type MyLapsClient = {
  id: string;
  meta: MyLapsClientMetadata;
  openedAt: string;
};

export type MyLapsExtendedSocket = ExtendedSocket & {
  meta: MyLapsClientMetadata;
};
