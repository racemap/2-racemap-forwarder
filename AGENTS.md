# 2-racemap-forwarder – agent guide

Electron desktop app (main = Node, renderer = React + antd). It opens TCP ports for MyLaps (3097) and ChronoTrack (3000), parses their protocols and posts the reads to `racemap.com`. Customers run it on race day on their timing laptop, often with bad internet.

## Principles

- A read MUST NOT get lost. Never ack a read to the timing software before it is stored durably or delivered.
- Keep it small. Prefer deleting code and dependencies over adding them (see the `ponytail` skill).
- Parsers in `src/main/**/functions.ts` MUST stay pure (no global state, no electron, no I/O) so they can be unit tested.
- Every build MUST know its version. Version = git tag `vMAJOR.MINOR.PATCH` (semver). Support needs it from logs, UI and feedback.

## Layout

- `src/main/` – electron main process: `mylaps/`, `chronoTrack/`, `api-client.ts`, `state.ts`, `envs.ts`
- `src/preload/` – IPC bridge exposed as `window.api`
- `src/renderer/` – React UI
- `tests/` – ava tests (currently need a real `RACEMAP_API_TOKEN` in `.env`)
- `docs/` – protocol docs of MyLaps and ChronoTrack

## Commands

- `yarn dev` – run the app with HMR
- `yarn typecheck` – MUST pass before a commit
- `yarn test` – integration tests against racemap.com
- `yarn build-linux|build-win|build-mac` – local binaries into `dist/`

## Conventions

- Commit subjects are imperative sentences ("Retry failed uploads"). No body unless it states a fact the diff cannot show.
- Branches are named `<issue#>-slug`. PRs are squash merged.
- Comments are 1–2 lines and explain why, not what.
- Use `.claude/skills/ui-ux-pro-max` when you change the UI. Use `grill-me` to stress-test a plan before building it.
