# Case Study: Qualia Coding

Qualitative data analysis plugin for Obsidian (28k LOC, 150 modules). Codes text, PDF, images, CSV, audio, and video.

## The problem

Had 1,269 unit tests (Vitest + jsdom) covering ~80% of testable code, but 82 UI modules had zero coverage — jsdom can't render CM6, Chart.js, or Fabric.js.

## Results with obsidian-e2e-visual-test-kit

| Metric | Before | After |
|--------|--------|-------|
| Unit tests (Vitest) | 1,269 | 1,503 |
| E2E tests (wdio) | 0 | 65 |
| **Total** | **1,269** | **1,568** |
| E2E specs | 0 | 18 |
| Screenshot baselines | 0 | ~20 |
| UI components covered | 0 | All 6 engines + analytics + sidebar + modals + settings |

## Specs created

| Spec | Tests | What it validates |
|------|-------|-------------------|
| smoke | 3 | Plugin loads, file opens, editor visible |
| margin-panel | 4 | Bars render, CSS classes, screenshot baseline, hover |
| highlights | 4 | CM6 decorations, nested markers, screenshot |
| handle-overlay | 3 | Container exists, SVGs on hover, screenshot |
| hover-interaction | 3 | Hover sync editor↔margin, clear on leave |
| code-explorer | 4 | Sidebar renders, tree items, code names, screenshot |
| analytics-frequency | 3 | View renders, toolbar, chart screenshot |
| analytics-dashboard | 3 | KPI cards, marker count, screenshot |
| csv-grid | 4 | ag-grid headers, rows, screenshot |
| board-view | 3 | Fabric.js canvas, toolbar, screenshot |
| pdf-view | 3 | PDF pages, canvas, screenshot |
| image-view | 3 | Image canvas, screenshot |
| audio-view | 3 | WaveSurfer waveform, screenshot |
| video-view | 3 | Video player, timeline, screenshot |
| settings-tab | 3 | Setting items, color picker, toggles |
| code-form-modal | 8 | Title, inputs, buttons, screenshot |
| code-browser-modal | 5 | Code list, search, swatches, screenshot |
| column-toggle-modal | 3 | Opens via gear icon, settings, screenshot |

## Execution time

- **First run:** ~2min (Obsidian download ~200MB)
- **Subsequent runs:** ~3min (18 specs sequential, Obsidian opens/closes per spec)
- **6 specs written in parallel** by subagents in ~3min

## Plugin structure

```
qualia-coding/
  wdio.conf.mts                           ← 8 lines
  test/e2e/
    helpers/qualia.ts                      ← injectQualiaData + mkMarker + SELECTORS
    vaults/visual/
      .obsidian/app.json
      .obsidian/community-plugins.json
      Sample Coded.md                      ← markdown fixture
      Sample Data.csv                      ← CSV fixture
      Sample.pdf                           ← PDF fixture
      Sample.png                           ← image fixture
      Sample.mp3                           ← audio fixture
      Sample.mp4                           ← video fixture
    specs/
      smoke.e2e.ts
      margin-panel.e2e.ts
      highlights.e2e.ts
      handle-overlay.e2e.ts
      hover-interaction.e2e.ts
      code-explorer.e2e.ts
      analytics-frequency.e2e.ts
      analytics-dashboard.e2e.ts
      csv-grid.e2e.ts
      board-view.e2e.ts
      pdf-view.e2e.ts
      image-view.e2e.ts
      audio-view.e2e.ts
      video-view.e2e.ts
      settings-tab.e2e.ts
      code-form-modal.e2e.ts
      code-browser-modal.e2e.ts
      column-toggle-modal.e2e.ts
  test/screenshots/
    baseline/                              ← ~20 visual reference screenshots
```

## Key decisions

- **Smoke test first** — always start with "plugin loads, file opens" before adding visual specs
- **1 spec per component** — each engine/view/modal gets its own spec file
- **Parallel spec writing** — 6 subagents wrote specs simultaneously, each independent
- **CI runs smoke only** — screenshot baselines are machine-dependent (macOS vs Linux rendering differs), so visual comparison stays local
- **Media fixtures from demo vault** — copied existing PDF, PNG, MP3, MP4 from the plugin's demo vault
