# Relatorio Codex

Auditoria realizada em 25/08/2026, considerando exclusivamente este repositorio como fonte de verdade. Nenhum segredo foi criado, exibido ou registrado.

### Estado encontrado

- Aplicacao full-stack em um unico processo Node.js: React/Vite no frontend e Express no backend.
- Dependencias nao estavam instaladas e nao havia `package-lock.json`; o repositorio continha `bun.lock`.
- Existe `.env` local, ignorado pelo Git, com `GEMINI_API_KEY` configurada. A chave foi validada em chamadas reais de estruturacao Gemini sem ser exibida ou registrada.
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
| `POST /api/ai/structure` | JSON `{ materialTitle?, rawText }` | `{ success, title, topics }` | `200` com Gemini real para TXT, DOCX e PDF; `400` para texto menor que 20 caracteres |
| `POST /api/ai/generate` | JSON com `materialTitle?`, `combinedContent`, `selectedTopics?`, `mode?`, `difficulty?` e contagens | `{ success, flashcards, multipleChoiceQuestions, trueFalseQuestions, warnings? }` | `400` sem conteudo; `200` vazio quando todas as contagens sao zero; geracao Gemini com contagens positivas ainda nao testada |
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
| `GEMINI_API_KEY` | obrigatoria para criar o cliente Gemini | configurada no `.env` local ignorado e validada em chamadas reais; valor nao registrado |
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
- `.env` existe localmente e esta ignorado por `.gitignore` via `.env*`.
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
| estrutura em cenario controlado sem chave | `500 application/json`, erro encerrado corretamente; nao representa a configuracao local atual |
| geracao sem conteudo | `400 application/json` correto |
| geracao em cenario controlado sem chave | `500 application/json`, erro encerrado corretamente; nao representa a configuracao local atual |
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
| rota de IA em cenario controlado sem chave apos timeout/retry | `500 application/json`, sem regressao |

Teste funcional focado no fluxo de upload, executado em 25/08/2026 com arquivos pequenos gerados localmente e sem exposicao de secrets:

| Formato | Multipart recebido | `/api/materials/extract` | Texto extraido | Palavras | Texto enviado para `/api/ai/structure` | `/api/ai/structure` | Topicos | Fluxo completo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TXT | sim | `200 application/json; charset=utf-8` | 299 caracteres | 51 | sim, os mesmos 299 caracteres retornados pela extracao | `200 application/json; charset=utf-8` | 2 | sucesso |
| DOCX | sim | `200 application/json; charset=utf-8` | 299 caracteres | 51 | sim, os mesmos 299 caracteres retornados pela extracao | `200 application/json; charset=utf-8` | 2 | sucesso |
| PDF | sim | `200 application/json; charset=utf-8` | 113 caracteres | 22 | sim, os mesmos 113 caracteres retornados pela extracao | `200 application/json; charset=utf-8` | 2 | sucesso |

Topicos retornados:

- TXT: `Evaporacao e Condensacao`; `Precipitacao, Infiltracao e Escoamento`.
- DOCX: `Evaporacao e Condensacao`; `Precipitacao, Infiltracao e Escoamento`.
- PDF: `Ciclo da Agua`; `Evaporacao e Resfriamento do Vapor`.

Em cada caso, o teste construiu o payload de estrutura com `rawText` apontando diretamente para o campo `text` da resposta de extracao e confirmou igualdade e tamanho antes do envio. A chave configurada no `.env` foi apenas consumida pelo servidor e nao foi impressa ou registrada. Nenhuma falha ocorreu e nenhuma correcao de codigo foi necessaria.

Nao foi realizado teste visual automatizado em navegador nem interacao manual completa da interface. A entrega HTTP do frontend, compilacao e bundle foram validados. Chamadas Gemini reais de `/api/ai/structure` foram executadas com sucesso para TXT, DOCX e PDF usando a chave local. A chamada Gemini real de `/api/ai/generate` com contagens positivas ainda nao foi executada.

### Problemas encontrados

1. Corrigido: `npm start` nao definia ambiente de producao e, mesmo executando `dist/server.cjs`, montava o Vite de desenvolvimento.
2. Resolvido: a `GEMINI_API_KEY` esta configurada localmente e o fluxo de extracao seguido de estruturacao Gemini foi validado para TXT, DOCX e PDF.
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
- Gemini esta integrado, configurado neste ambiente pela `GEMINI_API_KEY` local e validado com chamadas reais de estruturacao.
- O cenario controlado de chave ausente retorna JSON e libera o loading do frontend.
- Chamadas Gemini pendentes agora sao encerradas pelo backend no limite configurado; o frontend recebe JSON `504` e executa seu `finally`, encerrando o loading.
- O fluxo funcional de upload, extracao e estruturacao Gemini foi concluido com sucesso para TXT, DOCX e PDF.
- O Marco 1 esta tecnicamente estavel para health, interface compilada, upload, extracao local e estruturacao Gemini real nos tres formatos suportados.
- O teste funcional completo do Marco 1 nao esta bloqueado por chave ou pela etapa de estruturacao. Permanecem a geracao Gemini com contagens positivas, a validacao visual/interativa e a definicao formal dos criterios de aceite.

### Pendencias

- Executar `/api/ai/generate` com contagens positivas e validar flashcards e questoes retornados.
- Executar o fluxo completo no navegador: perfil, projeto, upload/colar, topicos, configuracao, atividades, respostas e resumo.
- Definir criterios objetivos de aceite do Marco 1 para declarar conclusao, especialmente quanto a qualidade/fidelidade das respostas Gemini.
- Decidir em etapa futura como tratar metadados genericos e persistencia, sem ampliar o escopo desta estabilizacao.

### Proximos passos recomendados

1. Executar `/api/ai/generate` com entrada controlada e validar schema, quantidades e fidelidade ao material.
2. Fazer o teste funcional completo do Marco 1 em navegador desktop e mobile, sem redesenho.
3. Validar em uma chamada Gemini real o timeout configurado e as mensagens retornadas pelo SDK, sem registrar a chave.
4. Formalizar os criterios de aceite do Marco 1 e registrar os resultados de cada cenario.

---

## Validacao da tarefa atual - `/api/ai/generate` com Gemini real (25/08/2026)

### Resumo

- Validada a rota `POST /api/ai/generate` com uma chamada Gemini real, um unico topico, `mode=faithful`, dificuldade basica, 3 flashcards, 2 questoes de multipla escolha e 2 questoes de verdadeiro/falso.
- O teste de sucesso usou um texto controlado e autocontido sobre a fotossintese de uma planta ficticia chamada "luminaria", facilitando a verificacao objetiva de fidelidade e a deteccao de conhecimento externo.
- Nenhuma interface, integracao, persistencia ou funcionalidade foi alterada.
- Nenhuma correcao de codigo foi necessaria para concluir o teste.

### Arquivos alterados

- `RELATORIO_CODEX.md`: registro desta validacao.

### Alteracoes realizadas

- Apenas este relatorio foi atualizado.
- Para contornar a cota diaria esgotada do modelo padrao durante o teste, o servidor foi iniciado temporariamente com `AI_MODEL=gemini-3.6-flash`, usando a configuracao ja existente. Nenhum arquivo de ambiente ou codigo-fonte foi modificado.

### Testes executados

| Teste | Resultado |
| --- | --- |
| Chamada real `POST /api/ai/generate`, um topico, `mode=faithful`, contagens 3/2/2 | passou com `HTTP 200` e `application/json; charset=utf-8` usando `gemini-3.6-flash` |
| Validacao do schema retornado | passou; `success`, `flashcards`, `multipleChoiceQuestions`, `trueFalseQuestions` e `warnings` presentes e com os tipos esperados |
| Quantidades solicitadas versus retornadas | passou; solicitados e retornados exatamente 3 flashcards, 2 multiplas escolhas e 2 verdadeiro/falso |
| Schema dos flashcards | passou; todos continham `id`, `front`, `back`, `tip` e `sourceReference` |
| Schema das multiplas escolhas | passou; todas continham `id`, `prompt`, quatro opcoes A-D, `correctOptionId`, `explanation` e `sourceReference` |
| Schema de verdadeiro/falso | passou; todas continham `id`, `statement`, `isTrue` booleano, `justification` e `sourceReference` |
| Fidelidade, topico e ausencia de conteudo externo | passou; os 7 itens tratavam exclusivamente do topico selecionado e todas as respostas, justificativas e referencias eram sustentadas pelo texto de origem |
| Gabaritos | passou; alternativas corretas A e B e respostas verdadeiro/falso foram conferidas manualmente contra o texto; explicacoes estavam corretas |
| Referencias de origem | passou; todos os itens trouxeram `sourceReference` pertinente e rastreavel ao material |
| Erro controlado com `combinedContent` vazio | passou; `HTTP 400` e `application/json; charset=utf-8`, sem chamada externa |
| Encerramento de loading no frontend | passou por inspecao do fluxo; `handleGenerateActivities` define o loading antes da chamada e o remove em `finally`, tanto em sucesso quanto em erro; as requisicoes observadas tambem foram encerradas, sem espera indefinida |
| Indisponibilidade/quota real do Gemini | passou quanto ao encerramento; depois dos retries previstos, a rota devolveu erro JSON e finalizou a requisicao |
| `npm run lint` (`tsc --noEmit`) | passou sem erros |
| `npm run build` | passou; frontend Vite e bundle do servidor gerados |

### Resultados

- Resposta de sucesso: `HTTP 200`, JSON valido e `success: true`.
- Quantidade efetivamente retornada: 3 flashcards, 2 questoes de multipla escolha e 2 questoes de verdadeiro/falso, exatamente como solicitado.
- As multiplas escolhas continham quatro opcoes A-D e `correctOptionId` apontava para uma opcao existente.
- Os gabaritos e justificativas estavam corretos conforme o material fornecido.
- Nao foi encontrado fato externo no modo fiel. Inclusive os distratores permaneceram verificaveis como negacoes ou combinacoes de elementos do proprio texto controlado.
- O unico topico selecionado foi respeitado em todas as atividades.
- `warnings` foi retornado como lista vazia.
- O loading possui encerramento garantido pelo bloco `finally` existente no frontend; nao foi necessario alterar a interface.

### Problemas encontrados

1. O modelo padrao `gemini-3.7-flash` apresentou inicialmente alta demanda (`503`) e depois cota diaria gratuita esgotada (`429`) apos os retries. A rota encerrou corretamente e retornou JSON, mas converte atualmente esses status do provedor em `HTTP 500`.
2. `gemini-2.5-flash`, experimentado apenas como configuracao temporaria, retornou `404` informando que nao esta disponivel para novos usuarios e recomendou `gemini-3.6-flash`.
3. Uma resposta real intermediaria nao pode ser inspecionada porque o `Invoke-WebRequest` local tentou usar o mecanismo legado do Internet Explorer. O cliente de teste foi substituido por `HttpClient`, sem mudanca na aplicacao.
4. Nao foi executada automacao em navegador. O encerramento do loading foi validado por inspecao direta do caminho de sucesso e erro no frontend, complementada pela confirmacao de que as chamadas HTTP terminaram.

### Estado atual

- A geracao real de atividades esta funcional com um modelo Gemini disponivel configurado por `AI_MODEL`.
- Schema, quantidades, fidelidade, aderencia ao topico, gabaritos, referencias e resposta de erro foram validados no escopo solicitado.
- TypeScript e build permanecem operacionais.

### Pendencias

- Nenhuma pendencia para a tarefa atual.
- Fora do escopo desta tarefa: avaliar em uma tarefa futura se erros upstream `429` e `503` devem preservar status HTTP mais especificos em vez de serem expostos pela rota como `500`.
- Fora do escopo desta tarefa: decidir se o modelo padrao deve ser revisto diante da cota observada; nenhuma mudanca foi feita porque `AI_MODEL` ja permite configuracao externa.

### Proximos passos recomendados

1. Considerar concluida a validacao controlada de `/api/ai/generate` solicitada nesta tarefa.
2. Em tarefa futura explicitamente autorizada, avaliar o mapeamento HTTP de falhas do provedor e a configuracao do modelo padrao.

---

## Melhoria de UX para processamentos longos (25/08/2026)

### Resumo

- Adicionado indicador de progresso com barra, percentual e texto da etapa atual nos fluxos de upload/extracao, estruturacao de topicos e geracao de atividades.
- O progresso acompanha transicoes reais do frontend: preparacao, envio/extracao, preparacao do conteudo, espera da IA, validacao/normalizacao e conclusao.
- Durante chamadas de IA, o indicador avanca gradualmente apenas dentro da faixa reservada e para em 84%, sem chegar a 100% antes da resposta.
- A conclusao exibe 100% antes da transicao para a proxima tela.
- Em erro, o temporizador e interrompido, o indicador e removido e o tratamento de erro existente continua sendo exibido.
- Nenhuma alteracao de backend, arquitetura, identidade visual ou dependencia foi realizada.

### Arquivos alterados

- `src/components/ProcessingProgress.tsx`: novo componente visual reutilizavel de progresso.
- `src/components/MaterialInput.tsx`: etapas de preparacao, upload/extracao, estruturacao e conclusao do material.
- `src/components/SessionConfigView.tsx`: exibicao do progresso no card existente de configuracao da sessao.
- `src/App.tsx`: coordenacao das etapas reais de estruturacao e geracao, incluindo parada dos temporizadores em sucesso ou erro.
- `RELATORIO_CODEX.md`: registro da tarefa.

### Alteracoes realizadas

- Criado um componente compacto no padrao visual existente, com tons zinc, borda, fundo, tipografia e animacao ja utilizados pela aplicacao.
- Adicionados `role="progressbar"`, limites acessiveis e `aria-live` para comunicar mudancas de etapa.
- O fluxo de material passa a aguardar o callback de estruturacao, permitindo apresentar uma unica sequencia visual desde a preparacao do upload/texto ate os topicos prontos.
- O fluxo de geracao mostra preparacao da configuracao e do conteudo, processamento com IA, validacao e conclusao.
- Temporizadores graduais usam teto de 38% durante extracao e 84% durante IA. Eles nao representam percentual exato do Gemini.
- O estado de 100% permanece brevemente visivel antes da troca de tela.
- Falhas de estruturacao sao novamente propagadas ao formulario para uso da mensagem de erro ja existente.

### Testes executados

| Teste | Resultado |
| --- | --- |
| `npm run lint` (`tsc --noEmit`) | passou sem erros |
| `npm run build` | passou; 1.686 modulos transformados e bundles de frontend/backend gerados |
| Revisao estatica do fluxo de upload/extracao | passou; etapas iniciam no envio, avancam ate o limite e seguem para estruturacao somente apos resposta da extracao |
| Revisao estatica da espera de estruturacao com IA | passou; avanco limitado a 84%, seguido de validacao, 100% e transicao |
| Revisao estatica da geracao de atividades | passou; preparacao, IA, validacao e 100% sao exibidos no card existente |
| Revisao estatica dos caminhos de erro | passou; intervalos sao limpos em `catch`/`finally`, progresso e interrompido e erros existentes permanecem ativos |
| Revisao de escopo | passou; nenhuma rota, backend, dependencia, persistencia ou integracao foi alterada |

### Resultados

- Os tres processamentos solicitados agora fornecem percepcao continua de atividade e informam a etapa atual.
- A espera de IA e apresentada como estimativa visual explicita e nunca alcanca 100% antes da resposta.
- O componente de progresso e reutilizado nos dois fluxos sem redesenho das telas.
- TypeScript e build permanecem operacionais.

### Problemas encontrados

- Nao havia componente de progresso reutilizavel; existiam apenas spinner e texto generico nos botoes.
- A extracao e a estruturacao pertencem a componentes diferentes. O callback existente foi mantido, tornado assincrono e recebeu apenas uma funcao de atualizacao para coordenar a mesma sequencia sem mudar a arquitetura.
- Nao ha suite automatizada de interface ou navegador configurada no repositorio; a verificacao funcional desta tarefa ficou limitada a TypeScript, build e revisao direta dos caminhos de estado.

### Estado atual

- Upload/extração, estruturacao e geracao possuem barra de progresso e etapa atual.
- Sucesso chega a 100%; erro encerra o progresso e segue o tratamento normal.
- Backend e contratos HTTP permanecem inalterados.

### Pendencias

- Nenhuma pendencia de implementacao para o escopo solicitado.
- Teste visual/interativo em navegador real permanece recomendavel quando houver uma tarefa especifica de validacao visual.

### Proximos passos recomendados

1. Validar visualmente, em uma tarefa futura, os dois fluxos com respostas rapidas e lentas em desktop e mobile.
2. Nao avancar para outras melhorias de UX sem novo escopo autorizado.

---

## Sanitizacao de erros das rotas de IA (25/08/2026)

### Resumo

- Corrigida exclusivamente a apresentacao de erros de `/api/ai/structure` e `/api/ai/generate`.
- Respostas ao frontend agora usam mensagens curtas e codigos publicos estaveis, sem encaminhar a mensagem bruta do SDK Gemini.
- Status `429`, `503` e `504` sao preservados conforme a causa; falhas de autenticacao/configuracao e erros nao classificados retornam `500` com texto generico.
- O componente visual de erro do frontend nao foi alterado.

### Arquivos alterados

- `server/ai.ts`: classificacao centralizada e sanitizada dos erros de IA.
- `server.ts`: uso do mapeamento publico nas duas rotas de IA.
- `RELATORIO_CODEX.md`: registro desta correcao.

### Alteracoes realizadas

- Criada `mapAIErrorToHttp`, que transforma erros tecnicos em apenas `status`, `code` e `message` seguros para o cliente.
- `429` ou `RESOURCE_EXHAUSTED` retorna `429`, codigo `AI_RATE_LIMIT` e mensagem amigavel sobre limite temporario.
- `503` ou `UNAVAILABLE` retorna `503`, codigo `AI_UNAVAILABLE` e mensagem amigavel sobre indisponibilidade temporaria.
- `AI_REQUEST_TIMEOUT` retorna `504`, mantem o codigo publico e informa que o processamento demorou mais que o esperado.
- `401`, `403`, `UNAUTHENTICATED` ou `PERMISSION_DENIED` retorna mensagem generica de configuracao, sem detalhes do provedor.
- Demais erros retornam `500`, codigo `AI_PROCESSING_ERROR` e mensagem generica.
- Os handlers registram no backend apenas diagnostico tecnico selecionado (`name`, `status`, `code`, `message` e `stack`) com redacao da chave configurada e de parametros comuns de API key. A resposta HTTP nao reutiliza `error.message`, stack trace ou payload tecnico.

