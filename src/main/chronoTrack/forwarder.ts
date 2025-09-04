import fs from 'node:fs';
import net from 'node:net';
import _pick from 'lodash/pick';
import moment from 'moment';
import shortId from 'shortid';
import type APIClient from '../api-client';
import type { TimingRead } from '../../types';
import BaseForwarder from '../base-forwarder';
import { serverState, updateServerState } from '../state';
import { error, info, log, parseTimeToIsoStringWithUserDefinedOffset, processStoredData, storeIncomingRawData, success, warn } from '../functions';
import {
  type MessageParts,
  ChronoTrackProtocol,
  type ChronoTrackDevice,
  type ChronoTrackExtendedSocket,
  type ChronoTrackForwarderState,
} from './types';
import {
  SUPPORTED_PROTOCOL,
  ChronoTrackCommands,
  ChronoTrackFeatures,
  ChronoTrackWelcomeMessage,
  ChronoTrack2RMServiceName,
  ChronoTrackFrameTerminator,
  MAX_MESSAGE_DATA_DELAY_IN_MS,
} from './consts';

const logToFileSystem = (message: Buffer | string, fromClient = true) => {
  fs.appendFileSync('./ChronoTrackInputAdapter.log', `${new Date().toISOString()} ${fromClient ? '» from' : '« to  '} client: ${message}\n`);
};

const clearIntervalTimer = (timerHandle: NodeJS.Timeout | null) => {
  if (timerHandle != null) {
    clearInterval(timerHandle);
  }
};

class ChronoTrackForwarder extends BaseForwarder<ChronoTrackExtendedSocket> {
  _server: net.Server;

  constructor(apiClient: APIClient, listenPort: number, justLocalHost = true) {
    super(apiClient, listenPort, justLocalHost);

    this._server = this._configureReceiverSocket(this._listenPort, this._listenHost);

    this.updateElectronState();
  }

  getForwarderState = (): ChronoTrackForwarderState => {
    const connections = Array.from(this._connections.values()).map((socket) => ({
      id: socket.id,
      userId: socket.userId,
      sourceIP: socket.remoteAddress ?? '',
      sourcePort: socket.remotePort ?? -1,
      openedAt: socket.openedAt,
      closedAt: socket.closedAt,
      forwardedReads: socket.forwardedReads,
      identified: socket.identified,
      locations: Object.values(socket.meta.locations),
    }));

    return {
      forwardedReads: this._forwardedReads,
      listenHost: this._listenHost,
      listenPort: this._listenPort,
      connections,
    };
  };

  updateElectronState = () => {
    updateServerState({
      chronoTrackForwarder: this.getForwarderState(),
    });
  };

  getConnectedChronoTrackDevices(): Array<ChronoTrackDevice> {
    return Array.from(this._connections.entries()).map(([_id, socket]) => {
      return _pick(socket, ['id', 'meta', 'openedAt']);
    });
  }

  _configureReceiverSocket = (listenPort: number, bindAddress: string): net.Server => {
    const server = net.createServer(this._onNewConnection as (socket: net.Socket) => void);
    server.listen({ host: bindAddress, port: listenPort }, () => {
      info(`${ChronoTrack2RMServiceName} is listening on \x1b[32m${bindAddress}\x1b[0m:\x1b[35m${listenPort}\x1b[0m`);
    });
    server.on('error', (err) => {
      error(`${this.className}._configureReceiverSocket`, err);
    });
    return server;
  };

  _markDisconnected = (socketId: string): void => {
    const socket = this._connections.get(socketId);
    if (socket != null) {
      log(`${this.className}._markDisconnected`, socket.id);
      socket.closedAt = new Date();
      socket.identified = false;
      socket.userId = '';
      socket.cache.buffer = Buffer.alloc(0);
    }
  };

