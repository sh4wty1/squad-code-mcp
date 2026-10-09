# Correções da review do PR 8

F1–F4 corrigidos em `feat/tui-leitura`, sobre `004fe43`, e publicados no PR 8 em
2026-10-09 após aprovação do dev. Commits: `1eaf4b1`, `a943d95`, `83f1eef` e `98b8323`. A review original é
https://github.com/sh4wty1/squad-code-mcp/pull/8#pullrequestreview-5475930529.
Nenhum comentário foi publicado ou resolvido no GitHub nesta rodada.

## Resolution

| ID | Entrega | Critério / evidência |
| -- | ------- | -------------------- |
| F1 | `openPermissions` considera o `peer_left` posterior do requerente, como a decisão do broker. A definição da spec acompanha a regra canônica. O teste de recusa/unblocked continua cobrindo apenas esses eventos. | TUI-04; `broker/test/unit/derive-squad.test.ts:1232` afirma `permission_closed`, `:1233` afirma nenhum pedido aberto e `:1235` afirma `{ status: "idle", permission: null }` depois do rejoin. `:1243–1244` cobrem outra saída, saída anterior e ordem invertida. |
| F2 | O orçamento de 30 linhas limita também a primeira entrada. Uma entrada alta preserva cabeçalho e início do resumo, termina com `… conteúdo cortado` e reserva as linhas de rolagem. | TUI-19/TUI-46; `broker/test/unit/tui-thread.test.ts:204` compara `drawn.slice(35)` com `plain.slice(35)` em quatro offsets; `:206–210` exigem aviso, resumo e task visíveis. |
| F3 | O laço guarda prefixos CSI entre chunks; Escape isolado é entregue após 40 ms. A saída cancela o timer. | TUI-60/TUI-62; `broker/test/unit/tui-loop.test.ts:315` exige que o prefixo não altere a tela; `:317` compara sequência inteira e fragmentada; `:323–324` conferem texto e ANSI esperado, incluindo foco; `:172` aguarda Escape isolado. |
| F4 | `grid.put` substitui C0, DEL e C1 por espaço, uma célula por controle. `wrap` continua separando parágrafos antes da escrita. | TUI-19; `broker/test/unit/tui-grid.test.ts:135–137` verifica o título aceito pelo broker e ausência de LF/controles nas células; `:143–144` verifica todos os controles e o cursor final. |

Cada regressão mapeia diretamente ao achado e aos requisitos indicados. Nenhum teste foi
apagado ou pulado. Antes da correção, cinco testes novos falharam reproduzindo os quatro
achados. O teste existente de Escape passou a aguardar a entrega; seu resultado esperado
não mudou. O teste de recusa/unblocked deixou de incluir uma saída, conforme pedido F1.

## Verificação

- `python3 .agents/skills/tlc-spec-driven/scripts/validate_tasks.py tui-leitura`: exit 0;
  três avisos preexistentes de tarefas com `Tests: none`.
- `bun node_modules/typescript/bin/tsc --noEmit`: exit 0.
- `bun test`: Linux, Bun 1.3.14, 929 passam, zero falham, zero pulados, 48 arquivos.
- Verifier independente, rodada 3: 64/64 ACs, 9/9 casos de borda; 24 mutações distintas
  mortas ao final. Uma mutação de shift-tab sobreviveu inicialmente porque o teste só
  comparava texto. A asserção foi reforçada para comparar a saída ANSI, e a mutação morreu
  na repetição. Gate final: 5664 assertions.
- Relatório completo: `validation.md`. Windows, macOS e terminal interativo real não
  foram executados nesta rodada. Os resultados anteriores permanecem no histórico.

## Publicação aprovada

O dev aprovou os cinco commits e o push. As quatro correções foram publicadas, e o quinto
commit registra o PASS e o estado da entrega. Sem merge. Mensagens aprovadas, na convenção
imperativa em minúsculas do repositório:

1. `close permission requests when their session leaves`
2. `keep oversized thread entries inside the timeline`
3. `buffer fragmented terminal key sequences`
4. `replace terminal controls with printable cells`
5. `record the verifier pass for the TUI reading slice`

O quinto commit inclui spec, tarefas, relatório, lições, roadmap, STATE e o registro desta
tarefa. Os três registros anteriores em `docs/tasks/` permanecem preservados, fora desse
escopo de commit, até uma instrução específica para incluí-los.
