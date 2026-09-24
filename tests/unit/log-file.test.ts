import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLogFile, stripAnsi } from '../../src/main/log-file';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'logs-'));

describe('createLogFile', () => {
  it('writes the header first and strips colour codes', () => {
    const dir = tmp();
    const log = createLogFile('app', { dir, header: () => '=== 2-racemap-forwarder 1.2.0 ===' });
    log('\x1b[32mSuccess\x1b[0m');
    expect(fs.readFileSync(path.join(dir, 'app.log'), 'utf8')).toBe('=== 2-racemap-forwarder 1.2.0 ===\nSuccess\n');
  });

  it('rotates at maxBytes, keeps the newest files and repeats the header', () => {
    const dir = tmp();
    const log = createLogFile('app', { dir, maxBytes: 100, keep: 2, header: () => 'HEADER' });
    for (let i = 0; i < 40; i++) log(`line ${i} ${'x'.repeat(20)}`);
    expect(fs.readdirSync(dir).sort()).toEqual(['app.1.log', 'app.2.log', 'app.log']);
    expect(fs.readFileSync(path.join(dir, 'app.log'), 'utf8')).toMatch(/^HEADER\n/);
    expect(fs.readFileSync(path.join(dir, 'app.log'), 'utf8')).toContain('line 39');
  });

  it('never throws when the folder cannot be written', () => {
    const notADir = path.join(tmp(), 'a-file');
    fs.writeFileSync(notADir, '');
    const log = createLogFile('app', { dir: notADir });
    expect(() => log('hello')).not.toThrow();
  });
});

describe('stripAnsi', () => {
  it('removes colour codes', () => {
    expect(stripAnsi('Info:   \x1b[34m Check \x1b[0m')).toBe('Info:    Check ');
  });
});
