# Gotchas & Lessons Learned

These lessons were learned during integration with Qualia Coding (28k LOC, 18 e2e specs). Don't repeat them.

## Gotchas table

| Gotcha | What happens | What to do |
|--------|-------------|------------|
| Install without `--legacy-peer-deps` | Fails with peer dep conflict | **Always** use the flag |
| Use `async/await` inside `browser.execute()` | `WebDriverError: status missing` — execute is synchronous | Everything synchronous inside execute, use `browser.pause()` after |
| Use `require("obsidian")` inside `browser.execute()` | Crash — not available in Electron context | Build DOM manually or access via `window.app` |
| Screenshot baselines in CI (Linux) | 60%+ mismatch vs macOS baselines | Screenshots are machine-dependent — visual comparison only local |
| Command IDs without plugin prefix | `executeCommand("open-settings")` not found | Check actual ID — may be `plugin-id:command-name` |
| Inherit from intermediate class (`MyView extends MediaView extends ItemView`) | View doesn't load in Obsidian | Obsidian may have edge case with indirect ItemView inheritance |
| `openFile` without enough wait | Elements haven't rendered yet | Always `waitForElement(selector, 10000)` after openFile |
| Screenshots of media components (audio/video) | Flaky due to WaveSurfer timing | Increase pause to 8000ms |
| Forget `waitForPlugin()` before injecting data | Plugin hasn't loaded yet, inject silently fails | **Always** call waitForPlugin before browser.execute in helper |
| Commit `test/screenshots/actual/` and `test/screenshots/diff/` | Run artifacts bloat the repo | Add to .gitignore, commit only `baseline/` |

## CI (GitHub Actions)

E2E works in CI via xvfb (virtual display for Electron). However, **visual screenshot tests fail** because Linux renders fonts/anti-aliasing differently from macOS. The solution: run only the smoke test in CI, visual comparison stays local.

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci --legacy-peer-deps
      - run: npm run build
      - run: npm test

  e2e-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci --legacy-peer-deps
      - run: npm run build
      - uses: actions/cache@v4
        with:
          path: .obsidian-cache
          key: obsidian-${{ runner.os }}
      - name: E2E smoke test
        uses: coactions/setup-xvfb@v1
        with:
          run: npx wdio run wdio.conf.mts --spec test/e2e/specs/smoke.e2e.ts
```