  _onNewConnection = (socket: ChronoTrackExtendedSocket): void => {
    log(`${this.className}Socket.onNewConnection`);

    socket.id = shortId.generate();
    socket.userId = '';
    socket.openedAt = new Date();
    socket.closedAt = null;
    socket.identified = false;
    socket.cache = {
      lastTime: Date.now(),
      buffer: Buffer.alloc(0),
      name: `ChronoTrackInputAdapter.ClienttSocket[${socket.id}].cache`,
    };
    socket.keepAliveTimerHandle = null;
    socket.triggerStartTransmissionHandle = null;
    socket.lastReceivedMessages = [];
    socket.forwardedReads = 0;
    socket.meta = {
      name: '',
      version: '',
      event: undefined,
      protocol: ChronoTrackProtocol.Unknown,
      clientRespondedAt: new Date(),
      connectionId: undefined,
      locations: [],
    };

    this._connections.set(socket.id, socket); // The server knows its sockets

    this.updateElectronState();

    socket.on('error', (error: Error) => {
      if (error != null) {
        log(`${this.className}Socket.onError: ${error} ${error.stack}`);
        clearIntervalTimer(socket.keepAliveTimerHandle);
        clearIntervalTimer(socket.triggerStartTransmissionHandle);
        this._connections.delete(socket.id);
      }
    });

    // Scope is ChronoTrackForwarder
    socket.on('end', () => {
      log(`${this.className}Socket.onEnd`);
      clearIntervalTimer(socket.keepAliveTimerHandle);
      clearIntervalTimer(socket.triggerStartTransmissionHandle);
      this._markDisconnected(socket.id);
      this.updateElectronState();
    });

    socket.on('data', (data: Buffer) => {
      try {
        storeIncomingRawData(data, socket.cache, MAX_MESSAGE_DATA_DELAY_IN_MS);
        processStoredData(
          socket.cache,
          (message) => {
            this._handleRawMessage(socket, message);
          },
          ChronoTrackFrameTerminator,
        );
      } catch (e) {
        warn(`${this.className}Socket.onData ParserError`, data, e);
      }
    });

    socket.sendFrame = (text: string) => {
      log('Socket.sendFrame', text);
      logToFileSystem(text + ChronoTrackFrameTerminator, false);
      return socket.write(text + ChronoTrackFrameTerminator);
    };

    socket.sendObject = (object: Record<string, string>) => {
      for (const [key, value] of Object.entries(object)) {
        socket.sendFrame(`${key}=${value}`);
      }
    };

    socket.sendKeepAlivePing = () => {
      socket.sendFrame(ChronoTrackCommands.ping);
    };

    socket.keepAliveTimerHandle = setInterval(() => {
      socket.sendKeepAlivePing();
    }, 10000);
  };

  _handleRawMessage = (socket: ChronoTrackExtendedSocket, rawMessage: Buffer): void => {
    if (rawMessage != null) {
      try {
        logToFileSystem(rawMessage);
        log(`${this.className}._handleMessage.rawMessage: ${rawMessage}`);
        const separated = rawMessage.toString().split('~');
        if (separated.length > 0) {
          if (!socket.identified) {
            this._handleWelcomeMessage(socket, separated);
          } else {
            this._handleMessages(socket, separated);
          }
        }
      } catch (e) {
        error(`${this.className}._handleMessage`, e);
      }
    }
  };

  _handleWelcomeMessage = (refToSocket: ChronoTrackExtendedSocket, parts: MessageParts): void => {
    if (parts.length === 3 && (parts[0] === 'SimpleClient' || parts[0] === 'RacemapTestClient')) {
      refToSocket.identified = true;
      refToSocket.meta = {
        name: parts[0],
        version: parts[1],
        protocol: parts[2] as ChronoTrackProtocol,
        event: undefined,
        connectionId: undefined,
        locations: [],
        clientRespondedAt: new Date(),
      };
      refToSocket.sendFrame(`${ChronoTrackWelcomeMessage}~${Object.keys(ChronoTrackFeatures).length}`);
      refToSocket.sendObject(ChronoTrackFeatures);
      refToSocket.sendFrame(ChronoTrackCommands.getconnectionid);
      refToSocket.sendFrame(ChronoTrackCommands.geteventinfo);
      refToSocket.sendFrame(ChronoTrackCommands.getlocations);
      refToSocket.sendFrame(ChronoTrackCommands.authorize);
    }
    this.updateElectronState();
  };

  _handleMessages = (refToSocket: ChronoTrackExtendedSocket, parts: MessageParts): void => {
    if (refToSocket.meta.protocol === SUPPORTED_PROTOCOL) {
      const len = parts.length;
      if (len > 1 && parts[1] === ChronoTrackCommands.getlocations) {
        if (refToSocket.meta.locations.length === 0) {
          refToSocket.sendFrame(ChronoTrackCommands.start);
        }
        refToSocket.meta.locations = parts.slice(2);
        return;
      }
      switch (len) {
        case 2: {
          if (parts[0] === ChronoTrackCommands.ack && parts[1] === ChronoTrackCommands.ping) {
            refToSocket.meta.clientRespondedAt = new Date();
          }
          break;
        }
        case 3: {
          if (parts[0] === ChronoTrackCommands.ack && parts[1] === ChronoTrackCommands.getconnectionid) {
            refToSocket.meta.clientRespondedAt = new Date();
            refToSocket.meta.connectionId = parts[2];
          }
          break;
        }
        case 5: {
          if (parts[0] === ChronoTrackCommands.ack && parts[1] === ChronoTrackCommands.geteventinfo) {
            refToSocket.meta.clientRespondedAt = new Date();
            refToSocket.meta.event = {
              id: parts[3],
              name: parts[2],
              description: parts[4],
            };
          }
          break;
        }
        case 8: {
          this._processTimingRead(refToSocket, parts);
          break;
        }
        default: {
          warn('Message with unknown count of parts received', parts);
          break;
        }
      }
      this.updateElectronState();
    } else {
      warn(`${this.className} - We do not handle messages using protocol ${refToSocket.meta.protocol}`);
    }
  };