### Testes executados

| Teste controlado | Resultado |
| --- | --- |
| `429 / RESOURCE_EXHAUSTED` com quotaId e link ficticios no erro bruto | passou; `429`, `AI_RATE_LIMIT` e mensagem amigavel; detalhes brutos ausentes |
| `503 / UNAVAILABLE` com payload tecnico ficticio | passou; `503`, `AI_UNAVAILABLE` e mensagem amigavel; payload bruto ausente |
| `504 / AI_REQUEST_TIMEOUT` | passou; `504`, `AI_REQUEST_TIMEOUT` e mensagem curta solicitada |
| Erro generico com mensagem interna ficticia | passou; `500`, `AI_PROCESSING_ERROR`; detalhe interno ausente |
| `401 / UNAUTHENTICATED` | passou; `500`, `AI_CONFIGURATION_ERROR`; detalhe de autenticacao ausente |
| `403 / PERMISSION_DENIED` | passou; `500`, `AI_CONFIGURATION_ERROR`; detalhe de permissao ausente |
| Redacao do diagnostico backend com credencial ficticia | passou; o valor foi substituido por `[REDACTED]` e nao apareceu no log estruturado |
| `npm run lint` (`tsc --noEmit`) | passou sem erros |
| `npm run build` | passou; frontend e backend gerados |

### Resultados

- Nenhuma resposta de erro das rotas de IA envia a mensagem bruta recebida pelo mapeamento.
- Stack trace, quotaId, links do provedor, nome do modelo, payload do SDK e detalhes de autenticacao nao fazem parte do objeto publico.
- O diagnostico do backend mantem contexto tecnico selecionado e redige a chave configurada ou parametros comuns de API key antes do log.
- O frontend continua usando o componente existente e recebe apenas a mensagem amigavel no campo `error`.
- O backend preserva status HTTP especificos para limite, indisponibilidade e timeout.
- TypeScript e build permanecem operacionais.

### Problemas encontrados

- Os dois handlers usavam diretamente `error.message`, permitindo que o JSON tecnico do SDK fosse exibido ao usuario.
- Erros `429` e `503` eram convertidos para `500`, ocultando a natureza HTTP temporaria da falha.
- Nenhuma outra falha foi encontrada durante a correcao.

### Estado atual

- As duas rotas de IA compartilham o mesmo tratamento publico de erros.
- Detalhes tecnicos permanecem apenas no log do backend e nao sao serializados para o frontend.
- A interface e o comportamento visual de erro permanecem inalterados.

### Pendencias

- Nenhuma pendencia para o escopo solicitado.

### Proximos passos recomendados

1. Considerar concluida a sanitizacao de erros das rotas de IA.
2. Nao alterar outros tratamentos de erro sem nova tarefa autorizada.

---

## Conclusao funcional do Marco 1 no navegador (25/08/2026)

### Resumo

- Registrada a validacao manual completa do Marco 1 realizada pelo usuario em navegador com material real.
- O fluxo funcional completo foi concluido sem travamento, desde a criacao/uso do perfil e selecao do projeto ate o resumo final da sessao e as opcoes de continuidade.
- A geracao real utilizou Gemini com modelo configuravel por `AI_MODEL`.
- O Marco 1 esta funcionalmente concluido conforme a validacao manual informada.

### Arquivos alterados

- `RELATORIO_CODEX.md`: formalizacao da conclusao funcional do Marco 1.

### Alteracoes realizadas

- Nenhum codigo, configuracao, interface ou funcionalidade foi alterado.
- Apenas a evidencia de validacao manual fornecida pelo usuario foi registrada neste relatorio.

### Testes executados

Validacao manual realizada pelo usuario no navegador com material real:

| Etapa ou comportamento validado | Resultado observado |
| --- | --- |
| Criacao e uso de perfil | passou |
| Selecao de projeto | passou |
| Upload de PDF | passou |
| Extracao do conteudo | passou |
| Identificacao de topicos | passou |
| Selecao de topico | passou |
| Geracao de 3 flashcards | passou |
| Geracao de 4 questoes/exercicios | passou |
| Questoes de multipla escolha | passou |
| Questoes de verdadeiro/falso | passou |
| Registro da resposta do usuario | passou |
| Correcao imediata | passou |
| Destaque visual de resposta correta e incorreta | passou |
| Exibicao de explicacao e gabarito | passou |
| Fundamentacao no proprio material | passou |
| Resumo final da sessao | passou |
| Contagem de acertos e erros | passou |
| Calculo de aproveitamento | passou |
| Opcao de refazer atividades | passou |
| Opcao de iniciar nova sessao ou usar outro material | passou |
| Barra de progresso durante o processamento | passou |
| Fluxo completo no navegador | passou sem travamento |

### Resultados

- Perfil e projeto puderam ser criados/usados no fluxo normal da aplicacao.
- O PDF real foi enviado, extraido e estruturado em topicos corretamente.
- A selecao de topico alimentou a geracao real de 3 flashcards e 4 questoes/exercicios com Gemini.
- Multipla escolha e verdadeiro/falso aceitaram respostas, corrigiram imediatamente e apresentaram destaque visual, explicacao, gabarito e fundamentacao no material.
- O resumo final apresentou acertos, erros e aproveitamento.
- As opcoes de refazer atividades e iniciar nova sessao ou outro material funcionaram.
- A barra de progresso comunicou os processamentos longos.
- Nao foi observado travamento durante o fluxo completo.

### Problemas encontrados

- Nenhum problema funcional foi observado na validacao manual informada.

### Estado atual

- Marco 1 funcionalmente concluido e validado manualmente no navegador com material real.
- Integracao Gemini real operacional com modelo selecionavel por `AI_MODEL`.
- Fluxo principal de estudo validado de ponta a ponta.

### Pendencias

- Nenhuma pendencia funcional para a conclusao do Marco 1 com base no escopo validado.

### Proximos passos recomendados

1. Considerar o Marco 1 concluido funcionalmente.
2. Nao iniciar outro marco ou funcionalidade sem nova tarefa explicitamente autorizada.

---

## Auditoria de preparacao do piloto na Vercel (31/08/2026)

### Resumo

- A aplicacao pode ser publicada na Vercel para um piloto temporario, mas nao exatamente na forma atual: o frontend Vite e compativel, enquanto o backend precisa ser exposto como Vercel Function em vez de iniciar um processo persistente com `app.listen`.
- O Express pode ser reaproveitado como uma unica Function Node.js. A Vercel documenta suporte a Express, mas ignora `express.static()` nesse modelo; o frontend compilado deve ser servido pela camada estatica da plataforma.
- O bloqueio tecnico principal e o upload atual de 30 MB. Vercel Functions limitam request e response a 4,5 MB, limite nao configuravel. O fluxo atual ainda devolve todo o texto extraido ao navegador e depois o envia novamente em JSON, criando dois outros pontos sujeitos ao mesmo teto.
- E possivel realizar o piloto sem banco, storage persistente, historico ou autenticacao. Isso nao significa que os dados nao transitem nem que haja retencao zero nos provedores: arquivo/texto passa pela infraestrutura da Vercel e partes do material, prompts e respostas passam pela Gemini.
- Antes de expor uma URL sem autenticacao, sao obrigatorios limites coerentes com a plataforma, validacao efetiva de entrada, protecao contra abuso/custo, alinhamento de timeouts e sanitizacao adicional dos logs/erros de extracao.
- Nenhum codigo, configuracao, branch, servico ou variavel foi alterado nesta auditoria.

### Fontes e premissas verificadas

