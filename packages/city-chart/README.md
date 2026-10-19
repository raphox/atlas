# atlas-city-chart

Cidade 3D reutilizável: mapa, chuva, neve, iluminação, trânsito, efeitos de risco, busca, seleção, zoom, perspectivas e tela cheia. Recebe os dados do projeto consumidor. Não precisa da aplicação Atlas, de backend próprio ou de uma configuração de Tailwind.

## Instalar o pacote local

Na raiz deste repositório:

```sh
npm run pack:package
```

No projeto consumidor (React 18 ou 19):

```sh
npm install /caminho/atlas-city-chart-0.1.0.tgz
```

O nome `atlas-city-chart` é inicial. O pacote ainda não foi publicado no registry; defina o nome/escopo e a licença de distribuição antes de publicar. `UNLICENSED` não concede uma licença pública para o código.

## React e tema em CSS puro

```jsx
import { CityMap } from "atlas-city-chart/react";
import "atlas-city-chart/styles.css";
import "./minha-cidade.css";

const companies = [
  {
    id: "aurora",
    name: "Aurora",
    metric: { label: "Receita", value: 2400.5 },
    categories: [{ label: "Varejo", value: "retail" }],
    status: "critical",
  },
];

export function Dashboard() {
  return (
    <CityMap
      className="minha-cidade"
      theme="default"
      data={companies}
      weather="rain"
      lightingMode="auto"
      onSelect={(company) => console.log(company)}
    />
  );
}
```

`styles.css` contém a estrutura e o tema CSS puro padrão. O tema também é exportado isoladamente em `atlas-city-chart/theme-default.css`. Não há reset global, fontes externas, CSS do Atlas ou exigência de Tailwind. As classes de tema usam especificidade zero (`:where`), permitindo estender o tema sem `!important` e sem depender da ordem dos imports.

```css
/* minha-cidade.css: estende o tema padrão somente nesta instância. */
.minha-cidade {
  --atlas-city-height: 640px;
  --atlas-city-accent: #7c3aed;
  --atlas-city-on-accent: #fff;
  --atlas-city-card: #faf5ff;
  --atlas-city-text: #2e1065;
  --atlas-city-border: #ddd6fe;
  --atlas-city-radius: 12px;
  --atlas-city-font-family: "Inter", sans-serif;
  --atlas-city-control-padding: 10px 14px;
}

.minha-cidade .atlas-city-camera-button {
  width: 40px;
  height: 40px;
}

.minha-cidade .atlas-city-search-input {
  border-width: 2px;
}
```

Use `theme={null}` para fornecer todos os tokens por uma classe própria. Temas de diferentes instâncias são independentes. O componente usa `className` para dimensionamento e personalização; não possui propriedade `style`.

## Tema com Tailwind CSS 4

Em um projeto já configurado com Tailwind CSS 4, importe os estilos no CSS processado pelo Tailwind:

```css
@import "tailwindcss";
@import "atlas-city-chart/styles.css";
@import "atlas-city-chart/tailwind.css";

.minha-cidade {
  --atlas-city-accent: theme("colors.violet.600");
  --atlas-city-height: 40rem;
}

.minha-cidade .atlas-city-camera-button {
  @apply rounded-xl shadow-md;
}
```

```jsx
<CityMap data={companies} theme="tailwind" className="minha-cidade" />
```

O tema Tailwind usa `@reference`, `theme()` e `@apply`; deve ser processado pelo Tailwind 4 do consumidor. O tema CSS puro funciona diretamente em qualquer bundler que importe CSS. A estrutura e os nomes de classes são os mesmos nos dois temas.

## Classes da interface

| Parte | Classes públicas |
| --- | --- |
| Contêiner e gráfico | `.atlas-city-map`, `.atlas-city-chart`, `.atlas-city-viewport`, `.atlas-city-host` |
| Cabeçalho | `.atlas-city-header`, `.atlas-city-title` |
| Busca | `.atlas-city-search`, `.atlas-city-search-input`, `.atlas-city-results`, `.atlas-city-search-result`, `.atlas-city-search-empty` |
| Perspectiva | `.atlas-city-perspectives`, `.atlas-city-perspective-button` (estado `aria-pressed`) |
| Câmera | `.atlas-city-zoom`, `.atlas-city-camera-button`, modificadores `--zoom-in`, `--zoom-out`, `--reset`, `--fullscreen` |
| Ambiente | `.atlas-city-scene-controls`, `.atlas-city-environment-control--lighting`, `.atlas-city-environment-control--weather`, `.atlas-city-select` |
| Opções | `.atlas-city-control`, `.atlas-city-control-label`, `.atlas-city-toggle`, modificadores `--life`, `--effects`, `--labels` |
| Etiquetas | `.atlas-city-labels`, `.atlas-city-label`, `.atlas-city-label-dot`, `.atlas-city-label-name`, `.atlas-city-label-count` |
| Tooltip | `.atlas-city-tooltip`, `.atlas-city-tooltip-name`, `.atlas-city-tooltip-summary`, `.atlas-city-tooltip-arrow` |
| Detalhes | `.atlas-city-details`, `.atlas-city-details-title`, `.atlas-city-details-categories`, `.atlas-city-details-metric`, `.atlas-city-details-status`, `.atlas-city-details-close`, `.atlas-city-details-focus` |
| Estado | `.atlas-city-loading`, `.atlas-city-message` |

