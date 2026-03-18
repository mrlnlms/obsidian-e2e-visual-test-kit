export interface E2EConfigOptions {
    /** Plugin ID as registered in Obsidian (e.g. 'qualia-coding') */
    pluginId: string;
    /** Path to plugin root directory (has manifest.json). Usually '.' */
    pluginDir: string;
    /** Path to test vault directory */
    vault: string;
    /** Glob patterns for spec files */
    specs: string[];
    /** Obsidian version to test against. Default: 'latest' */
    obsidianVersion?: string;
    /** Directory for screenshots. Default: 'test/screenshots' */
    screenshotDir?: string;
    /** Mocha timeout in ms. Default: 60000 */
    timeout?: number;
    /** Extra options passed to @wdio/visual-service */
    visualServiceOptions?: Record<string, unknown>;
    /** Extra wdio config overrides (merged last) */
    overrides?: Record<string, unknown>;
}
export interface DomExpectation {
    /** Element is visible (offsetParent !== null) */
    visible?: boolean;
    /** Child element count */
    childCount?: {
        min?: number;
        max?: number;
        exact?: number;
    };
    /** CSS class assertions */
    classList?: {
        contains?: string[];
        notContains?: string[];
    };
    /** innerHTML content assertions */
    innerHTML?: {
        contains?: string[];
        notContains?: string[];
    };
    /** data-* attribute assertions. String = exact match, object = partial match */
    dataAttributes?: Record<string, string | {
        contains: string;
    }>;
}
export interface DomSnapshot {
    selector: string;
    tagName: string;
    attributes: Record<string, string>;
    classList: string[];
    innerHTML: string;
    isConnected: boolean;
    boundingRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    childCount: number;
}
//# sourceMappingURL=types.d.ts.map