import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError, Outbox } from '../../src/main/outbox';
import type { TimingRead } from '../../src/types';

const read = (n: number): TimingRead => ({ timingId: 'Start', timingName: 'Start', chipId: `MyLaps_${n}`, timestamp: '2026-06-13T10:00:00.000Z' });
const reads = (count: number) => Array.from({ length: count }, (_, i) => read(i));

let file: string;
beforeEach(() => {
  file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'outbox-')), 'outbox.jsonl');
});

describe('Outbox', () => {
  it('writes reads to disk before add returns', () => {
    new Outbox({ file, send: vi.fn() }).add(reads(3));
    expect(fs.readFileSync(file, 'utf8').trim().split('\n')).toHaveLength(3);
  });

  it('sends in batches and empties the file', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const outbox = new Outbox({ file, send, batchSize: 2 });
    outbox.add(reads(3));
    await outbox.flush();
    await outbox.flush();
    expect(send.mock.calls.map(([batch]) => batch.length)).toEqual([2, 1]);
    expect(outbox.state).toMatchObject({ queued: 0, forwarded: 3, lastError: null });
    expect(fs.readFileSync(file, 'utf8')).toBe('');
  });

  it('keeps the reads and backs off while offline, then delivers all of them', async () => {
    const send = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const outbox = new Outbox({ file, send });
    outbox.add(reads(100));

    await outbox.flush(0);
    expect(outbox.state).toMatchObject({ queued: 100, forwarded: 0, lastError: 'fetch failed' });
    await outbox.flush(500); // still inside the 1 s backoff
    expect(send).toHaveBeenCalledTimes(1);

    send.mockResolvedValue(undefined);
    await outbox.flush(1000);
    expect(outbox.state).toMatchObject({ queued: 0, forwarded: 100, lastError: null });
    expect(send.mock.calls[1][0]).toHaveLength(100);
  });

  it('doubles the backoff up to the maximum', async () => {
    const send = vi.fn().mockRejectedValue(new HttpError(503, 'unavailable'));
    const outbox = new Outbox({ file, send, maxDelayMs: 4000 });
    outbox.add(reads(1));
    const tries: Array<number> = [];
    for (let now = 0; now <= 20_000; now += 250) {
      const before = send.mock.calls.length;
      await outbox.flush(now);
      if (send.mock.calls.length > before) tries.push(now);
    }
    expect(tries.slice(0, 6)).toEqual([0, 1000, 3000, 7000, 11000, 15000]);
  });

  it('keeps retrying on 401 so a fixed token delivers the queue', async () => {
    const send = vi.fn().mockRejectedValueOnce(new HttpError(401, 'Unauthorized')).mockResolvedValue(undefined);
    const outbox = new Outbox({ file, send });
    outbox.add(reads(2));
    await outbox.flush(0);
    await outbox.flush(1000);
    expect(outbox.state).toMatchObject({ queued: 0, forwarded: 2, rejected: 0 });
  });

  it('moves a batch the API rejects to the .rejected file instead of blocking', async () => {
    const send = vi.fn().mockRejectedValueOnce(new HttpError(400, 'Bad Request')).mockResolvedValue(undefined);
    const outbox = new Outbox({ file, send, batchSize: 2 });
    outbox.add(reads(3));
    await outbox.flush(0);
    await outbox.flush(1);
    expect(outbox.state).toMatchObject({ queued: 0, forwarded: 1, rejected: 2 });
    expect(fs.readFileSync(`${file}.rejected`, 'utf8').trim().split('\n')).toHaveLength(2);
  });

  it('resends what is left after a restart and skips a line cut off by a crash', async () => {
    new Outbox({ file, send: vi.fn() }).add(reads(50));
    fs.appendFileSync(file, '{"timingId":"Sta');

    const send = vi.fn().mockResolvedValue(undefined);
    const restarted = new Outbox({ file, send });
    expect(restarted.state.queued).toBe(50);
    await restarted.flush();
    expect(send.mock.calls[0][0]).toHaveLength(50);
  });

  it('waits while canSend is false', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    let hasToken = false;
    const outbox = new Outbox({ file, send, canSend: () => hasToken });
    outbox.add(reads(1));
    await outbox.flush();
    expect(send).not.toHaveBeenCalled();
    hasToken = true;
    await outbox.flush();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
