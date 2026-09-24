import moment from 'moment';
import { parseTimeOfDayWithUserDefinedOffset, parseTimeToIsoStringWithUserDefinedOffset } from '../functions';
import { createLogFile } from '../log-file';
import { ChronoTrackDefaultPrefix } from './consts';

// All ChronoTrack Transponder IDs are prefixed with Chrono_
// This is to seperate them from Raceresult TransponderIds and common App Ids
export function prefix(chipId: string): string {
  return chipId.startsWith(ChronoTrackDefaultPrefix) ? chipId : ChronoTrackDefaultPrefix + chipId;
}

export function chronoTrackTimeToDate(timeString: string, timeFormat: string, timeZoneOffsetInHours: number, now = new Date()): Date {
  switch (timeFormat) {
    // 14:02:15.31, local time without a date
    case 'normal':
      return parseTimeOfDayWithUserDefinedOffset(timeString, 'HH:mm:ss.SS', timeZoneOffsetInHours, now);
    // 2008-10-16T14:02:15.31, the offset applies here too since 1.1.3
    case 'iso':
      return parseTimeToIsoStringWithUserDefinedOffset(timeString, 'YYYY-MM-DDTHH:mm:ss.SS', timeZoneOffsetInHours);
    case 'unix':
      return moment.unix(Number.parseFloat(timeString)).toDate();
    default:
      return new Date(0);
  }
}

const rawLog = createLogFile('ChronoTrackInputAdapter');
export const logToFileSystem = (message: Buffer | string, fromClient = true) => {
  rawLog(`${new Date().toISOString()} ${fromClient ? '» from' : '« to  '} client: ${message}`);
};
