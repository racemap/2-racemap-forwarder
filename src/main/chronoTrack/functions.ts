import fs from 'node:fs';
import { ChronoTrackDefaultPrefix } from './consts';

// All ChronoTrack Transponder IDs are prefixed with Chrono_
// This is to seperate them from Raceresult TransponderIds and common App Ids
export function prefix(chipId: string): string {
  // When "Chrono_" is not prepended it should be prepended
  if (chipId.indexOf(ChronoTrackDefaultPrefix) !== 0) {
    return chipId;
  }
  return ChronoTrackDefaultPrefix + chipId;
}

export const logToFileSystem = (message: Buffer | string, fromClient = true) => {
  fs.appendFileSync('./ChronoTrackInputAdapter.log', `${new Date().toISOString()} ${fromClient ? '» from' : '« to  '} client: ${message}\n`);
};
