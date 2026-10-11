# Question: rodada de correção 6

O Verifier independente deu FAIL em `6cd28e2` (`validation.md`, rodada 6), na terceira
verificação seguida desde a rodada de correção 3: gate verde com 1295 testes, os nove
mutantes da rodada 5 mortos, 31 de 40 mutações mortas, 21 de 27 cláusulas fechadas por
inteiro. O limite de três voltas de correção e verificação foi atingido, e o dev mandou
seguir em 2026-10-11, com outro agente. Nenhuma tarefa abaixo tem código escrito.

## O problema

Nas três verificações o código fez o que a spec diz em toda sonda, e todo mutante de uma
construção escrita morreu. O que sobra, a cada volta, são mutantes que **acrescentam uma
condição que o código não tem** num caso que o requisito cobre e nenhum teste visita. As
rodadas 4 e 5 fecharam os sobreviventes nomeados com testes de exemplo, e a verificação
seguinte achou os vizinhos. Fechar só os seis desta vez tende a repetir o resultado: as
tarefas F35 e F36 trocam as listas de exemplos por casos gerados do produto das dimensões,
que é o que ataca a causa.

Nenhuma tarefa pede mudança de código de produção. Se um teste novo falhar no código de
`6cd28e2`, é um achado: pare e registre, não ajuste o teste para passar.

## Regras

- Valem as regras, a matriz de testes e os gates de `tasks.md`, e o fluxo Execute da skill
  `tlc-spec-driven`. Um commit por tarefa, com a tarefa marcada aqui e a spec no mesmo commit.