  _processTimingRead = (refToSocket: ChronoTrackExtendedSocket, parts: MessageParts): void => {
    const protocolId = parts[0];

    const saveRead = (someParts: Array<string>) => {
      let chipId = someParts[3];

      // All ChronoTrack Transponder IDs are prefixed with Chrono_
      // This is to seperate them from Raceresult TransponderIds and common App Ids
      if (chipId.indexOf('Chrono_') !== 0) {
        chipId = `Chrono_${chipId}`;
      }

      const timingRead: TimingRead = {
        chipId, // the transponder registered by the antenna
        timingId: someParts[6], // MAC Address of the reader (often each antenna has a own MAC address)
        timestamp: this._parseTime(refToSocket, someParts[4]).toISOString(),
        // receivedAt: Date.now(), // when we received this information in our backend
        lat: null,
        lng: null,
        alt: null,
        timingName: someParts[2],
      };

      this._pushNonlocatedReadToRacemap(timingRead);
      refToSocket.forwardedReads += 1;
      this._forwardedReads += 1;
    };

    switch (protocolId) {
      case ChronoTrackProtocol.CT01_13: {
        /*
          CT01_13,     24,          START, 50101,15:54:48.90, 1,              117F37,     8
          Protocol_ID, Line number, Point, Tag,  Time of Day, Read Occurence, Reader MAC, Reader Antenna Port
           0 Protocol ID         = Always the same will not change
          1 Line Number         = So this isnt increasing anything, it is just the line number/counter
          2 Point               = timing location name
          3 Tag                 = the tag 😊 / bib numer / transpodnerId / chipId
          4 Time of Day         = In local time Europe/Amsterdam, i fit is required we can forward with a time shift the UTC time
          5 Read Occurence      = How many times the tag has read ( useable for laps )
          6 Reader MAC          = Mac adress of the reader
          7 Reader antenna Port = is always between 1-8 It is just for us that we now wich antenna had read something. If this is 0 it will be a GUN START normally
          */

        saveRead(parts);

        break;
      }
      case ChronoTrackProtocol.CT01_33: {
        // CT01_33~2038~30k~newlocation~09:15:21.00~0~ED932A~0
        // Here new hardware was connected to SimpleClient the measure point is called 30k
        // We try to obtain all readings again
        if (parts[3] === ChronoTrackCommands.newlocation) {
          const newLocationName = parts[2];
          refToSocket.sendFrame(ChronoTrackCommands.getlocations);
          // 1 seconds after we received a new location we trigger the client to start transmitting data
          refToSocket.triggerStartTransmissionHandle = setInterval(() => {
            this._triggerStartTransmission(refToSocket, newLocationName);
          }, 1000);
        } else if (parts[3] === ChronoTrackCommands.guntime) {
          // CT01_33~4~start~guntime~07:45:01.01~0~DF239A~0
          // ToDo: How to handle guntimes?
          warn('We received a guntime. But do not know what to do with it. So we drop it. Parts:', parts);
        } else {
          saveRead(parts);
        }

        break;
      }

      default: {
        warn(`protocolId: ${protocolId} of ChronoTrack textfile-format is not supported yet`);
        break;
      }
    }
  };

  _parseTime(_refToSocket: ChronoTrackExtendedSocket, timeString: string): Date {
    let timestamp = new Date(0);
    switch (ChronoTrackFeatures['time-format']) {
      case 'normal': {
        // we have no date just 14:02:15.31
        // this is just local time so we need to add the timezone offset to get UTC time
        // timestamp = moment.utc(timeString, 'HH:mm:ss.SS').subtract(serverState.timeZoneOffsetInHours, 'hours').toDate();
        timestamp = parseTimeToIsoStringWithUserDefinedOffset(timeString, 'HH:mm:ss.SS', serverState.timeZoneOffsetInHours);
        break;
      }
      case 'iso': {
        // we have: 2008-10-16T14:02:15.31 => expected to be UTC
        timestamp = moment.utc(timeString, 'YYYY-MM-DDTHH:mm:ss.SS').toDate();
        break;
      }
      case 'unix': {
        timestamp = moment.unix(Number.parseFloat(timeString)).toDate();
      }
    }
    return timestamp;
  }

  _triggerStartTransmission(socket: ChronoTrackExtendedSocket, locationName: string): void {
    socket.sendFrame(`${ChronoTrackCommands.start}~${locationName}`);
  }

  async _pushNonlocatedReadToRacemap(TimingRead: TimingRead): Promise<void> {
    // log("tryToPushNonlocatedReadToRacemap", TimingRead);
    const response = await this._apiClient.sendTimingReadsAsJSON([TimingRead]);
    if (response.status === 200) {
      success('tryToPushNonlocatedReadToRacemap', TimingRead);
    } else {
      warn('tryToPushNonlocatedReadToRacemap', response.status);
    }
  }
}

export default ChronoTrackForwarder;
