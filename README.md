# obsidian-e2e-visual-test-kit

Harness reutilizavel para testes visuais e de DOM em plugins Obsidian. Abre o Obsidian real, navega como uma pessoa, tira screenshots, e valida o estado do DOM.

## Resultados

Primeiro plugin integrado: **Qualia Coding** (QDA plugin, 28k LOC)

```
» smoke.e2e.ts
   ✓ Obsidian loads and plugin is available
   ✓ can open a file
   ✓ editor is visible

» margin-panel.e2e.ts
   ✓ renders margin bars for coded segments
   ✓ margin bars have correct CSS classes
   ✓ visual baseline — margin panel with 2 markers
   ✓ hover highlights bar

7 passing — Obsidian v1.12.4 (installer v1.5.8, macOS)
Spec Files: 2 passed, 2 total in 00:00:17
```

Complementa 1263 testes unitarios (Vitest + jsdom) que cobrem logica pura. Este harness cobre o que jsdom nao alcanca: rendering visual, CM6 decorations, interacoes de hover/drag, e visual regression via screenshots.

## O que faz

Voce escreve specs simples no seu plugin, e o harness cuida do resto:

```typescript
import { openFile, waitForElement, checkComponent, assertDomState } from 'obsidian-e2e-visual-test-kit';

describe('margin panel', () => {
  it('renders coded segments', async () => {
    await openFile('Sample Coded.md');
    await waitForElement('.codemarker-margin-panel');

    // Valida estrutura do DOM
    await assertDomState('.codemarker-margin-panel', {
      visible: true,
      childCount: { min: 2 },
    });

    // Screenshot comparison (baseline vs atual)
    await checkComponent('.codemarker-margin-panel', 'margin-2markers');
  });
});
```

## Arquitetura

3 camadas, cada uma com responsabilidade clara:

```
wdio-obsidian-service (npm)     ← baixa Obsidian, cria vault, instala plugin
        ↓
obsidian-e2e-visual-test-kit (este repo) ← navega, tira print, valida DOM
        ↓
seu plugin (specs)              ← cenarios especificos, dados de teste
```

### Config Layer — `createConfig()`

Gera um `wdio.conf` completo com 4 linhas:

```typescript
// seu-plugin/wdio.conf.mts
import { createConfig } from 'obsidian-e2e-visual-test-kit';

export const config = createConfig({
  pluginId: 'qualia-coding',
  pluginDir: '.',
  vault: 'test/e2e/vaults/visual',
  specs: ['test/e2e/specs/**/*.e2e.ts'],
});
```

Isso configura: Obsidian download, vault sandbox, plugin install, screenshot comparison, timeouts.

### Navigation Layer — interagir com o Obsidian

| Helper | O que faz |
|--------|-----------|
| `openFile(path)` | Abre arquivo no vault (pausa 2s pra render) |
| `openSidebar('left'\|'right')` | Abre sidebar |
| `switchSidebarTab(viewType)` | Troca aba da sidebar |
| `executeCommand(id)` | Executa command do Obsidian |
| `focusEditor()` | Foca no editor CM6 |
| `scrollTo(selector)` | Scroll ate elemento |
| `waitForElement(selector)` | Espera elemento aparecer |
| `waitForPlugin(pluginId)` | Espera plugin carregar |
| `hoverElement(selector)` | Hover com pausa pra tooltip |
| `getActiveFile()` | Retorna path do arquivo ativo |
| `resetVault()` | Reseta vault pro estado inicial |

### Assertion Layer — validar visual + DOM

**Screenshots:**
```typescript
await checkComponent('.my-panel', 'panel-baseline');  // compara com baseline
await checkViewport('full-page');                      // viewport inteiro
await saveComponent('.my-panel', 'panel-save');        // salva sem comparar
```

**DOM state:**
```typescript
await assertDomState('.my-element', {
  visible: true,
  childCount: { min: 1, max: 5 },
  classList: { contains: ['active'], notContains: ['hidden'] },
  innerHTML: { contains: ['Expected text'] },
  dataAttributes: { 'data-position': 'above-title' },
});

// Captura estado completo pra comparacao manual
const snapshots = await captureDomState('[data-mirror-key]');
// → [{ tagName, attributes, innerHTML, boundingRect, childCount, ... }]
```