Tokens adicionais: `--atlas-city-background`, `--atlas-city-muted`, `--atlas-city-font-size`, `--atlas-city-panel-radius`, `--atlas-city-shadow`, `--atlas-city-tooltip-background`, `--atlas-city-tooltip-text`, `--atlas-city-region-1` até `--atlas-city-region-7`.

Os componentes da interface não geram atributos `style`. As posições dinâmicas de etiquetas e tooltips são atualizadas em regras de stylesheet por instância. O host TanStack e o canvas WebGL gerenciam suas próprias dimensões internas. Tokens CSS de categorias personalizam as etiquetas; a paleta da geometria é configurada na definição do gráfico (`defineCityChart`), pois o conteúdo 3D é renderizado no canvas.

## Propriedades e dados

`data` é uma lista imutável. Cada empresa tem `id` único (string ou número), `name`, `metric: { label, value }`, `categories: [{ label, value }]` e `status: "healthy" | "warning" | "critical"`. A métrica deve ser finita e não negativa. Use uma a três categorias por empresa, com até três valores distintos na base. A mesma categoria deve manter seu label. Uma nova lista atualiza o gráfico; `[]` exibe a cidade vazia.

| Propriedade | Padrão | Uso |
| --- | --- | --- |
| `theme` | `"default"` | `"default"`, `"tailwind"` ou `null` |
| `view` | `"iso"` | `"iso"` ou `"top"` |
| `life` / `effects` | `true` | animação da cidade / efeitos de risco |
| `showDistrictLabels` | `false` | categorias e interseções |
| `weather` | `"none"` | `"none"`, `"rain"` ou `"snow"` |
| `lightingMode` | `"auto"` | `"auto"`, `"day"`, `"twilight"` ou `"night"` |
| `showControls` | `true` | controles de câmera, cena e ambiente |
| `showEnvironmentControls` | `true` | seletores de clima e iluminação |
| `showSearch` / `showDetails` | `true` | busca / painel de seleção |
| `busy` | `false` | bloqueio temporário e indicador de atualização |
| `title` / `ariaLabel` | textos em português | título / identificação acessível |
| `className` / `children` | — | personalização CSS / conteúdo adicional |
| `onSelect` | — | empresa original selecionada ou `null` |

`view`, `life`, `effects` e `showDistrictLabels` podem ser controladas pelo consumidor com `onViewChange`, `onLifeChange`, `onEffectsChange` e `onDistrictLabelsChange`. Sem essas props, os botões gerenciam o estado local. Os seletores de ambiente têm substituições locais por instância; **Automático** segue a prop recebida.

`ref` expõe `zoom(factor)`, `view(mode)`, `select(company, focus?, maxZoom?)`, `deselect()`, `cancel()`, `capture()`, `play(direction)`, `scrollIntoView()` e `stats()`. `onFocusChange` recebe o `ChartPoint` do TanStack.

Não há chamada de geolocalização ou API meteorológica no pacote. Para clima real, forneça a prop `weather` a partir do seu provedor. `life={false}` pausa o clima e restaura a luz diurna. Preferência por movimento reduzido desativa as partículas. Tela cheia depende do suporte do navegador. WebGL inicia somente no navegador; SSR gera um shell acessível. Em frameworks com Server Components, importe o componente numa fronteira cliente e carregue o CSS conforme as regras do framework.

## Composição e motor sem React

```jsx
import { CityChart } from "atlas-city-chart/react";
import { defineCityChart } from "atlas-city-chart";

// Memorize a definição a partir da lista de dados na aplicação.
<CityChart definition={definition} weather="snow" showEnvironmentControls />
```

`CityChart` mantém os callbacks TanStack (`point?.datum`), aceita `chartRef`, e permite posicionar seus controles usando `children={({ environmentControls, ready, error }) => ...}`. `EnvironmentControls` também é exportado para composição. `CityMap` oferece a interface completa pronta para uso.

A entrada principal exporta `defineCityChart`, `cityMark`, `createCityRenderer` e `cityFocus`, sem importar React. Passe a definição e o renderer ao host `mountChartRenderer` de `@tanstack/charts/renderer`, ou ao `Chart` oficial do TanStack. Destrua o host ao remover a montagem. Dependências do motor: TanStack Charts 1.1.0 e Three.js 0.180.0.

## Manutenção e distribuição

Na raiz do repositório:

```sh
npm run build:package
npm run test:package
npm run test:e2e -- tests/e2e/city-package.spec.js
npm run pack:package
```

O build compila as fontes compartilhadas com o Atlas para `packages/city-chart/dist`, inclui JavaScript ESM, declarações TypeScript, CSS e sourcemaps. React, Three.js e TanStack são dependências externas ao bundle. O tarball contém apenas arquivos de distribuição, README e aviso do Three.js; não inclui a SPA ou seus dados.

Para publicar, após escolher nome/escopo, versão e licença e autenticar no npm, execute `npm publish` dentro de `packages/city-chart`. O `prepack` recompila o pacote a partir deste checkout. Nenhuma publicação é feita pelos comandos de build, teste ou empacotamento.
