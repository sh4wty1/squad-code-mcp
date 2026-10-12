# TUI clicável Context

**Gathered:** 2026-10-12
**Spec:** `.specs/features/tui-clicavel/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A TUI pede os relatórios de mouse ao terminal e trata cada clique e cada passo da roda como
a tecla que o elemento sob o ponteiro já tem. Nenhuma tecla muda, nenhuma tela ganha
elemento novo, e a TUI continua escrevendo uma coisa só: a resposta do dev a uma pergunta.

---

## Implementation Decisions

### Ordem no roadmap

- A fatia entra entre Papéis e Gate e depende só da Question.
- O MVP passa a ter oito fatias, e a Gate passa a depender desta: os modais de gate e de permissão nascem clicáveis, pelas regras do modal de resposta.

### O que é clicável

- Os quatro grupos entram: navegar (abas, linhas do feed, tickets, perguntas, painéis), roda do mouse, atalhos e selos, modal de resposta.
- Clicar na linha já selecionada abre, como o `enter`.
- No modal, clicar em `outra resposta…` vai ao texto, e clicar fora da caixa fecha como o `esc`.

### Envio pelo mouse

- O clique numa opção só a marca.
- O envio sai do `enter` ou de um clique no atalho `enter confirmar` ou `enter enviar` da linha 39.

### Onde a spec foi escrita

- Worktree à parte, branch `spec/tui-clicavel` saído da `main`, para não tocar no checkout em que a fatia Papéis estava em execução.

### Agent's Discretion

Nenhuma área foi entregue com "você decide". O que o dev não foi perguntado está abaixo.

### Declined / Undiscussed Gray Areas → Assumptions

Estão na tabela "Assumptions & Open Questions" da spec, com `n` em "Confirmed?". As que
mudam o que o dev vê:

- A tecla `m` e `SQUAD_TUI_MOUSE=0` desligam o mouse, para o terminal voltar a selecionar texto com o arrasto.
- A roda anda três linhas no feed e um item nas outras listas.
- Com o modal aberto, o clique que chega menos de 500 ms depois do anterior não faz nada: é o que impede um clique duplo em `enter abrir` de enviar a primeira opção.
- Com o broker sem responder (tela congelada) o mouse não faz nada.
- Clicar num ticket abre o thread dele; clicar no contador `? N` vale como `4`; clicar no custo da linha 38 vale como `t`.
- O `stdin` do Bun entregar os relatórios no Windows Terminal é uma suposição: a sonda é a primeira tarefa, e o dev é quem a roda.

---

## Specific References

- `docs/claude-design-handoff/PROMPT.md`: "nenhum elemento que dependa de mouse; tudo navegável por teclado". A fatia mantém a regra: o mouse não faz nada que uma tecla não faça.

---

## Deferred Ideas

- Realce do elemento sob o ponteiro (hover).
- Clique num nó da topologia ou num agente para abrir o thread do ticket dele.
- Clique numa opção do detalhe da aba Perguntas abrindo o modal com ela marcada.
- Cursor do campo de texto posicionado pelo clique.
- Rolagem do feed independente da seleção.
