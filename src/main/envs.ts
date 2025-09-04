import dotenv from 'dotenv';

import { ToRacemapForwarderVersion } from '../version';
import { printEnvVar } from './functions';

dotenv.config();

const RACEMAP_API_HOST = process.env.RACEMAP_API_HOST ?? 'https://racemap.com';
const RACEMAP_API_TOKEN = process.env.RACEMAP_API_TOKEN ?? '';
const LISTEN_MODE = process.env.LISTEN_MODE?.toLocaleLowerCase() ?? 'private';
const MYLAPS_LISTEN_PORT = Number.parseInt(process.env.MYLAPS_LISTEN_PORT ?? '3097');
const CHRONO_LISTEN_PORT = Number.parseInt(process.env.CHRONO_LISTEN_PORT ?? '3000');
const VERSION = ToRacemapForwarderVersion.gitTag.split('_')[0];

printEnvVar({ RACEMAP_API_HOST });
printEnvVar({ RACEMAP_API_TOKEN });
printEnvVar({ LISTEN_MODE });
printEnvVar({ MYLAPS_LISTEN_PORT });
printEnvVar({ CHRONO_LISTEN_PORT });
printEnvVar({ VERSION });

export const envs = {
  RACEMAP_API_HOST,
  RACEMAP_API_TOKEN,
  LISTEN_MODE,
  MYLAPS_LISTEN_PORT,
  CHRONO_LISTEN_PORT,
  VERSION,
};
