# GUIA_CODEX

Este arquivo contém regras permanentes para o desenvolvimento deste projeto.

## Fonte de verdade

Este repositório é a fonte oficial do projeto.

Não utilizar como referência cópias antigas, versões anteriores de outros computadores ou implementações não presentes neste repositório.

## Forma de trabalho

- Trabalhar de forma incremental.
- Executar somente o escopo solicitado em TAREFA_ATUAL.md.
- Não implementar funcionalidades adicionais por iniciativa própria.
- Antes de alterar arquitetura, explicar a necessidade.
- Preferir correções pequenas e isoladas.
- Preservar funcionamento existente.

## Interface

- Preservar a identidade visual atual.
- Não redesenhar telas sem solicitação.
- Reutilizar componentes, tipografia, espaçamentos, botões, cards, inputs, modais e padrões visuais existentes.
- Não alterar UX de forma ampla sem autorização.

## Arquitetura e dependências

- Utilizar npm como gerenciador de pacotes.
- Considerar package-lock.json como lockfile oficial.
- Não trocar bibliotecas sem necessidade técnica justificada.
- Não fazer refatorações amplas sem solicitação.

## Segurança

- Nunca exibir, registrar ou versionar secrets.
- Nunca incluir valores de .env em relatórios.
- Não versionar .env.
- Não inserir API keys ou credenciais diretamente no código.
- Não utilizar dados pessoais reais como exemplos de teste.

## Custos

- Priorizar soluções sem custo.
- Não adicionar serviços pagos ou dependências que exijam plano pago sem autorização.
- Não assumir quotas ou limites fixos de serviços externos.

## Dados e persistência

- Não implementar Supabase, Google Drive, persistência ou outras integrações fora da tarefa atual.
- Quando forem implementados, seguir o princípio de armazenar apenas o necessário e evitar duplicação desnecessária de dados.

## IA

- Manter configurações de modelo centralizadas e configuráveis quando possível.
- Não hardcodar limites de RPM, TPM ou quotas externas.
- Tratar timeouts, erros transitórios e indisponibilidade de forma controlada.
- Não deixar frontend preso indefinidamente em estado de loading.

## Testes

Sempre que tecnicamente aplicável:

- executar checagem TypeScript;
- executar build;
- testar rotas afetadas;
- testar fluxo funcional alterado;
- registrar resultados no RELATORIO_CODEX.md.

## RELATORIO_CODEX.md

Ao concluir qualquer tarefa, atualizar RELATORIO_CODEX.md.

Registrar:

### Resumo

### Arquivos alterados

### Alterações realizadas

### Testes executados

### Resultados

### Problemas encontrados

### Estado atual

### Pendências

### Próximos passos recomendados

Não registrar secrets.

## Regra final

Executar somente o que estiver solicitado em TAREFA_ATUAL.md.

Não avançar automaticamente para o próximo marco ou funcionalidade.

## RELATORIO_CODEX.md — indicação de linhas alteradas

Sempre que atualizar o arquivo `RELATORIO_CODEX.md`, informe ao final da resposta do Codex:

- linha inicial das alterações realizadas;
- linha final das alterações realizadas.

Formato esperado:

`RELATORIO_CODEX.md atualizado: linhas 471–571`

Se houver mais de um bloco não contínuo alterado, informar cada intervalo separadamente.

Exemplo:

`RELATORIO_CODEX.md atualizado: linhas 120–138 e 471–571`

Não informar linhas apenas aproximadas se puder determinar o intervalo real após salvar o arquivo.