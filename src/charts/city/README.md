# City chart: health score como uma cidade 3D

Extensão local do TanStack Charts **1.1.0**. Uma empresa é uma marca espacial: a combinação de categorias determina seu distrito e sua cor, valores da métrica determinam o porte da construção e a classificação de saúde determina os sinais de risco. O cadastro atual fornece `status`, não um score numérico; o gráfico não inventa nem calcula esse score.

O consumidor usa `defineChart`, `ChartMark`, `ChartRenderer`, `ChartPoint`, foco, tooltip e callbacks do TanStack. O Three.js implementa a superfície 3D. Não é necessário usar a aplicação Atlas, seus filtros ou seus componentes de interface.

## Uso com React

```jsx
import { useMemo } from "react";
import { Chart } from "@tanstack/charts/react/core";
import { tooltip } from "@tanstack/charts/tooltip";
import { defineCityChart, createCityRenderer } from "./src/charts/city";

const renderer = createCityRenderer(); // identidade estável entre renders

export function CompanyHealth({ companies, onCompanySelect }) {
  const definition = useMemo(
    () => defineCityChart(companies, {
      tooltip: {
        use: tooltip,
        format: ({ datum }) => `${datum.name} · ${datum.metric.label}: ${datum.metric.value} · ${datum.status}`,
      },
    }),
    [companies],
  );

  return (
    <Chart
      definition={definition}
      renderer={renderer}
      height={480}
      ariaLabel="Saúde das empresas"
      onSelect={(point) => onCompanySelect(point?.datum ?? null)}
      onFocusChange={(point) => console.log(point?.datum)}
    />
  );
}
```

`createCityRenderer()` é uma fábrica de `ChartRenderer`, não um novo host. Cada montagem tem câmera, seleção, contexto WebGL e recursos próprios, mesmo ao compartilhar a definição e o renderer. Para JavaScript sem React, passe os mesmos `definition` e `renderer` para `mountChartRenderer` de `@tanstack/charts/renderer` e chame `host.destroy()` ao remover o gráfico.

## Composição da definição

`defineCityChart` é somente um preset. Quem já cria definições pode usar a marca diretamente:

```js
import { defineChart } from "@tanstack/charts";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { cityMark, cityFocus } from "./src/charts/city";

const definition = defineChart({
  marks: [cityMark(companies, { id: "company-health" })],
  scales: {
    x: { scale: scaleLinear, axis: false },
    y: { scale: scaleLinear, axis: false },
  },
  color: {
    domain: [1, 2, 4, 3, 5, 6, 7],
    range: ["#4b91ef", "#e281af", "#ecc456", "#ab7cdd", "#47b8b2", "#e99b55", "#7777ca"],
  },
  guides: false,
  margin: 0,
  focus: cityFocus,
  tooltip,
});
```

A cor resolvida pelo TanStack chega ao renderer. `defineCityChart(data, options)` também aceita as opções habituais da definição, como `color`, `tooltip` e `keyboard`. A opção interna `layout` evita recalcular a distribuição quando a aplicação já possui o resultado de `layoutCity`.

`cityFocus` resolve o prédio atingido por raycasting, em vez de procurar o ponto mais próximo em uma projeção antiga. `getPresentationPoints` e `subscribePresentationPoints` atualizam as posições dos `ChartPoint`s quando a câmera muda. Assim, foco e tooltips do próprio TanStack acompanham zoom, giro e redimensionamento. Arrastar a câmera não dispara seleção. Setas, Home/End e Enter usam o teclado do host TanStack.

## Dados e semântica

```js
const companies = [
  { id: "aurora", name: "Aurora", metric: { label: "Receita", value: 2200.75 }, categories: [{ label: "Varejo", value: "retail" }], status: "critical" },
  { id: "cedro", name: "Cedro", metric: { label: "Receita", value: 350 }, categories: [{ label: "Serviços", value: "services" }], status: "warning" },
];
```

| Campo | Contrato | Representação |
| --- | --- | --- |
| `id` | string ou número único e estável | chave da marca e da seleção |
| `name` | string não vazia | identificação da empresa |
| `metric` | `{ label: string, value: number }`, valor finito ≥ 0 | label na interface; valor define o porte |
| `categories` | lista de `{ label: string, value: string }` | distrito e cor; até três valores distintos na base |
| `status` | `healthy`, `warning` ou `critical` | operação normal, fumaça/alerta ou fogo/piscar |

O contrato genérico pode ser passado diretamente a `defineCityChart`/`cityMark`. `placeCompanies` valida os dados e calcula `mask` (bits 1, 2 e 4 atribuídos aos identificadores das categorias em ordem textual). As combinações determinam até sete regiões. O mesmo `value` deve manter o mesmo `label` em toda a base. O layout deve usar a base já normalizada quando calculado fora da marca, antes da paginação.

