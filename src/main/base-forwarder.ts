import type { Outbox } from './outbox';

export const CLOSED_CONNECTION_TTL_MS = 5 * 60 * 1000;

class BaseForwarder<SocketType> {
  _connections: Map<string, SocketType> = new Map();
  _listenHost: string;
  _listenPort: number;
  _forwardedReads = 0;
  _outbox: Outbox;

  get className(): string {
    return this.constructor.name;
  }

  constructor(outbox: Outbox, listenPort: number, justLocalHost: boolean) {
    this._outbox = outbox;
    this._listenPort = listenPort;
    this._listenHost = justLocalHost ? '127.0.0.1' : '0.0.0.0';
  }
}

export default BaseForwarder;
