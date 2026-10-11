# Question: rodada de correção 4

O Verifier independente deu FAIL em `89007b8` (`validation.md`, rodada 4), na primeira
verificação da rodada de correção 3: gate verde com 1284 testes, 32 de 39 mutações mortas,
16 de 23 cláusulas fechadas. O código fez o que a spec diz em toda sonda menos uma; as
lacunas 1 a 5 são de teste. QST-49 passou a Verified. QST-36, QST-78 e QST-99 seguem em
`Implementing`.

Valem as regras, a matriz de testes e os gates de `tasks.md`. Um commit por tarefa, com a
tarefa marcada aqui.

## Decisões do dev

Respondidas em 2026-10-11.

- **F24**: sem modal aberto, `\n` não faz nada. A spec passa a dizer o que o código faz:
  `\r` é o `enter`.
- **F25**: os marcadores de uma colagem delimitada são lidos em qualquer tamanho do
  terminal. Não são teclas.

## Tarefas

### F21: QST-36 por outra mesclada

**Lacuna**: lacuna 1 e mutante C2, `broker/question.ts:74`. Os dois testes de F16 mesclam as duas perguntas do worker direto uma na outra; "direto ou por outra mesclada" não tem caso.
**Where**: `broker/test/unit/question-result.test.ts`
**Requirement**: QST-36

- [x] worker-1 pergunta Q-01 e Q-02 sobre T-1, worker-3 pergunta Q-03 sobre T-3; Q-02 mesclada em Q-03 e Q-03 em Q-01; o `result` de worker-1 grava `Q-01: 8080` e `Q-02: 9090`, Q-03 fecha com o `answer` de Q-01, e as entregas são a de Q-01 para worker-1 e worker-3 e a de Q-02 para worker-1
- [x] O teste falha sem o `NOT IN` do passo recursivo da busca das mescladas
- [x] Gate quick passa

### F22: `q` e `ctrl+c` no terminal pequeno, cada um no seu caso

**Lacuna**: lacunas 2 e 4, mutantes A3, A6 e A8, `broker/tui.ts:168`. O teste aperta `q` logo depois de `ctrl+c`, e nenhum teste sai de um terminal pequeno sem modal nem com a tecla entre outras.
**Where**: `broker/test/unit/tui-loop.test.ts`
**Requirement**: QST-99

- [x] Sem modal e com o modal no modo texto, cada um de `q`, `ctrl+c` e um bloco com `q` entre outras teclas, sozinho e sem tecla depois, devolve o terminal e não faz `POST`
- [x] O teste falha com `q` como única tecla que sai, com a saída só de modal aberto e com a saída só da tecla sozinha no bloco
- [x] Gate quick passa

### F23: A colagem sem modal aberto

**Lacuna**: lacunas 3 e 5, mutantes B5, B14 e B6, `broker/tui/keys.ts:198`. A regra de QST-78 tem três ramos e o gatilho novo foi testado em dois; uma quebra seguida de escape incompleto sem modal aberto continua sem teste desde a rodada 3.
**Where**: `broker/test/unit/tui-keys.test.ts`, `broker/test/unit/tui-loop.test.ts`
**Requirement**: QST-78

- [x] Na aba, sem modal, dentro de uma colagem delimitada: `\r` sozinho numa leitura abre o modal da pergunta selecionada; o texto e a quebra que vêm depois ficam no campo e nada é enviado
- [x] Sem modal, `esc` encerra a colagem delimitada: o `enter` seguinte no modal envia
- [x] No laço, na aba sem modal, `key("\r\x1b")` mostra o modal da pergunta selecionada, não faz `POST` e, depois da espera, mostra a aba sem ele
- [x] Cada teste falha sob o seu mutante
- [x] Gate build passa

### F24: `\n` sem modal aberto

**Lacuna**: lacuna 6, `broker/tui/keys.ts:132`. QST-78 diz que sem modal "a tecla", `\r` ou `\n`, faz o que `enter` faz; `press` só conhece `\r`.
**Where**: `.specs/features/question/spec.md` ou `broker/tui/keys.ts`, e `broker/test/unit/tui-keys.test.ts`
**Requirement**: QST-78
**Depende de**: decisão do dev sobre F24: `\n` não faz nada

- [x] A spec diz que sem modal aberto `\r` é o `enter` e `\n` não faz nada, como o código, e um teste fixa isso na aba e no feed: sozinho, depois de outra tecla e numa colagem delimitada
- [x] Gate quick passa

### F25: Os marcadores de colagem no terminal pequeno

**Lacuna**: SP1, `broker/tui.ts:168`. `dispatch` descarta toda tecla no terminal pequeno, os marcadores também: um redimensionamento entre os dois marcadores de uma colagem deixa `enter` escrevendo espaço até um `esc`, ou deixa uma quebra colada enviar.
**Where**: `.specs/features/question/spec.md`, e `broker/tui.ts` com o seu teste se os marcadores passam a ser lidos
**Requirement**: QST-78, QST-99
**Depende de**: decisão do dev sobre F25

- [ ] A spec diz o que os marcadores fazem no terminal pequeno, e o código e um teste a seguem
- [ ] Gate build passa
