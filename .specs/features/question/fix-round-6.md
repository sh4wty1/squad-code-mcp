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

- [ ] `input(v.ui, k, v, true)` para `\r` e para `\n` sobre `open("06", { text: "logo" })` dá o modal com `logo `, e sobre `open("05", { choice: 1 })` dá o mesmo estado; no laço, `"\n\x1b["` ao lado de `"\r\x1b["`
- [ ] `"aqa"` e `"a\x03a"` na lista do teste da saída
- [ ] O primeiro teste falha com `(more && k === "\r")` no lugar de `more`
- [ ] Gate quick passa

### F34: Um marcador cortado por uma leitura

**Lacuna**: SP4 e mutante V8, `broker/tui.ts:188`–`:194`. A spec não diz que um marcador pode chegar em duas leituras; o laço o junta em qualquer tamanho, e só há asserção em 120×40.
**Where**: `.specs/features/question/spec.md`, `broker/test/unit/tui-loop.test.ts`
**Requirement**: QST-78, QST-99

- [ ] QST-78 diz que um marcador é um marcador em quantas leituras vier
- [ ] Teste, nos três tamanhos: o modal de Q-08, o terminal encolhe, `ESC[20` e `0~` em duas leituras, cresce, `logo`, `\r`: o texto é `logo ` e nada é enviado
- [ ] Gate quick passa

### F35: O terminal pequeno pelo produto das dimensões

**Lacuna**: a causa das três reprovações em QST-99. Os testes de exemplo já fazem 54 lançamentos para a saída e 36 para os marcadores, e o espaço que amostram ainda tem células sem visita.
**Where**: `broker/test/unit/tui-loop.test.ts`, ou um arquivo novo `broker/test/unit/tui-small.test.ts`
**Requirement**: QST-99, QST-78

- [ ] Um teste monta os casos do produto de: tamanho (119×40, 120×39, 100×30); estado antes de encolher (tela principal, aba sem modal, modal no modo texto com e sem texto, modal no modo escolha); colagem em curso ou não; e uma leitura feita de uma a três teclas tiradas de `q`, `ctrl+c`, `esc`, `\r`, `\n`, um dígito, uma letra, uma seta e os dois marcadores
- [ ] Para cada caso afirma o que QST-99 define: com `q` ou `ctrl+c` na leitura o terminal é devolvido; sem eles nada é enviado, a tela é a de `small`, e de volta a 120×40 a tela é a de antes; a colagem em curso depois da leitura é a que os marcadores dela dizem, e nenhuma outra tecla a muda, o `esc` também não
- [ ] O que a colagem em curso é depois da leitura se vê pelo `\r` seguinte, de volta a 120×40: envia ou vira espaço
- [ ] Os valores esperados saem da spec, escritos no teste como regra, não de uma chamada ao código sob teste
- [ ] Os mutantes X3, X5 a X9, N8, N11, N16 a N20, K1 a K3, V2, V4, V8 e V13 morrem por este teste sozinho
- [ ] Gate full passa

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
escreve a rodada 7 no topo de `validation.md`. Com PASS: QST-36, QST-78 e QST-99 passam a
`Verified` na tabela da spec, `validate_state.py question` sai com 0, e o handoff de
`STATE.md` é atualizado. Com FAIL: o resíduo e a decisão voltam ao dev, sem outra rodada por
conta própria.
