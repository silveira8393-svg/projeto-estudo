# Relatorio Codex

Auditoria realizada em 25/08/2026, considerando exclusivamente este repositorio como fonte de verdade. Nenhum segredo foi criado, exibido ou registrado.

### Estado encontrado

- Aplicacao full-stack em um unico processo Node.js: React/Vite no frontend e Express no backend.
- Dependencias nao estavam instaladas e nao havia `package-lock.json`; o repositorio continha `bun.lock`.
- Nao existe `.env` local. As chamadas Gemini nao podem ser executadas de ponta a ponta sem configuracao externa.
- Nao existe `README.md` no clone.
- Frontend, backend, build e parsers estao operacionais apos a instalacao.
- Todo o estado funcional e mantido em memoria pelo React. Recarregar a pagina apaga perfis, projetos, material, configuracao, atividades e pontuacao.
- Nao ha banco de dados, Supabase, Google Drive, API de persistencia ou armazenamento local no navegador.

### Arquitetura atual

- Frontend: React 19.2.8, React DOM 19.2.8, TypeScript 5.8.3 e Vite 6.4.3.
- Estilos/UI: Tailwind CSS 4.3.3, plugin `@tailwindcss/vite` 4.3.3, Lucide React 0.546.0 e Motion 12.43.0.
- Backend: Node.js com Express 4.22.2, iniciado por `server.ts` em desenvolvimento e pelo bundle `dist/server.cjs` em producao.
- Uploads: Multer 2.2.0, armazenamento em memoria, limite de 30 MB por arquivo.
- Corpo JSON e URL encoded: limite de 20 MB.
- PDF: `pdf-parse` 2.4.5.
- DOCX: Mammoth 1.12.1.
- TXT e outros arquivos tratados como texto: conversao UTF-8 e normalizacao local.
- IA: SDK `@google/genai` 2.19.0, usado somente no backend.
- Desenvolvimento: o Express monta Vite como middleware SPA.
- Producao: o Express serve `dist` estaticamente e aplica fallback para `dist/index.html`.

Fluxo de dados atual:

1. O usuario cria perfil e projeto; ambos ficam apenas em estado React.
2. O frontend envia texto JSON ou arquivo multipart para `/api/materials/extract`.
3. O backend extrai texto localmente e devolve titulo, tipo, texto, contagem de palavras e, para PDF, paginas.
4. O frontend envia o texto extraido para `/api/ai/structure`.
5. O backend solicita ao Gemini uma estrutura JSON de topicos.
6. O frontend seleciona topicos e envia conteudo/configuracao para `/api/ai/generate`.
7. O Gemini devolve flashcards e questoes em JSON; respostas e pontuacao ficam somente no React.

### Arquivos principais

- `package.json`: dependencias e scripts npm.
- `package-lock.json`: lockfile npm criado nesta auditoria.
- `bun.lock`: lockfile herdado do clone; nao foi alterado nem removido.
- `vite.config.ts`: React, Tailwind, alias `@` e controle de HMR por `DISABLE_HMR`.
- `server.ts`: Express, limites, uploads, rotas API, middleware Vite e arquivos estaticos.
- `server/parsers.ts`: extracao de PDF, DOCX e texto simples.
- `server/ai.ts`: cliente Gemini, modelo, prompts, schemas JSON, retry e normalizacao.
- `src/App.tsx`: fluxo principal e todo o estado da aplicacao.
- `src/lib/api.ts`: cliente HTTP defensivo, validacao de status e `Content-Type` JSON.
- `src/components/`: interface existente para cabecalho, entrada de material, configuracao, topicos, atividades, modais e estados vazios.
- `src/types.ts`: contratos de dominio do frontend/backend.
- `.env.example`: placeholders de ambiente.
- `.gitignore`: ignora `.env*` e libera apenas `.env.example`.
- `index.html` e `metadata.json`: metadados genericos herdados do Google AI Studio.

### Dependencias

