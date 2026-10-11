# Question: rodada de correção 7

O Verifier independente deu FAIL em `832a1d7` (`validation.md`, rodada 7) por um resíduo só:
gate verde com 1302 testes, o produto completo de F35 passando, 33 de 34 mutantes mortos,
26 de 28 cláusulas fechadas por inteiro, QST-36 com as dez. O dev decidiu em 2026-10-11
fechar o resíduo com uma tarefa e uma verificação restrita. F37 está concluída em `0e49bfe`;
a rodada 8 restrita do Verifier deu PASS, registrado no topo de `validation.md`.

## O problema

O mutante I4 troca `exec(input)` por `exec(chunk)` em `broker/tui.ts:191`: o prefixo de uma
sequência de escape incompleta se perde quando a leitura seguinte também não a termina. Os
testes cortam um marcador de colagem em duas leituras, no máximo, e a última frase de QST-78
diz "em quantas leituras vier". A sonda do Verifier com três e seis leituras passou no código
de `832a1d7` e falhou no mutante: é uma lacuna de teste, sem defeito de produção achado.

A tarefa não pede mudança de código de produção. Se o teste novo falhar no código de
`832a1d7`, é um achado: pare e registre, não ajuste o teste para passar.

## Regras

- Valem as regras de `fix-round-6.md`: a matriz de testes e os gates de `tasks.md`, o fluxo Execute da skill `tlc-spec-driven`, um commit por tarefa com a tarefa marcada aqui, e a mensagem de commit como em `git log`.
- Comandos de dentro de `broker/`: `bun test test/unit` (quick) e `bun node_modules/typescript/bin/tsc --noEmit && bun test` (full e build). Não usar `bun x tsc`.
- Antes de marcar a tarefa, aplique o mutante numa cópia, veja o teste falhar e restaure.
- A cópia de trabalho de um mutante não tem junction nem link para o `node_modules` da árvore real: copie a pasta ou instale nela. Na rodada 7 a remoção de um worktree com junction apagou `broker/node_modules`.
- Não editar `broker/test/frames/*.txt`. Não fazer push nem merge.

## Tarefas

### F37: Um marcador em quantas leituras vier

**Lacuna**: resíduo 1 da rodada 7 e mutante I4, `broker/tui.ts:191`; cláusula l de QST-78 e cláusula e de QST-99 em `validation.md`.
**Where**: `broker/test/unit/tui-loop.test.ts`
**Requirement**: QST-78, QST-99

- [x] Um teste monta os casos do produto de: marcador (`ESC[200~`, `ESC[201~`); tamanho (120×40, 119×40, 120×39, 100×30); e cada uma das 32 maneiras de entregar os seis bytes do marcador em uma a seis leituras, na ordem. São 256 casos, e o teste afirma a contagem
- [x] Cada caso parte do modal de Q-08 com `logo`. Para `ESC[201~` uma colagem começa antes, com `ESC[200~` inteiro, ainda em 120×40. Nos três tamanhos pequenos o terminal encolhe antes das leituras e cresce depois delas. As leituras de um caso chegam em seguida, sem espera entre elas: um marcador com mais de 40 ms entre dois pedaços está fora desta tarefa
- [x] Para cada caso afirma o que QST-78 e QST-99 definem: depois das leituras nada foi enviado e, em 120×40, a tela é o modal com `logo`, sem um caractere a mais; o `\r` seguinte, depois de `ESC[200~`, não envia e o texto fica `logo `; depois de `ESC[201~`, envia `logo`, com o POST inteiro conferido
- [x] Os valores esperados saem da spec, escritos no teste como regra, não de uma chamada ao código sob teste
- [x] O teste falha com I4, `exec(chunk)` no lugar de `exec(input)` em `broker/tui.ts:191`, e passa no código de `832a1d7`
- [x] Gate full passa

O estado da tela não entra no produto porque a junção dos pedaços acontece em `key`, antes
de qualquer estado, e F35 já cruza os cortes em duas leituras com os cinco estados e a
colagem em curso. `smallCases`, `checkSmall` e `checkSmallCases` não mudam.

**Evidência F37**: `broker/test/unit/tui-loop.test.ts:807` monta as 32 partições pelos cinco
intervalos entre os seis bytes, cruzadas com os dois marcadores e os quatro tamanhos. Cada
caso abre Q-08 com `logo`, começa a colagem antes do encolhimento para o marcador final e
entrega os pedaços sem espera. O resultado esperado usa texto literal, modal original,
ausência de POST e, ao terminar a colagem, o POST inteiro de Q-08. Não chama `key`, `input`,
`press` ou `marks` para calcular o esperado; os desenhos recebem o estado esperado escrito
no teste, como nos casos anteriores. Nenhuma asserção anterior ou função da F35 mudou.
Nenhum código de produção mudou em relação a `832a1d7`.

