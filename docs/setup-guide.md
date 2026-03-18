# Setup Guide

Step-by-step guide to integrate obsidian-e2e-visual-test-kit into your Obsidian plugin.

## 1. Install dependencies

```bash
npm install --save-dev --legacy-peer-deps \
  obsidian-e2e-visual-test-kit@github:mrlnlms/obsidian-e2e-visual-test-kit \
  wdio-obsidian-service @wdio/visual-service \
  @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter \
  wdio-obsidian-reporter @types/mocha
```

**IMPORTANT:** Always use `--legacy-peer-deps` — wdio packages have peer dep conflicts with each other.

## 2. Create wdio.conf.mts

```typescript
import { createConfig } from "obsidian-e2e-visual-test-kit";

export const config = createConfig({
  pluginId: "my-plugin",           // ID from manifest.json
  pluginDir: ".",
  vault: "test/e2e/vaults/visual",
  specs: ["test/e2e/specs/**/*.e2e.ts"],
});
```

## 3. Create test vault

```bash
mkdir -p test/e2e/vaults/visual/.obsidian test/e2e/specs test/e2e/helpers
```

```json
// test/e2e/vaults/visual/.obsidian/app.json
{ "showInlineTitle": true }
```

```json
// test/e2e/vaults/visual/.obsidian/community-plugins.json
["my-plugin"]
```

Add notes/fixtures your plugin needs to render.

## 4. Create injection helper (plugin-specific)

Each plugin has its own way to inject data:

```typescript
// test/e2e/helpers/my-plugin.ts
import { waitForPlugin } from "obsidian-e2e-visual-test-kit";

export async function injectData(data: Record<string, unknown>) {
  await waitForPlugin("my-plugin");
  await browser.execute((d: Record<string, unknown>) => {
    const plugin = (window as any).app.plugins.plugins["my-plugin"];
    plugin.saveData({ ...plugin.settings, ...d });
    // Call refresh/reload if the plugin has one
  }, data);
  await browser.pause(2000);
}

export const SELECTORS = {
  // Map your plugin's CSS selectors here
} as const;
```

## 5. Create smoke test first (ALWAYS start here)

```typescript
// test/e2e/specs/smoke.e2e.ts
import { openFile, waitForPlugin, getActiveFile } from "obsidian-e2e-visual-test-kit";

describe("smoke test", () => {
  it("plugin loads", async () => {
    await waitForPlugin("my-plugin", 30000);
    const loaded = await browser.execute(() => {
      return !!(window as any).app.plugins.plugins["my-plugin"];
    });
    expect(loaded).toBe(true);
  });

  it("opens a file", async () => {
    await openFile("Sample Note.md");
    expect(await getActiveFile()).toBe("Sample Note.md");
  });
});
```

## 6. Add scripts to package.json

```json
{
  "test:e2e": "wdio run wdio.conf.mts",
  "test:visual:update": "npx wdio run wdio.conf.mts -- --update-visual-baseline"
}
```

## 7. Run

```bash
# First run downloads Obsidian (~200MB, cached in .obsidian-cache/)
npm run test:e2e -- --spec test/e2e/specs/smoke.e2e.ts
```

Once smoke passes, add more specs following the template.

## 8. Add to .gitignore

```
.obsidian-cache/
test/screenshots/actual/
test/screenshots/diff/
```

Baselines (`test/screenshots/baseline/`) should be committed — they are the visual reference.

## How it works under the hood

1. `wdio-obsidian-service` downloads Obsidian (cached in `.obsidian-cache/`)
2. Creates a sandbox vault by copying your `test/e2e/vaults/visual/`
3. Installs your plugin (copies `main.js`, `manifest.json`, `styles.css`)
4. Opens Obsidian as an Electron app
5. Your specs run via WebdriverIO — each `browser.execute()` runs JS inside Obsidian
6. Screenshots are compared pixel-by-pixel via `@wdio/visual-service`
7. Obsidian closes when tests finish
