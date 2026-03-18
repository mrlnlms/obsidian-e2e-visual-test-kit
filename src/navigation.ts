const DEFAULT_PAUSE = 2000;

/** Open a file in the active leaf. Pauses for rendering. */
export async function openFile(filePath: string, pauseMs?: number): Promise<void> {
  await browser.execute((p: string) => {
    const file = (window as any).app.vault.getAbstractFileByPath(p);
    if (file) (window as any).app.workspace.getLeaf(false).openFile(file);
  }, filePath);
  await browser.pause(pauseMs ?? DEFAULT_PAUSE);
}

/** Open left or right sidebar. Pauses for animation. */
export async function openSidebar(side: "left" | "right"): Promise<void> {
  await browser.execute((s: string) => {
    const ws = (window as any).app.workspace;
    if (s === "left") {
      ws.leftSplit?.expand();
    } else {
      ws.rightSplit?.expand();
    }
  }, side);
  await browser.pause(1000);
}

/** Switch to a specific sidebar tab by view type. Pauses for rendering. */
export async function switchSidebarTab(viewType: string): Promise<void> {
  await browser.execute((vt: string) => {
    const ws = (window as any).app.workspace;
    const leaf = ws.getLeavesOfType(vt)[0];
    if (leaf) ws.revealLeaf(leaf);
  }, viewType);
  await browser.pause(1000);
}

/** Execute an Obsidian command by ID. Uses wdio-obsidian-service's built-in command. */
export async function executeCommand(commandId: string): Promise<void> {
  await browser.executeObsidianCommand(commandId);
  await browser.pause(1000);
}

/** Focus the CM6 editor in the active leaf. */
export async function focusEditor(): Promise<void> {
  const content = await browser.$(".workspace-leaf.mod-active .cm-content");
  if (await content.isExisting()) {
    await content.click();
    await browser.pause(500);
  }
}

/** Scroll the active view to bring an element into view. */
export async function scrollTo(selector: string): Promise<void> {
  const el = await browser.$(selector);
  if (await el.isExisting()) {
    await el.scrollIntoView();
    await browser.pause(500);
  }
}

/** Wait for a DOM element to appear. Uses wdio waitForExist. */
export async function waitForElement(selector: string, timeout?: number): Promise<void> {
  const el = await browser.$(selector);
  await el.waitForExist({ timeout: timeout ?? 10000 });
}

/** Wait for a plugin to be loaded and enabled. */
export async function waitForPlugin(pluginId: string, timeout?: number): Promise<void> {
  await browser.waitUntil(
    async () => {
      return browser.execute((id: string) => {
        return !!(window as any).app?.plugins?.plugins?.[id];
      }, pluginId);
    },
    {
      timeout: timeout ?? 15000,
      timeoutMsg: `Plugin '${pluginId}' not loaded within timeout`,
    },
  );
}

/** Hover over an element with pause for tooltip/animation. */
export async function hoverElement(selector: string, pauseMs?: number): Promise<void> {
  const el = await browser.$(selector);
  if (await el.isExisting()) {
    await el.moveTo();
    await browser.pause(pauseMs ?? 800);
  }
}

/** Get the path of the currently active file. No pause. */
export async function getActiveFile(): Promise<string | null> {
  return browser.execute(() => {
    return (window as any).app?.workspace?.getActiveFile()?.path ?? null;
  });
}

/** Reset vault to clean state. Uses wdio-obsidian-service's reloadObsidian. */
export async function resetVault(vaultPath?: string): Promise<void> {
  await (browser as any).reloadObsidian(vaultPath ? { vault: vaultPath } : undefined);
  await browser.pause(3000);
}
