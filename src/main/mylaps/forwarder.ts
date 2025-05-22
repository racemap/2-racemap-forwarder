import fs from 'node:fs';
import net from 'node:net';
import shortId from 'shortid';
import BaseForwarder from '../base-forwarder';
import type APIClient from '../api-client';
import { updateServerState } from '../state';
import type { TimingRead, MessageParts, LocationUpdate } from '../../types';
import type { MyLapsDevice, MyLapsExtendedSocket, MyLapsForwarderState, MyLapsLocation } from './types';
import { myLapsDeviceToObject, myLapsLagacyPassingToRead, myLapsMarkerToRead, myLapsPassingToRead } from './functions';
import { log, info, warn, error, success, processStoredData, storeIncomingRawData, removeCertainBytesFromBuffer } from '../functions';
import {
  MyLapsFunctions,
  MyLapsIdentifiers,
  MyLapsDataSeparator,
  MyLaps2RMServiceName,
  MyLapsFrameTerminator,
  MAX_MESSAGE_DATA_DELAY_IN_MS,
} from './consts';

const logToFileSystem = (message: Buffer | string, fromClient = true) => {
  fs.appendFileSync('./MyLapsInputAdapter.log', `${new Date().toISOString()} ${fromClient ? '» from' : '« to  '} client: ${message}\n`);
};

const clearIntervalTimer = (timerHandle: NodeJS.Timeout | null) => {
  if (timerHandle != null) {
    clearInterval(timerHandle);
  }
};

class MyLapsForwarder extends BaseForwarder<MyLapsExtendedSocket> {
  _server: net.Server;

  constructor(apiClient: APIClient, listenPort: number, justLocalHost = true) {
    super(apiClient, listenPort, justLocalHost);

    this._server = this._configureReceiverSocket(this._listenPort, this._listenHost);

    this.updateElectronState();
  }