Integrações existentes com `{ users, mask }` continuam aceitas pela marca. O importador do Atlas também aceita `{ users, systems: ["A", "B"] }`, convertendo para os campos genéricos. `metric.value` preserva decimais; `sizeForValue` mantém as quatro faixas de porte existentes (<90, <550, <1800 e ≥1800), independentemente do label. `sizeForUsers` permanece como alias de compatibilidade.

O ponto preserva `datum === data[datumIndex]`. A marca não altera as linhas recebidas, inclusive quando estão congeladas. `xValue` e `yValue` são as coordenadas espaciais x/z dos lotes. A geometria mutável do Three.js recebe cópias separadas. Dados novos exigem uma nova definição, como nos demais gráficos TanStack; mantenha os dados imutáveis e memorize definições que capturam props.

## Organização

| Arquivo | Responsabilidade |
| --- | --- |
| `index.js` | entrada pública sem React ou componentes do Atlas |
| `data.js` | contrato JSDoc e validação dos dados |
| `mark.js` | `createMark`: canais, identidade, geometria semântica e pontos |
| `definition.js` | preset de escalas, cor, foco e layout |
| `layout.js` | transporte interno do layout na cena, sem alterar os dados do consumidor |
| `interaction.js` | associação de pontos à superfície e estratégia de foco 3D |
| `renderer.js` | `ChartRenderer`/`ChartSurface`: montagem, projeção, eventos e descarte |
| `react.jsx` | integração visual do Atlas sobre o `Chart` oficial |
| `use-city-chart.js` | ponte do Atlas para câmera, labels, tooltip visual e transição de páginas |
| `three/primitives.js` | materiais e lotes de instâncias compartilhados |
| `three/terrain.js` | ruas, calçadas, marcações, árvores e bancos |
| `three/buildings.js` | construções, janelas e emissores de risco |
| `three/building-material.js` | vermelho de risco independente da iluminação e exposição |
| `three/lighting.js` | períodos de luz pelo relógio local e iluminação das janelas |
| `three/traffic.js` | desenho de carros, pessoas e semáforos |
| `three/effects.js` | alertas, cores de risco e coordenação das partículas |
| `../../city.js` | cena, câmera, animação e recursos WebGL |

`src/components/city-map.jsx` é o consumidor da extensão: conecta o gráfico aos dados e controles do Atlas. O componente React aceita `showDistrictLabels` (padrão `false`) para exibir as etiquetas das categorias e interseções; o checkbox correspondente no Atlas controla essa propriedade sem reconstruir a cena. O renderer não importa `useAtlas`, paginação, shadcn ou React. A simulação do trânsito continua separada em `src/traffic.js`.

O vermelho do piscar crítico é uma cor fixa (`#ff2525`), independente das luzes e da exposição. Fora da fase vermelha, o prédio mantém a cor de sua categoria sob a iluminação atual. O ícone de exclamação também preserva suas cores, sem iluminação nem mapeamento de tons. Ambos permanecem constantes durante as transições de período.

## Atualizações e renderização

O layout é calculado pela marca (ou fornecido pela aplicação) e acompanha um grupo da cena por um símbolo interno. O renderer reutiliza esse resultado, inclusive em cidades vazias, e copia somente as linhas que o motor Three.js precisa alterar. Cada montagem mantém sua própria câmera, geometria e cache de interação.

| Mudança | Trabalho necessário |
| --- | --- |
| IDs, categorias, posições ou limites das ruas | reconstruir a cidade e enquadrar o novo layout |
| Métrica ou saúde, com os mesmos lotes | reconstruir prédios e efeitos; preservar terreno, trânsito, câmera e seleção existente |
| Paleta | atualizar as cores das instâncias, preservando sombreamento e fase de risco |
| Nome | atualizar os dados usados pela interface |
| Tamanho do contêiner | ajustar a câmera e o canvas, sem reconstruir geometria |

Com cidade viva e efeitos desligados, o loop entra em repouso após a câmera estabilizar. Câmera, seleção, dados, controles e redimensionamento solicitam um novo frame; animações mantêm o loop ativo somente enquanto necessário. Ao integrar diretamente com o motor, use `setActivity({ life, effects })` e `select(company)`/`select(null)` para também invalidar a cena.

Com cidade viva ativa, a iluminação segue o horário local do navegador: sol nascente das 6h às 8h, dia das 8h às 17h, sol poente das 17h às 19h e noite das 19h às 6h. Nascente e poente compartilham o mesmo nível de luz quente. As janelas ficam acesas nesses períodos e à noite, inclusive com efeitos de risco desligados; fogo e alertas preservam sua sinalização. A verificação ocorre a cada minuto e ao retornar à aba, inclusive com movimento reduzido. Desativar cidade viva restaura a iluminação diurna original e interrompe a verificação periódica.

