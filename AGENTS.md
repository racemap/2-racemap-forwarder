# 2-racemap-forwarder – agent guide

Electron desktop app (main = Node, renderer = React + antd). It opens TCP ports for MyLaps (3097) and ChronoTrack (3000), parses their protocols and posts the reads to `racemap.com`. Customers run it on race day on their timing laptop, often with bad internet.

## Principles

- A read MUST NOT get lost. Reads go through `src/main/outbox.ts`; ack to the timing software only after `outbox.add()` returned.
- Keep it small. Prefer deleting code and dependencies over adding them (see the `ponytail` skill).
- Parsers in `src/main/**/functions.ts` MUST stay pure (no global state, no electron, no I/O) so they can be unit tested.
- Every build MUST know its version. The git tag `vMAJOR.MINOR.PATCH` (semver) is the only source; `tools/build-info.mjs` injects it as `buildInfo` (`src/version.ts`). Never hard-code a version.

## Layout

- `src/main/` – electron main process: `mylaps/`, `chronoTrack/`, `api-client.ts`, `state.ts`, `envs.ts`
- `src/preload/` – IPC bridge exposed as `window.api`
- `src/renderer/` – React UI
- `tests/unit/` – Vitest unit tests (`yarn test`, run in CI)
- `tests/test-2-racemap-forwarder.ts` – live ava suite against racemap.com (`yarn test:live`, needs `RACEMAP_API_TOKEN` in `.env`)
- `docs/` – protocol docs of MyLaps and ChronoTrack

## Commands

- `yarn dev` – run the app with HMR
- `yarn check` and `yarn typecheck` – MUST pass before a commit (CI runs both)
- `yarn test` – unit tests; every bug fix MUST come with one
- `yarn build-linux|build-win|build-mac` – local binaries into `dist/`
- `./tools/release/release.sh [--minor|--major] [--dry-run]` – cut a release; the tag triggers `.github/workflows/release.yml`

## Conventions

- Commit subjects are imperative sentences ("Retry failed uploads"). No body unless it states a fact the diff cannot show.
- Branches are named `<issue#>-slug`. PRs are squash merged.
- Comments are 1–2 lines and explain why, not what.
- Use `.claude/skills/ui-ux-pro-max` when you change the UI. Use `grill-me` to stress-test a plan before building it.
