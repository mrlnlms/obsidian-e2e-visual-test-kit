# Coverage Guide — Turning Unit Test Gaps into E2E Specs

For developers and LLMs converting untested UI modules into e2e visual tests.

## The problem

Obsidian plugins typically have two types of code:

- **Pure logic** (models, engines, helpers) — testable with Vitest + jsdom
- **UI/DOM** (views, renderers, CM6 extensions, canvas) — **only testable with this kit**

When unit test coverage hits the ceiling (~80%), the remaining modules are UI. This kit exists to cover that gap.

## How to identify gaps

Run a coverage analysis on unit tests. Modules that have NO tests and import from `obsidian`, `@codemirror`, `fabric`, `ag-grid-community`, `chart.js`, or `wavesurfer` are e2e candidates.

Example from Qualia Coding — 82 UI modules without unit coverage:

| Category | Examples | What to test via e2e |
|----------|---------|---------------------|
| CM6 extensions | marginPanelExtension, markerViewPlugin | Screenshot of panel, hover state, drag handles |
| Analytics modes | frequencyMode, dendrogramMode (19 modes) | Screenshot of rendered chart, config controls |
| PDF rendering | highlightRenderer, drawInteraction | Screenshot of highlights |
| Fabric.js canvas | boardCanvas, regionDrawing | Screenshot of board, node interaction |
| Obsidian Views | analyticsView, boardView, csvCodingView | Open view, verify DOM, screenshot |
| Menus/Modals | codingPopover, codeBrowserModal | Open modal, verify content |

## How to convert a gap into an e2e spec

For each untested UI module, follow this pattern:

**1. Identify what it renders** — which DOM element? Which CSS selector?

**2. Identify the required state** — what data must exist for this module to render? (markers, settings, frontmatter)

**3. Write the spec following this template:**

```typescript
import { openFile, focusEditor, waitForElement, checkComponent, assertDomState } from 'obsidian-e2e-visual-test-kit';
import { injectData, SELECTORS } from '../helpers/my-plugin.js';

describe('component name', () => {
  before(async () => {
    // 1. Inject required data
    await injectData({ /* markers, settings, etc */ });

    // 2. Navigate to the component
    await openFile('fixture.md');      // or executeCommand(), switchSidebarTab(), etc.
    await focusEditor();

    // 3. Wait for the component to render
    await waitForElement(SELECTORS.myComponent, 10000);
  });

  // 4. Validate DOM structure
  it('renders correctly', async () => {
    await assertDomState(SELECTORS.myComponent, {
      visible: true,
      childCount: { min: 1 },
      classList: { contains: ['expected-class'] },
    });
  });

  // 5. Screenshot baseline
  it('visual baseline', async () => {
    const mismatch = await checkComponent(SELECTORS.myComponent, 'descriptive-tag');
    expect(mismatch).toBeLessThan(1);
  });

  // 6. Test interaction (if applicable)
  it('hover/click state', async () => {
    await hoverElement(SELECTORS.interactiveElement);
    const mismatch = await checkComponent(SELECTORS.myComponent, 'tag-hover');
    expect(mismatch).toBeLessThan(2);
  });
});
```

## Rules for e2e specs

- **1 spec per visual component** — don't mix margin panel with analytics
- **Minimal data** — inject only what's needed to render (2-3 markers, not 100)
- **Granular screenshots** — capture the component, not the entire screen
- **1-2% tolerance** — anti-aliasing and subpixel rendering vary
- **Pause after navigation** — helpers include pauses, but add more if the component is async
- **Descriptive tag** — `margin-2markers-hover`, not `test1`
- **`before()` for setup** — data injection and navigation go in before, not in each it()

## Navigation map by component type

| Component | How to reach it |
|-----------|----------------|
| Editor (highlights, margin panel) | `openFile()` + `focusEditor()` |
| Sidebar view | `openSidebar('right')` + `switchSidebarTab('view-type')` |
| Modal | `executeCommand('plugin:open-modal')` |
| Settings tab | `executeCommand('app:open-settings')` + navigate to tab |
| Analytics view | `executeCommand('plugin:open-analytics')` |
| PDF view | `openFile('document.pdf')` |
| CSV view | `openFile('data.csv')` |
| Context menu | `hoverElement('.element')` + click |

## Generic pattern for any plugin

Regardless of plugin type, the e2e flow answers 3 questions:

1. **What state must exist?**
   - Coding plugin → markers, code definitions
   - Injection plugin → settings, templates, frontmatter
   - Dashboard plugin → data sources, config
   - Any plugin → `injectData()` in your helper

2. **How do I reach the component?**
   - Editor → `openFile()` + `focusEditor()`
   - Sidebar → `openSidebar()` + `switchSidebarTab()`
   - Modal → `executeCommand()`
   - Custom view → `executeCommand()` that opens the view

3. **What do I validate?**
   - Exists and visible → `assertDomState({ visible: true })`
   - Has correct content → `assertDomState({ innerHTML: { contains: [...] } })`
   - Has correct attributes → `assertDomState({ dataAttributes: { ... } })`
   - Looks correct visually → `checkComponent(selector, tag)`
   - Interaction works → `hoverElement()` / click + re-assert

If you can answer these 3 questions for the module you want to test, the spec writes itself from the template.
