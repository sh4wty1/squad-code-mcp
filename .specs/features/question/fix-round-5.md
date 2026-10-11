# Question: rodada de correção 5

O Verifier independente deu FAIL em `5fa9b80` (`validation.md`, rodada 5), na segunda
verificação desde a rodada de correção 3: gate verde com 1292 testes, os sete mutantes da
rodada 4 mortos, 32 de 41 mutações mortas, 18 de 22 cláusulas fechadas por inteiro. O código
fez o que a spec diz nas 14 sondas, e nada do que sobrou faz a TUI enviar uma resposta que o
dev não enviou. As cinco lacunas são de teste; SP2 e SP3 são frases que faltam na spec.

Esta é a terceira e última volta de correção e verificação antes de a decisão subir ao dev.

Valem as regras, a matriz de testes e os gates de `tasks.md`. Um commit por tarefa, com a
tarefa marcada aqui.

## Tarefas

### F26: O terminal pequeno, em cada tamanho e em cada estado

**Lacuna**: lacunas 1 a 4 e SP3; mutantes X5, X6, X7, X3, N8 e N11, `broker/tui.ts:170`–`:171`. A saída só é testada em 100×30 e com `ctrl+c` sozinho; os marcadores só com o modal no modo texto e sozinhos na leitura.
**Where**: `broker/test/unit/tui-loop.test.ts`, `broker/test/unit/tui-keys.test.ts`, `.specs/features/question/spec.md`
**Requirement**: QST-99

- [x] `q`, `ctrl+c` e cada um deles entre outras teclas saem em 119×40, 120×39 e 100×30, sem modal, com o modal no modo texto e com o modal no modo escolha
- [x] Os marcadores são lidos nos três tamanhos, sem modal, no modo texto e no modo escolha, sozinhos na leitura e junto de outras teclas: a colagem que termina ali terminou, e a que começa ali não envia pela quebra sozinha
- [x] `marks` sobre um estado sem modal
- [x] QST-99 diz que `esc` no terminal pequeno é uma tecla como as outras e não encerra a colagem (SP3); o teste que já fixa isso é `marks(pasting, "\x1b")`
- [x] Gate quick passa

### F27: `\n` e `esc` em cada caso de QST-78

**Lacuna**: lacuna 5 e mutante L4, `broker/tui/keys.ts:207`. `\n` sem modal com teclas retidas pelo laço não tem asserção; `esc` só encerra a colagem em teste sozinho na leitura e no modo texto.
**Where**: `broker/test/unit/tui-keys.test.ts`
**Requirement**: QST-78

- [x] `input(ui, "\n", view, true)` sem modal devolve o mesmo estado, na aba e no feed
- [x] `esc` encerra a colagem também junto de outra tecla na leitura e com o modal no modo escolha
- [x] Gate quick passa

### F28: A pergunta do mesmo worker que o `result` não fecha

**Lacuna**: SP2 e mutantes Q6 e Q6a, `broker/question.ts:71` e `:74`. QST-36 fala da mesclada de outro `asked_by`; a do mesmo worker sobre outro ticket, mesclada numa que o `result` fecha, não está em frase nem em teste.
**Where**: `.specs/features/question/spec.md`, `broker/test/unit/question-result.test.ts`
**Requirement**: QST-36

- [ ] QST-36 diz que toda pergunta que o `result` não fecha por si, mesclada numa que ele fecha, segue o `answer` daquela, como QST-31
- [ ] Teste: Q-02 de worker-1 sobre T-2 mesclada em Q-01 sobre T-1, direto e por meio da pergunta de outro worker; o `result` de T-1 grava um `answer` só, e Q-02 fecha com ele
- [ ] O teste falha com a busca filtrando por `asked_by` no lugar dos ids que o `result` fecha
- [ ] Gate build passa
