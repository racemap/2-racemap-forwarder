import fs from 'node:fs';

const vers = JSON.parse(fs.readFileSync('./.version', 'utf8'));

// rename the binaries located in ./bin from filname to filename-x64-v1.0.0
const binDir = './.bin';
const files = fs.readdirSync(binDir);

for (const fileName of files) {
  console.log(`|-> Try to rename \x1b[91m${fileName}\x1b[0m to \x1b[32m${fileName}-x64-${vers.prefix}\x1b[0m`);

  const isWindows = fileName.endsWith('.exe');
  const hasBeenRenamed = fileName.includes(`-x64-${vers.prefix}`);

  if (hasBeenRenamed) {
    console.log('|-> Already renamed');
    continue;
  }

  const filePath = `${binDir}/${fileName}`;
  const filePathX64Version = `${binDir}/${isWindows ? fileName.replaceAll('.exe', '') : fileName}-x64-${isWindows ? `${vers.prefix}.exe` : vers.prefix}`;

  if (fs.existsSync(filePath)) {
    fs.renameSync(filePath, filePathX64Version);
  }
}
