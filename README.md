# obsidian-e2e-visual-test-kit

E2E visual test kit for Obsidian plugins — open the real app, navigate like a person, take screenshots, assert DOM state. Works with any plugin.

## Why

Vitest + jsdom covers pure logic (~80%), but can't test visual rendering (CM6, Chart.js, Fabric.js, canvas), DOM structure in Obsidian's real context, or interaction states (hover, drag, selection). This kit fills that gap.

## Results

| Plugin | Unit tests | E2E tests | Total | Specs |
|--------|-----------|-----------|-------|-------|
| [Qualia Coding](docs/case-studies/qualia-coding.md) (28k LOC) | 1,269 | 65 | 1,334 | 18 |
| [Mirror Notes](docs/case-studies/mirror-notes.md) | — | — | — | — |

## Quick start

```bash
npm install --save-dev --legacy-peer-deps \
  obsidian-e2e-visual-test-kit@github:mrlnlms/obsidian-e2e-visual-test-kit \
  wdio-obsidian-service @wdio/visual-service \
  @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter \
  wdio-obsidian-reporter @types/mocha
```

```typescript
// wdio.conf.mts
import { createConfig } from "obsidian-e2e-visual-test-kit";

export const config = createConfig({
  pluginId: "my-plugin",
  pluginDir: ".",
  vault: "test/e2e/vaults/visual",
  specs: ["test/e2e/specs/**/*.e2e.ts"],
});
```

```typescript
// test/e2e/specs/smoke.e2e.ts
import { openFile, waitForPlugin, getActiveFile } from "obsidian-e2e-visual-test-kit";

describe("smoke", () => {
  it("plugin loads", async () => {
    await waitForPlugin("my-plugin");
    expect(await browser.execute(() =>
      !!(window as any).app.plugins.plugins["my-plugin"]
    )).toBe(true);
  });

  it("opens a file", async () => {
    await openFile("Sample Note.md");
    expect(await getActiveFile()).toBe("Sample Note.md");
  });
});
```

```bash
npx wdio run wdio.conf.mts
```

Full setup: [docs/setup-guide.md](docs/setup-guide.md)

## Architecture

```
wdio-obsidian-service (npm)          ← downloads Obsidian, creates vault, installs plugin
        ↓
obsidian-e2e-visual-test-kit (this)  ← navigates, screenshots, DOM assertions
        ↓
your plugin (specs)                  ← scenarios, data injection, selectors
```

## API

### Navigation

| Helper | What it does |
|--------|-------------|
| `openFile(path)` | Opens file in active leaf (2s pause for render) |
| `openSidebar('left'\|'right')` | Opens sidebar |
| `switchSidebarTab(viewType)` | Switches sidebar tab |
| `executeCommand(id)` | Executes Obsidian command |
| `focusEditor()` | Focuses CM6 editor |
| `scrollTo(selector)` | Scrolls element into view |
| `waitForElement(selector)` | Waits for element to appear |
| `waitForPlugin(pluginId)` | Waits for plugin to load |
| `hoverElement(selector)` | Hovers with pause for tooltip |
| `getActiveFile()` | Returns active file path |
| `resetVault()` | Resets vault to clean state |

### Visual assertions

```typescript
await checkComponent('.panel', 'baseline-tag');  // compare with baseline
await checkViewport('full-page');                  // full viewport
await saveComponent('.panel', 'save-tag');         // save without comparing
```

### DOM assertions

```typescript
await assertDomState('.element', {
  visible: true,
  childCount: { min: 1, max: 5 },
  classList: { contains: ['active'] },
  innerHTML: { contains: ['Expected'] },
  dataAttributes: { 'data-position': 'above-title' },
});

const snapshots = await captureDomState('[data-key]');
// → [{ tagName, attributes, innerHTML, boundingRect, childCount, ... }]
```

## Documentation

| Doc | Audience | Content |
|-----|----------|---------|
| [Setup Guide](docs/setup-guide.md) | Developers | Step-by-step integration (8 steps) |
| [Gotchas](docs/gotchas.md) | Everyone | 10 lessons learned + CI template |
| [Coverage Guide](docs/coverage-guide.md) | Developers & LLMs | How to convert unit test gaps into e2e specs |
| [Case Study: Qualia Coding](docs/case-studies/qualia-coding.md) | Reference | 28k LOC plugin, 18 specs, 65 tests |
| [Case Study: Mirror Notes](docs/case-studies/mirror-notes.md) | Reference | DOM injection plugin |

## Limitations

- Node 18+ (20+ recommended)
- First run: ~2min (Obsidian download ~200MB, cached after)
- Screenshots are resolution-dependent — same machine for baseline and comparison
- `browser.execute()` is synchronous — no async/await inside
- iOS not supported
- `maxInstances: 1` (Obsidian is a desktop app)
- Use `--legacy-peer-deps` on install (wdio peer dep conflicts)
