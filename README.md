# Atlas · Saúde das empresas

Cidade interativa em Three.js com uma base de 1.400 empresas fictícias, paginada inicialmente em cidades de 100 empresas. Cada empresa aparece uma única vez, na região correspondente à sua combinação exata de categorias.

## Executar

Aplicação Vite com React 19, TanStack Charts 1.1.0, Three.js e Tailwind CSS 4. Requer Node.js 22.12 ou superior (ou 24 LTS). Consulte EXECUTAR-LOCAL.md.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:4173. O Vite recompila alterações automaticamente. `npm start` também inicia o ambiente de desenvolvimento. Para produção, execute `npm run build` e `npm run preview` para verificar o resultado. A publicação usa somente os arquivos estáticos em `dist/`; Three.js está incluído no bundle, sem dependência de CDN para a cena.

## Estrutura da interface

- `src/main.jsx` monta a árvore React; `src/App.jsx` organiza a aplicação.
- `src/components/` contém cabeçalho, ajuda, filtros, resumo, importação, busca, mapa, controles, detalhes e tabela com paginação. Campos, seletores, busca com sugestões, alternâncias e perspectiva usam HTML nativo (`input`, `select`, `datalist`, checkbox e radio). Cards, botões, diálogo e tooltips mantêm os componentes existentes.
- `src/hooks/use-atlas.js` concentra os dados e o estado compartilhado entre mapa e tabela. A extensão em `src/charts/city/` usa `createMark`, `defineChart`, `ChartRenderer` e o componente `Chart` oficial do TanStack. Consulte [o guia de desenvolvimento](src/charts/city/README.md) para consumir a cidade em outro projeto, configurar eventos e entender a arquitetura.
- `src/index.css` configura o Tailwind e os tokens de tema shadcn/ui; o layout e os componentes usam classes utilitárias. O CSS específico restante atende ao canvas e às capturas da animação de cidades.
- `components.json` configura o shadcn/ui. Para adicionar componentes: `npx shadcn@latest add nome-do-componente`. O utilitário `cn` local fica em `src/lib/utils.js`.
- `scripts/generate-demo.mjs` gera `public/data/empresas.json` antes de iniciar ou compilar. `public/config.json` continua configurando a fonte de dados.

`npm test` executa os testes do domínio e do motor 3D. `npm run test:e2e` valida a aplicação no Chromium com Playwright (na primeira utilização, execute `npx playwright install chromium`). Os testes cobrem filtros, busca, paginação, seleção, controles, ajuda, importação, download, falhas da fonte e layout móvel com movimento reduzido.


## Navegação

- Arraste com o botão esquerdo para girar horizontalmente. A inclinação fica travada na isometria padrão; arrastar para cima ou para baixo não inclina o mapa.
- Use a roda, os botões +/− ou pinça para zoom.
- Arraste com o botão direito ou dois dedos para mover.
- Clique em uma construção para selecionar a empresa. A construção recebe contorno branco com borda escura, e o lote recebe uma moldura contrastante. O destaque é reutilizado entre seleções e mantém as cores das categorias e os efeitos de risco.
- A tabela abaixo do mapa mostra empresa, categorias, valores da métrica e saúde. Ela acompanha os mesmos filtros e a mesma paginação da cidade. “Ver no mapa” seleciona, centraliza e aproxima a construção correspondente até o zoom máximo permitido.
- Use a busca ou os filtros para localizar empresas. O filtro de saúde aparece antes do resumo; as contagens em Categorias & interseções refletem todos os filtros ativos sobre a base completa, antes da paginação.
- Escolha 100, 250, 500, 1.000 ou todas as empresas por cidade; os filtros são aplicados antes da paginação.
- Ao avançar uma página, a cidade atual desliza para a esquerda e a próxima entra pela direita, já centralizada. Ao voltar, o movimento é invertido. A tabela acompanha a página; com movimento reduzido, a troca é imediata.
- Alterne entre vista isométrica e superior. A tecla 0 restaura a visão geral.
- Os controles “Cidade viva” e “Efeitos de risco” permitem ocultar as respectivas animações. A preferência do sistema por movimento reduzido é respeitada.

