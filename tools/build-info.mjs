import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (args) => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
};

// The release tag is the only version source. CI passes it as BUILD_VERSION; local builds ask git.
export function getBuildInfo() {
  const described = git("describe --tags --match 'v[0-9]*.[0-9]*.[0-9]*' --dirty").replace(/^v/, '');
  const fallback = `${JSON.parse(readFileSync('package.json', 'utf8')).version}-dev`;
  return {
    version: process.env.BUILD_VERSION || described || fallback,
    commit: git('rev-parse --short HEAD') || process.env.GITHUB_SHA?.slice(0, 7) || 'unknown',
    buildDate: new Date().toISOString(),
  };
}
