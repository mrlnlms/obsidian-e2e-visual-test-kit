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

## Limitacoes

- Node 18+ (20+ recomendado)
- Primeiro run leva ~2min (download Obsidian). Depois ~30-60s
- Screenshots dependem de resolucao — mesma maquina pra baseline e comparacao
- `browser.execute()` e sincrono — sem async/await dentro
- iOS nao suportado
- `maxInstances: 1` (Obsidian e desktop app)
- Usar `--legacy-peer-deps` no install (conflitos de peer deps entre wdio packages)