## Como usar no seu plugin

### 1. Instalar

```bash
npm install --save-dev --legacy-peer-deps \
  obsidian-e2e-visual-test-kit@file:../../obsidian-e2e-visual-test-kit \
  wdio-obsidian-service @wdio/visual-service \
  @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter \
  wdio-obsidian-reporter @types/mocha
```

### 2. Criar wdio.conf.mts

```typescript
import { createConfig } from 'obsidian-e2e-visual-test-kit';

export const config = createConfig({
  pluginId: 'meu-plugin',
  pluginDir: '.',
  vault: 'test/e2e/vaults/visual',
  specs: ['test/e2e/specs/**/*.e2e.ts'],
});
```

### 3. Criar vault de teste

```
test/e2e/vaults/visual/
  .obsidian/
    app.json                      ← settings basicos
    community-plugins.json        ← ["meu-plugin"]
  Sample Note.md                  ← fixture com conteudo conhecido
```

### 4. Criar helper de injecao (plugin-specific)

Cada plugin tem sua propria forma de injetar dados. O pattern geral:

```typescript
// test/e2e/helpers/meu-plugin.ts
import { waitForPlugin } from 'obsidian-e2e-visual-test-kit';

export async function injectData(data: Record<string, unknown>) {
  await waitForPlugin('meu-plugin');
  await browser.execute((d: Record<string, unknown>) => {
    const plugin = (window as any).app.plugins.plugins['meu-plugin'];
    plugin.saveData({ ...plugin.settings, ...d });
  }, data);
  await browser.pause(2000);
}
```

### 5. Escrever specs

```typescript
// test/e2e/specs/smoke.e2e.ts
import { openFile, waitForPlugin, getActiveFile } from 'obsidian-e2e-visual-test-kit';

describe('smoke', () => {
  it('plugin loads', async () => {
    await waitForPlugin('meu-plugin');
  });

  it('opens a file', async () => {
    await openFile('Sample Note.md');
    expect(await getActiveFile()).toBe('Sample Note.md');
  });
});
```

### 6. Rodar

```bash
# Primeira vez — baixa Obsidian (~200MB, cached depois)
npx wdio run wdio.conf.mts

# Scripts recomendados no package.json:
"test:e2e": "wdio run wdio.conf.mts"
"test:visual:update": "npx wdio run wdio.conf.mts -- --update-visual-baseline"
```

## Como funciona por baixo

1. `wdio-obsidian-service` baixa o Obsidian (cached em `.obsidian-cache/`)
2. Cria um vault sandbox copiando seu `test/e2e/vaults/visual/`
3. Instala seu plugin (copia `main.js`, `manifest.json`, `styles.css`)
4. Abre o Obsidian como app Electron
5. Seus specs rodam via WebdriverIO — cada `browser.execute()` roda JS dentro do Obsidian
6. Screenshots sao comparados pixel-a-pixel via `@wdio/visual-service`
7. Obsidian fecha quando os testes terminam

## Cobrindo gaps de teste (guia pra LLMs)

Plugins Obsidian tipicamente tem dois tipos de codigo:

- **Logica pura** (models, engines, helpers) — testavel com Vitest + jsdom
- **UI/DOM** (views, renderers, CM6 extensions, canvas) — **so testavel com este harness**

Quando a cobertura de testes unitarios atinge o teto (~80%), os modulos restantes sao UI. Este harness existe pra cobrir esse gap.

### Como identificar os gaps

Rode uma analise de cobertura nos testes unitarios. Modulos que NAO tem testes e importam de `obsidian`, `@codemirror`, `fabric`, `ag-grid-community`, `chart.js`, ou `wavesurfer` sao candidatos a e2e.

Exemplo do Qualia Coding — 82 modulos UI sem cobertura unitaria:

