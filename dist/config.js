import * as path from "node:path";
export function createConfig(opts) {
    const screenshotDir = opts.screenshotDir ?? "test/screenshots";
    const timeout = opts.timeout ?? 60000;
    const base = {
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
        const overrides = opts.overrides;
        return {
            ...base,
            ...overrides,
            capabilities: overrides.capabilities ?? base.capabilities,
            services: overrides.services ?? base.services,
            mochaOpts: { ...base.mochaOpts, ...overrides.mochaOpts },
        };
    }
    return base;
}
