import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app } from 'electron';

export const logsDir = process.versions?.electron ? app.getPath('logs') : path.join(os.tmpdir(), '2-racemap-forwarder-logs');

// biome-ignore lint/suspicious/noControlCharactersInRegex: matches the ANSI escape character on purpose
export const stripAnsi = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, '');

type Options = { dir?: string; maxBytes?: number; keep?: number; header?: () => string };

// Appends lines to <dir>/<name>.log and rotates at maxBytes: name.log -> name.1.log -> … -> name.<keep>.log.
// The file stays open (writeSync on one fd, no open/close per line) so closing and renaming on rotation
// also works on Windows. Errors are swallowed: a full disk must never stop the forwarding.
export function createLogFile(name: string, { dir = logsDir, maxBytes = 5 * 1024 * 1024, keep = 4, header }: Options = {}): (line: string) => void {
  const file = path.join(dir, `${name}.log`);
  let fd: number | null = null;
  let bytes = 0;

  const write = (line: string) => {
    const text = `${stripAnsi(line)}\n`;
    if (fd !== null) fs.writeSync(fd, text);
    bytes += Buffer.byteLength(text);
  };

  const open = () => {
    fs.mkdirSync(dir, { recursive: true });
    fd = fs.openSync(file, 'a');
    bytes = fs.fstatSync(fd).size;
    if (header) write(header());
  };

  const rotate = () => {
    if (fd !== null) fs.closeSync(fd);
    fd = null;
    for (let i = keep - 1; i >= 1; i--) {
      const from = path.join(dir, `${name}.${i}.log`);
      if (fs.existsSync(from)) fs.renameSync(from, path.join(dir, `${name}.${i + 1}.log`));
    }
    fs.renameSync(file, path.join(dir, `${name}.1.log`));
  };

  return (line: string) => {
    try {
      if (fd !== null && bytes >= maxBytes) rotate();
      if (fd === null) open();
      write(line);
    } catch {
      bytes = 0; // do not retry the rotation on every line
    }
  };
}
