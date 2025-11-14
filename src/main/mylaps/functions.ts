import type { TimingRead } from '../../types';
import { MyLapsDefaultPrefix } from './consts';
import type {
  MyLapsDevice,
  MyLapsMarker,
  MyLapsPassing,
  MyLapsDeviceKeys,
  MyLapsMarkerKeys,
  MyLapsPassingKeys,
  MyLapsDeviceShortKeys,
  MyLapsMarkerShortKeys,
  MyLapsPassingShortKeys,
} from './types';
import { serverState } from '../state';
import { parseTimeToIsoStringWithUserDefinedOffset } from '../functions';

function prefix(chipId: string): string {
  // When "MyLaps_" is not prepended it should be prepended
  if (chipId.includes(MyLapsDefaultPrefix)) {
    return chipId;
  }
  return MyLapsDefaultPrefix + chipId;
}

//                                                            |> checksum
// Where one passing is: KV8658316:13:57.417 3 0F  1000025030870
//                       |      |            | |        |> date
//                       |      |            | |> readerNumber
//                       |      |> Time      |>  deviceNumber
//                       |> Transponder Id
export function myLapsLagacyPassingToRead(locationName: string, passingDetails: string): TimingRead | null {
  const passing = passingDetails.trim();
  if (passing.length > 38) {
    // transponderId is the first 7 chars of passingDetails i.e. KV86583
    const transponderId = passingDetails.substring(0, 7);
    // time is the next 12 chars of passingDetails i.e. 16:13:57.417
    const time = passingDetails.substring(7, 19);
    // date is the from len - 8 until len - 2 chars i.e. 250308
    const date = passingDetails.substring(passingDetails.length - 8, passingDetails.length - 2);

    const read: TimingRead = {
      timingId: locationName,
      timingName: locationName,
      // timestamp: moment.utc(`${date} ${time}`, 'YYMMDD hh:mm:ss.SSS').toISOString(),
      timestamp: parseTimeToIsoStringWithUserDefinedOffset(`${date} ${time}`, 'YYMMDD hh:mm:ss.SSS', serverState.timeZoneOffsetInHours).toISOString(),
      chipId: prefix(transponderId),
    };
    return read;
  }
  return null;
}

// to parse messages like this
// Start@Marker@t=11:03:40.347|mt=Gunshot|n=Gunshot 1@4@$
export function myLapsMarkerToRead(locationName: string, markerDetails: string): TimingRead | null {
  const markerDetailsArray = markerDetails.split('|');
  const marker: MyLapsMarker = {};
  for (const detail of markerDetailsArray) {
    const [key, value] = detail.split('=');
    marker[myLapsMarkerKeyToName(key as MyLapsMarkerShortKeys)] = value;
  }

  // having no time is useless to create a timing read
  if (!marker.time) {
    return null;
  }

  return {
    timingId: locationName,
    // timestamp: moment.utc(marker.time, 'hh:mm:ss.SSS').toISOString(),
    timestamp: parseTimeToIsoStringWithUserDefinedOffset(marker.time, 'hh:mm:ss.SSS', serverState.timeZoneOffsetInHours).toISOString(),
    timingName: marker.markerName,
    chipId: '',
  };
}

export function myLapsMarkerKeyToName(key: MyLapsMarkerShortKeys): MyLapsMarkerKeys {
  switch (key) {
    case 'mt':
      return 'markerType';
    case 't':
      return 'time';
    case 'n':
      return 'markerName';
    default:
      console.warn('Unknown key:', key);
  }
  return key;
}

// reads stuff like this
// id=20250558568|n=BibTagDecoder00AA|mac=0004B70700AA|ant=1|time=954463123529
export function myLapsDeviceToObject(deviceAsString: string): MyLapsDevice | null {
  const deviceDetails = deviceAsString.split('|');

  const deviceUpdate: MyLapsDevice = {};

  for (const detail of deviceDetails) {
    const [key, value] = detail.split('=');
    deviceUpdate[myLapsDeviceKeyToName(key as MyLapsDeviceShortKeys)] = value;
  }

  if (deviceUpdate.deviceId != null && deviceUpdate.deviceName != null && deviceUpdate.deviceMac != null) {
    return deviceUpdate;
  }
  return null;
}

