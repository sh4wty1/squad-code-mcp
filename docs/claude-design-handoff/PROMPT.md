# Design: TUI de observabilidade de um squad de agentes Claude

## Contexto do projeto
Estou construindo um MCP open source que coloca várias sessões do Claude Code para
conversar entre si, cada uma com um papel. O MCP é um broker de mensagens (fork
estendido do claude-peers-mcp). Cada papel usa um conjunto de skills de um registry
meu. Esta TUI é um processo separado que só OBSERVA o broker, lendo um log de
eventos. Ela não controla os agentes, exceto pelo gate humano (ver abaixo).

## Papéis e topologia (estrela, workers nunca falam entre si)
- Mother: dona do objetivo, fala com o humano e aprova a entrega final
- Leader (tech lead): quebra a spec em tickets e escolhe as skills de cada worker por ticket
- Worker 1..N: genéricos, executam um ticket por vez com o loadout recebido
- Judge: revisa a entrega contra a spec e devolve approve ou rework para o Leader

Fluxo: Mother → Leader → Workers → Judge → (rework) Leader → ... → Mother → humano.
Máximo de 2 reworks por ticket; depois disso escala para a Mother.

## Restrições obrigatórias (vai virar Ink ou Textual, então tem que ser portável)
- Grid de caracteres monospace, frame de 120 colunas × 40 linhas
- Bordas só com box-drawing (┌─┐│└┘├┤┬┴┼), sem border-radius, sombra ou gradiente
- Paleta de 16 cores ANSI sobre fundo escuro, com uma cor fixa por papel:
  Mother = magenta, Leader = ciano, Workers = verde, Judge = amarelo, erro = vermelho
- Ícones só com glifos Unicode: ● ○ ▶ ✓ ✗ ⟳ ⚠
- Status só por texto e cor: [idle] [working] [waiting] [blocked] [done]
- Nenhum elemento que dependa de mouse; tudo navegável por teclado

## Telas
1. **Visão principal (3 painéis, estilo k9s / lazygit / btop)**
   - Esquerda: lista de agentes com nome, papel, status, ticket atual e loadout
     (skills ativas, truncadas)
   - Centro: feed de mensagens ao vivo no formato
     `hh:mm:ss  from → to  [kind]  corpo truncado`,
     onde kind ∈ task, result, review, question, verdict
   - Direita: detalhe da mensagem selecionada (corpo completo, thread, ticket, loadout)
   - Barra inferior: atalhos, tokens/custo por sessão, contador de rework do thread selecionado

2. **Topologia**
   - Diagrama ASCII do squad com setas entre os nós
   - Status de cada nó e a aresta ativa destacada (quem está falando com quem agora)

3. **Detalhe de thread**
   - Linha do tempo vertical de um ticket do início ao fim:
     task → result → verdict (rework) → result → verdict (approve)
   - Nota do judge por critério da spec

4. **Gate humano (modal)**
   - A Mother pede aprovação antes de uma ação irreversível ou da entrega final
   - Mostra resumo, diff stat e as opções [a]provar / [r]ejeitar / [c]omentar

## Dados mock (use estes para ficar realista)
- Projeto: "portal-89fm", feature "player ao vivo com setlist"
- Workflow travado no thread: tlc
- Mother: tlc-discover, to-spec, the-fool
- Leader: tlc-plan, help-me
- Worker 1 (TKT-12, player de áudio): tlc-implement, coding-guidelines, ponytail,
  react-best-practices
- Worker 2 (TKT-13, API da setlist): tlc-implement, coding-guidelines, ponytail,
  codenavi
- Worker 3: [idle]
- Judge: spec-driven-eval, ponytail-review, break-ui
- Exemplo de verdict: rework no TKT-12, critério "reconexão após queda do stream" não
  atendido, rework 1/2

## Entregáveis
- As 4 telas no mesmo estilo
- Um estado "tudo idle" e um estado "erro" (worker [blocked] com ⚠ e motivo)
- Legenda de cores e atalhos de teclado