  getForwarderState = (): MyLapsForwarderState => {
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
      myLapsForwarder: this.getForwarderState(),
    });
  };

  lastReveivedMessages = (socketId: string): Array<string> => {
    const socket = this._connections.get(socketId);
    if (socket != null) {
      return socket.lastReceivedMessages;
    }
    return [];
  };

  _configureReceiverSocket = (listenPort: number, bindAddress: string): net.Server => {
    const server = net.createServer(this._onNewConnection as (socket: net.Socket) => void);
    server.listen({ host: bindAddress, port: listenPort }, () => {
      info(`${MyLaps2RMServiceName} is listening on \x1b[32m${bindAddress}\x1b[0m:\x1b[35m${listenPort}\x1b[0m`);
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

  _onNewConnection = (socket: MyLapsExtendedSocket): void => {
    log(`${this.className}Socket.onNewConnection`);

    socket.id = shortId.generate();
    socket.userId = '';
    socket.openedAt = new Date();
    socket.closedAt = null;
    socket.identified = false;
    socket.cache = {
      lastTime: Date.now(),
      buffer: Buffer.alloc(0),
      name: `MyLapsInputAdapter.ClienttSocket[${socket.id}].cache`,
    };
    socket.keepAliveTimerHandle = null;
    socket.triggerStartTransmissionHandle = null;
    socket.lastReceivedMessages = [];
    socket.forwardedReads = 0;
    socket.meta = {
      name: '',
      version: 'v2.1',
      connectionId: undefined,
      locations: {},
      clientRespondedAt: new Date(),
    };

    this._connections.set(socket.id, socket); // The server knows its sockets

    this.updateElectronState();

    // scope is MyLapsForwarder
    socket.on('error', (error: Error) => {
      if (error != null) {
        log(`${this.className}Socket.onError: ${error} ${error.stack}`);
        clearIntervalTimer(socket.keepAliveTimerHandle);
        clearIntervalTimer(socket.triggerStartTransmissionHandle);
        this._connections.delete(socket.id);
        this.updateElectronState();
      }
    });

    // Scope is MyLapsForwarder
    socket.on('end', () => {
      log(`${this.className}Socket.onEnd`);
      clearIntervalTimer(socket.keepAliveTimerHandle);
      clearIntervalTimer(socket.triggerStartTransmissionHandle);
      this._markDisconnected(socket.id);
      this.updateElectronState();
    });

    socket.on('data', (data: Buffer) => {
      try {
        storeIncomingRawData(removeCertainBytesFromBuffer([0x00, 0x0a, 0x0d], data), socket.cache, MAX_MESSAGE_DATA_DELAY_IN_MS);
        processStoredData(
          socket.cache,
          (message) => {
            this._handleRawMessage(socket, message);
          },
          MyLapsFrameTerminator,
        );
      } catch (e) {
        warn(`${this.className}Socket.onData ParserError`, data, e);
      }
    });

    socket.sendFrame = (text: string) => {
      log('Socket.sendFrame', text);
      logToFileSystem(text + MyLapsFrameTerminator, false);
      return socket.write(text + MyLapsFrameTerminator);
    };

    socket.sendData = (data: Array<string>) => socket.sendFrame(data.join(MyLapsDataSeparator) + MyLapsDataSeparator);

    socket.sendObject = (object: Record<string, string>) => {
      for (const [key, value] of Object.entries(object)) {
        socket.sendFrame(`${key}=${value}`);
      }
    };

    socket.sendKeepAlivePing = () => {
      // old version says you should send Pong
      // version 2.1 says you should send Ping
      socket.sendData([MyLaps2RMServiceName, MyLapsFunctions.Ping]);
    };

    socket.keepAliveTimerHandle = setInterval(() => {
      socket.sendKeepAlivePing();
    }, 10000);
  };

  _handleRawMessage = (socket: MyLapsExtendedSocket, rawMessage: Buffer): void => {
    if (rawMessage != null) {
      try {
        logToFileSystem(rawMessage);
        log(`${this.className}._handleMessage.rawMessage: ${rawMessage}`);

        socket.lastReceivedMessages.push(rawMessage.toString());
        // limit the number of messages to 100
        if (socket.lastReceivedMessages.length > 100) {
          socket.lastReceivedMessages.shift();
        }

        const separated = rawMessage.toString().split(MyLapsDataSeparator);
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

  _handleWelcomeMessage = (refToSocket: MyLapsExtendedSocket, parts: MessageParts): void => {
    // we assume a client version of 2.1
    if (parts.length === 3 && (parts[1] === MyLapsFunctions.Ping || parts[1] === MyLapsFunctions.Pong)) {
      refToSocket.identified = true;

      refToSocket.sendData([MyLaps2RMServiceName, MyLapsFunctions.AckPong, '@Version2.1']);
      refToSocket.sendData([MyLaps2RMServiceName, MyLapsFunctions.GetLocations]);
      refToSocket.sendData([MyLaps2RMServiceName, MyLapsFunctions.GetInfo]);
    } else {
      warn(`${this.className}._handleWelcomeMessage`, 'Unknown welcome message.', parts);
    }
  };

  _createOrUpdateDevice = (location: MyLapsLocation, deviceUpdate: MyLapsDevice): void => {
    if (deviceUpdate.deviceName != null) {
      const device: MyLapsDevice = location.devicesByName[deviceUpdate.deviceName];
      if (device == null) {
        location.devicesByName[deviceUpdate.deviceName] = deviceUpdate;
      } else {
        location.devicesByName[deviceUpdate.deviceName] = {
          ...device,
          ...deviceUpdate,
        };
      }
    }
    this.updateElectronState();
  };

  _createOrUpdateLocation = (refToSocket: MyLapsExtendedSocket, update: LocationUpdate): void => {
    let location = refToSocket.meta.locations[update.locationName];
    if (location == null) {
      success(`${this.className}._createOrUpdateLocation`, 'New location detected: ', update.locationName);
      location = {
        name: update.locationName,
        computerName: update.computerName ? update.computerName : '',
        devicesByName: {},
        lastSeen: new Date(),
      };
      refToSocket.meta.locations[update.locationName] = location;
      // if we get a new location we ask the client for the connected hardware => readers and so
      refToSocket.sendData([MyLaps2RMServiceName, MyLapsFunctions.GetInfo, update.locationName]);
    } else {
      location.lastSeen = new Date();
      if (update.computerName != null) {
        location.computerName = update.computerName;
      }
    }
    if (update.deviceUpdate != null) {
      this._createOrUpdateDevice(location, update.deviceUpdate);
    }
    this.updateElectronState();
  };

  // When the incoming stream is:  Toolkit@GetLocations@ln=Start@ln=5K@ln=Finish@$
  // The parts are: [Toolkit, GetLocations, ln=Start, ln=5K, ln=Finish]
  _handleMessages = (refToSocket: MyLapsExtendedSocket, parts: MessageParts): void => {
    if (['v1.0', 'v2.1'].includes(refToSocket.meta.version)) {
      const len = parts.length;
      if (len > 1) {
        const myLapsFunction = parts[1];
        switch (myLapsFunction) {
          case MyLapsFunctions.Pong: {
            const replied = refToSocket.sendData([MyLaps2RMServiceName, MyLapsFunctions.AckPong]);
            const locationName = parts[0];
            this._createOrUpdateLocation(refToSocket, { locationName });
            info(`${this.className}._handleMessages Pong received from client and ${replied ? 'answered' : 'not answered'}.`);
            break;
          }

          // ALocationName@AckPong@$
          case MyLapsFunctions.AckPong: {
            const locationName = parts[0];
            this._createOrUpdateLocation(refToSocket, { locationName });
            info(`${this.className}._handleMessages`, 'AckPong received from client.');
            break;
          }

          case MyLapsFunctions.Ping: {
            const replied = refToSocket.sendData([MyLaps2RMServiceName, MyLapsFunctions.AckPing]);
            const locationName = parts[0];
            this._createOrUpdateLocation(refToSocket, { locationName });
            info(`${this.className}._handleMessages Ping received from client and ${replied ? 'answered' : 'not answered'}.`);
            break;
          }

          // ALocationName@AckPing@$
          case MyLapsFunctions.AckPing: {
            const locationName = parts[0];
            this._createOrUpdateLocation(refToSocket, { locationName });
            info(`${this.className}._handleMessages`, 'AckPing received from client.');
            break;
          }

          case MyLapsFunctions.GetLocations: {
            refToSocket.meta.name = parts[0];
            for (let i = 2; i < len - 1; i++) {
              const location = parts[i].split('=');
              if (location.length === 2 && location[0] === MyLapsIdentifiers.LocationParameters.LocationName) {
                const locationName = location[1];
                this._createOrUpdateLocation(refToSocket, { locationName });
              } else {
                warn(`${this.className}._handleMessages`, 'Unknown location parameter', location);
              }
            }
            success(
              `${this.className}._handleMessages`,
              'Answer to GetLocations message received: ',
              Object.keys(refToSocket.meta.locations).join(', '),
            );
            break;
          }

          case MyLapsFunctions.AckGetInfo: {
            if (len > 4) {
              const locationName = parts[0];
              const deviceDetails = parts[2];
              const unknown = parts[3];
              const computerName = parts[4];

              // this is a bit tricky cause deviceName has diffrent contents depending of version 1 or 2 of MyLaps protocol
              if (unknown === 'Unknown') {
                // Version 1
                this._createOrUpdateLocation(refToSocket, {
                  locationName,
                  computerName,
                  deviceUpdate: {
                    deviceName: deviceDetails,
                  },
                });
              } else {
                // Version 2
                // 20M@AckGetInfo@id=20250558687|n=BibTagDecoder00DF|mac=0004B70700DF|ant=2|time=954463123529@$
                // 20M@AckGetInfo@id=20250558568|n=BibTagDecoder00AA|mac=0004B70700AA|ant=1|time=954463123529@$
                const device = myLapsDeviceToObject(deviceDetails);
                if (device != null) {
                  this._createOrUpdateLocation(refToSocket, {
                    locationName,
                    deviceUpdate: device,
                  });
                }
              }
              success(`${this.className}._handleMessages`, 'AckGetInfo message received: ', locationName);
            } else {
              warn(`${this.className}._handleMessages`, 'AckGetInfo message with wrong part length received', parts.length, parts);
            }
            break;
          }

          // case of passings we get something like this from the server:
          // len:  1    2       3                                                                                4                                                                                5    6
          //       10KM@Passing@t=13:11:30.904|c=0000041|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41@t=13:12:21.830|c=0000039|ct=UH|d=120606|l=30|dv=4|re=0|an=00001101|g=0|b=39|n=39@1016@$
          // and we have to return
          //       Test@AckPassing@1016@$
          case MyLapsFunctions.Passing: {
            const locationName = parts[0];
            if (len > 4) {
              const reads: Array<TimingRead> = [];
              const counter = Number.parseInt(parts[len - 2]);
              if (counter > 0) {
                for (let i = 2; i < len - 2; i++) {
                  const passing = parts[i];
                  const read = myLapsPassingToRead(locationName, locationName, passing);
                  if (read != null) {
                    reads.push(read);
                  } else {
                    warn(`${this.className}._handleMessages`, 'Passing message with missing keys received:', passing);
                  }
                }
                refToSocket.sendData([MyLaps2RMServiceName, MyLapsFunctions.AckPassing, counter.toString()]);
              }
              if (reads.length > 0) {
                this._pushNonlocatedReadToRacemap(reads);
                refToSocket.forwardedReads += reads.length;
                this._forwardedReads += reads.length;
              }
            }

            if (refToSocket.meta.locations[locationName] != null) {
              refToSocket.meta.locations[locationName].lastSeen = new Date();
            }

            this.updateElectronState();
            break;
          }

          // Store Message from Client: MTB Split 4Km@Store@KV8658316:13:57.417 3 0F  1000025030870@TC3970116:14:00.638 3 0F  1000125030857@FL8964716:35:29.424 3 0F  1000225030868@LL0011316:35:34.379 3 0F  1000325030857@HK0540916:36:34.249 3 0F  100042503085D@FX0918916:38:30.970 3 0F  1000525030871@FC3719516:39:00.729 3 0F  100062503085B@HN4126016:42:08.338 3 0F  100072503085B@LS1319316:43:55.826 3 0F  100082503086E@SF3671416:44:43.227 3 0F  1000925030866@FL8964716:50:41.667 3 0F  2000A25030878@LL0011316:50:42.206 3 0F  2000B25030858@HK0540916:52:47.756 3 0F  2000C25030872@FX0918916:56:34.182 3 0F  2000D25030880@FC3719516:57:54.971 3 0F  2000E25030873@LP9719617:22:09.556 3 0F  1000F25030885@SL3784517:22:34.554 3 0F  100102503086A@NL3771117:22:48.577 3 0F  1001125030868@GN8815417:22:48.936 3 0F  100122503086A@NH0186117:22:49.731 3 0F  100132503085C@HP6144617:23:34.483 3 0F  1001425030863@NT0248917:23:35.325 3 0F  100152503086C@SF6466217:23:35.847 3 0F  100162503086E@CS5806117:24:08.642 3 0F  1001725030862@PC8455717:24:18.934 3 0F  100182503086E@LW7969617:24:41.844 3 0F  1001925030883@TW5917117:24:55.618 3 0F  1001A25030889@VF3655317:25:02.357 3 0F  1001B25030873@SL4977017:25:03.582 3 0F  1001C2503087D@TN3909317:25:23.360 3 0F  1001D2503087A@2@
          //                                                            |> checksum
          // Where one passing is: KV8658316:13:57.417 3 0F  1000025030870
          //                       |      |            | |        |> date
          //                       |      |            | |> readerNumber
          //                       |      |> Time      |>  deviceNumber
          //                       |> Transponder Id
          case MyLapsFunctions.Store: {
            const locationName = parts[0];
            if (len > 4) {
              const reads: Array<TimingRead> = [];
              const counter = Number.parseInt(parts[len - 2]);
              if (counter > 0) {
                for (let i = 2; i < len - 2; i++) {
                  const read = myLapsLagacyPassingToRead(locationName, parts[i]);
                  if (read != null) {
                    reads.push(read);
                  }
                }
              }
              if (reads.length > 0) {
                this._pushNonlocatedReadToRacemap(reads);
                refToSocket.forwardedReads += reads.length;
                this._forwardedReads += reads.length;
              }
              refToSocket.sendData([MyLaps2RMServiceName, MyLapsFunctions.AckStore, counter.toString()]);
            }
            if (refToSocket.meta.locations[locationName] != null) {
              refToSocket.meta.locations[locationName].lastSeen = new Date();
            }
            break;
          }

          case MyLapsFunctions.Marker: {
            console.log('Marker', parts);
            const locationName = parts[0];
            if (len > 4) {
              const markers: Array<TimingRead> = [];
              const counter = Number.parseInt(parts[len - 2]);
              if (counter > 0) {
                for (let i = 2; i < len - 2; i++) {
                  const marker = myLapsMarkerToRead(locationName, parts[i]);
                  if (marker != null) {
                    markers.push(marker);
                  }
                }
              }
              warn(`We received ${markers.length} Markers. But do not know what to do with them. So we drop them. Possible guntime!`);
              // we always answer with the counter
              refToSocket.sendData([MyLaps2RMServiceName, MyLapsFunctions.AckMarker, counter.toString()]);
            }

            break;
          }

          default: {
            warn('Message with unknown MyLaps function received:', myLapsFunction, parts);
            break;
          }
        }
      }
    } else {
      warn(`${this.className} - We do not handle messages because protocol version is not in [v1.0, v2.1]`);
    }
  };

  async _pushNonlocatedReadToRacemap(timingReads: Array<TimingRead>): Promise<void> {
    // log("tryToPushNonlocatedReadToRacemap", timingReads);
    const response = await this._apiClient.sendTimingReadsAsJSON(timingReads);
    if (response.status === 200) {
      success('tryToPushNonlocatedReadToRacemap', timingReads);
    } else {
      warn('tryToPushNonlocatedReadToRacemap', response.status);
      warn(`|-> reads:${JSON.stringify(timingReads)}`);
    }
  }
}

export default MyLapsForwarder;
