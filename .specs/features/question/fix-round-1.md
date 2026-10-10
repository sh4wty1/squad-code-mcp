# Question: rodada de correção 1

O Verifier independente deu FAIL em `613da1c` (`validation.md`, rodada 1): gate verde,
nenhuma asserção enfraquecida, 139 de 149 mutações mortas. As dez que sobreviveram e as
lacunas de precisão da spec viram as tarefas abaixo. A spec foi corrigida antes desta
rodada onde o Verifier apontou lacuna de precisão (QST-05, QST-34, QST-56, QST-62, QST-65,
QST-67, QST-78).

Valem as regras, a matriz de testes e os gates de `tasks.md`. Um commit por tarefa, com a
tarefa marcada aqui.

## Tarefas

### F1: O `result` fecha a pergunta no broker real

**Lacuna**: mutante B08, `broker/broker.ts:57`. Com `createSend(log)` sem o `afterResult`, a suíte inteira passa.
**Where**: `broker/test/integration/question.test.ts`
**Requirement**: QST-36

- [x] Broker real: um worker com uma não-bloqueante aberta do ticket envia o `result` por `/send`; `GET /events` tem, depois do `result`, o `answer` de `broker` com `resolved_by` `result_default` e o default, e a pergunta não aceita mais `/answer` (`question_closed`)
- [x] O teste falha se `broker.ts` cria `createSend` sem `question.delivered`
- [x] Gate full passa

### F2: A mesclada fechada pelo próprio `result`, a duas mesclas de distância

**Lacuna**: mutante M10b, `broker/question.ts:73`. QST-37 só é provada a uma mescla.
**Where**: `broker/test/unit/question-result.test.ts`
**Requirement**: QST-37, QST-48

- [x] Q3 mesclada em Q2, Q2 em Q1; o `result` do `asked_by` de Q3 fecha Q3; depois Q1 é respondida: Q3 continua com o `answer_seq` e o status do próprio default, o `asked_by` dela não recebe a entrega da resposta de Q1, e Q2 acompanha Q1
- [x] O teste de paridade (`question-replay.test.ts`) passa a exigir que as sequências geradas alcancem "mesclada fechada pelo próprio `result` cuja de destino fecha depois"
- [x] Gate quick passa

### F3: Gravação que falha em `/merge-question`

**Lacuna**: mutante X01, `broker/question.ts:351`.
**Where**: `broker/test/unit/question-merge.test.ts`
**Requirement**: QST-12

- [ ] Com a atualização da linha de `questions` forçada a falhar, `/merge-question` não deixa o `question_merged` nem muda linha alguma
- [ ] Gate quick passa

### F4: Bloqueante com default no modal

**Lacuna**: mutante N01, `broker/tui/screens/answer.ts:73`. Nenhum caso distingue "não-bloqueante" de "tem default".
**Where**: `broker/test/unit/tui-answer.test.ts`
**Requirement**: QST-73, QST-80

- [ ] Uma bloqueante com default, no modo texto, não tem a linha `default …`; recusada, a linha da recusa é `✗ recusada pelo broker: Q-NN já fechada`, sem a parte do default
- [ ] Gate quick passa

### F5: O intervalo da conferência de prazos é configuração

**Lacuna**: mutante B04, `broker/broker.ts:71`. Os 1000 ms só são limitados por um teste de 3 s.
**Where**: `broker/shared/config.ts`
**Requirement**: QST-34

- [ ] `expireIntervalMs(env)` lê `SQUAD_EXPIRE_INTERVAL_MS` e dá 1000 sem a variável, ao lado de `cleanupIntervalMs`, com teste do literal em `test/unit/config.test.ts`; `broker.ts` usa a função
- [ ] `broker/CLAUDE.md` não precisa mudar se as outras variáveis de intervalo não estão lá; se estão, a nova entra
- [ ] Gate build passa

### F6: A entrada de terminal entrega a credencial

**Lacuna**: mutante T07, `broker/tui.ts:233`. O bloco `import.meta.main` precisa de terminal, e nenhum teste chega a ele.
**Where**: `broker/tui.ts`
**Requirement**: QST-83

- [ ] O que monta o `Io` do processo real sai do bloco `import.meta.main` para uma função exportada, e um teste afirma que o `token` dela lê o arquivo de `SQUAD_TOKEN_FILE` no momento da chamada (arquivo criado depois da montagem é lido; arquivo vazio ou ausente dá nulo)
- [ ] Nenhuma outra mudança de comportamento no bloco de entrada
- [ ] Gate full passa

### F7: `unknown_peer` antes de qualquer outra recusa

**Lacuna**: mutante B06, `broker/test/integration/question.test.ts:169`.
**Where**: `broker/test/integration/question.test.ts`
**Requirement**: QST-10, QST-16, QST-22, QST-29

- [ ] `/ask`, `/escalate`, `/merge-question` e `/answer` sem `human_token`, com `id` desconhecido e um corpo que também falha `missing_field`, respondem `unknown_peer`
- [ ] Gate full passa

### F8: Quebra de linha colada, tecla a tecla

**Lacuna**: G7. `keysOf` lê o modo no começo do bloco: `4\rtexto\r` no modo escolha envia.
**Where**: `broker/tui/keys.ts`
**Requirement**: QST-78

- [ ] Num bloco de mais de uma tecla, um `\r` ou `\n` vira espaço quando, na vez dele, o modal está no modo texto, inclusive quando o modal entrou no modo texto por uma tecla anterior do mesmo bloco (por `outra resposta…` ou por um `enter` no feed que abre o modal no modo texto)
- [ ] Um bloco de uma tecla só continua enviando com `\r`; os testes de QST-78 que já existem passam sem mudar valor esperado
- [ ] O laço de `tui.ts` usa a regra nova
- [ ] Gate quick passa

### F9: Default vazio é campo ausente

**Lacuna**: G6. Uma bloqueante com `default: ""` é aceita e fecha como `defaulted` no encerramento.
**Where**: `broker/question.ts`
**Requirement**: QST-05

- [ ] `/ask` com `default: ""` responde `missing_field`, com `blocking` verdadeiro ou falso
- [ ] Gate quick passa

### F10: O que a spec passou a dizer e ainda não tem teste

**Lacuna**: G3, G4 e G5, mutantes Q01, K08 e K21.
**Where**: `broker/test/unit/tui-keys.test.ts`
**Requirement**: QST-56, QST-65, QST-67, QST-82

- [ ] QST-56: com o foco no histórico, a pergunta selecionada da lista não tem `▶` (teste em `tui-questions.test.ts`)
- [ ] QST-67: `enter` com o foco no histórico abre o modal da selecionada e leva o foco à lista; QST-65: `b` dentro da aba leva o foco à lista
- [ ] QST-82: com um envio em curso e a pergunta fora das perguntas da feature aberta, `sync` não fecha o modal; ele fecha quando o resultado do envio chega
- [ ] Gate build passa