- Comandos de dentro de `broker/`: `bun test test/unit` (quick, 5 s), `bun node_modules/typescript/bin/tsc --noEmit && bun test` (full e build, 60 s). Não usar `bun x tsc`.
- Mensagem de commit: uma frase imperativa em inglês, em minúsculas, sem prefixo, como em `git log`.
- Antes de marcar uma tarefa, aplique o mutante do "Done when" numa cópia do arquivo, veja o teste falhar e restaure o arquivo. Os mutantes de cada correção estão em `validation.md`, rodada 6, "Fix plans" e "Discrimination sensor".
- No Git Bash desta máquina um heredoc troca `\\` por `\`: escreva scripts de mutação que casem texto sem barra invertida, ou edite por arquivo.
- Não editar `broker/test/frames/*.txt`. Não fazer push nem merge.

## Tarefas

### F29: Outro `asked_by` sobre o mesmo ticket

**Lacuna**: lacuna 1 e mutantes R3 e R2, `broker/question.ts:71` e `:74`. Em todo teste de QST-36 e QST-37 a pergunta de outro worker é sobre `T-3` ou `T-2`: "de outro `asked_by`" e "sobre outro ticket" são sempre as mesmas perguntas.
**Where**: `broker/test/unit/question-result.test.ts`
**Requirement**: QST-36

- [x] Q-01 de worker-1 sobre T-1; Q-02 sobre T-1 também, de worker-3 e, numa segunda volta, do judge; Q-02 mesclada em Q-01; `delivered("worker-1", "T-1")` grava um `answer` só, Q-02 fica `defaulted` com `merged_into` 1 e o `answer_seq` dele, e a entrega vai para worker-1 e para quem perguntou Q-02
- [x] Q-03 de worker-3 sobre T-1 mesclada em Q-02 de worker-2 sobre T-9, mesclada em Q-01: um `answer`, as três linhas com ele, entregas aos três
- [x] O teste falha com a busca filtrando pelo ticket da linha no lugar do `NOT IN`, em `:71` e em `:74`
- [x] Gate quick passa

**Evidência F29**: código de produção idêntico a `6cd28e2`; R3 e R2 mortos separadamente no scratch, restaurado após cada execução. Quick: 1138 pass, 1 skip, 0 fail. Full: tsc 0; 1296 pass, 3 skip, 0 fail.

| Critério / mapa reverso | Asserção (`broker/`) | Resultado da spec | Manter |
| --- | --- | --- | --- |
| QST-36, outro autor no mesmo ticket | `test/unit/question-result.test.ts:291` `expect(b.events().slice(4)).toEqual([storedDefault(5, id)])`; `:292` `expect(b.questionRows()).toEqual(...)`; `:296` `expect(b.deliveries()).toEqual(...)` | um answer completo, duas linhas defaulted e uma entrega por nome | sim |
| QST-36, mesmo ticket a duas mesclas | `test/unit/question-result.test.ts:312` `expect(b.events().slice(6)).toEqual([storedDefault(7, id)])`; `:313` linhas; `:318` entregas | um answer, três linhas defaulted e entregas aos três | sim |

Adequação: critérios completos; valores e campos do payload conferidos; nenhum teste enfraquecido; segue `broker/CLAUDE.md` e a matriz de `tasks.md`.

### F30: A duas mesclas de distância

**Lacuna**: lacuna 2 e mutantes R18 e R15, `broker/question.ts:73`–`:74`. "Por outra mesclada" só tem uma forma testada.
**Where**: `broker/test/unit/question-result.test.ts`
**Requirement**: QST-36

- [x] Q-03 de worker-3 sobre T-3 mesclada em Q-02, mesclada em Q-01, com Q-02 de worker-2 sobre T-2 e depois de worker-1 sobre T-2: um `answer`, as três linhas `defaulted` com o `answer_seq` dele, uma entrega por nome
- [x] O teste falha com `AND q.asked_by =` quem envia, e com `AND m.asked_by !=` quem envia, no passo recursivo
- [x] Gate quick passa

**Evidência F30**: R18 e R15 mortos separadamente no scratch, restaurado. Quick: 1139 pass, 1 skip, 0 fail.

| Critério / mapa reverso | Asserção (`broker/`) | Resultado da spec | Manter |
| --- | --- | --- | --- |
| QST-36, dois autores possíveis no meio | `test/unit/question-result.test.ts:336` `expect(b.events().slice(6)).toEqual([storedDefault(7, id)])`; `:337` `expect(b.questionRows()).toEqual(...)`; `:342` `expect(b.deliveries()).toEqual(...)` | um answer, três linhas defaulted com seq 7 e uma entrega por autor | sim |

Adequação: critérios completos, payload e linhas conferidos; sem enfraquecimento; segue `broker/CLAUDE.md` e a matriz.

### F31: Sair do terminal pequeno com uma colagem em curso

**Lacuna**: lacuna 3 e mutante V4, `broker/tui.ts:171`. Os três estados do teste da saída são estados do modal; a colagem em curso é um segundo estado do terminal pequeno.
**Where**: `broker/test/unit/tui-loop.test.ts`
**Requirement**: QST-99

- [x] Três lugares a mais na lista do teste da saída: `["\x1b[200~"]`, `["4", "j", "\r", "\x1b[200~logo"]` e `["4", "\r", "\x1b[200~"]`; e `"\x1b[200~q"` entre as leituras
- [x] O teste falha com `!ui.pasting &&` antes do `some`
- [x] Gate quick passa

**Evidência F31**: V4 morto no scratch e arquivo restaurado. Teste isolado: 126 lançamentos, 504 asserções, passa. Quick: 1139 pass, 1 skip, 0 fail.

| Critério / mapa reverso | Asserção (`broker/`) | Resultado da spec | Manter |
| --- | --- | --- | --- |
| QST-99, saída durante colagem | `test/unit/tui-loop.test.ts:638` `expect(t.raw).toEqual([true, false])`; `:639` `expect(t.out.endsWith(LEAVE)).toBe(true)`; `:640` `expect(t.posts).toEqual([])` | terminal devolvido e zero POST para todos os tamanhos, estados e leituras | sim |

Adequação: critérios completos; asserções antigas preservadas; segue `broker/CLAUDE.md` e a matriz.

### F32: `esc` no terminal pequeno, pelo laço

**Lacuna**: lacuna 4 e mutante V13, `broker/tui.ts:170`. A frase de QST-99 sobre `esc` só é afirmada em `marks`. É o único sobrevivente com caminho até uma resposta que o dev não enviou.
**Where**: `broker/test/unit/tui-loop.test.ts`
**Requirement**: QST-99

- [x] Nos três tamanhos: o modal de Q-08, `ESC[200~logo`, o terminal encolhe, `esc` sozinho com os seus 40 ms e, numa segunda volta, `esc` e `1` numa leitura, o terminal cresce: o modal com `logo`; `\r`: nada enviado e o texto é `logo `; `ESC[201~`, `\r`: `logo` é enviado
- [x] O teste falha com o laço encerrando a colagem ao ver um `esc` no terminal pequeno
- [x] Gate quick passa

**Evidência F32**: V13 morto no scratch e arquivo restaurado. Quick: 1140 pass, 1 skip, 0 fail.

| Critério / mapa reverso | Asserção (`broker/`) | Resultado da spec | Manter |
| --- | --- | --- | --- |
| QST-99, esc nos três tamanhos, sozinho ou acompanhado | `test/unit/tui-loop.test.ts:722` `expect(t.lines()).toEqual(tab(t.view(open)))`; `:724` `expect(t.posts).toEqual([])`; `:725` tela com `logo `; `:728` POST completo | esc não encerra a colagem; enter vira espaço; só depois do marcador final enter envia logo | sim |

Adequação: fluxo testado pela entrada do laço, campos do POST conferidos; segue `broker/CLAUDE.md` e a matriz.

### F33: `\n` com teclas retidas e o modal aberto, e a tecla entre duas outras

**Lacuna**: lacunas 5 e 6, mutantes W4 e V2, `broker/tui/keys.ts:206` e `broker/tui.ts:171`.
**Where**: `broker/test/unit/tui-keys.test.ts`, `broker/test/unit/tui-loop.test.ts`
**Requirement**: QST-78, QST-99

- [x] `input(v.ui, k, v, true)` para `\r` e para `\n` sobre `open("06", { text: "logo" })` dá o modal com `logo `, e sobre `open("05", { choice: 1 })` dá o mesmo estado; no laço, `"\n\x1b["` ao lado de `"\r\x1b["`
- [x] `"aqa"` e `"a\x03a"` na lista do teste da saída
- [x] O primeiro teste falha com `(more && k === "\r")` no lugar de `more`
- [x] Gate quick passa

**Evidência F33**: W4 e V2 mortos separadamente no scratch e arquivos restaurados. Quick: 1141 pass, 1 skip, 0 fail.

| Critério / mapa reverso | Asserção (`broker/`) | Resultado da spec | Manter |
| --- | --- | --- | --- |
| QST-78, r/n com mais teclas retidas, texto e escolha | `test/unit/tui-keys.test.ts:463` `expect(input(text.ui, k, text, true)).toEqual(...)`; `:464` `expect(input(choice.ui, k, choice, true)).toEqual(choice.ui)` | logo com espaço, ou escolha inalterada; sem send | sim |
| QST-78, entrada do laço | `test/unit/tui-loop.test.ts:440` `expect(t.posts).toEqual([])`; `:441` tela com logo e espaço; `:460` e `:461` escolha inalterada | quebra antes do escape retido não envia | sim |
| QST-99, tecla entre outras duas | `test/unit/tui-loop.test.ts:638` `expect(t.raw).toEqual([true, false])`; `:640` zero POST | aqa e ctrl+c entre letras devolvem terminal | sim |

Adequação: critérios completos, valores antigos preservados; segue `broker/CLAUDE.md` e a matriz.

### F34: Um marcador cortado por uma leitura

**Lacuna**: SP4 e mutante V8, `broker/tui.ts:188`–`:194`. A spec não diz que um marcador pode chegar em duas leituras; o laço o junta em qualquer tamanho, e só há asserção em 120×40.
**Where**: `.specs/features/question/spec.md`, `broker/test/unit/tui-loop.test.ts`
**Requirement**: QST-78, QST-99

- [x] QST-78 diz que um marcador é um marcador em quantas leituras vier
- [x] Teste, nos três tamanhos: o modal de Q-08, o terminal encolhe, `ESC[20` e `0~` em duas leituras, cresce, `logo`, `\r`: o texto é `logo ` e nada é enviado
- [x] Gate quick passa

**Evidência F34**: V8 (não reter sequência incompleta só quando pequeno, tamanho protegido por try) morto no scratch; arquivo restaurado. Quick: 1142 pass, 1 skip, 0 fail.

| Critério / mapa reverso | Asserção (`broker/`) | Resultado da spec | Manter |
| --- | --- | --- | --- |
| QST-78/99, marcador em duas leituras | `test/unit/tui-loop.test.ts:752` `expect(t.posts).toEqual([])`; `:753` `expect(t.lines()).toEqual(tab(t.view(...)))` | enter vira espaço em logo, zero POST, nos três tamanhos | sim |

Adequação: novo texto da spec explícito; teste pela entrada do laço, sem mudar produção; segue `broker/CLAUDE.md` e a matriz.

### F35: O terminal pequeno pelo produto das dimensões

**Lacuna**: a causa das três reprovações em QST-99. Os testes de exemplo já fazem 54 lançamentos para a saída e 36 para os marcadores, e o espaço que amostram ainda tem células sem visita.
**Where**: `broker/test/unit/tui-loop.test.ts`, ou um arquivo novo `broker/test/unit/tui-small.test.ts`
**Requirement**: QST-99, QST-78

- [x] Uma função monta os casos e um oráculo só os confere, para os dois testes abaixo. As dimensões: tamanho (119×40, 120×39, 100×30); estado antes de encolher (tela principal, aba sem modal, modal no modo texto com e sem texto, modal no modo escolha); colagem em curso ou não; e uma leitura feita de uma a três teclas tiradas de `q`, `ctrl+c`, `esc`, `\r`, `\n`, um dígito, uma letra, uma seta e os dois marcadores, mais os dez cortes internos dos dois marcadores em duas leituras
- [x] Teste do gate, 800 casos, sem semente: as dez leituras de uma tecla e os dez cortes, cruzados com os 30 contextos (tamanho × estado × colagem), 600 casos; as 100 leituras de duas teclas e 100 de três, em que a terceira tecla é a de índice (primeira + segunda) módulo 10, cada leitura num contexto em rodízio, 200 casos. O rodízio faz cada tecla em cada posição encontrar, nas leituras de duas teclas e nas de três, os dois valores de colagem, os cinco estados e os três tamanhos. O teste afirma a contagem e essa cobertura
- [x] Teste completo, os 33600 casos do produto, registrado com `test.skipIf(!process.env.SQUAD_TEST_FULL)` e timeout próprio de 1800000 ms. Fica fora do gate, onde aparece como um pulado a mais (4 no Windows), e roda de dentro de `broker/` com `SQUAD_TEST_FULL=1 bun test test/unit/tui-loop.test.ts --test-name-pattern` e o nome dele
- [x] Para cada caso afirma o que QST-99 define: com `q` ou `ctrl+c` na leitura o terminal é devolvido; sem eles nada é enviado, a tela é a de `small`, e de volta a 120×40 a tela é a de antes; a colagem em curso depois da leitura é a que os marcadores dela dizem, e nenhuma outra tecla a muda, o `esc` também não
- [x] O que a colagem em curso é depois da leitura se vê pelo `\r` seguinte, de volta a 120×40: envia ou vira espaço
- [x] Os valores esperados saem da spec, escritos no teste como regra, não de uma chamada ao código sob teste
- [x] Os mutantes de terminal pequeno definidos nas rodadas 5 e 6, X3, X5, X6, X7, N8, N11, N5, V1, V2, V3, V4, V5, V7, V7b, V8, V11, V13, V14, V15 e V16, morrem pelo teste do gate sozinho. Se um sobreviver a ele, a célula que falta entra no teste do gate e fica registrada aqui; não se troca o mutante nem a asserção
- [x] O teste completo passa uma vez no código de produção de `6cd28e2`, com o tempo anotado na evidência
- [x] Gate full passa

**Divergência autorizada pelo dev em 2026-10-11**: corrigida apenas a lista de mutantes, mantendo o produto completo. X8 e X9 não têm definição nos relatórios; N16 a N20 no histórico são mutantes de `question.ts` e `log.ts`, fora do caminho de um teste de TUI com fetch falso. K1 e K2 tratam `more` em terminal normal, e K3 o default desse argumento; não são mutantes da regra de terminal pequeno. A lista corrigida usa os 20 mutantes de QST-99 rastreáveis aos sensores das rodadas 5 e 6, incluindo os vizinhos já mortos por exemplos.

**Interrupção F35 em 2026-10-11**: o teste do produto completo foi escrito, mas sua primeira execução no código de produção de `6cd28e2` saiu com 1 por timeout após 601272 ms (limite 600000 ms), com 0 pass, 1 fail, 37 filtered out e 141047 asserções executadas. Não foi registrada falha de asserção de comportamento; a execução não terminou. O tsc passou. Nenhuma asserção, caso ou timeout foi alterado depois da falha. A tarefa permanece aberta e sem commit; os mutantes de F35 foram preparados, mas não executados. F36 e o Verifier não começaram. Decisão devolvida ao dev, conforme a regra de parar se um teste novo falhar no código original.

**Decisão do dev sobre o custo, em 2026-10-11**: o produto completo custa cerca de 24 ms por caso, perto de 13 minutos, e não cabe no gate. O gate passa a ter um desenho de pares de 800 casos, e o produto completo fica atrás de `SQUAD_TEST_FULL`, os dois com os mesmos casos gerados e o mesmo oráculo; as caixas acima já dizem isso. O teste escrito antes da interrupção é o ponto de partida: o oráculo e as asserções ficam, muda a montagem dos casos. O teste completo conta para o Verifier, como está em "Depois da última tarefa". Quem executa é o autor desta rodada.

**Evidência F35 nesta retomada**: montagem comum em `smallCases`, com 800 casos no gate e 33600 no completo; oráculo e asserções da interrupção preservados em `checkSmall`. O rodízio usa índice módulo 30, com passos e offsets determinísticos para cada par; as asserções conferem todas as marginais exigidas em cada posição. Nenhuma célula adicional foi necessária. Isolado de 800: 1 pass, 0 fail, 5320 asserções, 14636 ms (antes de recolocar a asserção da contagem de 1110 palavras no gerador comum). Completo: 1 pass, 0 fail, 187862 asserções, 481033,83 ms, timeout 1800000 ms. Código de produção idêntico a `6cd28e2`.

X3, X5, X6, X7, N8, N11, N5, V1, V2, V3, V4, V5, V7, V7b, V8, V11, V13, V14, V15 e V16 mortos separadamente pelo teste de 800 sozinho no scratch; cada execução falhou em asserção de comportamento, não por timeout. Arquivos restaurados e comparados byte a byte à produção real. Logs em `%TEMP%/squad-question-round6/F35-<id>.log`. Gate full: tsc 0; 1301 pass, 4 skip, 0 fail, 63 arquivos, 91,76 s; os três skips de plataforma anteriores e o completo fora do gate. O full e o completo correram simultaneamente em processos separados, sobre os mesmos arquivos finais, sem mutações na árvore real.

| Critério / mapa reverso | Asserção (`broker/`) | Resultado da spec | Manter |
| --- | --- | --- | --- |
| Montagem e cobertura do gate | `test/unit/tui-loop.test.ts:919` `expect(cases.length).toBe(800)`; `:925` 100 leituras por comprimento; `:930` `expect(new Set(visits.map((c) => c.pasting)).size).toBe(2)`; `:931` cinco estados; `:932` três tamanhos | 600 casos de uma tecla/corte e 200 de duas/três, sem semente; cada tecla em cada posição cobre as marginais | sim |
| Produto preservado | `test/unit/tui-loop.test.ts:825` `expect(words.length).toBe(1110)`; `:942` `expect(cases.length).toBe(33600)` | 1110 leituras inteiras e dez cortes, em 30 contextos | sim |
| QST-99, saída em qualquer posição e contexto | `test/unit/tui-loop.test.ts:867` `expect(t.raw).toEqual([true, false])`; `:868` `expect(t.out.endsWith(LEAVE)).toBe(true)`; `:869` zero POST | terminal devolvido por q ou ctrl+c, com e sem colagem | sim |
| QST-99, demais teclas e volta do tamanho | `test/unit/tui-loop.test.ts:874` raw; `:875` `expect(t.posts).toEqual([])`; `:876` tela small; `:879` `expect(t.lines()).toEqual(before)` | nada enviado, tela pequena e estado anterior restaurado | sim |
| QST-78/99, colagem observada pelo enter seguinte | `test/unit/tui-loop.test.ts:897` `expect(t.posts).toEqual(pasting ? [] : [post])`; `:900` tela com espaço ou escolha mantida; `:903` `expect(t.posts).toEqual([post])` | só os marcadores mudam a colagem, esc não a encerra no terminal pequeno; POST com token, id e texto exatos | sim |

Adequação: critérios completos e mapa reverso acima; asserções do oráculo preservadas, sem enfraquecimento. Tela e payload completos conferidos, no padrão de `broker/CLAUDE.md` e da matriz de `tasks.md`. O skip e o timeout próprios do completo são a decisão explícita do dev, não uma dispensa de execução.

### F36: O gerador de `question-replay` com mescla e `result`

**Lacuna**: a causa das reprovações em QST-36. O gerador de `broker/test/unit/question-replay.test.ts` compara a tabela com a derivação depois de sequências geradas, e as sementes dele não chegam a uma pergunta de outro `asked_by` sobre o ticket do worker, mesclada numa que o `result` fecha.
**Where**: `broker/test/unit/question-replay.test.ts`
**Requirement**: QST-36, QST-37, QST-48

- [ ] O gerador produz perguntas de dois ou mais `asked_by` sobre o mesmo ticket, mesclas em cadeia de até três, e o `result` de um deles
- [ ] Além da paridade com a derivação, o teste afirma o que QST-36 define, calculado da sequência gerada: cada pergunta que o `result` fecha por si tem `answer` próprio com o seu default, em ordem crescente de id; cada mesclada que ele não fecha por si tem o `answer_seq` da mais próxima que ele fecha na cadeia; e cada `answer` é entregue uma vez a cada `asked_by` que fechou com ele, menos a quem o escreveu
- [ ] Os mutantes C2, Q5, Q6, Q6a, Q7, R2, R3, R15 e R18 morrem por este teste sozinho
- [ ] Gate build passa

## Depois da última tarefa

O Verifier roda de novo, como agente novo que não escreveu o código, os testes nem os
relatórios, com `references/validate.md` da skill como checklist, sobre `6cd28e2..HEAD`, e
escreve a rodada 7 no topo de `validation.md`.

O teste completo de F35 conta para o Verifier (decisão do dev, 2026-10-11). O gate da
rodada 7 é o full mais uma execução do teste completo sobre o HEAD, com `SQUAD_TEST_FULL=1`.
No sensor de discriminação, um mutante do ramo do terminal pequeno do laço (`broker/tui.ts`)
ou de `marks` (`broker/tui/keys.ts`) que sobreviver ao gate roda contra o teste completo, e
só é sobrevivente se passar pelos dois. O relatório diz quais mutantes só o completo matou.

Com PASS: QST-36, QST-78 e QST-99 passam a
`Verified` na tabela da spec, `validate_state.py question` sai com 0, e o handoff de
`STATE.md` é atualizado. Com FAIL: o resíduo e a decisão voltam ao dev, sem outra rodada por
conta própria.
