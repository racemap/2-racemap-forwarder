import { describe, expect, it } from 'vitest';
import { ChronoTrackDefaultPrefix } from '../../src/main/chronoTrack/consts';
import { prefix as chronoPrefix } from '../../src/main/chronoTrack/functions';
import { MyLapsDefaultPrefix } from '../../src/main/mylaps/consts';
import { myLapsDeviceToObject, myLapsLagacyPassingToRead, myLapsMarkerToRead, myLapsPassingToRead } from '../../src/main/mylaps/functions';

describe('ChronoTrack prefix', () => {
  it('adds the prefix', () => {
    expect(chronoPrefix('50101')).toBe(`${ChronoTrackDefaultPrefix}50101`);
  });
  it('does not add it twice', () => {
    expect(chronoPrefix(`${ChronoTrackDefaultPrefix}50101`)).toBe(`${ChronoTrackDefaultPrefix}50101`);
  });
});

describe('MyLaps passings', () => {
  const passive = 't=13:11:30.904|c=0000041|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41';
  const active = 't=13:11:30.904|c=FG29511|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41';

  it('parses a passive passing and drops the leading zeros', () => {
    expect(myLapsPassingToRead('Start', 'Start', passive, 0)).toEqual({
      timingId: 'Start',
      timingName: 'Start',
      chipId: `${MyLapsDefaultPrefix}41`,
      timestamp: '2012-06-06T13:11:30.904Z',
    });
  });

  it('keeps active transponder ids and applies the offset', () => {
    const read = myLapsPassingToRead('Start', 'Start', active, 2);
    expect(read?.chipId).toBe(`${MyLapsDefaultPrefix}FG29511`);
    expect(read?.timestamp).toBe('2012-06-06T11:11:30.904Z');
  });

  it('prefixes an id that merely contains the prefix', () => {
    expect(myLapsPassingToRead('Start', 'Start', active.replace('FG29511', `X${MyLapsDefaultPrefix}1`), 0)?.chipId).toBe(
      `${MyLapsDefaultPrefix}X${MyLapsDefaultPrefix}1`,
    );
  });

  it('returns null when chip, time or date is missing', () => {
    expect(myLapsPassingToRead('Start', 'Start', 't=13:11:30.904|ct=UH|d=120606', 0)).toBeNull();
  });

  it('parses a legacy Store passing', () => {
    expect(myLapsLagacyPassingToRead('Split', 'KV8658316:13:57.417 3 0F  1000025030870', 1)).toEqual({
      timingId: 'Split',
      timingName: 'Split',
      chipId: `${MyLapsDefaultPrefix}KV86583`,
      timestamp: '2025-03-08T15:13:57.417Z',
    });
  });

  it('dates a marker by the time it arrives', () => {
    const read = myLapsMarkerToRead('Start', 't=23:59:40.347|mt=Gunshot|n=Gunshot 1', 2, new Date('2026-06-13T22:00:10Z'));
    expect(read).toEqual({ timingId: 'Start', timingName: 'Gunshot 1', chipId: '', timestamp: '2026-06-13T21:59:40.347Z' });
  });

  it('parses a v2 device', () => {
    expect(myLapsDeviceToObject('id=20250558687|n=BibTagDecoder00DF|mac=0004B70700DF|ant=2|time=954463123529')).toMatchObject({
      deviceId: '20250558687',
      deviceName: 'BibTagDecoder00DF',
      deviceMac: '0004B70700DF',
      antennaCount: '2',
    });
  });
});
