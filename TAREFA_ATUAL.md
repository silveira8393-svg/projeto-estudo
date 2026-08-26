# TAREFA ATUAL

## Objetivo

Validar a rota /api/ai/generate com uma chamada Gemini real.

## Escopo

Executar teste controlado usando um único tópico e pequenas quantidades:

- 3 flashcards;
- 2 questões de múltipla escolha;
- 2 questões de verdadeiro/falso.

## Validar

- resposta HTTP;
- schema retornado;
- quantidades solicitadas;
- quantidade efetivamente retornada;
- fidelidade ao conteúdo de origem;
- correspondência com o tópico selecionado;
- respostas corretas;
- ausência de conteúdo externo quando mode=faithful;
- encerramento correto do loading;
- comportamento de erro.

## Restrições

- Não alterar interface.
- Não implementar Supabase.
- Não implementar Google Drive.
- Não implementar persistência.
- Não implementar Pareto.
- Não adicionar funcionalidades novas.

Se algum problema for encontrado, diagnosticar primeiro.

Corrigir apenas se for necessário para concluir este teste.

Atualizar RELATORIO_CODEX.md ao final.