- Repositorio local como fonte de verdade: `server.ts`, `server/ai.ts`, `server/parsers.ts`, `src/App.tsx`, `src/components/MaterialInput.tsx`, `src/lib/api.ts`, `vite.config.ts`, `package.json`, `.env.example` e `.gitignore`.
- Documentacao oficial da [Vercel para Express](https://vercel.com/docs/frameworks/backend/express): uma aplicacao Express pode virar uma unica Function; `express.static()` nao serve os assets nesse ambiente.
- Limites oficiais de [Vercel Functions](https://vercel.com/docs/functions/limitations): payload maximo de 4,5 MB para request e response, bundle descompactado de 250 MB e memoria dependente do plano/configuracao.
- Configuracao oficial de [duracao de Functions](https://vercel.com/docs/functions/configuring-functions/duration): a plataforma encerra a Function quando `maxDuration` e atingido; os limites dependem do plano e de Fluid Compute e devem ser confirmados no projeto no momento do deploy.
- Escopos oficiais de [variaveis de ambiente](https://vercel.com/docs/environment-variables): Development, Preview e Production sao ambientes separados e alteracoes exigem novo deploy.
- [Runtime Logs da Vercel](https://vercel.com/docs/logs/runtime): saidas de `console.log`, `console.warn` e `console.error` das Functions ficam disponiveis nos logs de Preview e Production.
- [Retencao de dados da Gemini](https://ai.google.dev/gemini-api/docs/zdr): a politica varia conforme modalidade e recursos usados; servicos pagos ainda podem registrar prompts e respostas por periodo limitado para monitoramento de abuso, salvo condicoes especificas de ZDR. O projeto atual nao usa File API, grounding, Interactions API nem explicit context caching.
- Nao foram assumidos valores fixos de preco, quota, RPM, TPM ou permanencia de plano gratuito. Limites e cobranca devem ser reconfirmados antes da abertura do piloto.

### Compatibilidade atual com Vercel

| Parte | Diagnostico | Consequencia |
| --- | --- | --- |
| React/Vite | Compativel como site estatico; `vite build` gera `dist/index.html` e assets | Pode permanecer como frontend, com rewrite SPA para rotas de interface |
| Express | Reaproveitavel como Function Node.js unica | Precisa exportar o app/handler e nao chamar `app.listen` na execucao serverless |
| `server.ts` | Mistura criacao do app, rotas, Vite middleware, arquivos estaticos e inicializacao da porta 3000 | Precisa separar o app/handler serverless do entrypoint local |
| `/api/*` | Rotas Express sao conceitualmente compativeis | Precisam ser encaminhadas para a Function sem cair no fallback SPA |
| Vite middleware | Adequado apenas ao desenvolvimento local atual | Nao deve ser criado dentro da Function; a Vercel serve o build estatico |
| Build atual | Passa localmente, mas produz tambem `dist/server.cjs` para processo Node persistente | O build/deploy precisa declarar output estatico e entrada da Function |
| `npm start` | Inicia `dist/server.cjs`, define producao e escuta `0.0.0.0:3000` | Nao e o mecanismo de execucao de uma Vercel Function |
| `express.static()` | Funciona no servidor de producao local | E ignorado no modelo Express da Vercel e nao pode ser a estrategia do deploy |

Adaptacao recomendada: preservar o Express e suas rotas, extrair a construcao do `app` para um modulo importavel, manter um entrypoint exclusivo para desenvolvimento/local e criar uma entrada serverless que exporte o app. Adicionar configuracao de build, rewrites e duracao para que `/api/*` chegue a Function e as demais rotas recebam o SPA. Nao ha necessidade de migrar para Next.js nem de criar uma Function por rota para este piloto.

Arquivos que provavelmente precisariam ser alterados ou criados na implementacao:

- `server.ts`: separar inicializacao local de construcao/exportacao do Express, ou ser substituido por dois entrypoints pequenos.
- Um novo modulo de app/handler, por exemplo `server/app.ts` e/ou `api/index.ts`: expor o Express a Vercel sem abrir porta.
- `package.json`: ajustar scripts/build para o alvo Vercel, preservando o desenvolvimento local.
- Novo `vercel.json`: declarar build/output, rewrites SPA/API e `maxDuration` compativel.
- `src/components/MaterialInput.tsx`: alinhar limite e mensagem do cliente ao limite seguro real.
- `server.ts` ou middleware dedicado: limites de upload/body, validacao, protecao de abuso, headers e erros publicos.
- Possivelmente `server/ai.ts`: alinhar o orcamento total de timeout/retry e reduzir diagnosticos de log.
- `.env.example`: remover a premissa de AI Studio em `APP_URL` e documentar somente variaveis efetivamente usadas, caso a implementacao do piloto confirme isso.

### Uploads, memoria e payload

- Multer usa `memoryStorage()`: o arquivo inteiro fica em um `Buffer` na RAM da Function e nao e gravado em disco pelo codigo.
- PDF e DOCX sao processados a partir desse buffer; TXT e qualquer arquivo nao reconhecido caem atualmente no caminho de texto UTF-8.
- O pico de memoria e maior que o tamanho do upload: coexistem buffer multipart, estruturas internas de `pdf-parse`/Mammoth, texto extraido, objetos de resposta e serializacao JSON. PDF pode exigir memoria e CPU muito superiores ao tamanho compactado; DOCX tambem pode expandir fortemente.
- O limite Multer de 30 MB e ineficaz na Vercel: a plataforma rejeita acima de 4,5 MB antes que esse limite seja util. Multipart ainda adiciona overhead, portanto o teto do aplicativo deve ficar abaixo de 4,5 MB, com margem medida, e nao exatamente em 4,5 MB.
- Mesmo um arquivo que caiba no request pode produzir texto extraido maior que 4,5 MB na response de `/api/materials/extract`. Em seguida, `/api/ai/structure` recebe esse texto novamente, sujeito ao limite de request JSON. Esse desenho exige limite tambem no tamanho do texto extraido, nao apenas no arquivo.
- `/api/ai/structure` envia no maximo 50.000 caracteres do texto para a Gemini, mas o backend recebe o `rawText` inteiro antes de truncar. `/api/ai/generate` nao possui limite explicito para `combinedContent`.
- O modelo em memoria e aceitavel apenas para arquivos pequenos e com concorrencia baixa, depois de limites conservadores e testes. Para arquivos realmente grandes, seria necessario upload direto/storage ou processamento diferente, o que contraria o escopo sem persistencia deste piloto; portanto arquivos grandes devem ser recusados.

### Rotas de IA, duracao e falhas

- `/api/ai/structure` envia titulo e ate 50.000 caracteres do material para a Gemini e pede topicos, resumos, conceitos e trechos.
- `/api/ai/generate` envia titulo, topicos selecionados, conteudo combinado, modo, dificuldade e quantidades; recebe as atividades e referencias.
- O timeout atual e por tentativa: 60 segundos por padrao. Com tres tentativas e backoff exponencial inicial de 1.200 ms mais jitter, a duracao teorica pode superar 183 segundos, sem contar parsing, serializacao e overhead da plataforma.
- Timeout local nao recebe retry. Falhas HTTP 429, 500, 502, 503 e 504 e algumas falhas de rede recebem retry. Ao final, 429 vira `AI_RATE_LIMIT`, 503 vira `AI_UNAVAILABLE`, timeout local vira 504 `AI_REQUEST_TIMEOUT`; outros 500/502/504 do provedor podem terminar como `500 AI_PROCESSING_ERROR`.
- A Function pode ser encerrada pela Vercel antes do timeout do aplicativo se `maxDuration` for menor que todo o orcamento de tentativas. Nesse caso, o cliente recebe o 504 da plataforma (`FUNCTION_INVOCATION_TIMEOUT`), nao necessariamente o JSON sanitizado da aplicacao, e o `finally` do frontend ainda encerra o loading apos a requisicao falhar.
- Antes do piloto, `maxDuration`, `AI_REQUEST_TIMEOUT_MS`, numero de tentativas e backoff devem formar um orcamento total com margem para parsing e resposta. Nao se deve simplesmente elevar a duracao maxima: isso amplia exposicao a abuso e custo.

### Variaveis de ambiente para Vercel

Somente estes nomes sao consumidos pelo backend de IA:

| Nome | Necessidade | Development | Preview | Production |
| --- | --- | --- | --- | --- |
| `GEMINI_API_KEY` | Obrigatoria | sim, se testar Gemini via `vercel dev` | sim, para o piloto em Preview | somente se houver deploy Production |
| `AI_MODEL` | Opcional, mas recomendada para fixar modelo testado | sim | sim | sim, se Production for usado |
| `AI_REQUEST_TIMEOUT_MS` | Opcional, recomendada para alinhamento explicito | sim | sim | sim, se Production for usado |
| `AI_MAX_ATTEMPTS` | Opcional, recomendada para controle de duracao/custo | sim | sim | sim, se Production for usado |
| `AI_RETRY_INITIAL_BACKOFF_MS` | Opcional, recomendada para controle de retry | sim | sim | sim, se Production for usado |

`NODE_ENV`, `VERCEL` e `VERCEL_ENV` sao fornecidas/controladas pela plataforma e nao devem receber segredo manual. `APP_URL` nao e consumida pelo codigo. `DISABLE_HMR` so afeta o servidor Vite local e nao e necessaria na Function. Nenhuma variavel de banco, Supabase, Drive ou storage e necessaria. Para um piloto apenas em Preview, nao e necessario copiar a chave para Production; cada ambiente deve usar credencial/quota separada quando isso for operacionalmente possivel.

### Privacidade, transito e persistencia

- Nao existe escrita em disco pelo codigo da aplicacao. Multer mantem o arquivo em RAM; parsers recebem buffers. O filesystem efemero da Function tampouco e usado.
- Nao existe banco, Supabase, Google Drive, Vercel Blob, cache persistente, fila, `localStorage`, `sessionStorage` ou IndexedDB.
- Perfis, projetos, material bruto, topicos, configuracao, atividades, respostas e pontuacao ficam apenas no estado React da aba. Recarregar/fechar perde esse estado.
- Durante extracao, o arquivo completo e titulo transitam do navegador pela rede/infraestrutura da Vercel ate a Function; texto extraido completo retorna ao navegador.
- Na estruturacao, titulo e texto extraido completo transitam novamente ate a Function; titulo e amostra de ate 50.000 caracteres sao enviados a Gemini, junto com system instruction e schema. Topicos/resumos/trechos gerados retornam por Gemini e Vercel.
- Na geracao, titulo, topicos, modo, dificuldade, quantidades e conteudo combinado transitam por Vercel e Gemini; flashcards, questoes, gabaritos, explicacoes, referencias e avisos retornam pelo mesmo caminho.
- O SDK usado faz chamadas `generateContent` diretas; nao ha upload para Gemini File API, cache explicito, grounding ou armazenamento de conversacao no codigo.
- Assim, o piloto pode nao armazenar material ou historico na aplicacao, mas nao deve ser descrito como retencao zero sem validar contrato/plano/configuracao da Gemini e politicas da Vercel. O usuario externo deve ser informado de que o conteudo e processado por ambos os provedores e orientado a nao enviar material pessoal, sigiloso ou sem autorizacao.

### Auditoria de logs

| Dado | Situacao atual | Risco |
| --- | --- | --- |
| Texto extraido e arquivo | Nao sao logados deliberadamente no caminho de sucesso | Baixo no sucesso; objetos de erro de parser/middleware podem incluir metadados ou detalhes inesperados de bibliotecas |
| Prompts e respostas Gemini | Nao ha `console` explicito desses conteudos | Podem aparecer indiretamente se o SDK incluir request/response ou trecho do prompt em `message`/`stack` de erro |
| Erros de IA | `getAIErrorDiagnostics` registra nome, status, codigo, mensagem e stack, redigindo chave e parametros comuns | Redacao protege a credencial conhecida, mas nao remove conteudo do usuario eventualmente incorporado no erro |
| Erros de extracao | Parser e handler registram o objeto de erro; resposta publica reutiliza `error.message` | Pode expor detalhes internos nos Runtime Logs e no frontend; precisa sanitizacao antes do piloto |
| Erro global de API | Registra o erro completo e devolve `err.message`/`err.code` | Pode registrar e expor detalhe de Multer/parser; precisa resposta publica controlada e log minimo |
| Frontend | Registra URL, status, chaves de resposta e objetos de erro no console do navegador | Nao vai para Runtime Logs da Vercel por si so, mas pode revelar respostas/diagnosticos a quem usa o navegador; `data` completo e logado apenas nas respostas de erro |

Conclusao de logs: o sucesso comum nao imprime material, prompt ou resposta da Gemini no backend, mas nao ha garantia forte contra vazamento por excecoes de terceiros. Antes do piloto, logs server-side devem usar campos permitidos e mensagens normalizadas, sem `stack`/`message` brutos de SDK ou parser em ambiente externo. Nao ativar log de body, multipart, prompt ou response no painel/plataforma.

### Seguranca minima do piloto

| Item | Classificacao | Motivo |
| --- | --- | --- |
| Rate limiting por origem/IP nas rotas de IA e upload | obrigatorio antes do piloto | URL publica e chave server-side permitem consumo automatizado e custo; a Vercel oferece regra de rate limiting, cuja disponibilidade/preco deve ser confirmada |
| Limite de arquivo e de texto extraido | obrigatorio antes do piloto | 30 MB contradiz o teto de 4,5 MB; expansao do documento pode estourar response, proxima request e memoria |
| Validacao de extensao, MIME e assinatura/conteudo | obrigatorio antes do piloto | Hoje extensao ou MIME isolados selecionam parser e qualquer outro arquivo vira TXT; `accept` do navegador nao e controle de seguranca |
| Limites server-side de contagens, conteudo e combinacao de atividades | obrigatorio antes do piloto | Cliente e chamadas diretas podem pedir quantidades/textos arbitrarios e multiplicar tokens, duracao e custo |
| Protecao contra abuso/custo da Gemini | obrigatorio antes do piloto | Inclui rate limit, orcamento de timeout/retry, chave restrita ao projeto/API quando suportado, monitoramento/alertas e forma de desligar o piloto |
| Sanitizacao de erros/logs de extracao e middleware global | obrigatorio antes do piloto | Atualmente mensagens e objetos tecnicos podem chegar ao cliente ou aos Runtime Logs |
| CORS/origin policy | pode esperar para o piloto de mesma origem | O frontend usa URLs relativas e nao precisa CORS. CORS nao substitui autenticacao nem impede chamadas diretas; uma verificacao de origem e recomendavel como camada adicional, nao como defesa principal |
| Headers basicos (`nosniff`, frame policy/CSP, referrer policy) | recomendavel | Reduz superficie do frontend, mas nao resolve o principal risco de custo; deve ser aplicado sem quebrar Vite/assets |
| Autenticacao de usuario | pode esperar conforme o escopo | Nao e necessaria para provar o fluxo, desde que o acesso seja curto/controlado e existam controles de abuso. Protecao de acesso ao Preview, se usada, deve permitir o usuario piloto |
| Scanner/antivirus de arquivos | pode esperar no piloto restrito | O codigo apenas interpreta em memoria e nao redistribui arquivos; parsers ainda devem estar atualizados e entradas devem ser pequenas/validadas |

### Riscos de custo

- Vercel: invocacoes, CPU de parsing, memoria provisionada, duracao enquanto aguarda Gemini, transferencia e regras de firewall podem ter quota ou cobranca conforme o plano vigente. PDFs e concorrencia elevam CPU/memoria; retries elevam duracao.
- Gemini: cada material normalmente causa ao menos uma estruturacao e uma geracao; retries podem repetir chamadas. Entrada longa, muitos itens e respostas extensas elevam tokens. 429 nao deve ser tratado como garantia de custo zero.
- Ausencia de autenticacao: qualquer pessoa ou bot que descubra a URL pode chamar `/api/ai/*` diretamente, ignorar limites da interface e consumir a chave. Preview URL obscura nao e controle de acesso.
- Upload: embora nao haja storage, transferencia e processamento ainda consomem recursos. Repeticao de arquivos compactos que expandem muito pode causar pressao de memoria/CPU.
- Controles minimos: limite curto por IP/origem, tetos de contagem e caracteres, tamanho conservador, menor retry aceitavel, observabilidade sem conteudo, alertas/orcamentos nos provedores e procedimento de revogar chave/desativar deployment.

### Estrategia de branch

- Manter `main` como Marco 1 estavel e nao fazer nela as adaptacoes experimentais inicialmente.
- Criar, em tarefa posterior, `piloto-vercel` a partir do `main` limpo.
- Configurar essa branch como Preview e restringir `GEMINI_API_KEY`/demais variaveis ao Preview ou especificamente a essa branch; nao criar a branch nem vincular o projeto nesta auditoria.
- Fazer somente nessa branch a separacao do handler, configuracao Vercel e controles minimos. Validar Preview, limites, logs, custo e rollback.
- Depois do piloto, revisar commits individualmente e decidir por PR quais alteracoes genericas e comprovadas retornam a `main`; configuracoes temporarias de acesso/limite podem permanecer especificas do piloto.

### Matriz curta de teste de esforco

| Cenario | Observar |
| --- | --- |
| TXT pequeno | upload, extracao fiel, latencia, memoria, payload e ausencia de conteudo em logs |
| DOCX pequeno | MIME/assinatura, extracao, expansao do texto, latencia e descarte do buffer |
| PDF pequeno | paginas, texto, CPU/memoria, tempo de parser e erros controlados |
| PDF medio | tamanho request/response, pico de memoria, duracao total e legibilidade do texto |
| PDF grande dentro do novo limite seguro | rejeicao antecipada se texto expandir alem do teto, ausencia de 413 inesperado e funcao sem OOM |
| Poucos itens | schema, quantidades, qualidade, tokens/latencia e custo de referencia |
| Muitos itens ate o teto permitido | validacao do teto, tamanho da resposta, duracao, qualidade e consumo relativo |
| Gemini lenta | progresso, orcamento Function/aplicacao, cancelamento e loading encerrado |
| Gemini 429 | retries limitados, status/codigo publico, sem detalhe de provedor e sem tempestade de novas chamadas |
| Gemini 503 | backoff, numero maximo de tentativas, 503 final sanitizado e duracao total |
| Timeout | 504 JSON da aplicacao antes do limite Vercel; diferenciar de `FUNCTION_INVOCATION_TIMEOUT` |
| Mobile | upload suportado, progresso, recuperacao de erro, responsividade e rede lenta/interrompida |
| Dois usuarios simultaneos | isolamento de dados, concorrencia, memoria, latencia, rate limit sem colisao indevida e nenhuma mistura de respostas |
| Varias requisicoes sequenciais | ausencia de crescimento de memoria, limites/retries, estabilidade de latencia e consumo acumulado |

Antes desses cenarios, medir o tamanho real do multipart, texto extraido, JSON das duas rotas e resposta, sempre sem registrar o conteudo.

### Testes executados

| Teste | Resultado |
| --- | --- |
| Leitura integral de `GUIA_CODEX.md` | concluida; regras de escopo, segredo, custo, npm e relatorio observadas |
| Inspecao estatica da arquitetura, uploads, parsers, IA, frontend, ambiente e logs | concluida; achados registrados acima |
| Busca por persistencia e integracoes no codigo atual | nenhuma escrita em disco, banco, Supabase, Drive, storage ou Web Storage encontrada |
| Verificacao de arquivos de ambiente versionados | somente `.env.example` esta versionado; `.env*` permanece ignorado |
| `npm run lint` (`tsc --noEmit`) | passou sem erros |
| `npm run build` | passou; frontend Vite e bundle Node atual foram gerados |
| Deploy ou teste na Vercel | nao executado; exigiria adaptacao e mudanca externa, proibidas nesta etapa |
| Teste de carga real | nao executado; matriz proposta para depois da implementacao minima |

### Respostas objetivas

1. O projeto pode ser publicado na Vercel? Sim, apos uma adaptacao pequena de empacotamento/entrada serverless e controles minimos; o codigo atual nao deve ser enviado como piloto externo sem isso.
2. Precisa adaptacao de arquitetura? Sim. Express pode permanecer, mas deve ser exportado como Function; Vite/static e servidor local devem ser separados do handler.
3. Quais arquivos precisariam mudar? `server.ts`, `package.json`, limite exibido em `src/components/MaterialInput.tsx`, possivelmente `server/ai.ts` e `.env.example`, mais novos arquivos de app/handler e `vercel.json`.
4. Existe bloqueio real? Sim: upload anunciado/aceito em 30 MB contra payload maximo de 4,5 MB, fluxo de texto que pode exceder request/response, `app.listen`/static server no entrypoint atual e ausencia de protecao minima contra abuso.
5. O que corrigir antes? Handler serverless, roteamento/static, limite conservador de arquivo e texto, validacao real de tipo, tetos de contagem/conteudo, rate limit/protecao de custo, timeouts coerentes e logs/erros de extracao sanitizados.
6. O que pode esperar? Autenticacao completa, persistencia, Supabase, Drive, storage, antivirus dedicado, CORS para origens externas e endurecimento avancado de headers, desde que o piloto seja curto e controlado.
7. O piloto pode ocorrer sem armazenar material/historico? Sim no codigo da aplicacao, mantendo tudo efemero; isso nao equivale automaticamente a ZDR contratual nos provedores.
8. Quais dados transitam? Arquivo e texto por navegador/Vercel; titulo, amostra/conteudo selecionado, topicos, configuracao e prompts pela Gemini; topicos, atividades, gabaritos, explicacoes e referencias retornam por Gemini/Vercel.
9. Estrategia de branch? Preservar `main`, criar depois `piloto-vercel`, usar Preview e so reintegrar por PR o que for validado.
10. Plano minimo antes do deploy? Separar/exportar Express; configurar build, rewrites e duracao; reduzir e validar payloads; impor tetos; sanitizar logs/erros; configurar variaveis somente nos ambientes usados; ativar rate limit/controles de custo; executar `vercel dev`, Preview e a matriz critica antes de convidar o usuario.

### Problemas encontrados

1. Limite local de 30 MB incompativel com payload maximo de 4,5 MB das Functions.
2. O texto extraido completo cruza a Function tres vezes no fluxo (response de extracao, request de estrutura e, conforme selecao/fallback, request de geracao), podendo ultrapassar limites e ampliando exposicao de dados.
3. O entrypoint atual abre porta, monta Vite ou `express.static()` e nao exporta um handler serverless.
4. Nao ha limite server-side maximo para texto extraido, `combinedContent` ou contagens de atividades.
5. Validacao aceita arquivo por MIME ou extensao e trata qualquer formato restante como texto.
6. Erros de parser/middleware ainda usam objetos e mensagens tecnicas brutas em log/resposta.
7. Orcamento maximo de retry pode se aproximar do limite da Function e precisa configuracao explicita.
8. Sem autenticacao/rate limit, endpoints Gemini ficam sujeitos a chamada direta e consumo indevido.
9. O `TAREFA_ATUAL.md` do repositorio ainda descreve uma tarefa anterior; esta auditoria seguiu a solicitacao explicita atual sem altera-lo.

### Estado atual

- Marco 1 local permanece intacto, com TypeScript e build aprovados.
- O projeto e tecnicamente adaptavel a Vercel sem persistencia e sem reescrita de framework.
- Ainda nao esta pronto para um piloto externo na Vercel pelos bloqueios de payload, entrada serverless e protecao de custo/abuso.

### Pendencias

- Autorizar e implementar em tarefa separada o plano minimo na branch de piloto.
- Confirmar plano/Fluid Compute, duracao, regiao, quotas, cobranca e politica de dados vigentes nas contas Vercel e Gemini usadas.
- Definir limite seguro por medicao, abaixo de 4,5 MB e tambem baseado no texto extraido.
- Definir janela/duracao do piloto, usuario autorizado, monitoramento e criterio de interrupcao.

### Proximos passos recomendados

1. Criar `piloto-vercel` somente apos autorizacao e implementar a menor separacao possivel entre app Express, servidor local e handler.
2. Aplicar primeiro os controles obrigatorios de payload, tipo, contagem, logs, timeout e abuso.
3. Configurar apenas o ambiente Preview e validar com `vercel dev` e Preview real.
4. Executar a matriz critica, inspecionar Runtime Logs sem conteudo e medir consumo antes de compartilhar a URL.

---

## Implementacao minima para o piloto Vercel (31/08/2026)

### Resumo

- Criada a branch `piloto-vercel` a partir do mesmo commit de `main`, mantendo `main` apontada para `3435fd5b8b256937364f80e57c4a33ce02d4f14a` e sem commits ou alteracoes aplicados nela.
- Separada a aplicacao Express da inicializacao local: as rotas e protecoes agora ficam em `server/app.ts`, `server.ts` continua sendo o entrypoint local e `api/index.ts` exporta o mesmo app como Vercel Function sem `app.listen`, Vite middleware ou `express.static()`.
- Adicionada configuracao Vercel para build Vite estatico, Function Express, rewrite de `/api/*`, fallback SPA e `maxDuration` de 120 segundos.
- Implementados limites de upload, texto, geracao e rate limit em memoria, validacao de PDF/DOCX/TXT, erros/logs sanitizados, headers basicos e aviso curto de privacidade.
- Nenhuma persistencia, autenticacao, Supabase, Google Drive, storage ou dependencia nova foi adicionada. Nenhum deploy ou projeto Vercel foi criado.

### Arquivos alterados

- `server/app.ts`: novo modulo compartilhado com Express, rotas, limites, validacoes, rate limit, headers e erros publicos.
- `api/index.ts`: novo handler serverless que exporta o Express.
- `server.ts`: reduzido ao servidor local, com Vite em desenvolvimento e arquivos estaticos apenas na producao Node local.
- `vercel.json`: build/output, Function, duracao e rewrites.
- `server/ai.ts`: defaults de timeout/retry alinhados e diagnostico externo sem stack/mensagem bruta.
- `server/parsers.ts`: removidos logs e mensagens brutas dos parsers.
- `src/components/MaterialInput.tsx`: limite visual de 3 MB e aviso discreto de privacidade.
- `.env.example`: somente variaveis consumidas, sem valor real e sem `APP_URL` nao utilizada.
- `RELATORIO_CODEX.md`: registro da implementacao e dos testes.

### Arquitetura resultante

1. `createApp()` constroi o Express e registra `/api/health`, `/api/materials/extract`, `/api/ai/structure` e `/api/ai/generate`.
2. `server.ts` chama `createApp()`, monta Vite somente em desenvolvimento e abre a porta local. Em producao Node local, serve `dist` para preservar `npm start`.
3. `api/index.ts` chama `createApp()` e exporta o resultado; nao abre porta nem importa Vite.
4. Na Vercel, `dist` e o frontend estatico, `/api/:path*` e reescrito para a Function e o restante recebe `index.html` para o SPA.
5. A Function e o servidor local usam exatamente as mesmas rotas e validacoes.

### Limites adotados

| Recurso | Limite | Decisao |
| --- | --- | --- |
| Arquivo multipart | 3 MB, um arquivo por request | Mantem margem de aproximadamente 1,5 MB sob o teto de 4,5 MB da Vercel para headers e multipart |
| Campos multipart | 2 campos; 8 KB por campo | Aceita `file` e `title` sem campos arbitrariamente grandes |
| JSON | 2 MB | Rejeita body grande antes de parsing/memoria excessivos |
| Texto extraido, colado ou `rawText` | 500.000 caracteres | Mantem resposta de extracao e request de estrutura abaixo do teto em conteudo textual normal; rejeita, sem truncar silenciosamente |
| `combinedContent` | 100.000 caracteres | Limita tokens, duracao e custo da geracao |
| Titulo | 200 caracteres | Evita metadado arbitrariamente grande |
| Topicos selecionados | 8; titulo 200 e resumo 2.000 caracteres por topico | Coerente com a estruturacao existente e limita o prompt |
| Flashcards | 10 | Teto server-side independente do frontend |
| Multipla escolha | 10 | Teto server-side independente do frontend |
| Verdadeiro/falso | 10 | Teto server-side independente do frontend |
| Total de atividades | 20 | Evita combinar os tres tetos em 30 itens numa unica chamada |

O limite de caracteres complementa, mas nao substitui, o limite de bytes imposto pela Vercel. O piloto deve medir payloads reais no Preview; documentos compactados com expansao acima do teto sao rejeitados depois da extracao e antes de devolver o texto.

### Validacao de arquivos

- Somente extensoes `.pdf`, `.docx` e `.txt` sao aceitas.
- A extensao deve ser compativel com um MIME permitido; `application/octet-stream` e aceito como fallback comum de navegador, mas nao elimina a verificacao de conteudo.
- PDF exige `%PDF-` nos primeiros 1.024 bytes.
- DOCX exige assinatura ZIP e entradas basicas `[Content_Types].xml` e `word/`.
- TXT rejeita byte nulo e decodificacao UTF-8 com caractere de substituicao.
- Arquivos desconhecidos nao sao mais tratados como TXT.
- Multer devolve JSON sanitizado para excesso de tamanho ou multipart invalido.

### Protecao de abuso e custo

- Rate limit em memoria, por IP e janela fixa de 10 minutos: 15 extracoes, 10 estruturacoes e 10 geracoes por instancia aquecida.
- Respostas bloqueadas usam HTTP 429, `RATE_LIMITED`, `Retry-After` e headers `RateLimit-*`.
- O limite em memoria protege o processo local e uma instancia aquecida, mas nao e global entre Functions/instancias e reinicia em cold start. Ele nao deve ser a unica barreira externa.
- Antes de compartilhar o Preview, configurar no Vercel Firewall uma regra de rate limiting sem servico adicional: caminho iniciando por `/api/`, excluindo `/api/health`, chave IP, fixed window de 10 minutos, limite inicial de 30 requests e acao 429. Confirmar no painel a disponibilidade e eventual cobranca vigente antes de publicar a regra.
- Os limites de caracteres, topicos e atividades impedem que uma chamada direta ignore os controles visuais e solicite payload/saida arbitrarios.
- O app desativa `X-Powered-By` e aplica `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` e `Referrer-Policy: strict-origin-when-cross-origin`. CSP complexa nao foi adicionada.

### Timeout e retry

- `AI_REQUEST_TIMEOUT_MS`: default reduzido de 60.000 para 45.000 ms por tentativa.
- `AI_MAX_ATTEMPTS`: default reduzido de 3 para 2.
- `AI_RETRY_INITIAL_BACKOFF_MS`: default ajustado de 1.200 para 1.000 ms, ainda com jitter de ate 400 ms.
- `maxDuration`: 120 segundos na Function.
- Pior caso nominal da IA: duas tentativas de 45 segundos e um backoff de ate 1,4 segundo, aproximadamente 91,4 segundos. Restam cerca de 28,6 segundos para parsing, inicializacao, serializacao e resposta antes do limite da Function.
- Timeout local continua sem retry. 429 e 503 continuam transitorios e recebem no maximo a segunda tentativa.

### Logs, erros e privacidade

- Parsers nao registram mais o objeto bruto nem incorporam `error.message` de biblioteca no erro propagado.
- O middleware global registra somente `name`, `code` e status; nao registra body, arquivo, texto, prompt, resposta ou stack.
- Erros de IA em Preview/Production registram somente nome, status e codigo. Mensagem tecnica redigida fica disponivel apenas quando `NODE_ENV=development`; stack foi removida do diagnostico.
- Respostas publicas de upload, body parsing, validacao e falhas internas usam codigos/mensagens controlados.
- A tela informa que o processamento e temporario, que a aplicacao nao armazena os arquivos, que infraestrutura/IA externas processam o conteudo e que dados sensiveis, sigilosos ou sem autorizacao nao devem ser enviados.
- Todo estado funcional continua apenas no React; nenhum mecanismo de persistencia foi criado.

### Variaveis de ambiente

`.env.example` agora documenta somente nomes consumidos:

- `GEMINI_API_KEY`;
- `AI_MODEL`;
- `AI_REQUEST_TIMEOUT_MS`;
- `AI_MAX_ATTEMPTS`;
- `AI_RETRY_INITIAL_BACKOFF_MS`;
- `PORT`, opcional apenas para o servidor Node local;
- `DISABLE_HMR`, opcional apenas para Vite local.

Nenhum valor real foi lido para o relatorio, exibido ou versionado. `.env` continua ignorado.

### Testes executados

| Teste | Resultado |
| --- | --- |
| Branch atual e ancestria | `piloto-vercel`; `main`, `HEAD` inicial e merge-base no mesmo commit `3435fd5...`; main intacta |
| `npm run lint` | passou sem erros apos as alteracoes |
| `npm run build` | passou; 1.686 modulos Vite e bundle Node gerados |
| Servidor do build em porta isolada | passou em `http://localhost:3101`; frontend `200 text/html` |
| `/api/health` | `200 application/json`; headers `nosniff`, `DENY` e referrer policy presentes; `X-Powered-By` ausente no novo servidor |
| Upload TXT pequeno | `200`, tipo `txt`, 11 palavras |
| Upload DOCX pequeno em memoria | `200`, tipo `docx`, 7 palavras |
| Upload PDF minimo em memoria | `200`, tipo `pdf`; documento sem paginas/texto usado somente para validar transporte/parser |
| Arquivo `.exe` | `415 UNSUPPORTED_FILE_TYPE` |
| PDF com extensao/MIME corretos e assinatura invalida | `415 INVALID_FILE_SIGNATURE` |
| Arquivo com 3 MB + 1 byte | `413 FILE_TOO_LARGE` |
| Texto colado com 500.001 caracteres | `413 TEXT_TOO_LARGE` |
| `rawText` com 500.001 caracteres | `413 TEXT_TOO_LARGE`, antes da Gemini |
| `combinedContent` com 100.001 caracteres | `413 TEXT_TOO_LARGE`, antes da Gemini |
| Flashcards acima de 10 | `400 INVALID_ACTIVITY_COUNT` |
| Total acima de 20 | `400 TOO_MANY_ACTIVITIES` |
| Rate limit local | passou; requests excedentes receberam `429 RATE_LIMITED` |
| Mapeamento controlado 429 | `429 AI_RATE_LIMIT`, sem detalhe tecnico publico |
| Mapeamento controlado 503 | `503 AI_UNAVAILABLE`, sem detalhe tecnico publico |
| Retry controlado 503 | passou; falha inicial e sucesso na segunda tentativa |
| Timeout controlado de 20 ms | passou; `AI_REQUEST_TIMEOUT`, uma tentativa e sem retry |
| `git diff --check` | passou; apenas avisos esperados de conversao LF/CRLF no Windows |

Os arquivos de teste foram construidos em memoria e nao foram adicionados ao repositorio. Os testes controlados de IA nao fizeram chamada externa nem consumiram a chave.

### Problemas encontrados

1. `npm run dev` nao iniciou neste ambiente porque o Node/`tsx` falhou antes de carregar `server.ts`: `uv_os_get_passwd returned ENOMEM` ao consultar o usuario do Windows. O mesmo ocorreu com Node 24 e Node 22. O build e o servidor Node de producao iniciaram e responderam normalmente, indicando falha ambiental anterior a aplicacao, mas o comando de desenvolvimento permanece sem validacao runtime nesta maquina nesta tarefa.
2. A porta 3000 ja estava ocupada por outro processo Express anterior. O novo servidor foi testado isoladamente pela nova variavel opcional `PORT` em 3101, sem encerrar processo alheio.
3. `vercel dev` nao foi executado porque a Vercel CLI nao esta instalada. Nao foi baixada nem instalada dependencia fora do projeto sem autorizacao.
4. O rate limit em memoria nao e distribuido; a regra do Vercel Firewall e pendencia obrigatoria antes de abrir o Preview externo.
5. O rewrite e o empacotamento foram validados por TypeScript/build e comparados com a documentacao oficial, mas precisam do teste `vercel dev` e Preview real antes do piloto.

### Resultados

- O projeto esta preparado em codigo para frontend Vite estatico e Express serverless, preservando o servidor local.
- Upload e texto excessivos sao rejeitados antes de produzir requests/responses incompativeis com o piloto.
- Chamadas diretas nao conseguem ultrapassar os tetos documentados de geracao.
- Tipos desconhecidos e assinaturas basicas invalidas sao rejeitados com JSON controlado.
- Os logs server-side alterados nao incluem conteudo do usuario nem mensagens/stacks brutas em Preview/Production.
- O orcamento de IA termina com margem antes de `maxDuration`.

### Estado atual

- Branch ativa: `piloto-vercel`.
- `main` permanece apontada para o commit original e nao foi alterada.
- Alteracoes ainda estao no working tree da branch de piloto; nenhum commit foi criado porque nao foi solicitado.
- Nenhum deploy, projeto, link ou variavel Vercel foi criado.
- Nenhuma persistencia ou autenticacao foi implementada.

### Pendencias

- Instalar/usar Vercel CLI somente com autorizacao e executar `vercel dev`.
- Configurar variaveis no ambiente Preview, sem copiar secrets para Production se ela nao for usada.
- Configurar e revisar a regra de rate limit no Vercel Firewall antes de compartilhar a URL.
- Criar Preview real, conferir rewrites, limite/duracao do plano, Runtime Logs e payloads, sem promover para Production.
- Repetir `npm run dev` quando a falha `uv_os_get_passwd ENOMEM` do ambiente Node/Windows estiver resolvida.
- Executar no Preview a matriz de concorrencia e carga; testes locais nao simulam multiplas instancias serverless.

### Proximos passos recomendados

1. Corrigir ou contornar a falha ambiental do `tsx` e validar desenvolvimento local na porta livre.
2. Autorizar a instalacao/execucao da Vercel CLI e testar `vercel dev` sem deploy.
3. Configurar apenas Preview e sua regra de Firewall, confirmar custos/limites vigentes e realizar um Preview controlado.
4. Inspecionar Runtime Logs e executar TXT, DOCX, PDF, mobile, dois usuarios e chamadas sequenciais antes de entregar a URL ao usuario externo.

## Correcao do `vercel dev` com Vite (31/08/2026)

### Causa raiz

- O projeto nao declarava explicitamente ao `vercel dev` que o frontend deveria ser iniciado pelo servidor de desenvolvimento do Vite. As exclusoes do fallback SPA liberavam `/@vite/client`, `/@react-refresh` e `/src/*` do rewrite para `index.html`, mas, sem um Development Command Vite explicito, essas URLs nao eram encaminhadas corretamente ao Vite e recebiam HTTP 500.
- Um fallback SPA amplo tambem nao pode ser usado no desenvolvimento local: no teste controlado ele respondeu `index.html` para as rotas internas do Vite, com HTTP 200 e MIME `text/html`, em vez dos modulos JavaScript.

### Arquivos alterados

- `vercel.json`: declarados o framework Vite e o Development Command que recebe a porta reservada pelo `vercel dev`; mantido o rewrite da API e restringido o fallback SPA para nao capturar namespaces internos do Vite nem assets compilados.
- `RELATORIO_CODEX.md`: registrado este diagnostico e sua validacao.

### Correcao realizada

- Adicionados `"framework": "vite"` e `"devCommand": "vite --port $PORT"`.
- Mantido `/api/:path*` encaminhado para `/api/index`.
- Mantido o fallback para `index.html` somente fora dos prefixos `@`, `src/`, `node_modules/`, `assets/` e `__vite`, preservando as rotas virtuais no desenvolvimento e o filesystem estatico no Preview/Production.
- Nenhum arquivo de React, Express, IA, seguranca ou servidor local foi alterado.

### Testes

| Teste | Resultado |
| --- | --- |
| `vercel dev --listen 3000` com Vercel CLI 59.10.0 | passou; Vite iniciou pelo Development Command e o proxy ficou disponivel em `http://localhost:3000` |
| `/` no `vercel dev` | `200 text/html`; HTML da aplicacao servido |
| `/@vite/client` | `200 text/javascript`; modulo Vite servido, sem 500 e sem fallback HTML |
| `/@react-refresh` | `200 text/javascript`; runtime React Refresh servido, sem 500 e sem fallback HTML |
| `/src/main.tsx` | `200 text/javascript`; modulo transformado pelo Vite, sem 500 e sem fallback HTML |
| `/api/health` no `vercel dev` | `200 application/json`; Function Express e rewrite preservados |
| Rota SPA inexistente no `vercel dev` | `200 text/html`; fallback SPA preservado |
| `npm run lint` | passou sem erros |
| `npm run build` | passou; 1.686 modulos Vite e bundle Node gerados |
| `npm start` na porta 3103 | passou; `/`, asset JS compilado, `/api/health` e rota SPA responderam 200 com os tipos corretos |
| `npm run dev` na porta 3102 | continua bloqueado antes da aplicacao pelo erro ambiental conhecido `uv_os_get_passwd returned ENOMEM` do `tsx`; a configuracao deste comando nao foi alterada |
| `git diff --check` | passou; somente aviso esperado de conversao LF/CRLF no Windows |

### Resultado

- `vercel dev` renderiza a aplicacao e entrega normalmente os modulos internos do Vite, enquanto `/api/*` continua na Function Express.
- O build de Preview/Production continua usando `dist`, e o fallback SPA nao captura os namespaces internos do Vite nem o prefixo de assets compilados.
- `npm start` permanece funcional. `npm run dev` permanece inalterado e sua validacao continua impedida exclusivamente pela falha ambiental preexistente do Node/Windows.
- Nenhum deploy foi realizado.

## Consolidacao local da integracao Vercel (04/09/2026)

### Estado consolidado

- A implementacao e as correcoes locais da integracao Vercel foram consolidadas em um unico commit na branch `piloto-vercel`.
- O commit desta consolidacao e o proprio commit que contem este registro (`HEAD` da branch ao concluir a tarefa). O hash exato e registrado no resultado da tarefa, pois um commit nao pode conter o proprio hash sem altera-lo.
- Arquivos incluidos: `.env.example`, `.gitignore`, `RELATORIO_CODEX.md`, `api/index.ts`, `server.ts`, `server/ai.ts`, `server/app.ts`, `server/parsers.ts`, `src/components/MaterialInput.tsx` e `vercel.json`.
- Permanecem validos os testes registrados anteriormente: TypeScript, build Vite/Node, servidor de producao local, rotas e limites da API, uploads TXT/DOCX/PDF, erros controlados, rate limit local e `vercel dev` com frontend Vite, Function Express e fallback SPA.
- Nenhum deploy ou push foi realizado nesta consolidacao.
- Proximo passo: configurar as variaveis de ambiente apenas no Preview e gerar um Preview real para validacao controlada.

## Primeiro Preview real na Vercel (04/09/2026)

### Resultado

- Commit de partida: `74b0b71` (`feat: preparar integracao local com a Vercel`).
- A branch `piloto-vercel` foi enviada para `origin/piloto-vercel`; `main` nao foi alterada.
- Foram configuradas exclusivamente em Preview, como Secret, as variaveis `GEMINI_API_KEY` e `AI_MODEL`. Nenhum valor foi registrado.
- Preview final: `https://projeto-estudo-6if4grjz9-silveira8393-svgs-projects.vercel.app`.
- Deployment `dpl_FgmFzEqkFePDL4gWgRWYVy4GE9ZP`: target `preview`, status `Ready`, Function `api/index` com 14,06 MB na regiao `iad1`.
- Production nao foi configurada, promovida ou alterada; nenhum dominio personalizado, merge ou rate limiting definitivo foi criado.

### Testes executados

- `GET /`: `200 text/html`.
- Asset JavaScript compilado: `200 application/javascript`.
- Fallback SPA em `/preview-fallback-check`: `200 text/html`.
- `GET /api/health`: `200 application/json`, confirmando a execucao da Function.
- API inexistente: `404 application/json` controlado.
- `POST /api/materials/extract` com texto minimo seguro: `200 application/json`, 13 palavras.
- `POST /api/ai/structure` com carga minima: `200 application/json` em aproximadamente 19,9 segundos.
- `POST /api/ai/generate` com um topico e um flashcard: `200 application/json` em aproximadamente 21,6 segundos; quantidade e schema esperados.
- Runtime Logs consultados: chamadas finais registradas sem conteudo do material e sem valores de ambiente. Erros `500` e `504` nao foram provocados deliberadamente no Preview final.
- O Preview possui Deployment Protection; acesso automatizado de validacao foi realizado com bypass autenticado da Vercel CLI.

### Problemas e correcao

- O primeiro deployment (`dpl_H2rLAzFbMoXU5icA2nE7DaQvTMi1`) concluiu o build, mas a Function falhava no cold start com `FUNCTION_INVOCATION_FAILED`: `pdfjs-dist` nao encontrava `@napi-rs/canvas` e `DOMMatrix` ficava indefinido.
- Correcao minima em `vercel.json`: inclusao explicita de `node_modules/@napi-rs/canvas*/**` no bundle da Function, sem adicionar ou atualizar dependencias.
- A correcao passou em `npm run lint`, `npm run build` e `git diff --check`; o segundo Preview iniciou a Function e passou nos testes.
- Duas tentativas iniciais de extracao receberam JSON malformado por escape da linha de comando de teste e retornaram `500` controlado. O payload foi reenviado corretamente por stdin e passou; nenhuma correcao da aplicacao foi necessaria para esse caso.

### Pendencias e proximo passo

- A correcao de empacotamento e este registro permanecem locais e devem ser revisados, consolidados em commit e enviados para `piloto-vercel` antes de qualquer nova etapa.
- Proximo passo recomendado: consolidar e enviar esses dois arquivos na branch de piloto e confirmar que um Preview criado a partir do Git reproduz o resultado, sem promover para Production.

## Validacao do Preview automatico pelo Git (04/09/2026)

### Resumo

- A correcao de empacotamento do canvas e o registro do primeiro Preview foram consolidados no commit `7d5e3ff` (`fix: incluir canvas no bundle serverless da Vercel`).
- O push de `piloto-vercel` criou automaticamente um novo Preview pela integracao Git/Vercel.
- Preview validado: `https://projeto-estudo-osvqckv56-silveira8393-svgs-projects.vercel.app`.

### Arquivos alterados

- `vercel.json`: incluso no commit para garantir o empacotamento de `@napi-rs/canvas` na Function.
- `RELATORIO_CODEX.md`: incluso no commit com o registro anterior e atualizado localmente com esta validacao final.

### Alteracoes realizadas

- Commit e push exclusivos da branch `piloto-vercel`; `main` permaneceu em `3435fd5`.
- Nenhuma dependencia foi adicionada ou atualizada.
- Nenhuma promocao, configuracao ou alteracao de Production foi executada.

### Testes executados

- Deployment automatico `dpl_CubmnDr9C2fZpAJRUTc5EzaQzMtb`: target `preview`, status `Ready`, Function `api/index` com 14,06 MB em `iad1`.
- `GET /`: `200 text/html`.
- Asset JavaScript referenciado pelo HTML: `200 application/javascript`.
- Rota SPA `/preview-fallback-check`: `200 text/html`.
- `GET /api/health`: `200 application/json`.
- `POST /api/materials/extract` com texto minimo seguro: `200 application/json`, 13 palavras.
- `POST /api/ai/structure` com carga minima: `200 application/json`, aproximadamente 4,5 segundos.
- `POST /api/ai/generate` com um topico e um flashcard: `200 application/json`, aproximadamente 4,0 segundos.
- Runtime Logs consultados apos os testes.

### Resultados

- A integracao Git/Vercel criou o Preview automaticamente a partir do commit enviado.
- Frontend, fallback SPA, Function Express, extracao e as duas rotas Gemini funcionaram no Preview.
- O erro de cold start relacionado a `DOMMatrix` e `@napi-rs/canvas` nao reapareceu nos testes nem nos Runtime Logs.

### Problemas encontrados

- Um teste inicial consultou o nome de asset do Preview anterior e recebeu `404`; o asset efetivamente referenciado pelo HTML do novo build foi identificado e respondeu `200`. Nenhuma correcao de codigo foi necessaria.
- A listagem da Vercel mostrou um deployment Production mais antigo, anterior a este push. Nenhuma acao foi executada sobre ele nesta tarefa.

### Estado atual

- `piloto-vercel` e `origin/piloto-vercel` contem o commit `7d5e3ff`.
- O Preview automatico esta `Ready` e validado.
- `main` e Production nao foram alteradas nesta tarefa.
- Este registro final permanece como alteracao local nao consolidada para evitar gerar outro Preview automatico nesta mesma tarefa.

### Pendencias

- Consolidar este registro documental em tarefa posterior, considerando que um novo push pode acionar outro Preview automatico.
- Manter o Preview protegido e nao promover para Production sem autorizacao especifica.

### Proximos passos recomendados

- Definir em tarefa separada os criterios e controles para disponibilizar o Preview ao usuario piloto, sem promover para Production.

## Diagnostico da falha com o PDF DEL1001 (04/09/2026)

### Resumo

- Foi investigado o erro `500 INTERNAL_ERROR` observado no Preview `projeto-estudo-osvqckv56-silveira8393-svgs-projects.vercel.app` ao enviar o arquivo `DEL1001.pdf`, exibido pelo frontend com aproximadamente 2025,7 KB.
- A camada causadora foi delimitada ao parser de PDF: o upload chegou a Function, foi aceito pelo Multer e passou pela validacao de tipo/assinatura antes de `parsePdfBuffer` devolver um erro generico.
- A excecao interna exata do `pdfjs-dist` nao pode ser recuperada dos logs atuais porque `server/parsers.ts` captura qualquer erro e o substitui por uma nova mensagem generica; o middleware registra apenas nome, codigo e status desse novo erro.
- Nenhuma correcao, dependencia, deploy, push ou alteracao de arquitetura foi realizada nesta fase.

### Arquivos alterados

- `RELATORIO_CODEX.md`: registro deste diagnostico.

### Alteracoes realizadas

- Nenhum codigo ou configuracao foi alterado.
- Foram consultados somente o repositorio, o deployment Preview e a documentacao oficial vigente da Vercel.

### Testes executados

- Busca local por `DEL1001.pdf` e por outros arquivos PDF: nenhum PDF disponivel no workspace.
- Consulta dos Runtime Logs do deployment `dpl_CubmnDr9C2fZpAJRUTc5EzaQzMtb` nas ultimas 24 horas, filtrada por HTTP 500.
- Revisao do fluxo multipart, limites, validacao de assinatura, parser, tratamento de excecao e empacotamento de canvas.
- Revisao dos limites oficiais de payload, memoria, bundle e duracao das Vercel Functions.

### Resultados

- O Runtime Log registra uma unica falha real em `04/09/2026 15:04:34` no horario local: Function serverless, `POST /api/materials/extract`, HTTP 500, branch `piloto-vercel` e mensagem `[API Error]: { name: 'Error', code: 'UNKNOWN', status: undefined }`.
- Um excesso no limite Multer de 3 MiB produziria `MulterError`, log `Upload Rejected` e HTTP 413; isso nao ocorreu.
- Um tipo, MIME ou assinatura PDF invalida produziria `PublicRequestError` e HTTP 415; isso nao ocorreu.
- O payload informado, aproximadamente 1,98 MiB antes do overhead multipart, esta abaixo do limite do aplicativo de 3 MiB e do limite oficial de 4,5 MB por request/response da Vercel. O tamanho exato recebido nao e registrado atualmente.
- Como `multer.memoryStorage()` entrega `req.file.buffer` apenas depois de consumir o multipart, e a execucao alcancou o caminho que transforma falhas do parser em `Error`, ha evidencia de que o arquivo chegou integralmente a Function e foi entregue ao parser.
- A resposta foi HTTP 500 da aplicacao, nao 413 da plataforma, 504 `FUNCTION_INVOCATION_TIMEOUT` ou encerramento por falta de memoria. Timeout e limite de payload nao correspondem ao sintoma observado.
- `@napi-rs/canvas` esta incluido no bundle; a Function inicializou e os logs desta falha nao mostram `DOMMatrix`, modulo ausente ou process exit. A correcao anterior de empacotamento nao regrediu.
- A memoria efetivamente usada, a duracao exata e a excecao original nao aparecem na saida da CLI consultada. A Vercel disponibiliza esses metadados no detalhe da invocacao no painel de Runtime Logs, quando acessiveis no plano.

### Problemas encontrados

- `parsePdfBuffer` remove completamente nome, codigo e causa da excecao original. Isso protege detalhes internos na resposta publica, mas impede determinar pelos logs se este PDF falhou por estrutura, recurso grafico, fonte, criptografia, corrupcao ou limitacao especifica do `pdfjs-dist`.
- Sem o arquivo `DEL1001.pdf`, nao foi possivel reproduzir localmente nem comparar seu comportamento com outro PDF real de tamanho semelhante.
- Portanto, esta comprovado que a falha ocorre dentro do parser, mas nao esta comprovada a causa interna final nem se ela e exclusiva deste documento ou de uma classe de PDFs semelhantes.

### Estado atual

- A aplicacao continua aceitando texto e as rotas serverless continuam operacionais no Preview.
- O caminho PDF real possui uma falha reproduzida pelo usuario e localizada na etapa `PDFParse.getText()`/tratamento do parser.
- `main`, Production, dependencias e configuracoes Vercel nao foram alteradas nesta investigacao.

### Pendencias

- Disponibilizar o mesmo `DEL1001.pdf` no workspace, sem dados pessoais ou sigilosos, para reproducao controlada local.
- Executar o parser diretamente sobre o arquivo e capturar localmente tipo, codigo e cadeia de causa da excecao, sem registrar conteudo do documento.
- Se a reproducao local divergir, consultar no painel Vercel os metadados da invocacao das 15:04:34, especialmente duracao e pico de memoria.

### Proximos passos recomendados

- Na proxima tarefa, reproduzir com o mesmo arquivo e adicionar, somente se ainda necessario, diagnostico sanitizado temporario no `catch` de `parsePdfBuffer` que preserve `name`, `code` e categoria da causa sem expor texto, stack ou dados do PDF; somente depois definir a correcao funcional.

## Reproducao local com o PDF DEL1001 (04/09/2026)

### Resumo

- O arquivo exato usado pelo usuario foi localizado em `C:\Users\Silveira\Downloads\DEL1001.pdf`, fora do repositorio, com 2.074.318 bytes.
- O arquivo nao esta rastreado pelo Git, nao foi alterado, copiado, versionado nem enviado a servico externo nesta tarefa.
- A chamada direta da mesma biblioteca `pdf-parse` 2.4.5, classe `PDFParse` e metodo `getText()` concluiu localmente sem excecao.
- A falha do Preview nao foi reproduzida no Windows local; a diferenca esta associada ao ambiente de execucao serverless ou a uma condicao transitoria nele, mas o subtipo exato continua oculto pelo tratamento atual.

### Arquivos alterados

- `RELATORIO_CODEX.md`: registro dos resultados; nenhum codigo foi alterado.

### Alteracoes realizadas

- Nenhuma instrumentacao, correcao funcional, dependencia, configuracao, deploy, push ou commit foi realizado.

### Testes executados

- Confirmacao de caminho, tamanho e ausencia do arquivo no indice Git.
- Execucao direta de `PDFParse.getText()` sobre o arquivo exato, sem imprimir o texto extraido ou conteudo de paginas.
- Levantamento local apenas de tamanho, versao PDF, paginas, contagens, tempo, memoria e marcadores estruturais.
- Estimativa do tamanho da resposta JSON que a rota produziria, sem registrar seu campo de texto.
- Tentativa de executar `parsePdfBuffer` via `tsx`; o runner falhou antes de carregar o modulo pelo erro ambiental preexistente `uv_os_get_passwd returned ENOMEM`.
- Busca por PDF pequeno no workspace e nas dependencias: nenhum candidato disponivel para comparacao nesta tarefa.

### Resultados

- `PDFParse.getText()` passou em 961 ms: 86 paginas, 221.549 caracteres e 36.756 palavras.
- RSS observado: 57,4 MiB antes da leitura, 59,8 MiB apos leitura, 61,7 MiB apos construcao do parser e 100,1 MiB apos extracao; heap usado ao final 23,9 MiB e memoria externa 10,7 MiB.
- A resposta JSON estimada tem 235.449 bytes, muito abaixo do limite de resposta e do limite interno de 500.000 caracteres.
- Perfil estrutural sanitizado: PDF 1.4, nao criptografado, XRef classico, sem XRef stream, object stream, linearizacao, AcroForm ou XFA; foram detectados 12 objetos de fonte, 2 de imagem e 101 filtros Flate.
- O sucesso local exclui arquivo globalmente ilegivel, criptografia impeditiva, corrupcao basica de XRef e incompatibilidade geral da biblioteca com o documento.
- O consumo e o tempo locais nao sustentam falta de memoria ou timeout como causa. O HTTP 500 do Preview, em vez de 413 ou 504, tambem nao corresponde a esses limites.
- Como o mesmo documento passa localmente e falha somente na Function, a causa mais provavel e uma incompatibilidade ou falha transitoria do `pdfjs-dist`/recursos nativos no runtime Linux serverless acionada durante esse documento. Nao ha evidencia suficiente para atribui-la especificamente a canvas, fontes, imagens ou uma pagina.

### Problemas encontrados

- A excecao original do Preview continua irrecuperavel: `parsePdfBuffer` substitui integralmente o erro antes do log global.
- A falha ambiental do `tsx` impede usar diretamente o wrapper TypeScript nesta maquina, embora a biblioteca e o metodo efetivamente usados tenham sido exercitados com sucesso via Node.
- Sem uma nova execucao serverless com diagnostico sanitizado, nao e possivel distinguir incompatibilidade deterministica do runtime de falha transitoria.

### Estado atual

- A biblioteca atual permanece adequada de forma provisoria: processa o arquivo exato localmente, mas ainda nao oferece diagnostico suficiente nem confiabilidade comprovada para esta classe de PDF no Preview.
- `DEL1001.pdf` permanece somente em Downloads e fora do Git.
- `main`, Production, dependencias, codigo e configuracao Vercel permanecem inalterados.

### Pendencias

- Adicionar em tarefa separada instrumentacao sanitizada minima no `catch` de `parsePdfBuffer`, preservando apenas etapa, `name`, `code`, `cause.name`, `cause.code` e mensagem tecnica revisada, sem stack ou conteudo.
- Repetir uma unica vez o upload do mesmo arquivo no Preview instrumentado e remover ou reduzir a instrumentacao depois de identificar a excecao.

### Proximos passos recomendados

- Implementar primeiro a instrumentacao sanitizada em `server/parsers.ts`; nao trocar biblioteca nem criar fallback antes de capturar a excecao real no runtime serverless.

## Instrumentacao sanitizada do parser PDF (04/09/2026)

### Resumo

- Preparada instrumentacao minima no tratamento de erro de `parsePdfBuffer` para diagnosticar uma unica reproducao de `DEL1001.pdf` no Preview.

### Arquivos alterados

- `server/parsers.ts`: diagnostico sanitizado da excecao original.
- `RELATORIO_CODEX.md`: registro da instrumentacao e das validacoes.

### Alteracoes realizadas

- O log do parser preserva somente a etapa fixa `PDFParse.getText`, `name`, `code`, `causeName` e `causeCode` quando disponiveis.
- Mensagem, stack, buffer, texto, paginas, caminhos, variaveis de ambiente e demais dados foram deliberadamente omitidos.
- A resposta publica generica permanece inalterada; nenhuma biblioteca, dependencia, arquitetura ou fallback foi modificado.

### Testes executados

- Pendentes nesta entrada: TypeScript, build, `git diff --check`, parser local, Preview automatico e uma unica reproducao remota controlada.

### Resultados

- A instrumentacao esta limitada ao caminho de erro do parser PDF e nao altera o caminho de sucesso.

### Problemas encontrados

- Nenhum problema adicional identificado antes da validacao.

### Estado atual

- Alteracao preparada na branch `piloto-vercel`, ainda sem commit ou deploy nesta entrada.

### Pendencias

- Validar localmente, consolidar, enviar a branch, aguardar o Preview e executar uma unica reproducao com o arquivo exato.

### Proximos passos recomendados

- Capturar a excecao sanitizada no Preview e, sem implementar correcao funcional, definir a causa e a proxima alteracao minima.

## Resultado da instrumentacao no Preview (04/09/2026)

### Resumo

- A instrumentacao sanitizada foi consolidada no commit `5ea0088` (`chore: instrumentar erros do parser PDF`) e enviada somente para `piloto-vercel`.
- A integracao Git criou o Preview `https://projeto-estudo-en2no1702-silveira8393-svgs-projects.vercel.app`, deployment `dpl_7vAiCjCjS21dKwiatWWtgYi6U5BW`, target `preview`, confirmado como `Ready`.
- O arquivo `DEL1001.pdf` foi enviado uma unica vez a esse Preview; o corpo da resposta foi descartado e nenhum conteudo foi registrado.

### Arquivos alterados

- `server/parsers.ts`: instrumentacao sanitizada incluida no commit.
- `RELATORIO_CODEX.md`: historico de diagnostico incluido no commit e este resultado final mantido localmente.

### Alteracoes realizadas

- O `catch` do parser passou a registrar somente etapa, `name`, `code`, `causeName` e `causeCode`.
- A resposta publica permaneceu generica e nenhuma mensagem, stack, buffer, texto, pagina, caminho ou segredo foi registrado.
- Nenhuma correcao funcional, dependencia, fallback ou alteracao arquitetural foi implementada.

### Testes executados

- `npm run lint`: passou.
- `npm run build`: passou.
- `git diff --check`: passou.
- `PDFParse.getText()` local com o arquivo exato: passou novamente, 86 paginas e 221.549 caracteres, sem imprimir conteudo.
- Upload unico no Preview instrumentado: 2.074.631 bytes multipart, HTTP 500 JSON em aproximadamente 4,50 segundos; resposta com 93 bytes descartada.
- Runtime Logs do deployment consultados imediatamente apos a reproducao.

### Resultados

- Excecao sanitizada: etapa `PDFParse.getText`, `name=Error`, sem `code`, sem `causeName` e sem `causeCode`.
- O log global confirmou `Error`, codigo normalizado `UNKNOWN` e HTTP 500.
- O erro foi reproduzido somente no runtime serverless; o mesmo arquivo continua sendo processado localmente.
- Nao houve 413, 504, process exit, `DOMMatrix` ou modulo canvas ausente.

### Problemas encontrados

- Os campos estruturados permitidos sao insuficientes para determinar a causa interna: a biblioteca lancou um `Error` generico sem codigo nem causa.
- A mensagem bruta nao foi registrada porque nao ha garantia de que ela nao contenha caminho ou fragmento derivado do documento.
- Portanto, a causa exata ainda nao foi identificada. A hipotese permanece restrita a diferenca do runtime Linux serverless ou recurso carregado durante `getText()`, sem evidencia para escolher entre worker, fonte, canvas, imagem ou outro componente.

### Estado atual

- `piloto-vercel` e `origin/piloto-vercel` contem `5ea0088`.
- O Preview instrumentado esta `Ready`; o erro do PDF foi reproduzido uma vez e nao foi repetido.
- `main`, Production e dependencias permaneceram intactas.
- Este resultado final permanece como alteracao local do relatorio para nao disparar outro Preview nesta tarefa.

### Pendencias

- Em tarefa posterior, substituir temporariamente a omissao total da mensagem por classificacao local baseada em uma lista fechada de padroes tecnicos seguros, retornando somente uma categoria predefinida.
- Somente depois dessa revisao, autorizar uma nova reproducao unica para distinguir o componente interno sem expor dados.

### Proximos passos recomendados

- Revisar e autorizar uma instrumentacao de segunda etapa que converta a mensagem internamente em categorias predefinidas como worker, modulo nativo, canvas, fonte, XRef, criptografia, memoria ou desconhecida, sem registrar a mensagem original.

## Classificador fechado de erros PDF (04/09/2026)

### Resumo

- Preparada a segunda instrumentacao diagnostica para classificar internamente a mensagem original e registrar somente uma categoria tecnica predefinida.

### Arquivos alterados

- `server/parsers.ts`: classificador fechado e log reduzido a etapa/categoria.
- `RELATORIO_CODEX.md`: levantamento e registro da tarefa.

### Alteracoes realizadas

- Versoes confirmadas: `pdf-parse` 2.4.5, `pdfjs-dist` 5.4.296 e `@napi-rs/canvas` 0.1.80.
- O codigo instalado sustenta familias de erro relacionadas a worker, resolucao de modulo, canvas nativo, fontes, imagens, XRef/estrutura, criptografia, PDF invalido, filesystem, WebAssembly e memoria.
- Categorias fechadas: `WORKER`, `MODULE_RESOLUTION`, `CANVAS_NATIVE`, `FONT`, `IMAGE`, `XREF`, `ENCRYPTION`, `INVALID_PDF`, `FILESYSTEM`, `WASM`, `MEMORY` e `UNKNOWN`.
- A mensagem e lida somente dentro do classificador, comparada com termos tecnicos e descartada. O log contem apenas `stage=PDFParse.getText` e `pdfErrorCategory`.
- A resposta publica generica permanece inalterada; nenhuma dependencia, biblioteca, arquitetura, fallback ou correcao funcional foi modificada.

### Testes executados

- Pendentes nesta entrada: TypeScript, build, `git diff --check`, teste local, commit, Preview automatico e uma unica reproducao remota.

### Resultados

- A ordem do classificador prioriza resolucao de modulo antes de canvas e canvas antes de imagem para reduzir ambiguidades.

### Problemas encontrados

- Nenhum problema adicional identificado antes da validacao.

### Estado atual

- Instrumentacao de segunda etapa preparada somente na branch `piloto-vercel`.

### Pendencias

- Validar, consolidar, enviar a branch e capturar uma unica categoria no Preview.

### Proximos passos recomendados

- Usar a categoria resultante apenas para diagnosticar a proxima correcao; nao implementar correcao funcional nesta tarefa.

## Resultado do classificador no Preview (04/09/2026)

### Resumo

- O classificador fechado foi consolidado no commit `711cc05` (`chore: classificar erros do parser PDF`) e enviado somente para `piloto-vercel`.
- A integracao Git criou o Preview `https://projeto-estudo-85yv1gnc7-silveira8393-svgs-projects.vercel.app`, deployment `dpl_BpqCq8w7HvPjH6xNmwSRBwShX17M`, target `preview`, confirmado como `Ready`.
- `DEL1001.pdf` foi enviado uma unica vez; a resposta foi descartada e a mensagem original nunca foi registrada.

### Arquivos alterados

- `server/parsers.ts`: classificador fechado incluido no commit.
- `RELATORIO_CODEX.md`: levantamento incluido no commit e resultado final mantido localmente.

### Alteracoes realizadas

- A mensagem original passou somente por comparacao interna e foi descartada.
- O Runtime Log recebeu exclusivamente a etapa fixa e uma categoria da lista fechada.
- Nenhuma correcao funcional, dependencia, biblioteca, fallback ou arquitetura foi alterada.

### Testes executados

- `npm run lint`, `npm run build` e `git diff --check`: passaram.
- Teste local com o arquivo exato: passou, 86 paginas, 221.549 caracteres e aproximadamente 1,72 segundo, sem imprimir conteudo.
- Upload unico no Preview: 2.074.631 bytes multipart, HTTP 500 JSON em aproximadamente 3,90 segundos; corpo descartado.
- Runtime Log consultado imediatamente apos a unica reproducao.

### Resultados

- Categoria emitida: `MODULE_RESOLUTION`, na etapa `PDFParse.getText`.
- A classificacao e sustentada exclusivamente por um dos padroes fechados de falha de resolucao de modulo ou pacote; nenhum texto original foi persistido ou exibido.
- A inspecao estatica encontrou carregamentos dinamicos dos binarios de plataforma de `@napi-rs/canvas` e do modulo `pdf.worker.mjs`.
- Como o cold start, `DOMMatrix` e canvas ja funcionam, enquanto a falha ocorre ao executar `getText()`, o worker dinamico ausente do rastreamento do bundle e o candidato principal. A categoria nao identifica o nome do modulo; portanto esta e uma conclusao provavel, nao uma comprovacao final do caminho ausente.

### Problemas encontrados

- A prioridade intencional de `MODULE_RESOLUTION` evita expor o nome original, mas nao distingue canvas nativo de worker quando a mensagem contem ambos os conceitos.
- O PDF continua passando localmente e falhando somente no runtime serverless.

### Estado atual

- `piloto-vercel` e `origin/piloto-vercel` contem `711cc05`.
- O Preview do classificador esta `Ready`; a reproducao unica foi concluida e nao repetida.
- `main`, Production e dependencias permaneceram intactas.
- Este resultado final permanece como alteracao local do relatorio para evitar outro Preview nesta tarefa.

### Pendencias

- Avaliar em tarefa separada o empacotamento explicito de `pdfjs-dist/legacy/build/pdf.worker.mjs` ou a configuracao suportada de worker do `pdf-parse`, sem trocar biblioteca.
- Confirmar a solucao com testes locais e uma unica reproducao em novo Preview antes de remover ou reduzir a instrumentacao.

### Proximos passos recomendados

- Implementar e validar, em tarefa separada, a menor correcao de empacotamento/configuracao do worker PDF; nao promover para Production antes de o mesmo arquivo retornar sucesso no Preview.

## Inclusao do worker PDF no bundle da Vercel (04/09/2026)

### Resumo

- A investigacao confirmou que o `pdfjs-dist` resolve dinamicamente `pdf.worker.mjs` no runtime Node e que esse arquivo nao estava declarado entre os arquivos adicionais da Function.
- Foi preparada a menor correcao de empacotamento, mantendo as bibliotecas, o fluxo da API e a instrumentacao diagnostica atuais.

### Arquivos alterados

- `vercel.json`: inclusao explicita do worker do `pdfjs-dist` no bundle serverless.
- `RELATORIO_CODEX.md`: registro da investigacao, implementacao e validacao desta tarefa.

### Alteracoes realizadas

- `includeFiles` passou a incluir `node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs`, alem dos binarios ja incluidos de `@napi-rs/canvas`.
- Nenhuma dependencia, biblioteca, fallback, arquitetura ou resposta publica foi alterada.

### Testes executados

- `npm run lint`, `npm run build` e `git diff --check`: passaram.
- Teste local com o arquivo exato: passou em aproximadamente 2,1 segundos, com 86 paginas e 221.549 caracteres, sem imprimir conteudo.
- Pendentes nesta entrada: commit, Preview automatico e reproducao remota unica.

### Resultados

- O `pdf-parse` 2.4.5 usa `pdfjs-dist` 5.4.296 e oferece configuracao explicita de worker, mas o caminho padrao do Node resolve `./pdf.worker.mjs` ao lado do modulo principal.
- A inclusao no bundle e menos invasiva que alterar o codigo do parser e atende diretamente ao carregamento dinamico associado a categoria `MODULE_RESOLUTION`.
- O teste manual com aproximadamente 35.485 palavras confirmou que estrutura, geracao e estudo funcionam no Preview quando a etapa PDF e eliminada, isolando a falha ao parsing.

### Problemas encontrados

- A categoria sanitizada nao revela o nome do modulo ausente; a hipotese do worker sera confirmada ou refutada pelo teste real no novo Preview.
- A primeira forma usou uma lista em `includeFiles`, mas a Vercel aceita um unico padrao glob nessa configuracao e rejeitou o deployment antes do build. A mesma inclusao foi ajustada para um glob fechado com os dois alvos, sem mudanca funcional.

### Estado atual

- Correcao de empacotamento preparada somente em `piloto-vercel`; `main` e Production permanecem intactas.

### Pendencias

- Validar localmente, consolidar, enviar a branch e testar o arquivo exato uma unica vez no Preview automatico.

### Proximos passos recomendados

- Usar o resultado da reproducao unica para confirmar a correcao, sem promover para Production nesta tarefa.

## Resultado do worker PDF no Preview (04/09/2026)

### Resumo

- A inclusao do worker foi consolidada em `6561b34` (`fix: incluir worker PDF no bundle da Vercel`).
- A forma inicial de `includeFiles` foi rejeitada pela validacao da Vercel; o glob foi corrigido em `d45aaa3` (`fix: corrigir glob do worker PDF na Vercel`) sem reescrever o historico.
- O Preview valido foi criado automaticamente em `https://projeto-estudo-31zbqplgx-silveira8393-svgs-projects.vercel.app`, deployment `dpl_39ByoCe43TYc5cNZU3omo959cxdA`, target `preview`, status `Ready`.

### Arquivos alterados

- `vercel.json`: worker do `pdfjs-dist` incluido no mesmo glob dos arquivos nativos de canvas.
- `RELATORIO_CODEX.md`: registro da implementacao e do resultado final.

### Alteracoes realizadas

- O bundle da Function passou a conter explicitamente `pdfjs-dist/legacy/build/pdf.worker.mjs`.
- A instrumentacao diagnostica foi mantida e nenhum codigo do parser, dependencia, fallback, arquitetura ou resposta publica foi alterado.

### Testes executados

- `npm run lint`, `npm run build` e `git diff --check`: passaram antes dos commits.
- Teste local com o arquivo exato: passou, 86 paginas e 221.549 caracteres, sem imprimir conteudo.
- Upload unico de `DEL1001.pdf` no Preview valido: concluido sem registrar o texto ou salvar a resposta.
- Runtime Logs consultados imediatamente depois da reproducao.

### Resultados

- A extracao remota retornou HTTP 200: 86 paginas, 36.756 palavras e 221.547 caracteres.
- O Runtime Log confirmou `POST /api/materials/extract`, HTTP 200, ambiente `preview`, branch `piloto-vercel` e cache `MISS`.
- Nao houve categoria de erro, mensagem do parser, `DOMMatrix`, erro de canvas ou resolucao de modulo.
- O sucesso apos a inclusao isolada confirma que o worker dinamico ausente do bundle era a causa da falha serverless.

### Problemas encontrados

- O deployment de `6561b34` falhou antes do build porque `includeFiles` foi expresso como lista, formato nao aceito nessa configuracao. O ajuste para um unico glob fechado gerou o Preview valido.
- Nenhum problema funcional foi encontrado no teste real do PDF apos o ajuste.

### Estado atual

- `piloto-vercel` e `origin/piloto-vercel` contem `d45aaa3`.
- O Preview automatico esta `Ready` e o PDF real foi validado com sucesso.
- `main`, Production e dependencias permaneceram intactas.
- Este resultado final permanece como alteracao local do relatorio para evitar outro Preview automatico nesta tarefa.

### Pendencias

- Consolidar este registro documental em tarefa posterior, considerando que outro push pode acionar novo Preview.
- Avaliar em tarefa separada a remocao ou reducao da instrumentacao diagnostica temporaria, agora que a causa foi confirmada.

### Proximos passos recomendados

- Em tarefa separada, consolidar o registro final e remover ou reduzir a instrumentacao temporaria, mantendo o Preview antes de qualquer decisao sobre Production.

## Promocao controlada para Production (04/09/2026)

### Resumo

- O Preview validado `dpl_39ByoCe43TYc5cNZU3omo959cxdA`, associado ao commit `d45aaa3`, foi promovido pela operacao suportada `vercel promote`.
- A Vercel criou a copia de Production `dpl_CTQvK1GzKZwHWv7MvDRkvagswm8A`, status `Ready`, preservando o codigo e a configuracao do deployment validado.
- O endereco estavel `https://projeto-estudo-sooty.vercel.app` passou a apontar para a versao corrigida.

### Arquivos alterados

- `RELATORIO_CODEX.md`: registro da promocao e validacao de Production; nenhum codigo ou configuracao foi alterado localmente.

### Alteracoes realizadas

- Promocao direta do deployment validado, sem merge, push, novo commit ou alteracao de dependencias.
- Os aliases de Production foram associados ao novo deployment pela Vercel.
- A instrumentacao diagnostica existente foi preservada.

### Testes executados

- Confirmacao previa de status `Ready`, commit, aliases, configuracao do projeto e existencia das variaveis de Production somente por nome.
- `GET /`, asset JavaScript principal, fallback SPA e `GET /api/health` no dominio estavel.
- Upload unico de `DEL1001.pdf` em Production, sem exibir ou salvar seu conteudo.
- Estruturacao de texto minimo e geracao de um unico flashcard.
- Consulta dos Runtime Logs e dos metadados finais do deployment e aliases.

### Resultados

- Pagina, asset principal, fallback SPA e health retornaram HTTP 200 com os tipos de conteudo esperados.
- `DEL1001.pdf` retornou HTTP 200 em aproximadamente 5,05 segundos: 86 paginas, 36.756 palavras e 221.547 caracteres.
- Estruturacao minima retornou HTTP 200 com dois topicos; geracao minima retornou HTTP 200 com um flashcard.
- Os Runtime Logs confirmaram HTTP 200 para health, extracao, estrutura e geracao no ambiente `production`, branch `piloto-vercel`.
- Nao houve `FUNCTION_INVOCATION_FAILED`, `MODULE_RESOLUTION`, erro de worker, `DOMMatrix`, erro de canvas ou HTTP 500 inesperado.

### Problemas encontrados

- A primeira tentativa local de verificar as rotas usou acidentalmente um nome reservado do PowerShell e foi interrompida antes dos testes; a verificacao foi repetida com nome seguro e passou. Nenhum estado remoto foi afetado.
- Nenhum problema funcional foi encontrado na Production promovida.

### Estado atual

- Production Current: `dpl_CTQvK1GzKZwHWv7MvDRkvagswm8A`, derivada do deployment validado e associada pelo filtro Git ao commit `d45aaa3`.
- Dominios associados: `projeto-estudo-sooty.vercel.app`, `projeto-estudo-silveira8393-svgs-projects.vercel.app` e `projeto-estudo-git-piloto-vercel-silveira8393-svgs-projects.vercel.app`.
- `piloto-vercel` e `origin/piloto-vercel` permanecem em `d45aaa3`; `main` permanece em `3435fd5`.
- Somente este registro permanece modificado localmente.

### Pendencias

- Consolidar o historico documental em tarefa posterior.
- Avaliar separadamente a reducao da instrumentacao temporaria, sem alterar a versao funcional validada.

### Proximos passos recomendados

- Em tarefa separada, consolidar o relatorio e planejar a remocao controlada da instrumentacao diagnostica, com nova validacao antes de qualquer outra mudanca em Production.

## Limpeza da instrumentacao temporaria do parser PDF (04/09/2026)

### Resumo

- O classificador temporario usado para identificar a falha de resolucao de modulo foi removido apos a confirmacao e correcao da causa.
- Foi preservado um log operacional minimo e sanitizado com somente a etapa fixa do parser.
- Os registros locais pendentes das validacoes de Preview e Production foram mantidos e serao consolidados neste mesmo commit.

### Arquivos alterados

- `server/parsers.ts`: remocao do classificador temporario e reducao do log de erro.
- `RELATORIO_CODEX.md`: consolidacao do historico pendente e registro desta estabilizacao.

### Alteracoes realizadas

- Removidos o tipo `PdfErrorCategory`, a lista fechada de padroes e a leitura interna de `error.message`.
- Mantido o log `[PDF Parser Error]` somente com `stage=PDFParse.getText`.
- Mantidas a resposta publica generica, a biblioteca atual e a inclusao do worker PDF no `vercel.json`.
- Nenhuma UX, dependencia, arquitetura, persistencia ou funcionalidade foi alterada.

### Testes executados

- `npm run lint`, `npm run build` e `git diff --check`: passaram.
- Teste local com o arquivo exato: passou, com 86 paginas, 36.756 palavras e 221.547 caracteres, sem imprimir conteudo.
- Pendentes nesta entrada: commit, Preview automatico, health, upload remoto unico e Runtime Logs.

### Resultados

- A limpeza nao alterou o caminho de sucesso nem o contrato publico do parser na validacao local.

### Problemas encontrados

- Nenhum problema adicional identificado antes da validacao.

### Estado atual

- Limpeza preparada somente em `piloto-vercel`; `main` e Production permanecem inalteradas nesta tarefa.

### Pendencias

- Validar localmente, consolidar, enviar a branch e verificar o PDF real uma unica vez no Preview.

### Proximos passos recomendados

- Concluir a validacao desta limpeza antes de considerar o marco estabilizado e iniciar qualquer fase de persistencia.

## Validacao final da limpeza do parser PDF (04/09/2026)

### Resumo

- A limpeza foi consolidada no commit `1e929c0` (`chore: remover diagnostico temporario do parser PDF`) e enviada somente para `piloto-vercel`.
- A integracao Git criou o Preview `https://projeto-estudo-plq6pbc12-silveira8393-svgs-projects.vercel.app`, deployment `dpl_Fkd5NZftscMTcob65c8Q5AAC2Q8g`, target `preview`, status `Ready`.
- O marco atual ficou estabilizado e validado antes de qualquer trabalho de banco de dados ou persistencia.

### Arquivos alterados

- `server/parsers.ts`: classificador temporario removido e log operacional minimo preservado no commit.
- `RELATORIO_CODEX.md`: historico pendente consolidado no commit e este resultado final mantido localmente.

### Alteracoes realizadas

- Foram removidos a leitura interna da mensagem, os padroes e as categorias temporarias de diagnostico.
- Foram preservados o log sanitizado da etapa, a resposta publica generica, o fluxo do parser e o empacotamento do worker e canvas.
- Nenhuma dependencia, UX, arquitetura, banco de dados, autenticacao ou persistencia foi alterada.

### Testes executados

- `npm run lint`, `npm run build` e `git diff --check`: passaram.
- Teste local de `DEL1001.pdf`: passou com 86 paginas, 36.756 palavras e 221.547 caracteres, sem imprimir conteudo.
- `GET /api/health` no Preview: passou.
- Upload unico de `DEL1001.pdf` no Preview: passou sem exibir ou persistir seu texto.
- Runtime Logs consultados imediatamente apos os testes.

### Resultados

- Health e extracao retornaram HTTP 200 no Runtime Log.
- O PDF retornou 86 paginas, 36.756 palavras e 221.547 caracteres.
- Nao houve erro de parser, worker, canvas, `DOMMatrix`, resolucao de modulo ou HTTP 500.
- O comportamento funcional permaneceu inalterado apos a remocao do diagnostico temporario.

### Problemas encontrados

- A primeira contagem local de palavras ficou incorreta apenas no comando de diagnostico por escape duplo da expressao regular; a contagem foi recalculada sem alterar codigo ou arquivo e confirmou 36.756 palavras.
- Nenhum problema funcional foi encontrado.

### Estado atual

- `piloto-vercel` e `origin/piloto-vercel` contem `1e929c0`.
- `main` permanece em `3435fd5` e Production nao foi alterada nesta tarefa.
- O Preview esta `Ready` e validado; este resultado final permanece como alteracao local para evitar outro deployment automatico.
- O marco de estabilizacao do fluxo principal pode ser considerado fechado.

### Pendencias

- Consolidar este registro documental quando apropriado, considerando o acionamento automatico de Preview por push.
- Definir separadamente o escopo e os requisitos da proxima fase antes de implementar persistencia.

### Proximos passos recomendados

- Planejar em tarefa separada a proxima fase de dados e persistencia, sem inicia-la automaticamente.

## Diagnostico da geracao combinada de atividades por IA (07/09/2026)

### Resumo

- Objetivo: investigar por que modalidades isoladas funcionam e a combinacao falha, sem implementar correcao ou instrumentacao.
- Confirmado nos Runtime Logs de Production: falhas de `/api/ai/generate` com `ApiError`, status upstream 503 e 504. O backend preserva 503 e converte o 504 upstream em HTTP 500 generico.
- As falhas registradas ocorreram na chamada ao provedor, antes do parsing/normalizacao das atividades. Nao foi comprovado que a combinacao das modalidades seja a causa dos erros upstream.
- O pedido anexado prevaleceu sobre `TAREFA_ATUAL.md`, que ainda descreve uma validacao anterior. O problema de extracao PDF nao foi tratado como causa desta falha de geracao.

### Arquivos alterados

- Somente `RELATORIO_CODEX.md`, por acrescimo ao final. Preservados os 55 acrescimos locais preexistentes e todo o conteudo anterior (1.622 linhas).
- Estado inicial: branch `piloto-vercel`, HEAD `1e929c0`; somente o relatorio modificado. Nenhum commit, push ou deploy realizado.

### Alteracoes realizadas

- Apenas documentacao do diagnostico. Nenhuma alteracao de codigo, frontend, UX, prompt, modelo, dependencias, ambiente, Vercel, Supabase ou persistencia.
- Inspecionados: `GUIA_CODEX.md`, relatorio completo, `TAREFA_ATUAL.md`, `src/App.tsx`, `src/components/SessionConfigView.tsx`, `src/lib/api.ts`, `src/types.ts`, `server/ai.ts`, `server/app.ts`, `server.ts`, `api/index.ts`, `vercel.json`, `package.json`, resolucao do SDK no `package-lock.json` e trechos do SDK instalado `node_modules/@google/genai/dist/node/index.mjs`.
- Comparacao Git entre `d45aaa3` (Production registrada) e HEAD: sem diferencas em IA, rota, App, cliente HTTP, handler e configuracao Vercel. Os logs consultados confirmaram o deployment Production `dpl_CTQvK1GzKZwHWv7MvDRkvagswm8A`.

### Fluxo exato e pontos de controle

1. `src/App.tsx:42`: estado React de modo, dificuldade e contagens; defaults 3/2/2. `SessionConfigView` recebe valores/setters e altera cada quantidade independentemente; o botao chama `onGenerate`. A interface permite incrementos acima dos tetos do backend.
2. `src/App.tsx:177`: `handleGenerateActivities` filtra os topicos selecionados e monta `combinedContent` com titulo e `excerptContent || summary` de cada um. Se o resultado tiver menos de 50 caracteres ou estiver vazio, usa o `rawText` inteiro. Um topico selecionado nao significa automaticamente enviar o documento inteiro.
3. As aproximadamente 57.043 palavras e os cinco topicos sao dados informados pelo usuario, nao tamanhos medidos do request. A estruturacao anterior amostra ate 50.000 caracteres e produz trechos/sinteses; nao divide necessariamente todo o documento em cinco parcelas equivalentes. O tamanho real do topico desta falha nao esta nos logs.
4. `src/App.tsx:206`: envia um unico POST JSON a `/api/ai/generate`, contendo titulo, conteudo, titulos/resumos selecionados, modo, dificuldade e as tres contagens.
5. `vercel.json` reescreve `/api/*` para `/api/index`; `api/index.ts` exporta `createApp()`. `server.ts` usa o mesmo app para execucao local.
6. `server/app.ts:148`: rate limit de 10 requests por IP/janela de 10 minutos por instancia; valida texto, titulo, modo, dificuldade, topicos e contagens. `combinedContent` aceita ate 100.000 caracteres; JSON ate 2 MB; ate 8 topicos, titulo 200 e resumo 2.000 caracteres; cada modalidade ate 10 e soma ate 20. O pedido 5/3/2 passa nos limites de contagem.
7. `server/app.ts:157`: `parseActivityCount` converte com `Number`, exige inteiro entre zero e dez; `counts` e `safeTopics` chegam a `generateActivities` em `server/ai.ts:291`. Todas as contagens zero retornam listas vazias sem Gemini.
8. O system instruction define fidelidade, dificuldade e qualidade de todas as modalidades, mesmo quando alguma quantidade e zero. Temperatura definida pelo codigo: 0,15 no modo fiel e 0,35 no complementar. O prompt inclui titulo, titulos dos topicos, conteudo e tres linhas de quantidades. Os resumos enviados separadamente nao sao interpolados, salvo quando ja usados no conteudo pelo frontend.
9. `server/ai.ts:361`: uma chamada `ai.models.generateContent` por tentativa, compartilhada pelas tres modalidades, com JSON e `responseSchema` fixo. Nao ha chamada por modalidade, lote, merge de respostas externas ou tratamento especial ativado pela combinacao.
10. `server/ai.ts:371`: schema com arrays `flashcards`, `multipleChoiceQuestions`, `trueFalseQuestions` e `warnings`. Itens exigem campos de pergunta/resposta/referencia; multipla escolha tem opcoes e enum A-D; V/F exige booleano. Nao ha `required` no objeto raiz, `minItems/maxItems` para contagens ou garantia de quatro alternativas no schema; quatro opcoes e quantidades exatas sao instrucoes textuais.
11. `executeWithRetry` engloba chamada, leitura de texto, parsing e normalizacao. Defaults do codigo: 45 s por tentativa, duas tentativas, backoff inicial 1 s com jitter de ate 400 ms. Retry para HTTP 429/500/502/503/504 e certos erros de rede; timeout local nao recebe retry. O ultimo erro determina a resposta publica. O SDK instalado nao repete internamente sem `retryOptions`, ausente nesta chamada.
12. `server/ai.ts:434`: `JSON.parse(response.text || '{}')`. Nao ha validador runtime de schema. O getter `text` do SDK concatena partes textuais nao marcadas como pensamento do primeiro candidato; a aplicacao ignora `finishReason`, `promptFeedback` e `usageMetadata`.
13. `server/ai.ts:437`, `:445` e `:464`: tres mapas independentes geram IDs e preenchem defaults. Listas ausentes viram vazias; valor truthy que nao seja array ou item nulo pode lancar `TypeError`. Multipla escolha verifica se `options` e array; V/F usa `true` se o gabarito nao for booleano. Nao confere contagens, fidelidade ou consistencia do gabarito. Texto ausente pode ser aceito como sucesso com listas vazias.
14. Sucesso devolve `{ success: true, ...result }`. Qualquer excecao de IA/parsing/normalizacao chega ao mesmo catch de `server/app.ts:170`, loga diagnostico reduzido e chama `mapAIErrorToHttp`.
15. `src/lib/api.ts`: `safeFetchJson` verifica rede, Content-Type, parsing HTTP e `response.ok`. Em erro HTTP JSON, lanca `Error(data.error)`. O frontend nao escolhe entre as duas mensagens por modalidade nem pelo campo `code`: mostra o texto do backend em `generationError` (`src/App.tsx:237` e `:345`). `finally` encerra loading e temporizador. Nao ha timeout proprio no fetch do frontend.

### Mapeamento HTTP confirmado

| Condicao | HTTP / codigo publico | Implicacao |
| --- | --- | --- |
| Timeout local ou codigo `AI_REQUEST_TIMEOUT` | 504 / `AI_REQUEST_TIMEOUT` | Mensagem de processamento demorado |
| Upstream 429 ou texto tecnico `RESOURCE_EXHAUSTED` | 429 / `AI_RATE_LIMIT` | Limite temporario da IA |
| Upstream 503 ou texto tecnico `UNAVAILABLE` | 503 / `AI_UNAVAILABLE` | Mensagem de servico temporariamente indisponivel |
| Upstream 401/403 ou marcadores de autenticacao/permissao | 500 / `AI_CONFIGURATION_ERROR` | Mensagem de configuracao |
| Demais erros, inclusive upstream 400/500/502/504, `SyntaxError` e `TypeError` comuns | 500 / `AI_PROCESSING_ERROR` | Mensagem de impossibilidade de concluir processamento |
| Validacao de parametros ou total acima de 20 | 400 / codigo especifico | Antes da chamada Gemini |
| Conteudo acima do teto / JSON acima de 2 MB | 413 / `TEXT_TOO_LARGE` ou `REQUEST_TOO_LARGE` | Antes da chamada Gemini |
| Rate limit local | 429 / `RATE_LIMITED` | Antes da chamada Gemini |

- A ordem das classificacoes importa: timeout local, quota, indisponibilidade, configuracao, fallback. O 503 pode ser inferido por texto mesmo sem status upstream 503; contudo, nos registros desta investigacao, o status upstream 503 esta explicitamente presente.
- O middleware global pode retornar 500 `INTERNAL_ERROR` para erros anteriores ao handler, inclusive JSON de entrada malformado. Esse texto e diferente das duas mensagens investigadas.
- Portanto, o HTTP publico e emitido pelo backend; nas falhas 503 observadas nos logs, ele preserva um 503 efetivamente recebido pela camada SDK/provedor. Nos erros 504 upstream, o backend altera o status para 500.

### Testes executados

| Teste | Resultado |
| --- | --- |
| Testes manuais informados pelo usuario: 1 FC, 4 MC, 10 VF e combinacao | Considerados como evidencia relatada; nao repetidos com material real |
| A: resposta sintetica para 1/0/0 | Passou; contagens preservadas |
| B: resposta sintetica para 0/4/0 | Passou; contagens preservadas |
| C: resposta sintetica para 0/0/10 | Passou; contagens preservadas |
| D: resposta sintetica para 5/3/2 | Passou; contagens preservadas e tres modalidades coexistindo |
| Comparacao dos requests A-D | Mesmo schema e mesmas instrucoes de sistema; prompt de conteudo com 377/377/378/377 caracteres no fixture. Combinacao nao aumenta substancialmente a entrada; altera trabalho/saida solicitados |
| JSON incompleto, array substituido por objeto e item nulo | `SyntaxError` ou `TypeError`, mapeados a 500 `AI_PROCESSING_ERROR`, uma tentativa, sem retry |
| Texto de resposta vazio | Retorno aceito com listas vazias, confirmando lacuna de validacao |
| Mapeamento de upstream 503, marcador UNAVAILABLE sem status, 429, 504, 400, 401 e timeout local | Passou; confirmado especialmente upstream 504 -> HTTP 500 e timeout local -> HTTP 504 |
| `npm run lint` | Passou (`tsc --noEmit`) |
| `npm run build` | Passou; Vite e bundle Node gerados em `dist`, ignorado pelo Git |
| `git diff --check` | Passou antes e depois do acrescimo documental; somente aviso de conversao LF/CRLF |
| Runtime Logs de Production, janela de tres dias, ate 100 registros | Acesso concluido por Vercel CLI 59.10.0; somente metadados/categorias permitidas exibidos |

- Testes sinteticos transpilaram o `server/ai.ts` atual em memoria e executaram suas funcoes com SDK substituido por respostas controladas. Nenhum arquivo de teste foi criado; nao validam a qualidade da geracao real nem simulam carga do provedor. Nao foram testes HTTP ponta a ponta ou automacao visual.
- Nenhuma chamada nova ao Gemini foi feita por este diagnostico. Os logs reais ja localizaram a etapa da falha; reproducoes adicionais consumiriam recursos sem estabelecer causalidade com o material original.
- O launcher PowerShell da CLI estava bloqueado por politica de scripts; usado `vercel.cmd`. A rede restrita retornou `EPERM/fetch failed`; a mesma consulta de leitura com acesso ampliado foi aprovada e funcionou. Nenhuma configuracao foi modificada.

### Evidencias dos Runtime Logs

Todos os horarios abaixo sao de 07/09/2026 em America/Sao_Paulo (UTC-3), timestamps dos registros, nao duracoes. Endpoint `POST /api/ai/generate`, ambiente Production, deployment `dpl_CTQvK1GzKZwHWv7MvDRkvagswm8A`.

| Horario local | HTTP publico | Diagnostico tecnico |
| --- | --- | --- |
| 11:19:15.230 | 503 | `ApiError`, upstream status 503, code 503 |
| 11:20:11.007 | 500 | `ApiError`, upstream status 504, code 504 |
| 11:21:32.607 | 503 | `ApiError`, upstream status 503, code 503 |
| 11:23:49.363 | 200 | Sucesso; contagens nao registradas |
| 11:28:05.900 | 200 | Sucesso apos registro de retry 2/2, backoff 1.307 ms; causa da primeira tentativa nao registrada |
| 11:29:58.751 | 200 | Sucesso; contagens nao registradas |
| 11:31:32.790 | 400 | Rejeicao sem diagnostico de IA; codigo de validacao e contagens nao registrados |
| 11:31:54.463 | 500 | `ApiError`, upstream status 504, code 504 |

- Na segunda consulta apareceu tambem registro de 11:40:17.786 com status 0, sem diagnostico; nao foi interpretado como sucesso ou falha concluida. Nao foi iniciado por este diagnostico.
- O SDK instalado 2.19.0 cria `ApiError.status` a partir do status HTTP de resposta nao OK em `throwErrorIfNotOK`. Assim, os 503/504 acima sao evidencia de erro upstream, nao de `JSON.parse` das atividades ou de um `.map` local.
- A consulta tambem encontrou `ApiError` 503/504 em `/api/ai/structure`. Isso mostra falhas upstream fora da geracao combinada, mas nao prova uma unica causa interna para todos os eventos.
- Nao ha contagens, tamanho de entrada/saida, tokens, finish reason, etapa detalhada ou duracao nos campos devolvidos por esta consulta. Nao associar cada 200 a uma modalidade especifica sem correlacao adicional. A sequencia e compativel com o relato manual, mas nao identifica inequivocamente cada tentativa do usuario.

### Resultados e grau de confianca

| Hipotese | Conclusao / confianca |
| --- | --- |
| Gemini retorna erro upstream | Confirmado para as quatro falhas de geracao concluidas acima: 503 e 504 na chamada ao provedor |
| Tamanho/complexidade do prompt | Causa nao comprovada. O schema e system instruction sao os mesmos nas modalidades isoladas; a combinacao muda principalmente o volume/composicao de saida. Nao temos o tamanho real do conteudo selecionado |
| Parsing da resposta Gemini | Sem evidencia nas falhas registradas, que sao `ApiError`; falhas sinteticas de parsing produzem outra classe (`SyntaxError`) |
| Schema rejeitado por coexistencia | Sem evidencia. O mesmo schema e enviado mesmo com modalidades zeradas; nao ha validador local capaz de rejeitar especificamente a coexistencia |
| Consolidacao backend | Nenhuma incompatibilidade deterministica encontrada; fixture 5/3/2 passou. Tipos malformados sao risco real de normalizacao, mas nao explicam os `ApiError` observados |
| Tratamento especial de modalidade combinada | Nao existe ramificacao por combinacao; diferencas por tipo ocorrem nos campos/schema/normalizadores usuais |
| Timeout | Confirmado status upstream 504, indicativo de timeout na cadeia do provedor. Nao comprovado o mecanismo interno/deadline nem timeout local ou da Function Vercel |
| Quota/rate limit | Sem 429 nas falhas de geracao listadas; nao ha evidencia de quota como causa desses eventos |
| Tokens/saida truncada | Nao comprovado: sem maxOutputTokens explicito, contagem de tokens, finishReason ou tamanho da resposta nos logs; nenhum limite externo numerico foi presumido |
| Isoladas funcionam e combinada falha | Correlacao relatada e consistente com a sequencia dos logs; causalidade nao comprovada. Maior trabalho/saida e instabilidade transitoria do provedor sao hipoteses, nao conclusoes |

- Conclusao confirmada: o local imediato das falhas registradas e `await ai.models.generateContent`, dentro do retry, antes do parsing das atividades. O erro final e convertido no catch da rota; upstream 503 explica a primeira mensagem e upstream 504 convertido em 500 explica a mensagem generica nos registros encontrados.
- Nao ha base para afirmar bug de combinacao, estouro de tokens ou necessidade de trocar arquitetura. O sucesso combinado historico registrado neste repositorio e o sucesso sintetico atual tambem desaconselham tratar coexistencia como impossibilidade geral; o teste historico nao substitui reproducao nas condicoes atuais.
- `maxDuration` do repositorio e 120 s. O orcamento nominal com defaults e ate aproximadamente 91,4 s para duas tentativas e backoff, sem overhead; timeout local interrompe sem retry. Valores efetivos de ambiente nao foram consultados nem alterados, portanto esse calculo nao mede a invocacao Production.

### Problemas encontrados e pendencias

- O mapeamento mascara upstream 504 como erro generico 500. Os logs atuais identificam a origem upstream, mas nao explicam por que o provedor ficou indisponivel ou expirou.
- Faltam correlacao de request com contagens, duracao por tentativa, status de cada tentativa, etapa, tamanhos de entrada/saida e metadados tecnicos da resposta. Logs de retry atuais nao guardam a causa de cada tentativa.
- Instrumentacao minima a avaliar em tarefa posterior: identificador aleatorio de correlacao; rota; contagens e numero de topicos; tamanho do conteudo em caracteres/bytes; indice da tentativa e duracao; etapa fechada (`provider_call`, `response_received`, `json_parse`, `normalize`, `http_response`); classe/codigo/status upstream permitidos; codigo/status publico; indicador de timeout local. Registrar somente numeros, booleanos e categorias de lista fechada.
- Imediatamente apos a resposta do SDK e antes de `JSON.parse`: quantidade de candidatos, presenca/comprimento de texto, finish reason e categoria de bloqueio permitidas, contagens numericas de tokens quando presentes. No erro de parsing/normalizacao: apenas etapa e classe, sem mensagem original, stack ou fragmento de JSON. Nenhum prompt, material, titulo, resposta integral, chave ou valor de ambiente.
- Para eventos passados, dados nunca registrados nao podem ser reconstruidos com seguranca. Uma reproducao futura pequena, correlacionada e autorizada permitiria comparar combinada e isoladas mantendo conteudo/configuracao equivalentes.

### Estrategias possiveis, sem implementacao ou escolha

| Estrategia a avaliar | Vantagem | Risco / impacto |
| --- | --- | --- |
| Manter uma unica chamada combinada | Menor numero de requests e menor repeticao do contexto; preserva contrato atual | Falha descarta toda a geracao; exige medir duracao/saida e avaliar tratamento de 504/validacao |
| Chamadas independentes por modalidade | Isola falha por tipo e reduz saida por request | Repete contexto, aumenta requests/custo potencial e exige consolidacao e tratamento de sucesso parcial; nao garante resolver 503 |
| Pequenos lotes | Limita quantidade de saida e trabalho por chamada | Mais requests, duplicacao de contexto e risco de repeticao de atividades entre lotes |
| Lotes sequenciais | Reduz concorrencia e facilita controle de carga | Aumenta latencia total; se todos ficarem na mesma Function, podem ultrapassar o orcamento da invocacao |
| Retry somente do lote que falhou | Preserva trabalho concluido e evita regenerar tudo | Exige identificar lotes, evitar duplicacao e definir estado parcial; limita retries para nao amplificar indisponibilidade |
| Persistir posteriormente estado para retomada | Permite recuperar apos fechar/recarregar ou interromper sessao | Adiciona modelo de dados, privacidade, consistencia e escopo de infraestrutura; nao corrige a causa upstream por si so |

### Estado atual

- Diagnostico concluido; origem imediata upstream confirmada, causa da correlacao com modalidades combinadas ainda nao comprovada.
- Nenhuma correcao ou instrumentacao implementada. Build gerou apenas artefatos ignorados; somente o relatorio teve alteracao documental persistente no conjunto versionado.

### Proximos passos recomendados

- Revisar este diagnostico e, em tarefa posterior explicitamente autorizada, decidir sobre observabilidade minima e reproducao correlacionada antes de escolher qualquer estrategia de correcao.
- Encerrar esta tarefa sem avancar para implementacao, commit, push ou deploy.

## Observabilidade minima e sanitizada das chamadas Gemini (07/09/2026)

### Resumo

- Implementada somente telemetria para `structure` e `generate`, com identificador aleatorio por operacao, correlacao entre tentativas, duracao monotônica, tamanho da entrada, contagens e metadados tecnicos permitidos.
- Preservados prompts, schemas, modelo, temperaturas, retries, backoff, timeout, normalizacao, contratos HTTP, mensagens e frontend. O upstream 504 continua convertido em HTTP publico 500, conforme comportamento anterior.
- Nenhuma chamada real ao Gemini, alteracao de ambiente, commit, push ou deploy nesta tarefa.
- Lidos `GUIA_CODEX.md` e o relatorio mais recente; seguido o pedido atual anexado, que prevalece sobre a tarefa antiga ainda descrita em `TAREFA_ATUAL.md`.

### Arquivos alterados

- `server/ai-telemetry.ts`: novo modulo de telemetria compartilhada, listas fechadas, projecao de campos seguros, UUID nativo e medicao com `performance.now()`.
- `server/ai.ts`: instrumentacao das tentativas existentes e das etapas de resposta/parsing/normalizacao nas duas operacoes; diagnosticos antigos agora restritos a campos permitidos, inclusive em desenvolvimento.
- `server/app.ts`: uso do fallback sanitizado para falhas anteriores a chamada externa, evitando duplicar o erro ja registrado pela tentativa.
- `tests/ai-telemetry.test.cjs`: testes sinteticos com TypeScript ja instalado, SDK substituido e ambiente isolado; inclui testes HTTP locais das rotas Express.
- `RELATORIO_CODEX.md`: somente acrescimo desta entrada. As 1.767 linhas anteriores, incluindo os registros locais ainda nao commitados, foram preservadas. O prefixo original de 134.205 bytes foi verificado por SHA-256.

### Alteracoes realizadas

- `executeWithRetry` recebe contexto opcional de telemetria e registra cada tentativa sem alterar a decisao de retry, numero de tentativas, atraso ou cancelamento. O mesmo `requestId` acompanha toda a operacao; operacoes simultaneas recebem IDs distintos.
- Eventos JSON com prefixo fixo `[AI Telemetry]`: `attempt_started`, `response_received`, `attempt_completed` e `attempt_failed`.
- Etapas fechadas: `initialization`, `provider_call`, `response_received`, `json_parse`, `normalize` e `completed`. A falha mantem a etapa em que ocorreu, em vez de substitui-la por uma etapa generica `failed`.
- Sucesso normal emite tres eventos por tentativa: inicio, resposta recebida e conclusao. Falha upstream emite inicio e falha. O evento de falha informa se havera retry e o backoff, substituindo o aviso antigo nessa operacao e evitando um evento de retry redundante.
- A leitura de `response.text` continua ocorrendo uma unica vez; o texto local alimenta o mesmo `JSON.parse` anterior. A telemetria recebe somente seu comprimento para registro e projeta explicitamente os metadados do SDK.
- Uma tentativa encerrada por timeout ignora eventos de resposta tardia, sem alterar o comportamento de cancelamento ou da promessa subjacente.
- Falha do logger e ignorada para preservar resultado e retry. Acessos aos metadados tecnicos sao defensivos; getters defeituosos de metadados nao interrompem o processamento.
- Falhas anteriores ao inicio de tentativa externa recebem fallback correlacionado com etapa `initialization`, tentativa zero e tamanhos zero (nada enviado ao provedor). Erros ja observados sao identificados por `WeakSet`, sem anexar dados ao objeto Error nem manter retencao forte dele.
- Validacoes de entrada e o retorno antecipado de todas as quantidades zero permanecem fora da telemetria de chamadas externas: nesses caminhos nao ha chamada Gemini.

### Campos registrados e significado

| Campo | Origem / significado |
| --- | --- |
| `event`, `operation`, `stage` | Literais internos fechados; operacao `structure` ou `generate` |
| `requestId` | UUID v4 aleatorio criado por `node:crypto`, sem material, identidade do usuario ou valor de ambiente |
| `timestampMs` | Horario do evento em milissegundos Unix; permite conversao para UTC ou horario local |
| `attempt` | Indice iniciado em 1; zero reservado a falha anterior a tentativa externa |
| `durationMs` | Tempo decorrido desde o inicio da tentativa, medido com relogio monotônico e arredondado em ms; exclui o backoff entre tentativas |
| `inputChars`, `inputBytes` | Comprimento da string efetivamente passada como `contents`, em unidades de string JavaScript e bytes UTF-8. Inclui template/titulo inseridos nessa string, mas somente as medidas sao logadas; exclui system instruction, schema e envelope HTTP |
| `topicCount` | Quantidade de topicos selecionados em generate; omitido em structure, que ainda vai identificar topicos |
| `flashcardsRequested`, `multipleChoiceRequested`, `trueFalseRequested`, `totalActivitiesRequested` | Contagens numericas de generate; omitidas em structure |
| `success` | Resultado do evento de resposta ou encerramento; omitido no inicio, quando ainda nao e conhecido |
| `upstreamStatus`, `upstreamCode` | Status HTTP estruturado validado entre 100 e 599; codigo numerico HTTP ou nome em lista fechada. Na ausencia de code, o status upstream disponivel tambem representa o codigo tecnico |
| `publicStatus` | Status do mapeamento publico atual na falha final; 200 na conclusao. Omitido em tentativa que sera repetida, pois ainda nao ha resposta final |
| `timeoutLocal`, `errorCategory`, `errorName` | Booleano e categorias permitidas; nenhuma mensagem ou nome arbitrario de Error |
| `retryScheduled`, `retryDelayMs` | Decisao ja tomada pela politica existente e atraso arredondado; presentes no evento de falha conforme aplicavel |
| `candidateCount`, `responseTextLength` | Numero de candidatos e comprimento do texto, somente quando disponiveis |
| `finishReason`, `blockReason` | Enum permitido do primeiro candidato / bloqueio estruturado; valor desconhecido vira `UNKNOWN` |
| `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount` | Somente inteiros seguros nao negativos fornecidos por usageMetadata; ausentes/invalidos sao omitidos |

- Em structure, `inputChars/inputBytes` medem o `contents` apos a amostragem ja existente de 50.000 caracteres, incluindo o marcador textual de truncamento e o template. Nao representam o documento completo recebido pela rota.
- Um `response_received` com `success=true` significa que o SDK retornou resposta; parsing ou normalizacao ainda podem falhar. O desfecho da tentativa e `attempt_completed` ou `attempt_failed`.
- Status de sucesso upstream so e registrado se fornecido em `sdkHttpResponse.status`; nao e inventado quando esse campo estiver ausente. `publicStatus=200` identifica o caminho de retorno bem-sucedido da operacao para a rota atual, nao uma medicao do transporte ate o navegador.

### Categorias de erro e compatibilidade

- Lista fechada: `NONE`, `RATE_LIMIT`, `UNAVAILABLE`, `UPSTREAM_TIMEOUT`, `LOCAL_TIMEOUT`, `AUTH_CONFIGURATION`, `NETWORK`, `PARSE`, `NORMALIZATION`, `INVALID_RESPONSE` e `UNKNOWN`.
- 429 / `RESOURCE_EXHAUSTED`: `RATE_LIMIT`; 503 / `UNAVAILABLE`: `UNAVAILABLE`; 504 / `DEADLINE_EXCEEDED`: `UPSTREAM_TIMEOUT`; codigo/nome do timeout local: `LOCAL_TIMEOUT`; autenticacao/permissao estruturada: `AUTH_CONFIGURATION`.
- Rede usa somente codigos tecnicos permitidos do erro ou de sua causa. Parsing e normalizacao usam a etapa observada; falha ao acessar texto apos retorno do SDK usa `INVALID_RESPONSE`.
- A classificacao da telemetria nao examina mensagens livres. Erro conhecido apenas pelo texto pode receber `UNKNOWN`, mesmo se o mapeamento HTTP ou retry existente o reconhecer pela mensagem. Essa diferenca e intencional e nao muda a resposta publica.
- O mapeamento HTTP e os predicados originais de retry/timeout mantem suas leituras internas anteriores de mensagem para preservar compatibilidade; essas mensagens nao sao encaminhadas ao logger.

### Validacao explicita de privacidade

- Resultado negativo para conteudo sensivel nos logs de IA instrumentados: nenhum material, titulo, resumo, nome/texto de topico, prompt, pergunta, resposta, `response.text`, mensagem bruta, stack, credencial ou valor de ambiente e serializado.
- Metadados sao projetados campo a campo; nenhum objeto desconhecido do SDK ou Error e enviado diretamente ao console/JSON. Numeros sao validados, strings externas precisam corresponder exatamente a listas fechadas e valores desconhecidos sao omitidos ou normalizados para `UNKNOWN`.
- O campo `model` foi deliberadamente omitido: a selecao atual pode vir de um valor livre de ambiente. Nao houve alteracao do modelo nem leitura de valores reais para o relatorio.
- Removida do diagnostico de IA a antiga mensagem redigida de desenvolvimento: redacao de chave isoladamente nao garantia ausencia de material. Nomes/codigos arbitrarios tambem deixaram de ser logados.
- Testes inseriram marcadores sinteticos em entrada, resposta, nomes/codigos de erro, mensagens, stack, metadados e ambiente isolado; nenhum marcador apareceu nos logs. Foram incluidos enums desconhecidos, contagens invalidas e getters de metadados que lancam erro.
- A revisao cobre o caminho de logs de IA alterado nesta tarefa. Nao constitui auditoria geral dos demais logs da aplicacao, do console interno do SDK ou da infraestrutura Vercel.

### Testes executados

| Teste | Resultado |
| --- | --- |
| `node --test tests/ai-telemetry.test.cjs` | 13 testes passaram; nenhuma chamada ao Gemini |
| Retry sintetico 503 -> sucesso | Mesmo UUID entre tentativas 1 e 2; status, categoria, duracao e backoff registrados |
| Upstream 504 apos tentativas previstas | `UPSTREAM_TIMEOUT`, HTTP publico 500 preservado, sem duplicacao pelo catch da rota |
| Timeout local e resposta tardia | `LOCAL_TIMEOUT`, HTTP publico 504, uma tentativa, AbortSignal acionado e nenhum sucesso tardio nos logs |
| Generate e structure | Tamanhos UTF-8 corretos, amostragem da estrutura preservada, contagens apenas onde fazem sentido |
| Parsing / normalizacao / acesso ao texto | Etapas e categorias distintas; mesmos erros funcionais e sem retry adicional |
| Privacidade e metadados ausentes/hostis | Sem conteudo sintetico sensivel; campos ausentes nao inventados; metadados defeituosos nao mudam sucesso |
| Operacoes concorrentes / falha do logger | IDs distintos por operacao; logger com falha nao altera resultado nem retry |
| Falha de inicializacao / zero atividades | Fallback sanitizado sem chamada externa; retorno antecipado vazio preservado |
| HTTP local com Express e SDK sintetico | Generate 503 e structure com upstream 504 -> publico 500; corpos/mensagens originais, sem requestId no contrato |
| Comparacao em memoria com `HEAD:server/ai.ts` anterior | Requests identicos para structure/generate nos modos fiel e complementar, incluindo prompts/schema/modelo/timeout; resultados iguais exceto IDs gerados; 12 mapeamentos publicos identicos |
| `npm run lint` | Passou (`tsc --noEmit`) |
| `npm run build` | Passou; frontend e backend gerados, sem dependencias novas |
| `git diff --check` | Passou; somente avisos esperados de conversao LF/CRLF |

- Os testes usam somente pacotes ja instalados e o runner nativo `node:test`. O SDK e substituido em memoria, dotenv nao e carregado e variaveis de ambiente reais nao sao consumidas nesses testes.
- Nao foi necessario teste real minimo, consulta nova a Production ou nova bateria de geracao. A publicacao e validacao de logs no runtime Vercel continuam para uma tarefa autorizada posterior.

### Resultados

- Os novos logs permitem distinguir 503 upstream, 504 upstream, timeout local, retry, duracao por tentativa, tamanho de entrada e etapa de falha, correlacionados por operacao.
- Metadados de tokens e termino/bloqueio ficam disponiveis quando o SDK os fornece, sem expor conteudo.
- Nenhuma correcao da geracao foi implementada. As lacunas funcionais previamente diagnosticadas, inclusive aceitaçao de resposta vazia, continuam preservadas por exigencia de escopo.

### Problemas encontrados e riscos

- Os logs antigos de desenvolvimento podiam conter mensagem do SDK, e nomes/codigos de erro eram strings livres. Essa superficie foi removida apenas no diagnostico de IA.
- Campos opcionais podem nao existir em uma resposta real; nesses casos permanecem ausentes. A instrumentacao nao recupera dados de falhas anteriores a sua publicacao.
- Encerramento forcado da Function ou indisponibilidade do destino de logs pode impedir o evento final; um evento de inicio isolado nao comprova sucesso/falha. Nenhum timeout ou configuracao de runtime foi alterado.
- Ha custo operacional de alguns eventos pequenos por tentativa; nao se registram eventos adicionais para cada transicao local de parsing/normalizacao, apenas a etapa relevante quando ocorre falha.

### Estado atual

- Implementacao local e testes concluidos na branch `piloto-vercel`; frontend, configuracao Vercel, dependencias e ambiente permanecem inalterados.
- Arquivos pendentes apenas no workspace; Production ainda nao possui esta telemetria.
- Nenhum commit criado; nenhum push ou deploy realizado.

### Pendencias

- Revisao e autorizacao para consolidacao/publicacao em tarefa posterior.
- Apos publicacao autorizada, verificar eventos sanitizados no ambiente escolhido e correlacionar uma futura falha real antes de decidir qualquer correcao da geracao.

### Proximos passos recomendados

- Revisar o diff e autorizar separadamente commit, push/deploy e eventual reproducao minima. Nao iniciar lotes, filas, fallback, persistencia, novo retry ou mudanca de timeout nesta etapa.

## Publicacao da telemetria em Preview - revisao local (07/09/2026)

### Resumo

- Autorizada a consolidacao da telemetria ja implementada em um unico commit e push somente para `piloto-vercel`, com validacao no Preview e sem promocao para Production.

### Arquivos alterados

- Conjunto revisado: `server/ai-telemetry.ts`, `server/ai.ts`, `server/app.ts`, `tests/ai-telemetry.test.cjs` e `RELATORIO_CODEX.md`.
- Preservadas integralmente as 1.888 linhas anteriores do relatorio, incluindo os registros locais pendentes.

### Alteracoes realizadas

- Revisados status, diff, arquivos novos e listas de campos permitidos. Nenhuma alteracao inesperada, segredo, valor real de ambiente, material real ou arquivo indevido encontrado no conjunto a consolidar.
- Nenhuma alteracao funcional adicional realizada. Prompts, modelo, schema, retries, timeout, frontend e contratos publicos permanecem como na implementacao revisada.

### Testes executados

- `node --test tests/ai-telemetry.test.cjs`: 13 testes passaram.
- `npm run lint`, `npm run build` e `git diff --check`: passaram; somente avisos esperados de LF/CRLF.

### Resultados

- Conjunto aprovado pela revisao local para o commit autorizado `chore: adicionar telemetria sanitizada da IA`.
- Production antes do push: `dpl_CTQvK1GzKZwHWv7MvDRkvagswm8A`, target `production`, `READY`.

### Problemas encontrados

- Nenhum bloqueio local. Nenhum segredo ou conteudo de ambiente foi impresso ou incluido.

### Estado atual

- Branch `piloto-vercel`, HEAD anterior `1e929c0`; `main` permanece em `3435fd5b8b256937364f80e57c4a33ce02d4f14a`.

### Pendencias

- Criar o commit, enviar exclusivamente `piloto-vercel`, confirmar Preview do SHA e validar paginas, health e uma chamada minima de cada operacao.

### Proximos passos recomendados

- Registrar o SHA e os resultados remotos em acrescimo local apos o commit, evitando um segundo commit/push apenas para publicar o resultado documental.
