// ─── Visual (screenshot comparison) ──────────────────────────
/**
 * Compare a specific element against its baseline screenshot.
 * Wraps browser.checkElement() from @wdio/visual-service.
 * Returns mismatch percentage (0 = identical).
 */
export async function checkComponent(selector, tag, options) {
    const el = await browser.$(selector);
    await el.waitForExist({ timeout: 5000 });
    return browser.checkElement(el, tag, {
        misMatchPercentage: options?.misMatchPercentage ?? 0.5,
    });
}
/**
 * Compare full viewport against baseline.
 * Wraps browser.checkScreen() from @wdio/visual-service.
 */
export async function checkViewport(tag) {
    return browser.checkScreen(tag);
}
/**
 * Save element screenshot without comparison (for creating baselines).
 * Wraps browser.saveElement() from @wdio/visual-service.
 */
export async function saveComponent(selector, tag) {
    const el = await browser.$(selector);
    await el.waitForExist({ timeout: 5000 });
    await browser.saveElement(el, tag);
}
// ─── DOM state validation ────────────────────────────────────
/** Read DOM state of an element synchronously via browser.execute. */
async function readDomState(selector) {
    return browser.execute((sel) => {
        const el = document.querySelector(sel);
        if (!el)
            return null;
        const htmlEl = el;
        const rect = htmlEl.getBoundingClientRect();
        return {
            visible: htmlEl.offsetParent !== null || htmlEl.style.display !== "none",
            childCount: el.children.length,
            classList: Array.from(el.classList),
            innerHTML: el.innerHTML,
            tagName: el.tagName.toLowerCase(),
            isConnected: el.isConnected,
            boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            attributes: Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value])),
            dataAttributes: Object.fromEntries(Array.from(el.attributes)
                .filter((a) => a.name.startsWith("data-"))
                .map((a) => [a.name, a.value])),
        };
    }, selector);
}
/** Assert attributes and structure of a DOM element. */
export async function assertDomState(selector, expected) {
    const state = await readDomState(selector);
    if (!state) {
        throw new Error(`assertDomState: element not found: ${selector}`);
    }
    if (expected.visible !== undefined && state.visible !== expected.visible) {
        throw new Error(`assertDomState: expected visible=${expected.visible}, got ${state.visible}`);
    }
    if (expected.childCount) {
        const { min, max, exact } = expected.childCount;
        if (exact !== undefined && state.childCount !== exact) {
            throw new Error(`assertDomState: expected childCount=${exact}, got ${state.childCount}`);
        }
        if (min !== undefined && state.childCount < min) {
            throw new Error(`assertDomState: expected childCount>=${min}, got ${state.childCount}`);
        }
        if (max !== undefined && state.childCount > max) {
            throw new Error(`assertDomState: expected childCount<=${max}, got ${state.childCount}`);
        }
    }
    if (expected.classList) {
        for (const cls of expected.classList.contains ?? []) {
            if (!state.classList.includes(cls)) {
                throw new Error(`assertDomState: expected classList to contain '${cls}', got [${state.classList.join(", ")}]`);
            }
        }
        for (const cls of expected.classList.notContains ?? []) {
            if (state.classList.includes(cls)) {
                throw new Error(`assertDomState: expected classList NOT to contain '${cls}'`);
            }
        }
    }
    if (expected.innerHTML) {
        for (const str of expected.innerHTML.contains ?? []) {
            if (!state.innerHTML.includes(str)) {
                throw new Error(`assertDomState: expected innerHTML to contain '${str}'`);
            }
        }
        for (const str of expected.innerHTML.notContains ?? []) {
            if (state.innerHTML.includes(str)) {
                throw new Error(`assertDomState: expected innerHTML NOT to contain '${str}'`);
            }
        }
    }
    if (expected.dataAttributes) {
        for (const [attr, expectedVal] of Object.entries(expected.dataAttributes)) {
            const actual = state.dataAttributes[attr];
            if (actual === undefined) {
                throw new Error(`assertDomState: expected data attribute '${attr}' not found`);
            }
            if (typeof expectedVal === "string") {
                if (actual !== expectedVal) {
                    throw new Error(`assertDomState: expected ${attr}='${expectedVal}', got '${actual}'`);
                }
            }
            else if (expectedVal.contains && !actual.includes(expectedVal.contains)) {
                throw new Error(`assertDomState: expected ${attr} to contain '${expectedVal.contains}', got '${actual}'`);
            }
        }
    }
}
/** Assert innerHTML contents of an element. */
export async function assertInnerHTML(selector, expected) {
    await assertDomState(selector, { innerHTML: expected });
}
/** Capture full DOM state of all matching elements. */
export async function captureDomState(selector) {
    return browser.execute((sel) => {
        const elements = document.querySelectorAll(sel);
        return Array.from(elements).map((el) => {
            const htmlEl = el;
            const rect = htmlEl.getBoundingClientRect();
            return {
                selector: sel,
                tagName: el.tagName.toLowerCase(),
                attributes: Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value])),
                classList: Array.from(el.classList),
                innerHTML: el.innerHTML,
                isConnected: el.isConnected,
                boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                childCount: el.children.length,
            };
        });
    }, selector);
}
