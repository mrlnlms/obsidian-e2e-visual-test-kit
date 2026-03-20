# Case Study: Mirror Notes

Plugin de DOM injection + CM6 widgets que renderiza templates dinamicos em 9 posicoes do editor. 395 testes unitarios cobriam logica pura — este harness cobriu o que jsdom nao alcanca.

## Numbers

| Metric | Before | After |
|--------|--------|-------|
| Unit tests (Vitest) | 267 | 395 |
| E2E tests (wdio) | 0 | 39 |
| **Total** | **267** | **434** |
| E2E specs | 0 | 8 |
| Screenshot baselines | 0 | ~10 |

## Specs

| Spec | Tests | What it validates |
|------|-------|-------------------|
| smoke | 3 | Plugin loads, file opens, mirrors render |
| positions | 8 | 5 DOM positions + 2 CM6 widgets + negative test |
| mode-switch | 4 | LP→RV→LP, dual templates, no leaked CSS classes |
| lifecycle | 4 | Cold start, unload cleanup, re-enable, no orphans |
| visual-baselines | 6 | Screenshots: above-title, viewport, CM6, RV, roundtrip |
| code-blocks | 5 | Render, frontmatter variable, RV, source reference, border |
| advanced-behaviors | 7 | Multi-pane isolation (3), code block multi-pane (2), MutationObserver recovery (2) |
| suggest | 2 | File suggest dropdown, folder suggest dropdown |

Complementa 395 testes unitarios (Vitest + jsdom) que cobrem logica pura.

## O que o plugin faz

Mirror Notes injeta containers HTML em posicoes semanticas do editor Obsidian:
- **5 posicoes DOM**: above-title, above-properties, below-properties, above-backlinks, below-backlinks
- **2 posicoes CM6**: top (widget no topo do editor), bottom (widget no final)
- **2 margin panels**: left, right (ViewPlugin CM6)

Cada mirror tem um template (nota .md com variaveis `{{campo}}`) que renderiza usando MarkdownRenderer. O plugin detecta qual mirror ativar via conditions (property match, folder match, file match) com logica AND/OR. Suporta dual-template (um pra Live Preview, outro pra Reading View).

## Gaps que os unit tests nao cobriam

| Gap | Por que jsdom nao alcanca |
|-----|--------------------------|
| Posicionamento DOM | Depende de `.metadata-container`, `.embedded-backlinks`, `.inline-title` existirem no DOM real |
| CM6 widgets | StateField injection, Decoration lifecycle, `toDOM()` no editor real |
| Mode switch | `layout-change` event, `getMode()` oscilacao, CSS toggle entre source/preview |
| Cold start | MarkdownRenderer async, retry timing, DOM population delay |
| Plugin lifecycle | `onunload()` cleanup real, widgets e classes removidos do DOM |

## Como foi estruturado

### Test vault minimo

```
test/e2e/vaults/visual/
  .obsidian/
    app.json                    ← propertiesInDocument: visible, backlinks on
    community-plugins.json      ← ["mirror-notes"]
    plugins/mirror-notes/
      data.json                 ← 11 mirrors com conditions unicas
  templates/                    ← 9 callouts com prefixo E2E-
  notes/                        ← 8 notas (1 por posicao + smoke/dual/no-mirror)
```

### Decisao chave: uma nota por posicao

Mirror Notes usa **first-match-wins** — cada nota so ativa um mirror. Se voce configurar 7 mirrors matchando a mesma nota, so o primeiro renderiza. A solucao: cada nota de teste tem um frontmatter unico (`mirror: above-title`, `mirror: cm6-top`, etc.) que matcha exatamente um mirror.

### Helper com constantes tipadas

```typescript
// Selectors por posicao (data-attribute)
export const S = {
  aboveTitle: '[data-position="above-title"]',
  top: '.mirror-ui-widget[data-position="top"]',
  // ...
} as const;

// Markers no innerHTML (prefixo E2E- nos templates)
export const MARKERS = {
  aboveTitle: 'E2E-ABOVE-TITLE',
  lpDual: 'E2E-LP-TEMPLATE',
  rvDual: 'E2E-RV-TEMPLATE',
  // ...
} as const;
```

