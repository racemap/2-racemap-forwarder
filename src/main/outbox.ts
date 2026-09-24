import fs from 'node:fs';
import type { OutboxState, TimingRead } from '../types';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = {
  file: string; // JSONL, one read per line; mirrors the queue so a restart resends what is left
  send: (reads: Array<TimingRead>) => Promise<unknown>;
  canSend?: () => boolean;
  onChange?: (state: OutboxState) => void;
  batchSize?: number;
  maxDelayMs?: number;
};

// Retrying cannot fix these; the batch goes to <file>.rejected instead of blocking the queue forever.
const isPermanent = (err: unknown) => err instanceof HttpError && err.status >= 400 && err.status < 500 && ![401, 403, 408, 429].includes(err.status);

// Reads are written to disk before add() returns, so the timing software may be acked right after.
// Delivery is at least once: a crash between upload and rewrite sends the last batch again.
export class Outbox {
  private queue: Array<TimingRead>;
  private sending = false;
  private attempts = 0;
  private nextTryAt = 0;
  private timer: NodeJS.Timeout | null = null;
  readonly state: OutboxState = { queued: 0, forwarded: 0, rejected: 0, lastError: null, lastForwardedAt: null };

  constructor(private readonly options: Options) {
    this.queue = Outbox.load(options.file);
    this.state.queued = this.queue.length;
  }

  private static load(file: string): Array<TimingRead> {
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as TimingRead];
        } catch {
          return []; // a line cut off by a crash
        }
      });
  }

  add(reads: Array<TimingRead>): void {
    if (reads.length === 0) return;
    fs.appendFileSync(this.options.file, reads.map((r) => `${JSON.stringify(r)}\n`).join(''));
    this.queue.push(...reads);
    this.changed();
  }

  start(intervalMs = 500): void {
    this.timer ??= setInterval(() => void this.flush(), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async flush(now = Date.now()): Promise<void> {
    if (this.sending || this.queue.length === 0 || now < this.nextTryAt) return;
    if (this.options.canSend && !this.options.canSend()) return;

    this.sending = true;
    const batch = this.queue.slice(0, this.options.batchSize ?? 500);
    try {
      await this.options.send(batch);
      this.remove(batch.length);
      this.state.forwarded += batch.length;
      this.state.lastForwardedAt = new Date(now).toISOString();
      this.state.lastError = null;
      this.attempts = 0;
      this.nextTryAt = 0;
    } catch (err) {
      this.state.lastError = err instanceof Error ? err.message : String(err);
      if (isPermanent(err)) {
        fs.appendFileSync(`${this.options.file}.rejected`, batch.map((r) => `${JSON.stringify(r)}\n`).join(''));
        this.remove(batch.length);
        this.state.rejected += batch.length;
      } else {
        this.attempts += 1;
        this.nextTryAt = now + Math.min(this.options.maxDelayMs ?? 60_000, 1000 * 2 ** (this.attempts - 1));
      }
    } finally {
      this.sending = false;
      this.changed();
    }
  }

  private remove(count: number): void {
    this.queue.splice(0, count);
    // ponytail: rewrites the whole file per batch; fine for the few thousand reads a backlog holds
    fs.writeFileSync(this.options.file, this.queue.map((r) => `${JSON.stringify(r)}\n`).join(''));
  }

  private changed(): void {
    this.state.queued = this.queue.length;
    this.options.onChange?.({ ...this.state });
  }
}
