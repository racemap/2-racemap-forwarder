import { ToRacemapForwarderVersion } from '../../version';

export const MyLapsPrefix = 'MyLaps_'; // MyLaps prefix for the transponder or chipIds

export const MAX_MESSAGE_DATA_DELAY_IN_MS = 500;

export const MyLapsFunctions = {
  Pong: 'Pong',
  AckPong: 'AckPong',
  Ping: 'Ping',
  AckPing: 'AckPing',
  Store: 'Store',
  AckStore: 'AckStore',
  GetInfo: 'GetInfo',
  AckGetInfo: 'AckGetInfo',
  Passing: 'Passing',
  AckPassing: 'AckPassing',
  Marker: 'Marker',
  AckMarker: 'AckMarker',
  GetLocations: 'GetLocations',
};

export const MyLapsIdentifiers = {
  RaceInfoParameters: {
    RaceName: 'rn', // Name of the race: Valley park Triathlon
    StartDate: 'sd', // Start date of the race format: YYYY-MM-DD
  },
  MarkerParameters: {
    Type: 'mt', // What type of marker this is: Gunshot
    Time: 't', // Time of the day where this marker occurs in hh:mm:ss.001: 11:03:40.347
    Name: 'n', // Name of the marker: Gunshot 1
  },
  PassingParameters: {
    ChipCode: 'c', // 7-character chip code: DX93845, 0000345, 4AYXRTF
    ChipType: 'ct', // The type of chip this is: AP, LF, CX, UH, NOTCX, UNKNOWN
    Date: 'd', // Date of passing in YYMMDD format: 120122
    LapNumber: 'l', // Lap count: 0, 1, 2
    DeviceNumber: 'dv', // Number of the device where this passing has been recorded: 0
    ReaderNumber: 're', // Number of the reader where this passing has been recorded: 1
    AntennaNumber: 'an', // Antenna where this passing has been recorded: 1 (or BibTag: 00010000)
    GroupId: 'g', // Group id of this passing (BibTag): 0, 2
    BibNumber: 'b', // Bib number associated to the passing (BibTag): 1
    BibText: 'n', // Bib text associated to the passing (BibTag): F-10145
    Time: 't', // Time of the day where this passing occurs in hh:mm:ss.001 format: 14:22:33.091
    UnixTime: 'ut', // Time of the day of this passing in milliseconds (UNIX format): 18274599
    UtcTime: 'utc', // Time of the day of this passing in milliseconds on UTC (UNIX format): 11273599
    HitCount: 'h', // Number of detections (ProChip/BibTag): 10
    TimeSource: 'ts', // Time source the device was using: GPS
    BatchId: 'bid', // Batch id of this passing (BibTag): 23-33290
    Amplitude: 'am', // Amplitude in points (ProChip/BibTag): 15
    AmplitudeDbm: 'amd', // Amplitude in dBm (ProChip/BibTag): -101.15
    MacAddress: 'dm', // MAC address of the device this passing has been recorded: 0030568F2CE
    StrongestAntenna: 'ans', // Strongest antenna id (BibTag): 1
    AverageAntenna: 'ana', // Average antenna (BibTag): 1.7
  },
  DeviceParameters: {
    DeviceId: 'id', // Unique id assigned to the device by Timing&Scoring: 1, 3
    DeviceName: 'n', // Name of the device: BibTag-0345, Finish Backup
    DeviceType: 'dt', // Type of device: ChampionChip Portable Decoder, Decoder, ChampionChip Scanner, ChampionChip Ear 1, ChampionChip Ear 2
    DeviceNumber: 'nr', // Number assigned to the device by the timer: 1, 5
    DeviceMac: 'mac', // MAC address of the device: 0030568F2CE, no-mac
    BatteryLevel: 'bat', // Battery level indicator
    TimeBetweenSameChip: 'tbsc', // Time between same chip detection
    Profile: 'prof', // Device profile (e.g., Main, Backup)
    AntennaCount: 'ant', // Number of antennas connected
    FirmwareVersion: 'fwv', // Firmware version of the device
    BeeperVolume: 'bvol', // Volume of the beeper
    BeepType: 'btyp', // Beep type: 0=continuous, 1=single
    ContinuousMode: 'cont', // Indicates if Continuous Mode is enabled
    GunHoldoff: 'gho', // Gun holdoff in milliseconds: 0, 50, n.a.
    Ext1Holdoff: 'ex1ho', // Ext1 holdoff: 0, 50, n.a.
    Ext2Holdoff: 'ex2ho', // Ext2 holdoff: 0, 50, n.a.
    Temperature: 'temp', // Temperature in Celsius: 0, 30, n.a.
    DaylightSavingsTime: 'dst', // DST enabled or not: true, false, n.a.
    GPSSatelliteCount: 'gpsc', // Number of GPS satellites: 6, n.a.
    GPSLongitude: 'gpsx', // Longitude value: 12.0432, n.a.
    GPSLatitude: 'gpsy', // Latitude value: 30.1123, n.a.
    Timezone: 'tz', // Timezone offset from GMT in minutes: -720, 300, 720, n.a.
    // ... to be continued
  },
  LocationParameters: {
    LocationName: 'ln', // Name of the location as it is written in Timing & Scoring: Start, Finish, 5K
  },
};

export const MyLaps2RMServiceName = `MyLaps2RMForwarder_${ToRacemapForwarderVersion.gitTag.split('_')[0]}`; // RACEMAP MyLaps server name
export const MyLapsFrameTerminator = '$'; // special character to separate messages in MyLaps TCP IP protocol
export const MyLapsDataSeparator = '@'; // special character to separate data in MyLaps TCP IP protocol
