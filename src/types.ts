import type net from 'node:net';
import type MyLapsForwarder from './main/mylaps/forwarder';
import type ChronoTrackForwarder from './main/chronoTrack/forwarder';
import type { ServiceVersion } from './version';
import type { ChronoTrackDevice, ChronoTrackForwarderState } from './main/chronoTrack/types';
import type { MyLapsDevice, MyLapsForwarderState, MyLapsLocation } from './main/mylaps/types';

export type RacemapStarter = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  startNumber: string;
  deviceClass?: string;
  deviceType?: string;
  trackId?: string;
  appId: string | null;
  startTime?: string;
  endTime?: string;
  startTimeStamp?: number;
  endTimeStamp?: number;
  times: { start?: string; end?: string } & Record<string, string | undefined>;
  manualFinishDuration?: number;
  deviceId: string | null;
};

export type RacemapEvent = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  modules: {
    predictive: {
      enabled: boolean;
    };
  };
};

export type RacemapUser = {
  id: string;
  name: string;
  email: string;
};

export type ServerState = {
  expertMode: boolean;
  apiToken: string | null;
  apiTokenIsValid: boolean;
  events: Array<RacemapEvent>;
  starters: Array<RacemapStarter>;
  selectedEvent: RacemapEvent | null;
  user: RacemapUser | null;
  version: ServiceVersion | null;
  myLapsForwarder: MyLapsForwarderState;
  chronoTrackForwarder: ChronoTrackForwarderState;
};

export type TimingRead = {
  timestamp: string; // Millis since EPOCH
  chipId: string; // BiB or TransponderId or ChipID
  timingId: string; // ID of Timing Hardware or the reader or the antenna
  timingName?: string; // User defined name of the hardware i.e. Start 9K 42K or Finish
  lat?: number | null; // Latitude on earth in degree if availible (most timing system does not have this)
  lng?: number | null; // Longitude on earth in degree
  alt?: number | null; // Elevation in meters above sea level
};

export type StoredTimingRead = TimingRead & {
  receivedAt: string;
};

export type LocationUpdate = {
  locationName: string;
  computerName?: string;
  deviceUpdate?: MyLapsDevice;
};

export type ExtendedSocket = net.Socket & {
  id: string;
  token: string;
  cache: { lastTime: number; buffer: Buffer; name: string };
  userId: string;
  openedAt: Date;
  closedAt: Date | null;
  identified: boolean;
  keepAliveTimerHandle: NodeJS.Timeout | null;
  triggerStartTransmissionHandle: NodeJS.Timeout | null;
  sendKeepAlivePing: () => void;
  sendFrame: (text: string) => boolean;
  sendData: (data: Array<string>) => boolean;
  sendObject: (object: Record<string, string>) => void;
  lastReceivedMessages: Array<string>;
  forwardedReads: number;
};

export type MessageParts = Array<string>;

// for the test
export type TPredictionTestTimes = {
  testStartTime: Date;
  testStartTimeMinus60Seconds: Date;
  startTime: string;
  endTime: string;
};

export type TTestFixtures = {
  myLaps: {
    id: string;
    clientName: string;
    trasnponderIds: Array<string>;
    myLapsLocations: Array<MyLapsLocation>;
    passingString: string;
    legacyPassingString: string;
  };
  chronoTrack: {
    event: {
      id: string;
      name: string;
      description: string;
      locations: Array<{
        name: string;
        mac: string;
      }>;
    };
    newLocationName: string;
    connectionId: string;
    transponderId: string;
    timingMacs: Array<string>;
  };
};

export type TTestState = {
  myLaps: {
    aTCPClient: ExtendedSocket | null;
    forwarder: MyLapsForwarder | null;
    fromServiceMessages: Array<string>;
    socketCache: {
      lastTime: number;
      buffer: Buffer;
    };
    passingAttempts: Array<string>;
  };
  chronoTrack: {
    aTCPClient: ExtendedSocket | null;
    forwarder: ChronoTrackForwarder | null;
    fromServiceMessages: Array<string>;
    socketCache: {
      lastTime: number;
      buffer: Buffer;
    };
    connectedClients: Array<ChronoTrackDevice>;
  };
};
