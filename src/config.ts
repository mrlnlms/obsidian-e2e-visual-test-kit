import * as path from "node:path";
import type { E2EConfigOptions } from "./types.js";

/** WebdriverIO config object — typed loosely to accommodate obsidian service extensions */
export type WdioConfig = Record<string, unknown>;

export function createConfig(opts: E2EConfigOptions): WdioConfig {
  const screenshotDir = opts.screenshotDir ?? "test/screenshots";
  const timeout = opts.timeout ?? 60000;

  const base: WdioConfig = {
    runner: "local",
    framework: "mocha",
    specs: opts.specs,
    maxInstances: 1,
    capabilities: [
      {
        browserName: "obsidian",
        browserVersion: opts.obsidianVersion ?? "latest",
        "wdio:obsidianOptions": {
          installerVersion: "earliest",
          plugins: [opts.pluginDir],
          vault: opts.vault,
        },
      },
    ],
    services: [
      "obsidian",
      [
        "visual",
        {
          baselineFolder: path.join(process.cwd(), screenshotDir, "baseline"),
          screenshotPath: path.join(process.cwd(), screenshotDir),
          autoSaveBaseline: true,
          ...opts.visualServiceOptions,
        },
      ],
    ],
    reporters: ["obsidian"],
    cacheDir: path.resolve(".obsidian-cache"),
    mochaOpts: {
      ui: "bdd",
      timeout,
    },
    logLevel: "warn",
  };

  if (opts.overrides) {
    const overrides = opts.overrides as WdioConfig;
    return {
      ...base,
      ...overrides,
      capabilities: overrides.capabilities ?? base.capabilities,
      services: overrides.services ?? base.services,
      mochaOpts: { ...(base.mochaOpts as object), ...(overrides.mochaOpts as object) },
    };
  }

  return base;
}
