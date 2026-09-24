import type APIClient from './api-client';

class BaseForwarder<SocketType> {
  _connections: Map<string, SocketType> = new Map();
  _listenHost: string;
  _listenPort: number;
  _forwardedReads = 0;
  _apiClient: APIClient;

  get className(): string {
    return this.constructor.name;
  }

  constructor(apiClient: APIClient, listenPort: number, justLocalHost: boolean) {
    this._apiClient = apiClient;
    this._listenPort = listenPort;
    this._listenHost = justLocalHost ? '127.0.0.1' : '0.0.0.0';
  }
}

export default BaseForwarder;