## Clima local e iluminação

Com **Cidade viva** ativa (padrão), o navegador solicita permissão de localização para consultar o [Open-Meteo](https://open-meteo.com/) e representar chuva ou neve. O clima automático acompanha esse controle. A geolocalização exige HTTPS em produção; `localhost` também pode ser usado no desenvolvimento. Negar a permissão ou receber um erro de localização/API mantém o mapa disponível, com uma mensagem de estado e sem precipitação.

A iluminação automática continua usando exclusivamente o relógio local do navegador: nascente das 6h às 8h, dia das 8h às 17h, poente das 17h às 19h e noite das 19h às 6h. O seletor permite escolher esses períodos manualmente. O clima não altera o horário nem o fuso da iluminação.

A propriedade booleana `showEnvironmentControls` de `CityMap` e `CityChart` exibe os dropdowns **Iluminação** e **Clima**. O padrão é `false`; a demonstração em `src/App.jsx` usa `true`. Para ocultá-los, remova a propriedade ou use `showEnvironmentControls={false}`:

```jsx
<CityMap atlas={atlas} showEnvironmentControls />
```

Os seletores independentes permitem combinar **Dia**, **Nascente/poente** ou **Noite** com **Sem precipitação**, **Chuva** ou **Neve**. **Automático** retoma o relógio local e o clima da API, respectivamente. O estado do mapa identifica o clima manual como simulação. Ambos ficam desabilitados com **Cidade viva** desligada, preservando as escolhas para a reativação. Ocultar os dropdowns devolve a cena aos valores fornecidos pelas propriedades (na aplicação, horário local e clima da API); as consultas automáticas continuam seguindo Cidade viva.


- As consultas são feitas diretamente pelo cliente, sem cadastro, API key ou backend no modo padrão.
- O Atlas solicita localização sem alta precisão e arredonda as coordenadas para duas casas decimais antes do envio. Coordenadas e respostas ficam somente em memória durante a sessão; não são gravadas em `localStorage`, cookies ou no cadastro de empresas. O provedor recebe o IP e as coordenadas aproximadas, sujeitos à [política do Open-Meteo](https://open-meteo.com/en/terms).
- O resultado é reutilizado por 15 minutos. Consultas periódicas ficam suspensas com a aba oculta e retomam quando necessário ao voltar. Cada consulta tem limite de 10 segundos; falhas removem a precipitação e são tentadas novamente após 15 minutos. Para tentar obter a localização novamente, reative Cidade viva.
- Desativar **Cidade viva** interrompe consultas pendentes, atualização periódica e partículas, restaurando a iluminação diurna conforme o comportamento existente. Reativar usa a permissão do navegador e pode reutilizar um resultado ainda válido em memória.
- As partículas Three.js reutilizam buffers e não interferem na seleção das empresas. A neve usa flocos pequenos, distribuição irregular e velocidades variadas; acumula uma cobertura leve e parcial no solo e nos telhados em cerca de 24 segundos, sem cobrir toda a cor dos edifícios. A cobertura é removida ao sair da neve ou desligar Cidade viva.
- A chuva adapta seu contraste à iluminação: azul mais escuro durante o dia e claro à noite. Durante a chuva, cada relâmpago tem um clarão de início imediato seguido de um ou dois flashes mais fracos, com pausas escuras irregulares; o primeiro ocorre após 12–24 segundos e os seguintes a cada 18–38 segundos de animação, em intervalos aleatórios. Não há som. Com movimento reduzido, o clima aparece em texto e partículas, acúmulo e relâmpagos ficam ocultos.
- `weather_code`, `rain`, `showers` e `snowfall` determinam o efeito; neve tem prioridade na precipitação mista. São estimativas da região, não detecção instantânea na rua do usuário. Respostas incompletas ou com horário distante mais de 90 minutos são rejeitadas.

### Créditos e responsabilidade por uso comercial

Dados meteorológicos fornecidos pelo **[Open-Meteo](https://open-meteo.com/)** sob **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**. O Atlas interpreta esses dados como efeitos visuais. Os links de atribuição e licença aparecem no rodapé do mapa e devem ser preservados nas distribuições que utilizarem os dados.

A licença do código deste projeto e as condições de acesso ao serviço são independentes. Disponibilizar o Atlas como open source **não autoriza automaticamente o uso comercial do endpoint gratuito do Open-Meteo**. Conforme os [termos do provedor](https://open-meteo.com/en/terms), esse endpoint é destinado a uso não comercial e possui limites de requisições.

**Quem implantar ou operar uma instância é responsável por verificar e cumprir os termos aplicáveis ao seu uso**, incluindo uso comercial, atribuição, limites e privacidade. Para uma implantação comercial, o operador deve configurar um serviço compatível, por exemplo uma assinatura comercial através de um endpoint próprio, uma instância autogerenciada conforme suas licenças ou outro provedor autorizado. A mesma regra vale para demonstrações hospedadas pelo mantenedor.

O endereço da API pode ser substituído no build:

```sh
VITE_WEATHER_API_URL=https://clima.seudominio.com/v1/forecast npm run build
```

O endpoint deve aceitar os parâmetros e retornar o contrato `current` da [Forecast API](https://open-meteo.com/en/docs), incluindo `time` em segundos Unix, e permitir CORS para a origem da SPA. O cliente envia `credentials: omit`. Variáveis `VITE_*` ficam públicas no bundle: **não inclua chaves comerciais secretas na URL ou no código do cliente**; um endpoint próprio deve acrescentá-las no servidor quando necessário. Consulte os limites atuais do provedor antes de publicar uma instância.

## Dados

O botão de exemplo baixa um JSON no formato aceito:

```json
[
  {
    "id": "minha-empresa",
    "name": "Minha empresa",
    "metric": { "label": "Receita mensal", "value": 1350.75 },
    "categories": [
      { "label": "Varejo", "value": "retail" },
      { "label": "Serviços", "value": "services" }
    ],
    "status": "warning"
  }
]
```

`metric.label` é o nome exibido na tabela, nos detalhes e no tooltip; `metric.value` é um número finito não negativo que determina o porte da construção, preservando casas decimais. Pode representar usuários, receita, contratos ou outra medida. Com labels diferentes na mesma base, a tabela usa o cabeçalho “Valor” e identifica a métrica em cada linha.

`categories` contém um ou mais pares `{ "label": "Nome exibido", "value": "identificador" }`. `value` e `label` são textos não vazios, e um mesmo identificador deve ter o mesmo label em toda a base. O mapa aceita até **três categorias distintas por base**, com até sete combinações. Os bairros, filtros, detalhes e etiquetas usam esses labels. Identificadores são ordenados para atribuir os bits internos; a atribuição acontece antes dos filtros e da paginação. A mesma empresa aparece uma única vez, na interseção exata de suas categorias.

`id` identifica a empresa e deve ser único; quando omitido, é gerado na importação. `name` é texto não vazio. `status` aceita `healthy`, `warning` e `critical`. O formato anterior (`users` e `systems: ["A", "B", "C"]`) continua aceito e é convertido para métrica e categorias. Os códigos antigos mantêm seus significados: Leads, Inteligência Artificial e Imobiliárias.

A importação aceita uma lista JSON com até 5 MB, acontece no navegador e não persiste após recarregar. Uma importação inválida preserva a cidade anterior.

Cada página gera uma cidade independente. O território é calculado a partir das quantidades por combinação de categorias, com três retângulos sobrepostos no grid. Os lotes mais próximos do centro são ocupados primeiro dentro de cada região. As regiões representam cada categoria e suas interseções; os nomes vêm dos dados. Todas as ruas se cruzam a 90 graus no plano do terreno. Parques são reservados antes da alocação. As regiões crescem conforme a quantidade de empresas na página. A opção Todas reúne os resultados filtrados em uma única cidade. A configuração inicial é 100 empresas por cidade, com alternativas 250, 500 e 1.000. Não há atualização automática dos dados das empresas nesta versão.

## SPA e backend futuro

A aplicação é uma SPA React compilada pelo Vite. O servidor entrega HTML, CSS, JavaScript e JSON; toda a transformação do cadastro em cidade acontece no navegador. Não há SSR nem dependência de backend para gerar geometrias.

A fonte é declarada em `public/config.json` (copiado para `/config.json`):

```json
{"dataUrl":"/data/empresas.json","mode":"demo"}
```

O build gera o JSON demonstrativo com 1.400 registros. Para usar um backend, altere `dataUrl` para seu endpoint e `mode` para `live`. O endpoint deve retornar uma lista no formato documentado acima ou um objeto `{ "companies": [...] }`. Ele não precisa enviar posições, geometrias, quadras ou informações de Three.js. A SPA valida o JSON, filtra a base inteira, pagina, calcula as interseções, distribui os lotes e constrói a cena.

`src/data-source.js` concentra a leitura HTTP e a conversão do contrato. No mesmo domínio, cookies de sessão usam `credentials: same-origin`. Um endpoint em outro domínio precisa permitir CORS; a autenticação desse backend ainda não foi implementada. Erros de carregamento são exibidos e não são substituídos silenciosamente por dados fictícios. O carregamento ocorre ao abrir a aplicação; atualização automática ainda não foi implementada.

## Renderização

A cidade usa geometria simplificada: um bloco por construção, janelas/ruas/calçadas em planos, carros sem rodas, pedestres sem pernas, copas/cabeças e volumes de fogo/fumaça de oito faces. O gramado é um plano verde, as calçadas são planos cinza e os lotes dos prédios são planos claros. Não há molduras de janela, telhados extras, fundações ou blocos de grama. Bancos esparsos usam um único bloco baixo e compartilham o instanciamento dos troncos. A geometria base caiu de 96.830 para 26.022 triângulos com 100 empresas e de 804.354 para 198.042 com 1.400; `node scripts/benchmark-city.mjs` reproduz a medição sem efeitos. Os materiais iluminados usam sombreamento plano. A emissão pelas janelas mantém o movimento e a restrição à abertura.

Todo lote sem empresa na cidade exibida recebe piso verde, com distribuição entre clareiras e grupos de até três árvores, incluindo os parques reservados e terrenos livres dentro das sete regiões. Cerca de 9% dos lotes recebem um banco, em orientações variadas e com espaço livre ao redor. A vegetação é recalculada após filtros, paginação e importação, sem ocupar ruas ou lotes com empresas. Quantidades, cores, tamanhos e posições variam por coordenada de forma determinística; as copas permanecem dentro dos jardins. As mesmas geometrias são reutilizadas por instanciamento.

Construções, janelas, vegetação, veículos e pedestres usam `InstancedMesh`. O trânsito é simulado em `src/traffic.js`, com faixas direcionais, curvas de conversão, aceleração, frenagem e distância mínima entre veículos. Os cruzamentos conectam os quatro braços do asfalto e possuem calçadas, faixas de pedestres, linhas de parada e semáforos. Cada cruzamento reserva sua área para um veículo de cada vez e possui uma fase exclusiva de travessia, com liberação somente após a saída de carros e pedestres. A quantidade de veículos e pedestres acompanha as quadras, limitada a 36 carros e 60 pedestres.

As chamas e a fumaça são volumes 3D instanciados, definidos em `src/plumes.js` e renderizados em `src/plume-renderer.js`. Cada emissor corresponde a uma janela real da geometria. As partículas nascem atrás da fachada, cabem na abertura e saem na direção normal à parede; a expansão começa do lado de fora. A vazão depende da área da janela. O movimento aproxima pressão de saída, arrasto, empuxo, turbulência e resfriamento; não é uma simulação CFD. O teste de profundidade oculta as fontes dentro do prédio. O risco médio produz somente fumaça clara e alerta, e o alto risco acrescenta chama e brilho no interior das janelas. A cor da empresa sempre identifica as categorias, nunca o risco.

O modelo de porte está em `src/model.js` (`sizeForValue`) e usa quatro faixas demonstrativas do valor numérico: abaixo de 90, de 90 a menos de 550, de 550 a menos de 1.800 e a partir de 1.800. A troca do label não altera esses limites; a escala permanece a mesma para qualquer métrica. O diagnóstico inicial é fictício: os efeitos representam o status recebido, sem calcular risco real.

Em risco médio, casas emitem fumaça por uma janela; prédios pequenos, médios e grandes usam respectivamente duas, três e cinco janelas, distribuídas entre andares e fachadas. A fumaça continua clara, sem chamas; o alto risco mantém o fogo e a fumaça escura.

Construções em nível crítico também piscam em vermelho nas construções, alternando de forma instantânea com a cor original das categorias. Cada empresa possui uma sequência própria de intervalos pseudoaleatórios entre 450 e 1.100 ms, com início deslocado, sem transição gradual. Todas as faces do bloco compartilham o mesmo ritmo; a sequência é estável por empresa ao trocar filtros ou páginas. O controle “Efeitos de risco” desativa o piscar e restaura as cores originais. Com movimento reduzido, o destaque vermelho fica estático.

## Formatação

O projeto usa Biome, configurado em `biome.json`, com suporte às diretivas do Tailwind CSS 4. Execute `npm run format` para formatar os arquivos ou `npm run format:check` para conferir sem alterar. Arquivos gerados, dependências e o lockfile ficam fora da formatação.

## Verificação

`npm test` verifica pertinência às sete regiões, lotes exclusivos, ausência de ocupação em ruas/parques, filtros antes da paginação, todas as opções de tamanho de página, crescimento por região e validação de importação. Os testes de trânsito simulam vários ciclos em diferentes cidades para verificar colisões entre carros, atropelamentos, separação de fases e continuidade da circulação. Os testes de emissão verificam origem interna, restrição à abertura, expansão externa e integridade dos volumes Three.js. `npm run build` gera o bundle. A cena exige WebGL. Os testes de navegador usam renderização por software; medições de desempenho em hardware real continuam necessárias.

`window.atlas.summary` expõe contagens de empresas e estatísticas de desenho para auxiliar a integração.

As etiquetas sobre o mapa exibem os labels das categorias, incluindo as combinações nas interseções.

A navegação mantém somente uma cidade WebGL ativa e, durante o slider, uma captura 2D temporária da cidade anterior. Geometrias, materiais, texturas e buffers de instâncias da cidade antiga são descartados antes da montagem seguinte. Ao terminar ou cancelar a animação, a captura é removida e seu bitmap é zerado. O indicador animado de carregamento é exibido antes da preparação; cliques repetidos são bloqueados e alterações de filtro cancelam pedidos pendentes.

O alerta de risco médio usa triângulo amarelo vivo, exclamação e contorno escuros e borda externa branca, com tamanho ampliado e cor independente do mapeamento tonal da cena.

A extensão compartilha o layout entre a marca TanStack e o renderer 3D. Mudanças de paleta reaproveitam a geometria; mudanças de valores da métrica ou saúde preservam terreno, trânsito e câmera quando os lotes permanecem iguais. Com animações desligadas e câmera estabilizada, a cena renderiza sob demanda. Os contratos e as regras de atualização estão em `src/charts/city/README.md`.
