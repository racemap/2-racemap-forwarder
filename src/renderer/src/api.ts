import type { API } from 'src/preload';

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const api = (window as any).api as API;
