# Atlas na sua máquina

Aplicação Vite com React, Tailwind CSS e shadcn/ui. O mapa continua usando Three.js, com dados demonstrativos locais.

## Desenvolvimento

Requer Node.js 22.12 ou superior (ou 24 LTS) e npm.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:4173. O servidor atende somente sua máquina e atualiza o navegador ao editar os arquivos. `npm start` é um atalho para o mesmo servidor. Pressione Ctrl+C para parar. Para usar outra porta: `npm run dev -- --port 5173`.

## Build de produção

```sh
npm run build
npm run preview
```

O build gera `dist/`, pronta para hospedagem estática. A prévia também usa a porta 4173; pare o servidor de desenvolvimento antes de iniciá-la.

Three.js é incluído no bundle. As fontes do Google Fonts têm alternativas locais. A geração de dados de exemplo acontece automaticamente antes do desenvolvimento e do build, sem depender de um backend.

## Formatação

O projeto usa Biome, configurado em `biome.json`, com suporte às diretivas do Tailwind CSS 4. Execute `npm run format` para formatar os arquivos ou `npm run format:check` para conferir sem alterar. Arquivos gerados, dependências e o lockfile ficam fora da formatação.

## Verificação

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Os testes Playwright iniciam o Vite automaticamente quando necessário. Se já houver um servidor local na porta 4173, ele é reutilizado.

## Arquivos principais

- `src/App.jsx`: organização da interface React.
- `src/components/`: componentes da aplicação.
- `src/components/ui/`: componentes shadcn/ui.
- `src/hooks/use-atlas.js`: dados, filtros, paginação, importação e seleção.
- `src/hooks/use-city.js`: integração e descarte da cena Three.js.
- `src/city.js`: cena, prédios, trânsito, efeitos e câmera.
- `src/model.js`: empresas, regiões e distribuição dos lotes.
- `src/data-source.js`: leitura da fonte JSON.
- `src/index.css`: Tailwind e tema shadcn/ui.
- `public/config.json`: endereço da fonte de dados.
- `scripts/generate-demo.mjs`: geração dos dados demonstrativos.
- `vite.config.js`: Vite, plugin React, Tailwind e alias `@/`.
- `components.json`: configuração do shadcn/ui.

Para conectar um backend, configure `dataUrl` e `mode` em `public/config.json`; o contrato está no README.md. A importação de JSON continua restrita ao navegador e não persiste após recarregar a página.
