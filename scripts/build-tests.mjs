import { build } from 'esbuild';

build({
  entryPoints: ['tests/test-2-racemap-forwarder.ts'],
  bundle: true,
  platform: 'node',
  outfile: '.build/test-2-racemap-forwarder.js',
  sourcemap: true,
  external: ['electron'],
});