Gerenciador adotado: npm 11.13.0 sobre Node.js 24.17.0. Embora exista `bun.lock`, nao ha requisito tecnico no codigo que obrigue Bun, e todos os scripts usam ferramentas compativeis com npm.

Scripts:

| Script | Comando | Finalidade |
| --- | --- | --- |
| `npm run dev` | `tsx server.ts` | servidor integrado em desenvolvimento |
| `npm run lint` | `tsc --noEmit` | checagem TypeScript; nao ha ESLint configurado |
| `npm run build` | Vite e esbuild | frontend em `dist` e backend em `dist/server.cjs` |
| `npm start` | Node com `NODE_ENV=production` | servidor do build de producao |

`npm install` adicionou 253 pacotes e reportou zero vulnerabilidades no audit executado em 25/08/2026.

### Rotas

Todas as respostas das APIs testadas usam `Content-Type: application/json; charset=utf-8`, inclusive validacoes, falhas de IA, JSON malformado e 404.

| Metodo e rota | Payload | Resposta principal | Status observado |
| --- | --- | --- | --- |
| `GET /api/health` | nenhum | `{ status, time }` | `200` |
| `POST /api/materials/extract` | JSON `{ textInput, title? }` ou multipart `file` e `title?` | `{ success, title, fileType, text, wordCount, pageCount? }` | `200`; `400` sem material; `500` em falha de parser |
| `POST /api/ai/structure` | JSON `{ materialTitle?, rawText }` | `{ success, title, topics }` | `400` para texto menor que 20 caracteres; `500` sem chave; sucesso Gemini nao testado |
| `POST /api/ai/generate` | JSON com `materialTitle?`, `combinedContent`, `selectedTopics?`, `mode?`, `difficulty?` e contagens | `{ success, flashcards, multipleChoiceQuestions, trueFalseQuestions, warnings? }` | `400` sem conteudo; `500` sem chave; `200` vazio quando todas as contagens sao zero |
| qualquer `/api/*` inexistente | qualquer | `{ success: false, error }` | `404` |

Valores padrao de geracao: `mode=faithful`, `difficulty=auto` e contagens zero no backend. O frontend solicita inicialmente 3 flashcards, 2 questoes de multipla escolha e 2 de verdadeiro/falso.

Porta e enderecos:

- Porta fixa: `3000`, escuta em `0.0.0.0`.
- Local: `http://localhost:3000`.
- API health: `http://localhost:3000/api/health`.
- Vite nao usa uma segunda porta; ele e middleware do Express.

### Variaveis de ambiente

| Variavel | Uso | Situacao |
| --- | --- | --- |
| `GEMINI_API_KEY` | obrigatoria para criar o cliente Gemini | documentada em `.env.example`; ausente localmente |
| `AI_MODEL` | sobrescreve o modelo Gemini | usada no codigo e documentada em `.env.example` |
| `AI_REQUEST_TIMEOUT_MS` | timeout de cada tentativa Gemini em milissegundos | opcional; padrao de 60.000 ms |
| `AI_MAX_ATTEMPTS` | total maximo de tentativas, incluindo a inicial | opcional; padrao de 3 |
| `AI_RETRY_INITIAL_BACKOFF_MS` | espera inicial do backoff exponencial | opcional; padrao de 1.200 ms |
| `NODE_ENV` | alterna middleware Vite e arquivos de producao | definido pelo script `npm start` apos correcao |
| `DISABLE_HMR` | desativa HMR e file watching no Vite | usada em `vite.config.ts`, nao documentada no exemplo |
| `APP_URL` | declarada no exemplo do AI Studio | nao e consumida pelo codigo atual |

Modelo Gemini padrao: `gemini-3.7-flash`, centralizado em `AI_CONFIG.getModel()` e sobrescrevivel por `AI_MODEL`.

Resiliencia Gemini:

- Tres tentativas no total por padrao, configuraveis por `AI_MAX_ATTEMPTS`.
- Backoff exponencial inicial de 1.200 ms por padrao, configuravel e com jitter.
- Retry somente para HTTP `429`, `500`, `502`, `503`, `504` e falhas temporarias de rede reconhecidas.
- Sem retry para timeout local, HTTP `400`, `401`, `403`, chave invalida, modelo inexistente ou payload invalido.
- Cada tentativa tem timeout padrao de 60 segundos, configuravel por `AI_REQUEST_TIMEOUT_MS`.
- O SDK recebe `AbortSignal` e timeout HTTP; o backend tambem usa uma corrida de timeout para encerrar mesmo se a operacao subjacente nao respeitar o cancelamento.
- Timeout local retorna `504 application/json`, codigo `AI_REQUEST_TIMEOUT` e mensagem compreensivel.
- Excecoes comuns das duas rotas de IA continuam em JSON `500`; no frontend, blocos `finally` removem os estados de loading.

Segredos:

- Nenhuma API key, token, senha ou credencial hardcoded foi encontrada pela busca no repositorio versionado.
- `.env` nao existe e esta ignorado por `.gitignore` via `.env*`.
- `.env.example` contem somente placeholders e e intencionalmente versionado.

### Alteracoes realizadas

- Instalacao das dependencias com npm.
- Criacao de `package-lock.json` para reproduzir a resolucao npm usada nesta maquina.
- Correcao minima do script `npm start` para definir `NODE_ENV=production` de forma compativel com Windows, sem adicionar dependencia.
- Adicao de timeout e cancelamento explicitos por tentativa Gemini em `server/ai.ts`.
- Restricao do retry a erros HTTP transitorios e falhas temporarias de rede, com tentativas e backoff configuraveis.
- Mapeamento de timeout local para HTTP `504` JSON em `server.ts`.
- Documentacao das variaveis de modelo, timeout e retry em `.env.example`.
- Criacao deste `RELATORIO_CODEX.md`.
- Nenhuma tela, estilo, identidade visual, componente ou funcionalidade foi alterado.

### Testes executados

| Teste | Resultado |
| --- | --- |
| `npm install` | passou; zero vulnerabilidades reportadas |
| `npm run lint` (`tsc --noEmit`) | passou |
| `npm run build` | passou; frontend e backend gerados em `dist` |
| `npm run dev` | passou em `http://localhost:3000` |
| frontend HTML em desenvolvimento | `200 text/html`, com Vite middleware |
| `GET /api/health` em desenvolvimento | `200 application/json` |
| texto simples via JSON | `200`, texto e 9 palavras extraidos |
| TXT via multipart | `200`, conteudo extraido |
| PDF minimo valido via multipart | `200`, texto extraido e 1 pagina identificada |
| DOCX real via multipart | `200`, texto extraido |
| material ausente | `400 application/json` correto |
| JSON malformado | `400 application/json` pelo handler global |
| estrutura com texto curto | `400 application/json` correto |
| estrutura sem chave Gemini | `500 application/json`, erro encerrado corretamente |
| geracao sem conteudo | `400 application/json` correto |
| geracao sem chave Gemini | `500 application/json`, erro encerrado corretamente |
| geracao com contagens zero | `200`, listas vazias sem chamada externa |
| rota `/api/*` inexistente | `404 application/json` |
| `npm start` apos correcao | passou; serve `dist`, sem cliente Vite |
| HTML, bundle JS e health em producao | todos `200`, tipos de conteudo corretos |
| timeout simulado de 30 ms | passou; `AbortSignal` acionado, erro `AI_REQUEST_TIMEOUT` e somente 1 tentativa |
| retry simulado HTTP `503` | passou; sucesso na terceira tentativa |
| retry simulado HTTP `504` | passou; sucesso na segunda tentativa |
| erro simulado HTTP `401` | passou; somente 1 tentativa, sem retry |
| TypeScript e build apos timeout/retry | passaram |
| `/api/health` apos timeout/retry | `200 application/json` |
| rota de IA sem chave apos timeout/retry | `500 application/json`, sem regressao |