Os templates sao callouts Obsidian com texto identificavel:
```markdown
> [!info] E2E-ABOVE-TITLE
> Position: above-title | Note: **{{title}}**
```

Isso permite assertions simples: `innerHTML: { contains: ['E2E-ABOVE-TITLE'] }`.

### Config injection no runtime

O `wdio-obsidian-service` copia o plugin inteiro (incluindo `data.json` do workspace) pro sandbox. Pra usar a config de teste, um `before` hook no wdio.conf substitui os settings:

```typescript
overrides: {
  before: async function () {
    await browser.waitUntil(/* plugin loaded */);
    await browser.execute((id, settings) => {
      const plugin = app.plugins.plugins[id];
      plugin.settings = settings;
      plugin.saveSettings();
    }, 'mirror-notes', e2eSettings);
  },
},
```

## O que cada suite testa

### smoke (3 specs)
Validacao basica: plugin carrega, arquivo abre, mirror renderiza com conteudo correto. Serve como gate — se smoke falha, o resto nao vale rodar.

### positions (8 specs)
Abre uma nota por posicao e verifica:
- Container existe e esta visivel
- Classes CSS corretas (`mirror-dom-injection`, `mirror-position-X`)
- `data-position` attribute correto
- Template content renderizado (marker no innerHTML)
- CM6 widgets tem `data-widget-id` com prefixo `mirror-widget-`
- Nota sem mirror configurado tem zero widgets

Posicoes que dependem de elementos nativos (properties, backlinks) usam fallback gracioso — se o DOM target nao existe, verificam que o conteudo aparece via CM6 fallback.

### mode-switch (4 specs)
Testa o fluxo LP → RV → LP:
- Live Preview mostra template LP (callout tip, marker `E2E-LP-TEMPLATE`)
- Toggle pra Reading View mostra template RV (callout abstract, marker `E2E-RV-TEMPLATE`)
- Toggle de volta restaura template LP
- Nenhuma CSS class de override vaza entre switches (`mirror-hide-properties`, etc.)

### lifecycle (4 specs)
- Cold start: plugin carrega e mirrors aparecem na primeira abertura de arquivo
- Disable plugin: `app.plugins.disablePlugin()` remove TODOS os widgets do DOM + limpa classes de override
- Re-enable: `app.plugins.enablePlugin()` restaura mirrors ao navegar
- Navegacao: abrir nota com mirrors, depois nota sem mirrors → zero widgets orphans

### visual-baselines (6 specs)
Screenshot comparison pixel-a-pixel:
- Component: above-title container, CM6 top widget, CM6 bottom widget, RV template container
- Viewport: area superior com mirrors, viewport apos roundtrip LP→RV→LP

Tolerancia: 1.5% pra components, 10% pra viewport (cursor e timing variam).

## Problemas encontrados e como foram resolvidos

### `editor:toggle-source` nao funciona no sandbox

O comando existe mas nao faz nada. A Reading View continua com `display: none`. Solucao: usar `markdown:toggle-preview` via `app.commands.executeCommandById()`.

### wdio-obsidian-service sobrescreve data.json

O service copia tudo do `pluginDir` pro sandbox, incluindo o `data.json` do workspace de desenvolvimento (com 15 mirrors do demo vault). Solucao: `before` hook que injeta a config E2E via `plugin.settings = cfg; plugin.saveSettings()`.

### Renderer timeouts no Electron

Screenshots de elementos grandes disparam `"Timed out receiving message from renderer: 10.000"`. O wdio faz retry automatico via Web API fallback — funciona mas adiciona ~30s ao teste. Nao precisa de fix, so paciencia.

### CM6 widget invisivel em Reading View

Apos toggle pra RV, o CM6 widget (LP) tem dimensoes 0x0 mas continua no DOM. O DOM injection (RV) e o container visivel. Selectors devem apontar pra `.mirror-dom-injection[data-position="top"]` em vez de `.mirror-ui-widget[data-position="top"]` quando em RV.

## Tempo de execucao

| Fase | Tempo |
|------|-------|
| Primeira vez (download Obsidian) | ~2 min |
| Runs subsequentes | ~5 min |
| Por suite (media) | ~30s-60s |
| visual-baselines (com retries) | ~3 min |
