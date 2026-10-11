# Question: rodada de correção 3

A review do PR 9 (https://github.com/sh4wty1/squad-code-mcp/pull/9, postada em 2026-10-10
sobre `d867b57`) deu COMMENT: nenhum bloqueio, dois achados para corrigir e cinco nits. O
texto de cada achado, com a evidência, está nos comentários do PR. Esta rodada ainda não
começou: nenhuma tarefa abaixo tem código escrito.

Valem as regras, a matriz de testes e os gates de `tasks.md`. Um commit por tarefa, com a
tarefa marcada aqui.

## Decisões do dev

Respondidas em 2026-10-11.

- **F15**: a colagem delimitada entra na spec só para a regra de QST-78, com a regra do
  bloco como reserva. Até aqui `spec.md:37` deixava a colagem delimitada de fora.
- **F16**: o comportamento de `d867b57` não é o que QST-36 quer dizer. Cada pergunta do
  worker fecha com o próprio default, nas duas direções da mescla.

## Tarefas

### F14: Terminal menor que 120×40 não responde

**Lacuna**: achado F1 da review, `broker/tui.ts:160`. `draw` troca a tela por `small()` em `broker/tui.ts:114`, mas `dispatch` reduz toda tecla e posta. Num terminal de 100×30 sobre uma bloqueante com opções, `b`, `enter`, `enter` posta `8080` e a pergunta vira `answered` com a tela em `terminal pequeno demais`. Com o modal no modo texto e a janela encolhida, `q`, `q`, `enter` grava `qq` como resposta do dev.
**Where**: `broker/tui.ts`
**Requirement**: QST-99, escrito nesta tarefa: nenhum requisito de Question citava o terminal menor que 120×40

- [x] Com o tamanho abaixo de 120×40, `dispatch` deixa passar só `q` e ctrl+c, as teclas que `broker/tui/screens/small.ts:20` oferece; nenhuma outra tecla muda o estado nem faz `POST`
- [x] Teste: 100×30, bloqueante com opções, `b`, `enter`, `enter` não faz `POST` e a pergunta continua aberta
- [x] Teste: modal no modo texto, janela encolhida, `q` sai da TUI e nada é gravado
- [x] De volta a 120×40 as teclas valem de novo, com o estado que a tela tinha antes de encolher
- [x] Gate full passa

### F15: Colagem pelo sinal do terminal

**Lacuna**: achado F2 da review, `broker/tui/keys.ts:187`. `pasted` só vale quando a quebra de linha divide o bloco com outra tecla; uma colagem que chega com a quebra sozinha numa leitura envia a resposta. Depois de `CSI ? 2004 h` o terminal entrega a colagem entre `ESC [ 200 ~` e `ESC [ 201 ~`, e `KEY` já lê cada marcador como uma tecla.
**Where**: `broker/tui/ansi.ts`, `broker/tui/keys.ts`, `.specs/features/question/spec.md`
**Requirement**: QST-78
**Depende de**: decisão do dev sobre F15: entra na spec

- [x] A spec diz que a colagem delimitada vale para a regra de QST-78 e continua fora para a edição do campo
- [x] `ENTER` e `LEAVE` (`broker/tui/ansi.ts:29`) ligam e desligam o modo 2004. O teste de TUI-60 em `test/unit/tui-ansi.test.ts` fixava os dois literais e mudou de valor esperado com eles
- [x] `input` troca por espaço as quebras entre os dois marcadores, no modo texto, e as ignora no modo escolha, mesmo com a quebra sozinha numa leitura. A colagem em curso fica em `Ui.pasting`, porque atravessa leituras; o teste que fixa `START` ganhou o campo
- [x] `esc` encerra uma colagem cujo marcador de fim não veio: sem isso, um marcador perdido deixaria `enter` sem enviar até a TUI reiniciar. Não estava na tarefa; está em QST-78
- [x] A regra do bloco continua valendo para o terminal que não manda os marcadores: os testes de QST-78 que já existiam passam sem mudar valor esperado
- [x] O risco de colagem em `STATE.md` (Evidência e limites) é atualizado
- [x] Gate full passa

### F16: A direção da mescla e o default da segunda pergunta