Isolado: **1 pass, 0 fail, 256 casos, 1153 asserções, 5,82 s**. I4 morreu pelo teste novo
sozinho: **0 pass, 1 fail, exit 1**, comparação da tela em `tui-loop.test.ts:843`, sem timeout
ou erro de sintaxe. A cópia incluía `node_modules` próprio, com ausência de links e junctions
conferida antes da cópia e da remoção. `tui.ts` restaurado byte a byte e comparado com a
árvore real antes da remoção segura da cópia.

Full: TypeScript exit 0; **1303 pass, 4 skip, 0 fail, 108439 asserções, 63 arquivos,
100,10 s**. Os quatro skips são os três de plataforma anteriores e o completo da F35 fora
do gate, conforme decisão do dev. A primeira tentativa no sandbox foi interrompida após
timeouts de `/health` nos brokers temporários; o controle PEER-22 fora dele passou (1 pass,
0 fail), e o full acima rodou fora do sandbox. Nenhum teste foi alterado para contornar
isso. Logs em
`C:/Users/lucas/.codex/visualizations/2026/10/11/01a12cd7-55fd-7563-9df1-e47734f1ae61/`:
`F37-I4.log`, `F37-full.log` (tentativa interrompida) e `F37-full-unsandboxed.log`.

| Critério (mapa de suficiência) | Evidência (`broker/`) | Resultado da spec / tarefa |
| --- | --- | --- |
| Produto e contagem | `test/unit/tui-loop.test.ts:825` `expect(cases.length).toBe(256)`; construção `:812`–`:821` | Dois marcadores × quatro tamanhos × 32 partições ordenadas |
| Estado inicial e entrega | `test/unit/tui-loop.test.ts:832` `expect(t.lines()).toEqual(tab(t.view(open)))`; preparação `:830`–`:838` | Q-08 com logo, início inteiro para o final, encolher antes e crescer depois, leituras consecutivas |
| Marcador não envia nem altera modal/texto | `test/unit/tui-loop.test.ts:839` `expect(t.posts).toEqual([])`; `:843` `expect(t.lines()).toEqual(tab(t.view(open)))` | Nada enviado; modal com logo restaurado em 120×40 |
| Início mantém colagem | `test/unit/tui-loop.test.ts:846` `expect(t.posts).toEqual([])`; `:847` `expect(t.lines()).toEqual(tab(t.view({ ...open, modal: modal(8, { text: "logo " }) })))` | Enter seguinte vira espaço, sem envio |
| Fim encerra colagem | `test/unit/tui-loop.test.ts:849` `expect(t.posts).toEqual([{ url: "http://127.0.0.1:7900/answer", body: { human_token: TOKEN, question_id: 8, answer: "logo" } }])` | POST único com URL, token, pergunta e resposta exatos (QST-76/78) |
| Discriminação e gate | `F37-I4.log`, `F37-full-unsandboxed.log` | I4 morto pelo teste sozinho; original e full passam |

| Asserções (mapa reverso) | Âncora | Manter |
| --- | --- | --- |
| `tui-loop.test.ts:825`, contagem 256 | Produto explícito da F37 | sim |
| `tui-loop.test.ts:832`, `:839`, `:843`, tela original e nenhum POST | Preparação da F37 e QST-78/99, marcador sem texto e estado restaurado | sim |
| `tui-loop.test.ts:846`, `:847`, nenhum POST e logo com espaço | QST-78, quebra sozinha em colagem | sim |
| `tui-loop.test.ts:849`, POST completo | QST-78, fim da colagem, com payload e trim de QST-76 | sim |

Adequação: suficiência e necessidade fechadas pelos mapas acima. Tela e payload completos,
sem asserções rasas, desvios, enfraquecimentos ou testes pulados novos. Segue `broker/CLAUDE.md`
e a matriz de `tasks.md`. QST-36, QST-78 e QST-99 ficaram `Implementing` neste commit de
F37 e passam a `Verified` após o PASS independente da rodada 8.

## Depois da tarefa: a rodada 8, restrita

Um agente novo, que não escreveu o código, os testes nem os relatórios, escreve a rodada 8
no topo de `validation.md`. O escopo é só o que a rodada 7 deixou aberto:

- A cláusula l de QST-78 e a cláusula e de QST-99, sobre o diff `832a1d7..HEAD`. As outras 26 cláusulas e os outros 33 mutantes ficam com a evidência da rodada 7, que o relatório cita sem refazer.
- Gate: o full sobre o HEAD. O teste completo de F35 só roda de novo se `smallCases`, `checkSmall` ou `checkSmallCases` tiverem mudado.
- Sensor: I4 morre pelo teste de F37 sozinho. O Verifier pode acrescentar mutantes próprios, só na junção das leituras em `key` (`broker/tui.ts:185`–`:200`).
- Integridade: nenhuma asserção de um teste existente mudou de valor esperado.

Com PASS: QST-36, QST-78 e QST-99 passam a `Verified` na tabela da spec,
`validate_state.py question` sai com 0, e o handoff de `STATE.md` é atualizado. Com FAIL: o
resíduo e a decisão voltam ao dev, sem outra rodada por conta própria.
