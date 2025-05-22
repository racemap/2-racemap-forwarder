import type { ExtendedSocket } from '../../types';

type ChronoTrackEvent = {
  id: string;
  name: string;
  description: string;
};

export enum ChronoTrackProtocol {
  CT01_13 = 'CT01_13', // supported by us
  CT01_33 = 'CT01_33',
  CTP01 = 'CTP01',
  Unknown = 'Unknown',
}

export type ChronoTrackClientMetadata = {
  name: string; // name of the connected client
  version: string; // version of the connected client
  event?: ChronoTrackEvent;
  protocol: ChronoTrackProtocol;
  clientRespondedAt: Date; // last time client responded to a ping request
  connectionId?: string;
  locations: Array<string>; // list of connected Chronotrack Hardware/Files
};

export type ChronoTrackDevice = {
  id: string;
  meta: ChronoTrackClientMetadata;
  openedAt: Date;
};

export type TPredictionTestTimes = {
  testStartTime: Date;
  testStartTimeMinus60Seconds: Date;
  startTime: string;
  endTime: string;
};

export type TFixtures = {
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

export type ChronoTrackForwarderState = {
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
    locations: Array<string>;
  }>;
};

export type ChronoTrackExtendedSocket = ExtendedSocket & {
  meta: ChronoTrackClientMetadata;
};

export type MessageParts = Array<string>;
