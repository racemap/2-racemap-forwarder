import { build } from 'esbuild';
import { getBuildInfo } from './build-info.mjs';

build({
  entryPoints: ['tests/test-2-racemap-forwarder.ts'],
  bundle: true,
  platform: 'node',
  outfile: '.build/test-2-racemap-forwarder.js',
  sourcemap: true,
  external: ['electron'],
  define: { __BUILD_INFO__: JSON.stringify(getBuildInfo()) },
});
