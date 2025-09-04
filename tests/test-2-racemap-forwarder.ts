import moment from 'moment';
import APIClient from '../src/main/api-client';
import MyLapsForwarder from '../src/main/mylaps/forwarder';
import ChronoTrackForwarder from '../src/main/chronoTrack/forwarder';
import { serial as test } from 'ava';
import { OneHourInMillis, OneSecondInMillis } from '../src/consts';
import { myLapsLagacyPassingToRead, myLapsPassingToRead } from '../src/main/mylaps/functions';
import { ChronoTrackCommands, ChronoTrackFrameTerminator } from '../src/main/chronoTrack/consts';
import type { TTestState, TTestFixtures, TPredictionTestTimes } from '../src/types';
import { MyLapsFrameTerminator, MyLapsDataSeparator, MyLapsFunctions, MyLapsIdentifiers, MyLapsPrefix } from '../src/main/mylaps/consts';
import {
  sleep,
  isPortInUse,
  shortIdBuilder,
  connectTcpSocket,
  processStoredData,
  storeIncomingRawData,
  removeCertainBytesFromBuffer,
  printEnvVar,
  parseTimeToIsoStringWithUserDefinedOffset,
} from '../src/main/functions';

const RACEMAP_API_HOST = process.env.RACEMAP_API_HOST ?? 'https://racemap.com';
const RACEMAP_API_TOKEN = process.env.RACEMAP_API_TOKEN ?? '';
const LISTEN_MODE = process.env.LISTEN_MODE?.toLocaleLowerCase() ?? 'private';
const MYLAPS_LISTEN_PORT = Number.parseInt(process.env.MYLAPS_LISTEN_PORT || '3097');
const CHRONO_LISTEN_PORT = Number.parseInt(process.env.CHRONO_LISTEN_PORT || '3000');

const apiClient = new APIClient({ authorization: `Bearer ${RACEMAP_API_TOKEN}` });
const forwarderIPAddress = LISTEN_MODE === 'private' ? '127.0.0.1' : '0.0.0.0';

printEnvVar({ RACEMAP_API_HOST });
printEnvVar({ RACEMAP_API_TOKEN });
printEnvVar({ LISTEN_MODE });
printEnvVar({ MYLAPS_LISTEN_PORT });
printEnvVar({ CHRONO_LISTEN_PORT });
printEnvVar({ LISTEN_MODE });

const hasMyLapsForwarderInstance = !isPortInUse(MYLAPS_LISTEN_PORT);
const hasChronoTrckForwarderInstance = !isPortInUse(CHRONO_LISTEN_PORT);

const shortId001 = shortIdBuilder();
const times: TPredictionTestTimes = {
  testStartTime: moment().utc().toDate(),
  testStartTimeMinus60Seconds: moment().utc().add(-60, 'seconds').toDate(),
  startTime: moment().utc().subtract(1, 'h').toISOString(),
  endTime: moment().utc().toISOString(),
};