| Categoria | Exemplos | O que testar via e2e |
|-----------|----------|---------------------|
| CM6 extensions | marginPanelExtension, markerViewPlugin, handleOverlayRenderer | Screenshot do painel, hover state, drag handles |
| Analytics modes | frequencyMode, cooccurrenceMode, dendrogramMode (19 modes) | Screenshot do chart renderizado, config controls |
| PDF rendering | highlightRenderer, drawInteraction, dragHandles | Screenshot dos highlights, arrastar handles |
| Fabric.js canvas | boardCanvas, boardDrawing, regionDrawing | Screenshot do board, interacao com nodes |
| Views Obsidian | analyticsView, boardView, csvCodingView, imageView | Abrir view, verificar DOM, screenshot |
| Menus/Modals | codingPopover, codeBrowserModal, settingTab | Abrir modal, verificar conteudo |

### Como converter um gap em spec e2e

Para cada modulo UI sem cobertura, siga este pattern:

**1. Identifique o que o modulo renderiza** — qual elemento DOM ele cria? Qual seletor CSS?

**2. Identifique o estado necessario** — que dados precisam existir pra esse modulo renderizar? (markers, code definitions, settings)

**3. Escreva o spec seguindo este template:**

```typescript
import { openFile, focusEditor, waitForElement, checkComponent, assertDomState } from 'obsidian-e2e-visual-test-kit';
import { injectData, SELECTORS } from '../helpers/meu-plugin.js';

describe('nome do componente', () => {
  before(async () => {
    // 1. Injetar dados necessarios
    await injectData({ /* markers, settings, etc */ });

    // 2. Navegar ate o componente
    await openFile('fixture.md');      // ou executeCommand(), switchSidebarTab(), etc.
    await focusEditor();

    // 3. Esperar o componente renderizar
    await waitForElement(SELECTORS.meuComponente, 10000);
  });

  // 4. Validar estrutura DOM
  it('renderiza corretamente', async () => {
    await assertDomState(SELECTORS.meuComponente, {
      visible: true,
      childCount: { min: 1 },
      classList: { contains: ['classe-esperada'] },
    });
  });

  // 5. Screenshot baseline
  it('visual baseline', async () => {
    const mismatch = await checkComponent(SELECTORS.meuComponente, 'tag-descritiva');
    expect(mismatch).toBeLessThan(1);
  });

  // 6. Testar interacao (se aplicavel)
  it('hover/click state', async () => {
    await hoverElement(SELECTORS.elementoInterativo);
    const mismatch = await checkComponent(SELECTORS.meuComponente, 'tag-hover');
    expect(mismatch).toBeLessThan(2);
  });
});
```

### Regras pra specs e2e

- **1 spec por componente visual** — nao misturar margin panel com analytics
- **Dados minimos** — injetar so o necessario pra renderizar (2-3 markers, nao 100)
- **Screenshots granulares** — capturar o componente, nao a tela inteira
- **Tolerancia de 1-2%** — anti-aliasing e subpixel rendering variam
- **Pausa apos navegacao** — os helpers ja incluem pausa, mas adicione mais se o componente e async
- **Tag descritiva** — `margin-2markers-hover`, nao `test1`
- **`before()` pra setup** — injecao de dados e navegacao ficam no before, nao em cada it()

### Mapeamento de navegacao por tipo de componente

| Componente | Como chegar |
|------------|-------------|
| Editor (highlights, margin panel) | `openFile()` + `focusEditor()` |
| Sidebar view | `openSidebar('right')` + `switchSidebarTab('view-type')` |
| Modal | `executeCommand('plugin:open-modal')` |
| Settings tab | `executeCommand('app:open-settings')` + navegar ate a aba |
| Analytics view | `executeCommand('plugin:open-analytics')` |
| PDF view | `openFile('document.pdf')` |
| CSV view | `openFile('data.csv')` |
| Context menu | `hoverElement('.element')` + click |

### Ordem recomendada pra cobrir gaps (Qualia Coding)

1. **Smoke test** — plugin carrega, arquivo abre (ja feito)
2. **Margin panel** — layout de colunas, labels, hover (ja feito)
3. **Highlights no editor** — markers visualmente corretos
4. **Sidebar views** — explorer e detail panel renderizam
5. **Analytics modes** — cada mode renderiza chart/tabela
6. **PDF/Image/CSV views** — cada engine renderiza corretamente
7. **Modais e menus** — interacoes de UI