**Lacuna**: achado F3 da review, `broker/question.ts:381`. Quando um `result` fecha duas perguntas do mesmo worker e ticket, Q2 mesclada em Q1 dá um `answer` só, e Q2 fecha com o default de Q1; Q1 mesclada em Q2 dá dois, cada uma com o seu.
**Where**: `broker/question.ts`, `broker/test/unit/question-result.test.ts`
**Requirement**: QST-36
**Depende de**: decisão do dev sobre F16: cada uma com o seu default

- [x] QST-36 diz que cada pergunta do worker fecha com o seu `answer` e o seu default, qualquer que seja a mesclada
- [x] Cada pergunta fecha com o próprio default nas duas direções, em ordem crescente de id. A tarefa previa fechar as linhas `merged` antes das `open`; isso tiraria a ordem crescente de id que QST-36 fixa e deixaria uma cadeia de três perguntas do mesmo worker fechar pelo default de outra. No lugar, a busca das mescladas para numa pergunta que o mesmo `result` fecha, e as mescladas dessa a seguem
- [x] Teste: as duas direções dão dois `answer`, e a pergunta de outro worker mesclada numa das duas fecha com o `answer` dela
- [x] Gate full passa

### F17: Quem saiu da mescla sai de `absorbed`

**Lacuna**: achado F4 da review, `broker/shared/derive.ts:353`. Uma pergunta que deixou a mescla pelo próprio `result_default` continua em `absorbed` da que ela seguia: a lista, o detalhe e o modal de Q-02 mostram `absorveu Q-01 (worker)` e a resposta do dev a Q-02 só vai para `mother` e `worker-2`.
**Where**: `broker/shared/derive.ts`
**Requirement**: QST-49, que ganhou a frase sobre quem sai da lista; as linhas `absorveu` são de QST-56, QST-58 e QST-70

- [x] Depois de lidas as respostas, `absorbed` guarda só os ids cujo `answered_by` é nulo
- [x] Teste: Q-01 mesclada em Q-02, o `result` do worker de Q-01 a fecha, e Q-02 não mostra mais `absorveu Q-01` na lista, no detalhe nem no modal
- [x] Gate full passa

### F18: A asserção que compara `KEY_SEAL` com ele mesmo

**Lacuna**: achado F5 da review, `broker/test/unit/tui-frames.test.ts:108`. Os frames `10` e `20a` espalham a mesma constante em `broker/test/frames/deviations.ts:161` e `:392`, e a asserção não tem como falhar.
**Where**: `broker/test/unit/tui-frames.test.ts`
**Requirement**: QST-87

- [x] A linha 108 sai; a 107 já fixa a classe e o texto
- [x] Gate build passa

### F19: Um `TIMEOUT_S` só

**Lacuna**: achado F6 da review, `broker/question.ts:21` e `broker/shared/derive.ts:285`. O prazo da tabela e o derivado têm de concordar no 240 e cada um define o seu.
**Where**: `broker/shared/contract.ts`, `broker/question.ts`, `broker/shared/derive.ts`
**Requirement**: QST-04, QST-18

- [x] `broker/shared/contract.ts` exporta a constante, e os dois arquivos a importam
- [x] Gate full passa

### F20: O teste espera a leitura, não 200 ms

**Lacuna**: achado F7 da review, `broker/test/integration/tui.test.ts:240`. `await Bun.sleep(200)` faz as vezes de esperar uma leitura; uma leitura mais lenta que 200 ms derruba o teste, no tipo de contêiner em que a suíte já esgota o tempo.
**Where**: `broker/test/integration/tui.test.ts`
**Requirement**: QST-80, o do trecho do teste que espera a leitura

- [x] O teste espera um `GET` registrado em `asked` (`:190`) depois de `stale = true`, sem `Bun.sleep`
- [x] Gate full passa

## Fora das tarefas, anotado pela review

- `BLOCKING` em três arquivos de teste da TUI repete `ASKED` de `broker/test/unit/helpers.ts:84`.
- O cast duplo em `broker/test/unit/question-replay.test.ts:72` some se `questionRows` dos helpers devolver `QuestionRow[]`.
- `open()`, `asked()`, `atDev()` e `storedAnswer()` estão copiados entre os arquivos de teste novos.
- `scan_bypasses.py`: pôr `\bBun\.sleep\s*\(` no padrão `sync-hack`, que hoje só casa `time.sleep` e `Thread.sleep`.
- A review não conferiu as execuções no Linux nem as 36 de 38 mutações.
