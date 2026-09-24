import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { getBuildInfo } from './tools/build-info.mjs';

const define = { __BUILD_INFO__: JSON.stringify(getBuildInfo()) };

export default defineConfig({
  main: {
    define,
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    define,
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    define,
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
      },
    },
    plugins: [react()],
  },
});
