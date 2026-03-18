import type { DomExpectation, DomSnapshot } from "./types.js";
/**
 * Compare a specific element against its baseline screenshot.
 * Wraps browser.checkElement() from @wdio/visual-service.
 * Returns mismatch percentage (0 = identical).
 */
export declare function checkComponent(selector: string, tag: string, options?: {
    misMatchPercentage?: number;
}): Promise<number>;
/**
 * Compare full viewport against baseline.
 * Wraps browser.checkScreen() from @wdio/visual-service.
 */
export declare function checkViewport(tag: string): Promise<number>;
/**
 * Save element screenshot without comparison (for creating baselines).
 * Wraps browser.saveElement() from @wdio/visual-service.
 */
export declare function saveComponent(selector: string, tag: string): Promise<void>;
/** Assert attributes and structure of a DOM element. */
export declare function assertDomState(selector: string, expected: DomExpectation): Promise<void>;
/** Assert innerHTML contents of an element. */
export declare function assertInnerHTML(selector: string, expected: {
    contains?: string[];
    notContains?: string[];
}): Promise<void>;
/** Capture full DOM state of all matching elements. */
export declare function captureDomState(selector: string): Promise<DomSnapshot[]>;
//# sourceMappingURL=assertions.d.ts.map