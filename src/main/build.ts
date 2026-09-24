import os from 'node:os';
import type { AppVersion } from '../types';
import { buildInfo } from '../version';

const electron = process.versions.electron ?? '';

// What support needs to identify a build. `label` is what the UI copies and the log prints first.
export const appVersion: AppVersion = {
  ...buildInfo,
  platform: process.platform,
  arch: process.arch,
  os: `${os.type()} ${os.release()}`,
  electron,
  label: `2-racemap-forwarder ${buildInfo.version} (${buildInfo.commit}) ${process.platform}-${process.arch} Electron ${electron}`,
};

export const userAgent = `2-racemap-forwarder/${buildInfo.version} (${process.platform}; ${process.arch}; ${buildInfo.commit})`;
