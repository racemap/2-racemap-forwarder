export type BuildInfo = {
  version: string; // semver without "v", e.g. 1.2.0 or 1.2.0-3-gabc1234-dirty for local builds
  commit: string;
  buildDate: string;
};

// Injected at build time by tools/build-info.mjs (electron.vite.config.js, scripts/build-tests.mjs).
declare const __BUILD_INFO__: BuildInfo | undefined;

export const buildInfo: BuildInfo =
  typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : { version: '0.0.0-dev', commit: 'unknown', buildDate: '' };