const fixtures: TTestFixtures = {
  myLaps: {
    id: shortId001,
    clientName: 'RMMyLabsTestClient',
    trasnponderIds: ['0000041', '0000042', '0000043'],
    myLapsLocations: [
      {
        name: 'Start',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_0`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((0 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '1k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_1`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((1 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '2k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_2`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((2 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '3k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_3`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((3 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '5k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_4`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((4 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '8k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_5`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((5 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '9k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_6`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((6 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: 'Finish',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_7`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((7 * OneHourInMillis) / 7),
        devicesByName: {},
      },
    ],
    passingString: 't=13:11:30.904|c=0000041|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41',
    legacyPassingString: 'KV8658316:13:57.417 3 0F  1000025030870',
  },
  chronoTrack: {
    event: {
      id: shortId001,
      name: `Testevent for ChronoTrack Test (${shortId001})`,
      description: `Just to test the data import. (${shortId001})`,
      locations: [
        { name: 'Start', mac: `${shortId001}_0` },
        { name: '1k', mac: `${shortId001}_1` },
        { name: '2k', mac: `${shortId001}_2` },
        { name: '3k', mac: `${shortId001}_3` },
        { name: '5k', mac: `${shortId001}_4` },
        { name: '8k', mac: `${shortId001}_5` },
        { name: '9k', mac: `${shortId001}_6` },
        { name: 'Finish', mac: `${shortId001}_7` },
      ],
    },
    newLocationName: 'OnBridge',
    connectionId: `g4vnkHCHU8SbsDMF${shortId001}`,
    transponderId: shortId001,
    timingMacs: [],
  },
};

const state: TTestState = {
  myLaps: {
    aTCPClient: null,
    forwarder: null,
    fromServiceMessages: [],
    socketCache: {
      lastTime: 0,
      buffer: Buffer.alloc(0),
    },
    passingAttempts: [],
  },
  chronoTrack: {
    aTCPClient: null,
    forwarder: null,
    fromServiceMessages: [],
    socketCache: {
      lastTime: 0,
      buffer: Buffer.alloc(0),
    },
    connectedClients: [],
  },
};

test('Ava is running, fixtures and state exists', async (t) => {
  t.is(true, true);
  t.not(fixtures, null);
  t.not(state, null);
});

test('Test function removeCertainBytesFromBuffer', (t) => {
  const raw = Buffer.from([0x00, 0x00, 0x32, 0x33, 0x00, 0x34]);
  const filtered = removeCertainBytesFromBuffer([0x00], raw);
  t.deepEqual(filtered, Buffer.from([0x32, 0x33, 0x34]), 'should remove 0x00 bytes (0x00, 0x31, 0x00, 0x32) => (0x31, 0x32)');

  const raw2 = Buffer.from([0x0a, 0x0a, 0x32, 0x33, 0x0a, 0x34]);
  const filtered2 = removeCertainBytesFromBuffer([0x0a], raw2);
  t.deepEqual(filtered2, Buffer.from([0x32, 0x33, 0x34]), 'should remove 0x0a bytes (0x0a, 0x31, 0x0a, 0x32) => (0x31, 0x32)');

  const raw3 = Buffer.from([0x0d, 0x0d, 0x32, 0x33, 0x0d, 0x34]);
  const filtered3 = removeCertainBytesFromBuffer([0x0d], raw3);
  t.deepEqual(filtered3, Buffer.from([0x32, 0x33, 0x34]), 'should remove 0x0d bytes (0x0d, 0x31, 0x0d, 0x32) => (0x31, 0x32)');

  const raw4 = Buffer.from([0x00, 0x0a, 0x32, 0x33, 0x0d, 0x34]);
  const filtered4 = removeCertainBytesFromBuffer([0x00, 0x0a, 0x0d], raw4);
  t.deepEqual(
    filtered4,
    Buffer.from([0x32, 0x33, 0x34]),
    'should remove 0x00 and 0x0a and 0x0d bytes (0x00, 0x0a, 0x31, 0x0d, 0x32) => (0x31, 0x32)',
  );
});

test('Test parseTimeToIsoStringWithUserDefinedOffset function with different offsets', (t) => {
  const timeString = '2025-03-08T16:13:57.417Z';
  const resultWithZeroOffset = moment.utc(timeString).subtract(0, 'hour').toISOString();
  const resultWith3HoursOffset = moment.utc(timeString).subtract(3, 'hour').toISOString();
  const resultWithMinus2HoursOffset = moment.utc(timeString).subtract(-2, 'hour').toISOString();

  const parsedWithZeroOffset = parseTimeToIsoStringWithUserDefinedOffset(timeString, 'YYYY-MM-DDTHH:mm:ss.SSS[Z]', 0).toISOString();
  t.is(parsedWithZeroOffset, resultWithZeroOffset, `timestamp should be ${resultWithZeroOffset} with offset 0 hours`);

  const parsedWith3HourOffset = parseTimeToIsoStringWithUserDefinedOffset(timeString, 'YYYY-MM-DDTHH:mm:ss.SSS[Z]', 3).toISOString();
  t.is(parsedWith3HourOffset, resultWith3HoursOffset, `timestamp should be ${resultWith3HoursOffset} with offset 3 hours`);

  const parsedWithMinus2HourOffset = parseTimeToIsoStringWithUserDefinedOffset(timeString, 'YYYY-MM-DDTHH:mm:ss.SSS[Z]', -2).toISOString();
  t.is(parsedWithMinus2HourOffset, resultWithMinus2HoursOffset, `timestamp should be ${resultWithMinus2HoursOffset} with offset -2 hours`);
});

test('Test function myLapsLagacyPassingToRead', (t) => {
  // const legacyPassingString = 'KV8658316:13:57.417 3 0F  1000025030870'
  const toUTCHoursOffset = new Date().getTimezoneOffset() / -60;
  const result = moment.utc('2025-03-08T16:13:57.417Z').subtract(toUTCHoursOffset, 'hour').toISOString();

  const read = myLapsLagacyPassingToRead('Start', fixtures.myLaps.legacyPassingString);

  t.not(read, null, 'read should not be null');
  t.is(read?.chipId, `${MyLapsPrefix}KV86583`, 'chipId should be KV86583');
  t.is(read?.timingId, 'Start', 'timingId should be Start');
  t.is(read?.timingName, 'Start', 'timingName should be Start');
  t.is(read?.timestamp, result, `timestamp should be ${result}`);
});

test('Test function myLapsPassingToRead', (t) => {
  // passingString = 't=13:11:30.904|c=0000041|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41',
  const toUTCHoursOffset = new Date().getTimezoneOffset() / -60;
  const result = moment.utc('2012-06-06T13:11:30.904Z').subtract(toUTCHoursOffset, 'hour').toISOString();

  const read = myLapsPassingToRead('Start001', 'Start', fixtures.myLaps.passingString);
  t.not(read, null, 'read should not be null');
  t.is(read?.chipId, `${MyLapsPrefix}0000041`, 'chipId should be 0000041');
  t.is(read?.timingId, 'Start001', 'timingId should be Start001');
  t.is(read?.timingName, 'Start', 'timingName should be Start');
  t.is(read?.timestamp, result, `timestamp should be ${result}`);
});

test('Try to spin up an instance of the mylaps forwarder', async (t) => {
  if (await isPortInUse(MYLAPS_LISTEN_PORT)) {
    t.log(`Port ${MYLAPS_LISTEN_PORT} is already in use. We do not have to spin a server.`);
    t.pass();
  } else {
    state.myLaps.forwarder = new MyLapsForwarder(apiClient, MYLAPS_LISTEN_PORT);
    t.not(state.myLaps.forwarder, null, 'instance of MyLapsForwarder is not null');
  }
});

test(`should connect to tcp://${forwarderIPAddress}:${MYLAPS_LISTEN_PORT}`, async (t) => {
  state.myLaps.aTCPClient = await connectTcpSocket(forwarderIPAddress, MYLAPS_LISTEN_PORT);
  t.not(state.myLaps.aTCPClient, null, 'tcp client should be not null but is');
  if (state.myLaps.aTCPClient != null) {
    state.myLaps.aTCPClient.sendFrame = (text: string) => {
      if (state.myLaps.aTCPClient != null) {
        return state.myLaps.aTCPClient.write(`${text}${MyLapsFrameTerminator}`);
      }
      return false;
    };

    state.myLaps.aTCPClient.sendData = (data: Array<string>) => {
      const dataStr = data.join(MyLapsDataSeparator);
      if (state.myLaps.aTCPClient != null) {
        return state.myLaps.aTCPClient.sendFrame(`${dataStr}${MyLapsDataSeparator}`);
      }
      return false;
    };

    state.myLaps.aTCPClient.on('connect', () => {
      t.log('Connected to the server');
    });

    state.myLaps.aTCPClient.on('data', (data: Buffer) => {
      storeIncomingRawData(data, state.myLaps.socketCache);
      processStoredData(
        state.myLaps.socketCache,
        (message) => {
          if (state.myLaps.aTCPClient == null) return;
          const messageStr = message.toString();
          state.myLaps.fromServiceMessages.push(messageStr);
          const parts = messageStr.split(MyLapsDataSeparator);
          const len = parts.length;
          if (len > 2) {
            const serverName = parts[0];
            const myLabsFunction = parts[1];

            switch (myLabsFunction) {
              case MyLapsFunctions.Pong: {
                t.log('Pong from server => AckPong');
                state.myLaps.aTCPClient.sendData([fixtures.myLaps.clientName, MyLapsFunctions.AckPong]);
                break;
              }

              case MyLapsFunctions.Ping: {
                t.log('Ping from server => AckPing');
                state.myLaps.aTCPClient.sendData([fixtures.myLaps.clientName, MyLapsFunctions.AckPing]);
                break;
              }

              case MyLapsFunctions.GetLocations: {
                t.log('GetLocations from server => GetLocations');
                const data = [fixtures.myLaps.clientName, MyLapsFunctions.GetLocations];
                for (const location of fixtures.myLaps.myLapsLocations) {
                  data.push(`${MyLapsIdentifiers.LocationParameters.LocationName}=${location.name}`);
                }
                state.myLaps.aTCPClient?.sendData(data);
                break;
              }

              case MyLapsFunctions.GetInfo: {
                t.log('GetInfo from server => AckGetInfo');
                // if it request an explicit location we only answer for this
                for (const location of fixtures.myLaps.myLapsLocations) {
                  state.myLaps.aTCPClient?.sendData([
                    location.name,
                    MyLapsFunctions.AckGetInfo,
                    location.locationName ?? '',
                    'Unknown',
                    location.computerName,
                  ]);
                }
                break;
              }

              case MyLapsFunctions.AckPong: {
                t.log('AckPong from server. Nice.');
                break;
              }

              case MyLapsFunctions.AckPassing: {
                t.log('AckPassing from server. Nice.');
                break;
              }

              case MyLapsFunctions.AckMarker: {
                t.log('AckMarker from server. Nice.');
                break;
              }

              default: {
                console.warn(`MyLabsTestClient Unknown command from server. ${myLabsFunction}`);
                break;
              }
            }
          }
        },
        MyLapsFrameTerminator,
      );
    });
  }
});

test('should send the a MyLaps welcome message through the socket', async (t) => {
  t.not(state.myLaps.aTCPClient, null, 'tcp client is not null');
  if (state.myLaps.aTCPClient != null) {
    t.true(
      state.myLaps.aTCPClient.sendData([fixtures.myLaps.clientName, MyLapsFunctions.Pong]),
      'it should be possible to write a welcome message to the socket',
    );
    // give the server some time to answer!
    await sleep(500);
  }
});

test('the server should have responded with AckPong and GetLocations and GetInfo', async (t) => {
  t.log('server messages', state.myLaps.fromServiceMessages);

  t.not(state.myLaps.fromServiceMessages, null, 'server messages should not be null');
  t.true(state.myLaps.fromServiceMessages.length > 0, 'server messages should have some content');
  const ackPong = state.myLaps.fromServiceMessages.find((message) => message.includes(MyLapsFunctions.AckPong));
  const getLocations = state.myLaps.fromServiceMessages.find((message) => message.includes(MyLapsFunctions.GetLocations));
  const getInfo = state.myLaps.fromServiceMessages.find((message) => message.includes(MyLapsFunctions.GetInfo));

  t.not(ackPong, undefined, 'server should have responded with AckPong');
  t.not(getLocations, undefined, 'server should have responded with GetLocations');
  t.not(getInfo, undefined, 'server should have responded with GetInfo');
});

test('it should be possible to send 3 passings for every location to the server', async (t) => {
  t.not(state.myLaps.aTCPClient, null, 'tcp client is not null');
  if (state.myLaps.aTCPClient != null) {
    // for every location we define 3 passings
    for (const location of fixtures.myLaps.myLapsLocations) {
      const Attempt = Math.round(100 * Math.random()).toString();
      const passings = [location.name, MyLapsFunctions.Passing];
      for (let i = 0; i < 3; i++) {
        if (location.startTimeStamp != null) {
          const passing = [
            `${MyLapsIdentifiers.PassingParameters.Time}=${moment(location.startTimeStamp + i * OneSecondInMillis).format('HH:mm:ss.SSS')}`,
            `${MyLapsIdentifiers.PassingParameters.ChipCode}=${fixtures.myLaps.trasnponderIds[i]}`,
            `${MyLapsIdentifiers.PassingParameters.ChipType}=UH`,
            `${MyLapsIdentifiers.PassingParameters.Date}=${moment(location.startTimeStamp + i * OneSecondInMillis).format('YYMMDD')}`,
            `${MyLapsIdentifiers.PassingParameters.LapNumber}=1`,
            `${MyLapsIdentifiers.PassingParameters.DeviceNumber}=4`,
            `${MyLapsIdentifiers.PassingParameters.ReaderNumber}=1`,
            `${MyLapsIdentifiers.PassingParameters.AntennaNumber}=00001101`,
            `${MyLapsIdentifiers.PassingParameters.GroupId}=0`,
            `${MyLapsIdentifiers.PassingParameters.BibNumber}=1`,
          ];
          passings.push(passing.join('|'));
        }
      }
      passings.push(Attempt);
      state.myLaps.passingAttempts.push(Attempt);
      t.true(state.myLaps.aTCPClient.sendData(passings), 'it should be possible to write a passings message to the socket');
    }
    await sleep(500);
  }
});

test('the server should have responded with AckPassing for every passing', async (t) => {
  t.not(state.myLaps.fromServiceMessages, null, 'server messages should not be null');
  t.true(state.myLaps.fromServiceMessages.length > 0, 'server messages should have some content');
  const ackPassing = state.myLaps.fromServiceMessages.filter((message) => message.includes(MyLapsFunctions.AckPassing));
  t.is(ackPassing.length, state.myLaps.passingAttempts.length, 'server should have responded with AckPassing for every passing');
  for (const attempt of state.myLaps.passingAttempts) {
    const ack = ackPassing.find((message) => message.includes(attempt));
    t.not(ack, undefined, `server should have responded with AckPassing for attempt ${attempt}`);
  }
});

test('it should be possibel to send 3 markers to the server', async (t) => {
  t.not(state.myLaps.aTCPClient, null, 'tcp client is not null');
  if (state.myLaps.aTCPClient != null) {
    const attempt = Math.round(100 * Math.random()).toString();
    const marker = [
      fixtures.myLaps.myLapsLocations[0].name,
      MyLapsFunctions.Marker,
      [
        `${MyLapsIdentifiers.MarkerParameters.Time}=11:03:40.347`,
        `${MyLapsIdentifiers.MarkerParameters.Type}=Gunshot`,
        `${MyLapsIdentifiers.MarkerParameters.Name}=Gunshot 1`,
      ].join('|'),
      [
        `${MyLapsIdentifiers.MarkerParameters.Time}=11:03:41.327`,
        `${MyLapsIdentifiers.MarkerParameters.Type}=Gunshot`,
        `${MyLapsIdentifiers.MarkerParameters.Name}=Gunshot 2`,
      ].join('|'),
      [
        `${MyLapsIdentifiers.MarkerParameters.Time}=11:03:42.141`,
        `${MyLapsIdentifiers.MarkerParameters.Type}=Gunshot`,
        `${MyLapsIdentifiers.MarkerParameters.Name}=Gunshot 3`,
      ].join('|'),
      attempt,
    ];
    t.true(state.myLaps.aTCPClient.sendData(marker), 'it should be possible to write a marker message to the socket');
    await sleep(500);
  }
});

test('the server should have responded with AckMarker for the last marker telegram', async (t) => {
  t.log('server messages', state.myLaps.fromServiceMessages);
  t.not(state.myLaps.fromServiceMessages, null, 'server messages should not be null');
  t.true(state.myLaps.fromServiceMessages.length > 0, 'server messages should have some content');
  const ackMarker = state.myLaps.fromServiceMessages.find((message) => message.includes(MyLapsFunctions.AckMarker));
  t.not(ackMarker, undefined, 'server should have responded with AckMarker');
});

test('Try to spin up an instance of the chronotrack forwarder', async (t) => {
  if (await isPortInUse(CHRONO_LISTEN_PORT)) {
    t.log(`Port ${CHRONO_LISTEN_PORT} is already in use. We do not have to spin a server.`);
    t.pass();
  } else {
    state.chronoTrack.forwarder = new ChronoTrackForwarder(apiClient, CHRONO_LISTEN_PORT);
    t.not(state.chronoTrack.forwarder, null, 'instance of ChronoTrackForwarder is not null');
  }
});

test(`should connect to tcp://${forwarderIPAddress}:${CHRONO_LISTEN_PORT}`, async (t) => {
  state.chronoTrack.aTCPClient = await connectTcpSocket(forwarderIPAddress, CHRONO_LISTEN_PORT);
  t.not(state.chronoTrack.aTCPClient, null, 'tcp client should be not null but is');

  if (state.chronoTrack.aTCPClient != null) {
    state.chronoTrack.aTCPClient.on('data', (data: Buffer) => {
      storeIncomingRawData(data, state.chronoTrack.socketCache);
      processStoredData(
        state.chronoTrack.socketCache,
        (message) => {
          if (state.chronoTrack.aTCPClient == null) return;
          const messageStr = message.toString();
          state.chronoTrack.fromServiceMessages.push(messageStr);
          const parts = messageStr.split('~');
          const len = parts.length;
          if (len >= 1) {
            if (len > 1 && parts[0] === ChronoTrackCommands.start) {
              state.chronoTrack.aTCPClient.write(
                `CT01_13~21~${fixtures.chronoTrack.newLocationName}~${fixtures.chronoTrack.transponderId}~${moment(times.testStartTime)
                  .utc()
                  .format('YYYY-MM-DDTHH:mm:ss.SS')}~1~117F37~8${ChronoTrackFrameTerminator}`,
              );
            }

            if (len === 1) {
              switch (parts[0]) {
                case ChronoTrackCommands.start: {
                  for (const [i, location] of fixtures.chronoTrack.event.locations.entries()) {
                    state.chronoTrack.aTCPClient.write(
                      `${i % 2 === 0 ? 'CT01_13' : 'CT01_33'}~21~${location.name}~${fixtures.chronoTrack.transponderId}~${moment(times.testStartTime)
                        .utc()
                        .format('YYYY-MM-DDTHH:mm:ss.SS')}~1~${location.mac}~8${ChronoTrackFrameTerminator}`,
                    );
                  }
                  break;
                }
                case ChronoTrackCommands.ping: {
                  state.chronoTrack.aTCPClient.write(`${ChronoTrackCommands.ack}~${ChronoTrackCommands.ping}${ChronoTrackFrameTerminator}`);
                  break;
                }
                case ChronoTrackCommands.getlocations: {
                  state.chronoTrack.aTCPClient.write(
                    `${ChronoTrackCommands.ack}~${ChronoTrackCommands.getlocations}~${fixtures.chronoTrack.event.locations.map((l) => l.name).join('~')}${ChronoTrackFrameTerminator}`,
                  );
                  break;
                }
                case ChronoTrackCommands.geteventinfo: {
                  state.chronoTrack.aTCPClient.write(
                    `${ChronoTrackCommands.ack}~${ChronoTrackCommands.geteventinfo}~${fixtures.chronoTrack.event.name}~${fixtures.chronoTrack.event.id}~${fixtures.chronoTrack.event.description}${ChronoTrackFrameTerminator}`,
                  );
                  break;
                }
                case ChronoTrackCommands.getconnectionid: {
                  state.chronoTrack.aTCPClient.write(
                    `${ChronoTrackCommands.ack}~${ChronoTrackCommands.getconnectionid}~${fixtures.chronoTrack.connectionId}${ChronoTrackFrameTerminator}`,
                  );
                  break;
                }
                default: {
                  if (parts[0].includes('guntimes')) break;
                  if (parts[0].includes('newlocations')) break;
                  if (parts[0].includes('connection-id')) break;
                  if (parts[0].includes('stream-mode')) break;
                  if (parts[0].includes('time-format')) break;
                  console.warn(`Unknown command from server. ${parts[0]}`);
                  break;
                }
              }
            }
          }
        },
        ChronoTrackFrameTerminator,
      );
    });
  }
});

test('should send the ChronoTrack welcome message through the socket', async (t) => {
  t.not(state.chronoTrack.aTCPClient, null, 'tcp client is not null');
  if (state.chronoTrack.aTCPClient != null) {
    t.true(
      state.chronoTrack.aTCPClient.write(`RacemapTestClient~1.0.0~CTP01${ChronoTrackFrameTerminator}`),
      'it should be possible to write a welcome message to the socket',
    );
    // give the server some time to answer!
    await sleep(500);
  }
});

test('should send a TimingRead through the socket', async (t) => {
  t.not(state.chronoTrack.aTCPClient, null, 'tcp client should be initialized but is not');

  if (state.chronoTrack.aTCPClient != null) {
    t.true(
      state.chronoTrack.aTCPClient.write(
        `CT01_13~21~START~${fixtures.chronoTrack.transponderId}~${moment(times.testStartTime).utc().format('YYYY-MM-DDTHH:mm:ss.SS')}~1~117F37~8${ChronoTrackFrameTerminator}`,
      ),
      'it should be possible to send a TimingRead through the socket',
    );
    // give the server some time to answer!
    await sleep(500);
  }
});

test('should be possible to find the correct client config messages in the server welcome messages for (guntimes, newlocations, connection-id, stream-mode and time-format)', (t) => {
  t.true(state.chronoTrack.fromServiceMessages.includes('guntimes=true'), 'guntimes=true should be in the server welcome messages');
  t.true(state.chronoTrack.fromServiceMessages.includes('newlocations=true'), 'newlocations=true should be in the server welcome messages');
  t.true(state.chronoTrack.fromServiceMessages.includes('connection-id=false'), 'connection-id=false should be in the server welcome messages');
  t.true(state.chronoTrack.fromServiceMessages.includes('stream-mode=push'), 'stream-mode=push should be in the server welcome messages');
  t.true(state.chronoTrack.fromServiceMessages.includes('time-format=iso'), 'time-format=iso should be in the server welcome messages');
});

hasChronoTrckForwarderInstance &&
  test('it should be possible to get a list of connected chronotrack clients', async (t) => {
    t.true(state.chronoTrack.forwarder != null, 'forwarder should be initialized but is not');
    if (state.chronoTrack.forwarder != null) {
      t.true(Array.isArray(state.chronoTrack.forwarder?.getConnectedChronoTrackDevices()), 'connectedClients should be an array');

      t.true(state.chronoTrack.forwarder.getConnectedChronoTrackDevices().length > 0, 'connectedClients should have more than 0 entries');
      state.chronoTrack.connectedClients = state.chronoTrack.forwarder.getConnectedChronoTrackDevices();
    }
  });

hasChronoTrckForwarderInstance &&
  test('it should be possible to find our RacemapTestClient among all connected Clients', async (t) => {
    t.true(state.chronoTrack.connectedClients.length > 0, 'connectedClients should have more than 0 entries');
    const client = state.chronoTrack.connectedClients.find((c) => c.meta.name === 'RacemapTestClient');
    t.not(client, null, 'should have RacemapTestClient but found no connected client.');
    if (client != null) {
      t.not(client.meta, null, 'client.meta should not be null');
      t.is(client.meta.name, 'RacemapTestClient', 'client.meta.name should be RacemapTestClient');
      t.not(client.meta.event, null, 'client.meta.event should not be null');
      t.is(client.meta?.event?.name, fixtures.chronoTrack.event.name, 'client.meta.event.name should be fixtures.event.name');
      t.is(
        client.meta?.event?.description,
        fixtures.chronoTrack.event.description,
        'client.meta.event.description should be fixtures.event.description',
      );
      t.true(Array.isArray(client.meta.locations), 'client.meta.locations should be an array');
      t.is(client.meta.locations.length, 8, 'client.meta.locations should have 8 entries');
    }
  });

test('should send a new location through the socket', async (t) => {
  t.not(state.chronoTrack.aTCPClient, null, 'tcp client should be initialized but is not');
  if (state.chronoTrack.aTCPClient != null) {
    fixtures.chronoTrack.event.locations.push({
      name: fixtures.chronoTrack.newLocationName,
      mac: `${shortId001}_${fixtures.chronoTrack.event.locations.length}`,
    });
    t.true(
      await state.chronoTrack.aTCPClient.write(
        `CT01_33~12388~${fixtures.chronoTrack.newLocationName}~${ChronoTrackCommands.newlocation}~${moment(times.testStartTime)
          .utc()
          .format('YYYY-MM-DDTHH:mm:ss.SS')}~0~0~0${ChronoTrackFrameTerminator}`,
      ),
      'it should be possible to send a new location through the socket',
    );
    // give the server some time to answer!
    await sleep(1500);
  }
});

hasChronoTrckForwarderInstance &&
  test('it should be possible to get an updated list of connected chronotrack clients', async (t) => {
    t.not(state.chronoTrack.forwarder, null, 'forwarder should be initialized but is not');
    if (state.chronoTrack.forwarder != null) {
      t.true(Array.isArray(state.chronoTrack.forwarder?.getConnectedChronoTrackDevices()), 'connectedClients should be an array');
      t.true(state.chronoTrack.forwarder.getConnectedChronoTrackDevices().length > 0, 'connectedClients should have more than 0 entries');
      state.chronoTrack.connectedClients = state.chronoTrack.forwarder.getConnectedChronoTrackDevices();
    }
  });

hasChronoTrckForwarderInstance &&
  test('it should be possible to find our new location in the connected RacemapTestClient metadata', async (t) => {
    t.true(state.chronoTrack.connectedClients.length > 0, 'connectedClients should have more than 0 entries');
    const client = state.chronoTrack.connectedClients.find((c) => c.meta.name === 'RacemapTestClient');
    t.not(client, null, 'should have RacemapTestClient but found no connected client.');
    if (client != null) {
      t.not(client.meta, null, 'client.meta should not be null');
      t.is(client.meta.name, 'RacemapTestClient', 'client.meta.name should be RacemapTestClient');
      t.not(client.meta.event, null, 'client.meta.event should not be null');
      t.is(client.meta?.event?.name, fixtures.chronoTrack.event.name, 'client.meta.event.name should be fixtures.event.name');
      t.is(
        client.meta?.event?.description,
        fixtures.chronoTrack.event.description,
        'client.meta.event.description should be fixtures.event.description',
      );
      t.true(Array.isArray(client.meta.locations), 'client.meta.locations should be an array');
      t.is(client.meta.locations.length, 9, 'client.meta.locations should have 9 entries');
      t.true(client.meta.locations.includes(fixtures.chronoTrack.newLocationName), 'client.meta.locations should include fixtures.newLocationName');
    }
  });

test('it should be possible to find 2 start transmission frames received from the server. 1 unspecific and one specific for the newLocation', async (t) => {
  t.true(state.chronoTrack.fromServiceMessages.includes(ChronoTrackCommands.start), 'should have received a start transmission frame');
  t.true(
    state.chronoTrack.fromServiceMessages.includes(`${ChronoTrackCommands.start}~${fixtures.chronoTrack.newLocationName}`),
    'should have received a start transmission frame with the new location name',
  );
});

/*
test("it should be possible to obtain all generated TimingReads from the TimingRead_output adapter", async (t) => {
  state.chronoTimingReads = await apiClient.getTimingReads({
    timingIds: fixtures.timingMacs,
    startTime: times.startTime,
    endTime: times.endTime,
  });

  t.true(Array.isArray(state.chronoTimingReads), "aListOfChronoTimingReads should be an array");
  t.true(state.chronoTimingReads.length > 0, "aListOfChronoTimingReads should have more than 0 entries");
});


it('The result of the query must be an array and not be empty', () => {
  expect(state.aListOfChronoTimingReads).to.be.an('array');
  expect(state.aListOfChronoTimingReads.length).to.be.above(0);
});

it(`Every ping has to be older then ${times.startTime} and younger then ${times.endTime}.`, () => {
  for (const aRead of state.aListOfChronoTimingReads) {
    expect(Date.parse(aRead.timestamp)).to.be.within(
      Date.parse(times.startTime),
      Date.parse(times.endTime),
    );
  }
});

it(`Every timingId has to be in ${fixtures?.timingMacs}.`, () => {
  for (const aRead of state.aListOfChronoTimingReads) {
    expect(fixtures.timingMacs).to.include(aRead.timingId);
  }
});

it('should disconnect from client', async () => {
  if (aTCPClient == null) expect.fail('tcp client is not initialized');

  await aTCPClient.end();
});
*/

test('should wait 20 seconds before kill', async (t) => {
  t.timeout(30000);
  t.log('Waiting 20 seconds before kill');
  await sleep(20000);
  t.pass();
});
