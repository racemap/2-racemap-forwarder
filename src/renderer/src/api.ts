import type { API } from 'src/preload';

export const api = (window as unknown as { api: API }).api;