O seletor **Iluminação** permite testar **Nascente/poente**, **Dia** e **Noite** manualmente. **Automático** é o padrão e retoma o horário local ao ser selecionado. As mudanças de luz e das janelas são graduais, em 1,8 segundo, inclusive ao ativar/desativar cidade viva. Trocar de opção durante a transição parte da iluminação atual, sem saltos. A primeira renderização já usa o período correto. O seletor fica desabilitado com cidade viva desligada e preserva a escolha para quando ela for reativada. `CityChart` aceita a propriedade `lightingMode` (`auto`, `twilight`, `day`, `night`); integrações diretas com o motor podem usar `setLightingMode(mode)`. A verificação periódica do relógio fica suspensa durante uma escolha manual. A transição de cores funciona com movimento reduzido e mantém o loop ativo apenas até terminar, mesmo sem trânsito ou efeitos animados.

As projeções do TanStack e as etiquetas do Atlas acompanham uma revisão da câmera. Etiquetas também se atualizam quando seus dados ou filtro mudam. O hover e a estratégia de foco compartilham o mesmo resultado de raycasting para a mesma coordenada/câmera; o cache é invalidado quando os dados da cena mudam. Buscas por empresa usam um índice por ID.

Os testes de navegador verificam repouso sem novos frames ou uploads, retomada das animações e da câmera, uma consulta por movimento do ponteiro, layout personalizado e preservação de geometria/zoom nas atualizações de cor. Não há promessa de ganho fixo de FPS: ele depende do dispositivo e da quantidade de efeitos ativos.

## Geometria simplificada

| Elemento | Geometria atual |
| --- | --- |
| Prédio/casa | um bloco; face superior já é o telhado |
| Janela | um plano de dois triângulos, sem moldura |
| Rua/calçada | faixas contínuas planas, em vez de blocos por lote |
| Faixas e linhas de parada | planos; travessias com três faixas largas |
| Terreno | um plano verde de gramado; lotes dos prédios em bege e calçadas em cinza, todos planos |
| Árvores | zero a três por lote vazio; tronco e copa de oito faces, com posições e tamanhos variados |
| Bancos | um único bloco baixo em cerca de 9% dos lotes vazios; compartilham o instanciamento dos troncos |
| Carro | carroceria e cabine; sem rodas |
| Pedestre | corpo e cabeça de oito faces; sem pernas |
| Semáforo | poste, caixas e luzes simples; mantém as fases de veículos e pedestres |
| Fogo/fumaça | volumes instanciados de oito faces |

A distribuição de árvores e bancos usa sementes por coordenada: permanece estável ao reconstruir a mesma cidade, mantém as copas dentro do lote e reserva espaço entre árvores e bancos.

Removidos também os planos extras de sombra por prédio e os telhados duplicados do contorno de seleção. A cor continua representando categorias; saúde não altera porte nem pertencimento a um distrito.

Medição determinística da geometria base, sem fogo/fumaça e sem descarte pela câmera:

| Empresas | Triângulos antes | Triângulos atuais | Redução | Lotes de desenho antes → atuais |
| --- | ---: | ---: | ---: | ---: |
| 100 | 96.830 | 26.022 | 73,1% | 26 → 17 |
| 1.400 | 804.354 | 198.042 | 75,4% | 26 → 17 |

Reproduza com `node scripts/benchmark-city.mjs`. São contagens de geometria, não uma promessa de FPS. A contagem real por frame também depende de efeitos, seleção, visibilidade e câmera.

## Verificação e limites

- `npm test`: contratos da marca, dados imutáveis, SSR, isolamento entre superfícies, orçamento de geometria, simulação, emissores e liberação de recursos.
- `npm run test:e2e`: consumo direto pelo host TanStack, eventos/teclado/tooltip, duas montagens e os fluxos do Atlas em desktop e mobile.
- `npm run build` e `npm run format:check`: build de produção e formatação.

A superfície é dedicada a uma cidade: não desenha eixos, grids ou marcas cartesianas arbitrárias sobre o WebGL. Use uma `cityMark` por superfície. SVG e Canvas não se tornam renderers 3D; a geometria semântica da marca permite uma representação plana quando desenhada por SVG, mas a cidade requer `createCityRenderer`. SSR produz um shell acessível determinístico; WebGL só inicia na montagem do navegador. Não há publicação de pacote npm nesta alteração.

Referências de API: [custom marks and renderers](https://tanstack.com/charts/latest/docs/guides/custom-marks-and-renderers), [React renderer entry points](https://tanstack.com/charts/latest/docs/framework/react/reference/chart), [fonte da versão 1.1.0](https://github.com/TanStack/charts/tree/v1.1.0).
