#! /usr/bin/node

import child from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * script to generate version information files
 * - tries to locate .version in destination folder
 * - generates new file when missing
 * - updates file by 1 build when nothing special is provided
 *
 * - new-version ./subfolder         => generates new file in subfolder or updates it
 * - new-version ./subfolder         => moves from v4.7.8 to v4.7.9
 * - new-version ./subfolder --minor => moves from v4.7.8 to v4.8.0
 * - new-version ./subfolder --major => moves from v4.7.8 to v5.0.0
 */
const destinationFolder = process.argv[2];

if (destinationFolder == null) {
  console.error('You have to deliver a destination Folder');
  console.log('i.e. ./new-version.mjs ./subfolder');
  console.log('add --help to get help');
  process.exit();
}

const versionFilePath = path.resolve(`${path.normalize(destinationFolder)}.version`);
const minor = process.argv.join(' ').toLowerCase().includes('--minor');
const major = process.argv.join(' ').toLowerCase().includes('--major');
const hashOnly = process.argv.join(' ').toLowerCase().includes('--hash-only');
const help = process.argv.join(' ').toLowerCase().includes('--help');

let text = 'Doing a build update';
if (minor) text = 'Doing a minor update';
if (major) text = 'Doing a major update';
if (hashOnly) text = 'Only updating the hashes.';
if (help) {
  console.log('Run script with folder to update version file in folder');
  console.log('Add --major to increase major version by 1');
  console.log('Add --minor to increase minor version by 1');
  console.log('Add --hash-only to update the hashes without a version change');
  process.exit();
}

const getLastFolderSegment = (aPath) => {
  const parts = path.dirname(aPath).split(path.sep);
  return parts[parts.length - 1];
};

const readVersion = (versionString) => {
  const temp = versionString.split('v')[1].split('.');
  return {
    major: Number.parseInt(temp[0]),
    minor: Number.parseInt(temp[1]),
    build: Number.parseInt(temp[2]),
    asString: function () {
      return `v${this.major}.${this.minor}.${this.build}`;
    },
  };
};

const upgradeVersion = (oldVersion, minor, major) => {
  oldVersion.build = oldVersion.build + 1;
  if (minor) {
    oldVersion.build = 0;
    oldVersion.minor = oldVersion.minor + 1;
  }
  if (major) {
    oldVersion.build = 0;
    oldVersion.minor = 0;
    oldVersion.major = oldVersion.major + 1;
  }
  return oldVersion;
};

const getFolderHash = (folder) => {
  const command = folder ? `git log -n 1 --format="%H" -- ${folder}` : `git log -n 1 --format="%H"`;
  return child.execSync(command).toString('utf8').replace('\n', ' ').trim().slice(0, 7);
};

let versionFile = {
  name: getLastFolderSegment(`${process.cwd()}/.version`),
  prefix: 'v1.0.0',
  folderHash: getFolderHash(path.dirname(versionFilePath)),
  globalHash: getFolderHash(),
};

if (fs.existsSync(versionFilePath)) {
  console.log(`Updating version file: ${versionFilePath}`);
  versionFile = { ...versionFile, ...JSON.parse(fs.readFileSync(versionFilePath)) };
  const oldVersion = readVersion(versionFile.prefix);
  const savedOldVersionString = oldVersion.asString();

  // updating
  versionFile.name = getLastFolderSegment(versionFilePath);
  versionFile.prefix = (hashOnly ? oldVersion : upgradeVersion(oldVersion, minor, major)).asString();
  versionFile.folderHash = getFolderHash(path.dirname(versionFilePath));
  versionFile.globalHash = getFolderHash();
  console.log(`|-> name: \x1b[33m${versionFile.name}\x1b[0m`);
  console.log(`|-> prefix: upgraded from \x1b[35m${savedOldVersionString}\x1b[0m to \x1b[33m${versionFile.prefix}\x1b[0m`);
} else {
  console.log(`Version file missing: ${versionFilePath} generating version file.`);
  console.log(`|-> name: \x1b[33m${versionFile.name}\x1b[0m`);
  console.log('|-> prefix: initated as \x1b[33mv1.0.0\x1b[0m');
}

console.log(`|-> folderHash: \x1b[33m${versionFile.folderHash}\x1b[0m`);
console.log(`|-> globalHash: \x1b[33m${versionFile.globalHash}\x1b[0m`);

fs.writeFileSync(versionFilePath, JSON.stringify(versionFile, null, 2).concat('\n'));