### Exemplo: Mirror Notes (DOM injection plugin)

O Mirror Notes injeta containers HTML em posicoes especificas do editor (above-title, below-properties, etc.). O gap de teste e diferente — nao e visual rendering de charts, e **validacao de posicao DOM + conteudo renderizado**.

**O que muda em relacao ao Qualia:**

| Aspecto | Qualia Coding | Mirror Notes |
|---------|---------------|--------------|
| Estado a injetar | markers + codeDefinitions | settings + templates no frontmatter |
| O que renderiza | highlights, margin bars, charts | containers HTML em posicoes do editor |
| Como valida | screenshot dos componentes | `assertDomState` com `data-position`, `innerHTML` |
| Seletores chave | `.codemarker-margin-panel`, `.codemarker-highlight` | `[data-position="above-title"]`, `.mirror-dom-injection` |
| Interacao | hover, drag | multi-pane isolation, re-render on config change |

**Spec de exemplo pro Mirror Notes:**

```typescript
import { openFile, waitForElement, assertDomState, captureDomState, checkComponent } from 'obsidian-e2e-visual-test-kit';
import { injectMirrorConfig, SELECTORS } from '../helpers/mirror.js';

describe('injection positions', () => {
  before(async () => {
    await injectMirrorConfig({
      templates: {
        'above-title': '# Mirror: {{title}}',
        'below-properties': 'Tags: {{tags}}',
      },
    });
    await openFile('Test Note.md');
    await waitForElement(SELECTORS.injection, 10000);
  });

  it('above-title container is in correct position', async () => {
    await assertDomState(SELECTORS.aboveTitle, {
      visible: true,
      dataAttributes: { 'data-position': 'above-title' },
      innerHTML: { contains: ['Mirror:'] },
    });
  });

  it('below-properties container renders template', async () => {
    await assertDomState(SELECTORS.belowProperties, {
      visible: true,
      innerHTML: { contains: ['Tags:'] },
    });
  });

  it('visual baseline — all injection positions', async () => {
    await checkComponent('.markdown-preview-sizer', 'mirror-all-positions');
  });
});

describe('multi-pane isolation', () => {
  it('same file in two panes has independent containers', async () => {
    // Abrir segundo pane
    await browser.execute(() => {
      (window as any).app.workspace.getLeaf('split').openFile(
        (window as any).app.workspace.getActiveFile()
      );
    });
    await browser.pause(2000);

    // Capturar estado de todos os containers
    const snapshots = await captureDomState('[data-mirror-key]');

    // Deve ter containers de ambos os panes
    const keys = snapshots.map(s => s.attributes['data-mirror-key']);
    const uniqueViewIds = new Set(keys.map(k => k.split('-')[1]));
    expect(uniqueViewIds.size).toBeGreaterThanOrEqual(2);
  });
});
```

**Helper do Mirror Notes:**

```typescript
// test/e2e/helpers/mirror.ts
import { waitForPlugin } from 'obsidian-e2e-visual-test-kit';

export async function injectMirrorConfig(config: Record<string, unknown>) {
  await waitForPlugin('obsidian-mirror-notes');
  await browser.execute((c: Record<string, unknown>) => {
    const plugin = (window as any).app.plugins.plugins['obsidian-mirror-notes'];
    plugin.saveData({ ...plugin.settings, ...c });
    plugin.refresh();
  }, config);
  await browser.pause(2000);
}

export const SELECTORS = {
  injection: '.mirror-dom-injection',
  aboveTitle: '[data-position="above-title"]',
  aboveProperties: '[data-position="above-properties"]',
  belowProperties: '[data-position="below-properties"]',
  aboveBacklinks: '[data-position="above-backlinks"]',
  belowBacklinks: '[data-position="below-backlinks"]',
  top: '[data-position="top"]',
  bottom: '[data-position="bottom"]',
} as const;
```

### Pattern generico pra qualquer plugin

Independente do tipo de plugin, o fluxo e2e segue 3 perguntas:

1. **Que estado precisa existir?**
   - Coding plugin → markers, code definitions
   - Injection plugin → settings, templates, frontmatter
   - Dashboard plugin → data sources, config
   - Qualquer plugin → `injectData()` no helper

2. **Como chego no componente?**
   - Editor → `openFile()` + `focusEditor()`
   - Sidebar → `openSidebar()` + `switchSidebarTab()`
   - Modal → `executeCommand()`
   - Custom view → `executeCommand()` que abre a view

3. **O que valido?**
   - Existe e esta visivel → `assertDomState({ visible: true })`
   - Tem o conteudo certo → `assertDomState({ innerHTML: { contains: [...] } })`
   - Tem os atributos certos → `assertDomState({ dataAttributes: { ... } })`
   - Parece certo visualmente → `checkComponent(selector, tag)`
   - Interacao funciona → `hoverElement()` / click + re-assert

Se voce consegue responder essas 3 perguntas pro modulo que quer testar, a spec se escreve sozinha seguindo o template.

## Case Study: Qualia Coding

Plugin de analise qualitativa de dados (28k LOC, 150 modulos). Tinha 1263 testes unitarios (Vitest + jsdom) cobrindo ~80% do codigo testavel, mas 82 modulos UI ficavam sem cobertura — jsdom nao renderiza CM6, Chart.js, ou Fabric.js.

### Resultado com obsidian-e2e-visual-test-kit

| Metrica | Antes | Depois |
|---------|-------|--------|
| Testes unitarios (Vitest) | 1263 | 1263 |
| Testes e2e (wdio) | 0 | 27 |
| **Total** | **1263** | **1290** |
| Specs e2e | 0 | 8 |
| Screenshots baseline | 0 | 10 |
| Componentes UI cobertos | 0 | 6 (margin panel, highlights, handles, hover, explorer, analytics) |

### Specs criados

| Spec | Testes | O que valida |
|------|--------|-------------|
| smoke.e2e.ts | 3 | Plugin carrega, arquivo abre, editor visivel |
| margin-panel.e2e.ts | 4 | Bars renderizam, CSS classes, screenshot baseline, hover |
| highlights.e2e.ts | 4 | Decoracoes CM6, nested markers, screenshot |
| handle-overlay.e2e.ts | 3 | Container existe, SVGs no hover, screenshot |
| hover-interaction.e2e.ts | 3 | Hover sync editor↔margin, clear on leave |
| code-explorer.e2e.ts | 4 | Sidebar renderiza, tree items, code names, screenshot |
| analytics-frequency.e2e.ts | 3 | View renderiza, toolbar, chart screenshot |
| analytics-dashboard.e2e.ts | 3 | KPI cards, marker count, dashboard screenshot |

### Tempo de execucao

- **Primeira vez:** ~2min (download Obsidian ~200MB)
- **Runs subsequentes:** ~1min 20s (8 specs sequenciais, Obsidian abre/fecha 8x)
- **6 specs escritos em paralelo** por subagents em ~3min

### Estrutura no plugin

```
qualia-coding/
  wdio.conf.mts                           ← 8 linhas
  test/e2e/
    helpers/qualia.ts                      ← injectQualiaData + mkMarker + SELECTORS
    vaults/visual/
      .obsidian/app.json
      .obsidian/community-plugins.json
      Sample Coded.md                      ← fixture com 3 secoes
    specs/
      smoke.e2e.ts
      margin-panel.e2e.ts
      highlights.e2e.ts
      handle-overlay.e2e.ts
      hover-interaction.e2e.ts
      code-explorer.e2e.ts
      analytics-frequency.e2e.ts
      analytics-dashboard.e2e.ts
  test/screenshots/
    baseline/                              ← 10 screenshots de referencia
    actual/                                ← gerados a cada run
```

## Limitacoes

- Node 18+ (20+ recomendado)
- Primeiro run leva ~2min (download Obsidian). Depois ~30-60s
- Screenshots dependem de resolucao — mesma maquina pra baseline e comparacao
- `browser.execute()` e sincrono — sem async/await dentro
- iOS nao suportado
- `maxInstances: 1` (Obsidian e desktop app)
- Usar `--legacy-peer-deps` no install (conflitos de peer deps entre wdio packages)