export function myLapsDeviceKeyToName(key: MyLapsDeviceShortKeys): MyLapsDeviceKeys {
  switch (key) {
    case 'id':
      return 'deviceId';
    case 'n':
      return 'deviceName';
    case 'mac':
      return 'deviceMac';
    case 'ant':
      return 'antennaCount';
    case 'dt':
      return 'deviceType';
    case 'nr':
      return 'deviceNumber';
    case 'bat':
      return 'batteryLevel';
    case 'tbsc':
      return 'timeBetweenSameChip';
    case 'prof':
      return 'profile';
    case 'fwv':
      return 'firmwareVersion';
    case 'bvol':
      return 'beeperVolume';
    case 'btyp':
      return 'beepType';
    case 'cont':
      return 'continuousMode';
    case 'gho':
      return 'gunHoldoff';
    case 'ex1ho':
      return 'ext1Holdoff';
    case 'ex2ho':
      return 'ext2Holdoff';
    case 'temp':
      return 'temperature';
    case 'dst':
      return 'daylightSavingsTime';
    case 'gpsc':
      return 'gPSSatelliteCount';
    case 'gpsx':
      return 'gPSLongitude';
    case 'gpsy':
      return 'gPSLatitude';
    case 'tz':
      return 'timezone';

    default:
      console.warn('Unknown key:', key);
  }
  return key;
}

// reads stuff like this
// t=13:11:30.904|c=0000041|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41
export function myLapsPassingToRead(timingId: string, timingName: string, passingAsString: string): TimingRead | null {
  const passingDetails = passingAsString.split('|');

  const passing: MyLapsPassing = {};

  for (const detail of passingDetails) {
    const [key, value] = detail.split('=');
    passing[myLapsPassingKeyToName(key as MyLapsPassingShortKeys)] = value;
  }

  if (passing.chipCode != null && passing.time != null && passing.date != null) {
    return {
      timingId,
      timingName,
      chipId: prefix(passing.chipCode),
      // timestamp: moment.utc(`${passing.date}_${passing.time}`, 'YYMMDD_hh:mm:ss.SSS').toISOString(),
      timestamp: parseTimeToIsoStringWithUserDefinedOffset(
        `${passing.date}_${passing.time}`,
        'YYMMDD_hh:mm:ss.SSS',
        serverState.timeZoneOffsetInHours,
      ).toISOString(),
    };
  }
  return null;
}

export function myLapsPassingKeyToName(key: MyLapsPassingShortKeys): MyLapsPassingKeys {
  switch (key) {
    case 'c':
      return 'chipCode';
    case 'ct':
      return 'chipType';
    case 'd':
      return 'date';
    case 'l':
      return 'lapNumber';
    case 'dv':
      return 'deviceNumber';
    case 're':
      return 'readerNumber';
    case 'an':
      return 'antennaNumber';
    case 'g':
      return 'groupId';
    case 'b':
      return 'bibNumber';
    case 'n':
      return 'bibText';
    case 't':
      return 'time';
    case 'ut':
      return 'unixTime';
    case 'utc':
      return 'utcTime';
    case 'h':
      return 'hitCount';
    case 'ts':
      return 'timeSource';
    case 'bid':
      return 'batchId';
    case 'am':
      return 'amplitude';
    case 'amd':
      return 'amplitudeDbm';
    case 'dm':
      return 'macAddress';
    case 'ans':
      return 'strongestAntenna';
    case 'ana':
      return 'averageAntenna';

    default:
      console.warn('Unknown key:', key);
  }
  return key;
}
