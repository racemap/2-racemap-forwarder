/*
 * Just to sum up buffers
 * @param incomingData
 * @param aBufferObject
 * @param maxMessageDataDelayInMilis
 */

import net from 'node:net';
import { Buffer } from 'node:buffer';
import type { ExtendedSocket } from '../types';

type TArgs = Array<unknown>;

type BufferObject = {
  buffer: Buffer;
  lastTime: number;
  name?: string;
};

let refToElectronWebContents: Electron.WebContents | null = null;

export const storeIncomingRawData = (incomingData: Buffer, aBufferObject: BufferObject, maxMessageDataDelayInMilis = 200): void => {
  const newBufferlength: number = aBufferObject.buffer.length + incomingData.length;
  const now: number = Date.now();
  if (aBufferObject.buffer.length > 0 && aBufferObject.lastTime + maxMessageDataDelayInMilis < now) {
    console.warn(
      `storeIncomingRawData - ${aBufferObject.name} Buffer to old!`,
      'ΔT =',
      now - aBufferObject.lastTime,
      'ms',
      'allowedΔT =',
      maxMessageDataDelayInMilis,
      'ms',
      'dropped bytes:',
      aBufferObject.buffer,
    );
    aBufferObject.buffer = Buffer.alloc(0);
  }
  aBufferObject.buffer = Buffer.concat([aBufferObject.buffer, incomingData], newBufferlength);
  aBufferObject.lastTime = now;
};

/*
 * Just to find serialized data seperated by frameTerminator FT
 * @param aBufferToProcess
 * @param messageHandler
 */
export const processStoredData = (aBufferToProcess: BufferObject, messageHandler: (message: Buffer) => void, frameTerminator: string): void => {
  if (aBufferToProcess.buffer.length > 0) {
    let FTPos: number = aBufferToProcess.buffer.indexOf(frameTerminator);
    while (FTPos > -1) {
      // Reserving some Space
      const aMessage: Buffer = Buffer.alloc(FTPos);
      // Reserving some Space for the Rest of the Message
      const aTail: Buffer = Buffer.alloc(aBufferToProcess.buffer.length - FTPos - frameTerminator.length);
      // Extracting the message
      aBufferToProcess.buffer.copy(aMessage, 0, 0, FTPos);
      // Saving the rest of the message
      aBufferToProcess.buffer.copy(aTail, 0, FTPos + frameTerminator.length, aBufferToProcess.buffer.length);
      // shortening the Raw Buffer
      aBufferToProcess.buffer = aTail;
      FTPos = aBufferToProcess.buffer.indexOf(frameTerminator);
      // trying to analyse the message
      if (messageHandler != null && typeof messageHandler === 'function') messageHandler(aMessage);
    }
  }
};

type RemovableBytes = 0x00 | 0x0a | 0x0d;

export const removeCertainBytesFromBuffer = (bytesToCheckForRemoval: Array<RemovableBytes>, buffer: Buffer): Buffer => {
  const tempBuffer = Buffer.alloc(buffer.length);
  let j = 0;
  for (let i = 0; i < buffer.length; i++) {
    let skipByte = false;
    for (let k = 0; k < bytesToCheckForRemoval.length; k++) {
      if (buffer[i] === bytesToCheckForRemoval[k]) {
        // skip this byte
        skipByte = true;
      }
    }
    if (!skipByte) {
      tempBuffer[j] = buffer[i];
      j++;
    }
  }
  const resultBuffer = Buffer.alloc(j);
  tempBuffer.copy(resultBuffer, 0, 0, j);
  return resultBuffer;
};

// check if the port is already in use
export const isPortInUse = async (portToCheck: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(portToCheck, () => {
      server.close(() => resolve(false));
    });
    server.on('error', () => resolve(true));
  });
};

export const now = (): string => {
  return new Date().toISOString().split('T')[1].split('Z')[0];
};

const internal = (...args: TArgs): void => {
  console.log(...args);
  if (refToElectronWebContents != null) {
    const formatted = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg))).join(' ');

    refToElectronWebContents.send('onNewStdOutLine', formatted);
  }
};

export const log = (...args: TArgs): void => {
  internal(now(), 'Log:    ', ...args);
};

export const info = (...args: TArgs): void => {
  internal(now(), 'Info:   \x1b[34m', ...args, '\x1b[0m');
};

export const warn = (...args: TArgs): void => {
  internal(now(), 'Warning:\x1b[91m', ...args, '\x1b[0m');
};

export const error = (...args: TArgs): void => {
  internal(now(), 'Error:  \x1b[31m', ...args, '\x1b[0m');
};

export const success = (...args: TArgs): void => {
  internal(now(), 'Success:\x1b[32m', ...args, '\x1b[0m');
};

export function prepareLogger(webContents: Electron.WebContents): void {
  refToElectronWebContents = webContents;
}

export function connectTcpSocket(ip: string, port: number): Promise<ExtendedSocket> {
  return new Promise((resolve, reject) => {
    try {
      const tcpClient = new net.Socket();
      tcpClient.connect(port, ip, () => {
        resolve(tcpClient as ExtendedSocket);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * build a random string with 9 characters
 * @returns string
 */
export function shortIdBuilder(): string {
  return characterIdBuilder();
}

/**
 * build a character based id with a controlable number of characters
 * @param numberOfCharacter - The number digits the id will have
 * @returns id
 */
export function characterIdBuilder(numberOfCharacter = 9): string {
  return Math.random().toString(36).substr(2, numberOfCharacter);
}

export function sleep(millisToSleep: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, millisToSleep);
  });
}

export const printEnvVar = (envVar: { [name: string]: unknown }, isPublic = true): void => {
  let name = '???';
  let value: unknown | null = null;
  if (envVar != null && typeof envVar === 'object' && Object.keys(envVar).length === 1) {
    name = Object.keys(envVar)[0];
    value = isPublic ? Object.values(envVar)[0] : '***';
  }
  console.log(now(), 'Log:', `    |-> \x1b[35m${name}\x1b[0m: \x1b[36m${value || '???'}\x1b[0m`);
};
