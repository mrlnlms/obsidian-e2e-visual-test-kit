# obsidian-plugin-e2e

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
import { openFile, waitForElement, checkComponent, assertDomState } from 'obsidian-plugin-e2e';

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
obsidian-plugin-e2e (este repo) ← navega, tira print, valida DOM
        ↓
seu plugin (specs)              ← cenarios especificos, dados de teste
```

### Config Layer — `createConfig()`

Gera um `wdio.conf` completo com 4 linhas:

```typescript
// seu-plugin/wdio.conf.mts
import { createConfig } from 'obsidian-plugin-e2e';

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
  obsidian-plugin-e2e@file:../../obsidian-plugin-e2e \
  wdio-obsidian-service @wdio/visual-service \
  @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter \
  wdio-obsidian-reporter @types/mocha
```

### 2. Criar wdio.conf.mts

```typescript
import { createConfig } from 'obsidian-plugin-e2e';

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
import { waitForPlugin } from 'obsidian-plugin-e2e';

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
import { openFile, waitForPlugin, getActiveFile } from 'obsidian-plugin-e2e';

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
import { openFile, focusEditor, waitForElement, checkComponent, assertDomState } from 'obsidian-plugin-e2e';
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

### Ordem recomendada pra cobrir gaps

1. **Smoke test** — plugin carrega, arquivo abre (ja feito no Qualia)
2. **Margin panel** — layout de colunas, labels, hover (ja feito no Qualia)
3. **Highlights no editor** — markers visualmente corretos
4. **Sidebar views** — explorer e detail panel renderizam
5. **Analytics modes** — cada mode renderiza chart/tabela
6. **PDF/Image/CSV views** — cada engine renderiza corretamente
7. **Modais e menus** — interacoes de UI

## Limitacoes

- Node 18+ (20+ recomendado)
- Primeiro run leva ~2min (download Obsidian). Depois ~30-60s
- Screenshots dependem de resolucao — mesma maquina pra baseline e comparacao
- `browser.execute()` e sincrono — sem async/await dentro
- iOS nao suportado
- `maxInstances: 1` (Obsidian e desktop app)
- Usar `--legacy-peer-deps` no install (conflitos de peer deps entre wdio packages)
