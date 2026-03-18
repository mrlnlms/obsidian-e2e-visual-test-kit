const DEFAULT_PAUSE = 2000;
/** Open a file in the active leaf. Pauses for rendering. */
export async function openFile(filePath, pauseMs) {
    await browser.execute((p) => {
        const file = window.app.vault.getAbstractFileByPath(p);
        if (file)
            window.app.workspace.getLeaf(false).openFile(file);
    }, filePath);
    await browser.pause(pauseMs ?? DEFAULT_PAUSE);
}
/** Open left or right sidebar. Pauses for animation. */
export async function openSidebar(side) {
    await browser.execute((s) => {
        const ws = window.app.workspace;
        if (s === "left") {
            ws.leftSplit?.expand();
        }
        else {
            ws.rightSplit?.expand();
        }
    }, side);
    await browser.pause(1000);
}
/** Switch to a specific sidebar tab by view type. Pauses for rendering. */
export async function switchSidebarTab(viewType) {
    await browser.execute((vt) => {
        const ws = window.app.workspace;
        const leaf = ws.getLeavesOfType(vt)[0];
        if (leaf)
            ws.revealLeaf(leaf);
    }, viewType);
    await browser.pause(1000);
}
/** Execute an Obsidian command by ID. Uses wdio-obsidian-service's built-in command. */
export async function executeCommand(commandId) {
    await browser.executeObsidianCommand(commandId);
    await browser.pause(1000);
}
/** Focus the CM6 editor in the active leaf. */
export async function focusEditor() {
    const content = await browser.$(".workspace-leaf.mod-active .cm-content");
    if (await content.isExisting()) {
        await content.click();
        await browser.pause(500);
    }
}
/** Scroll the active view to bring an element into view. */
export async function scrollTo(selector) {
    const el = await browser.$(selector);
    if (await el.isExisting()) {
        await el.scrollIntoView();
        await browser.pause(500);
    }
}
/** Wait for a DOM element to appear. Uses wdio waitForExist. */
export async function waitForElement(selector, timeout) {
    const el = await browser.$(selector);
    await el.waitForExist({ timeout: timeout ?? 10000 });
}
/** Wait for a plugin to be loaded and enabled. */
export async function waitForPlugin(pluginId, timeout) {
    await browser.waitUntil(async () => {
        return browser.execute((id) => {
            return !!window.app?.plugins?.plugins?.[id];
        }, pluginId);
    }, {
        timeout: timeout ?? 15000,
        timeoutMsg: `Plugin '${pluginId}' not loaded within timeout`,
    });
}
/** Hover over an element with pause for tooltip/animation. */
export async function hoverElement(selector, pauseMs) {
    const el = await browser.$(selector);
    if (await el.isExisting()) {
        await el.moveTo();
        await browser.pause(pauseMs ?? 800);
    }
}
/** Get the path of the currently active file. No pause. */
export async function getActiveFile() {
    return browser.execute(() => {
        return window.app?.workspace?.getActiveFile()?.path ?? null;
    });
}
/** Reset vault to clean state. Uses wdio-obsidian-service's reloadObsidian. */
export async function resetVault(vaultPath) {
    await browser.reloadObsidian(vaultPath ? { vault: vaultPath } : undefined);
    await browser.pause(3000);
}
