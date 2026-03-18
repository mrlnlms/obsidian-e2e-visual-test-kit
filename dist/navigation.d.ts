/** Open a file in the active leaf. Pauses for rendering. */
export declare function openFile(filePath: string, pauseMs?: number): Promise<void>;
/** Open left or right sidebar. Pauses for animation. */
export declare function openSidebar(side: "left" | "right"): Promise<void>;
/** Switch to a specific sidebar tab by view type. Pauses for rendering. */
export declare function switchSidebarTab(viewType: string): Promise<void>;
/** Execute an Obsidian command by ID. Uses wdio-obsidian-service's built-in command. */
export declare function executeCommand(commandId: string): Promise<void>;
/** Focus the CM6 editor in the active leaf. */
export declare function focusEditor(): Promise<void>;
/** Scroll the active view to bring an element into view. */
export declare function scrollTo(selector: string): Promise<void>;
/** Wait for a DOM element to appear. Uses wdio waitForExist. */
export declare function waitForElement(selector: string, timeout?: number): Promise<void>;
/** Wait for a plugin to be loaded and enabled. */
export declare function waitForPlugin(pluginId: string, timeout?: number): Promise<void>;
/** Hover over an element with pause for tooltip/animation. */
export declare function hoverElement(selector: string, pauseMs?: number): Promise<void>;
/** Get the path of the currently active file. No pause. */
export declare function getActiveFile(): Promise<string | null>;
/** Reset vault to clean state. Uses wdio-obsidian-service's reloadObsidian. */
export declare function resetVault(vaultPath?: string): Promise<void>;
//# sourceMappingURL=navigation.d.ts.map