Nao foi realizado teste visual automatizado em navegador nem interacao manual completa da interface. A entrega HTTP do frontend, compilacao e bundle foram validados. A chamada Gemini real nao foi executada porque nao ha chave local.

### Problemas encontrados

1. Corrigido: `npm start` nao definia ambiente de producao e, mesmo executando `dist/server.cjs`, montava o Vite de desenvolvimento.
2. Bloqueio de ambiente: nao ha `GEMINI_API_KEY`; o fluxo funcional para apos a extracao local e antes da estrutura de topicos.
3. Corrigido: chamadas Gemini agora possuem timeout e cancelamento explicitos por tentativa, sem retry do timeout local.
4. `DISABLE_HMR` e usado, mas nao aparece em `.env.example`; `APP_URL` aparece no exemplo, mas nao e usado.
5. Porta `3000` e modelo padrao estao definidos no codigo. O modelo e centralizado e sobrescrevivel; a porta nao e configuravel.
6. O repositorio passa a conter lockfiles de npm e Bun. Para evitar resolucoes divergentes, npm e `package-lock.json` devem ser considerados o caminho local adotado nesta auditoria.
7. `README.md` esta ausente.
8. `index.html` ainda usa titulo, descricao e idioma genericos do Google AI Studio. Nao foi alterado para preservar a interface/metadados nesta etapa.
9. Nao ha persistencia; toda informacao e perdida ao recarregar a pagina.
10. O retorno de erros inclui `error.message` do SDK/parser. Nao houve exposicao de segredo nos testes, mas mensagens de terceiros podem revelar detalhes internos e merecem revisao antes de producao publica.

### Estado atual

- O projeto roda neste PC com `npm run dev` em `http://localhost:3000`.
- O build de producao roda com `npm run build` seguido de `npm start`, no mesmo endereco.
- Frontend e backend respondem corretamente nos testes tecnicos realizados.
- As APIs locais de health e extracao respondem corretamente.
- PDF, DOCX e TXT estao preparados e foram validados com arquivos reais/minimos pela rota multipart.
- Gemini esta integrado e configuravel no codigo, mas nao configurado neste ambiente por ausencia de chave.
- As falhas sem chave retornam JSON e liberam o loading do frontend.
- Chamadas Gemini pendentes agora sao encerradas pelo backend no limite configurado; o frontend recebe JSON `504` e executa seu `finally`, encerrando o loading.
- O Marco 1 esta tecnicamente estavel para health, interface compilada e extracao local. Nao e possivel confirmar o fluxo completo de estruturacao e geracao sem uma chave valida e sem criterios formais adicionais de aceite do Marco 1.
- Podem ser iniciados testes funcionais locais que nao dependam de IA. O teste funcional completo do Marco 1 permanece bloqueado apenas na etapa Gemini e na validacao visual/interativa ainda nao executada.

### Pendencias

- Configurar localmente uma `GEMINI_API_KEY` valida, sem versiona-la.
- Validar se `gemini-3.7-flash` esta disponivel para a conta/projeto da chave usada.
- Executar o fluxo completo no navegador: perfil, projeto, upload/colar, topicos, configuracao, atividades, respostas e resumo.
- Definir criterios objetivos de aceite do Marco 1 para declarar conclusao, especialmente quanto a qualidade/fidelidade das respostas Gemini.
- Decidir em etapa futura como tratar metadados genericos e persistencia, sem ampliar o escopo desta estabilizacao.

### Proximos passos recomendados

1. Criar `.env` local com `GEMINI_API_KEY` valida e, se necessario, `AI_MODEL`, mantendo o arquivo ignorado.
2. Repetir `/api/ai/structure` e `/api/ai/generate` com entradas controladas e validar schema, quantidades e fidelidade ao material.
3. Fazer o teste funcional completo do Marco 1 em navegador desktop e mobile, sem redesenho.
4. Validar em uma chamada Gemini real o timeout configurado e as mensagens retornadas pelo SDK, sem registrar a chave.
5. Formalizar os criterios de aceite do Marco 1 e registrar os resultados de cada cenario.
