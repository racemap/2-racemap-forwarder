import { describe, expect, it } from 'vitest';
import { chronoTrackTimeToDate } from '../../src/main/chronoTrack/functions';
import { parseTimeOfDayWithUserDefinedOffset, parseTimeToIsoStringWithUserDefinedOffset } from '../../src/main/functions';

const at = (iso: string) => new Date(iso);

describe('parseTimeOfDayWithUserDefinedOffset', () => {
  it.each([
    // offset, now (UTC), local time of the read, expected UTC
    { offset: 2, now: '2026-06-13T23:30:00Z', time: '01:29:00.000', expected: '2026-06-13T23:29:00.000Z' }, // after local midnight, UTC still the day before
    { offset: 2, now: '2026-06-13T22:01:00Z', time: '23:59:00.000', expected: '2026-06-13T21:59:00.000Z' }, // read from before midnight arrives after it
    { offset: -5, now: '2026-06-14T04:30:00Z', time: '23:29:00.000', expected: '2026-06-14T04:29:00.000Z' }, // west of UTC, late evening
    { offset: 10, now: '2026-06-13T14:05:00Z', time: '00:04:00.000', expected: '2026-06-13T14:04:00.000Z' },
    { offset: 0, now: '2026-06-13T12:00:00Z', time: '11:59:30.500', expected: '2026-06-13T11:59:30.500Z' },
  ])('UTC$offset at $now: $time -> $expected', ({ offset, now, time, expected }) => {
    expect(parseTimeOfDayWithUserDefinedOffset(time, 'HH:mm:ss.SSS', offset, at(now)).toISOString()).toBe(expected);
  });
});

describe('parseTimeToIsoStringWithUserDefinedOffset', () => {
  it.each([
    [0, '2025-03-08T16:13:57.417Z'],
    [2, '2025-03-08T14:13:57.417Z'],
    [-3, '2025-03-08T19:13:57.417Z'],
  ])('subtracts an offset of %i h', (offset, expected) => {
    expect(parseTimeToIsoStringWithUserDefinedOffset('250308 16:13:57.417', 'YYMMDD hh:mm:ss.SSS', offset).toISOString()).toBe(expected);
  });
});

describe('chronoTrackTimeToDate', () => {
  it('normal: local time of day, date taken from now', () => {
    expect(chronoTrackTimeToDate('23:59:58.10', 'normal', 2, at('2026-06-13T22:00:30Z')).toISOString()).toBe('2026-06-13T21:59:58.100Z');
  });
  it('iso: the user offset is applied', () => {
    expect(chronoTrackTimeToDate('2008-10-16T14:02:15.31', 'iso', 2).toISOString()).toBe('2008-10-16T12:02:15.310Z');
  });
  it('unix: seconds since epoch', () => {
    expect(chronoTrackTimeToDate('1700000000.5', 'unix', 2).toISOString()).toBe('2023-11-14T22:13:20.500Z');
  });
});
