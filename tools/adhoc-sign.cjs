// electron-builder afterPack hook. Without an Apple Developer ID the app is left unsigned, and macOS
// reports unsigned arm64 apps as "damaged". An ad-hoc signature turns that into the usual
// "unidentified developer" prompt, which users can confirm with right-click -> Open.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async ({ electronPlatformName, appOutDir, packager }) => {
  if (electronPlatformName !== 'darwin' || process.env.CSC_LINK) return;
  const app = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
