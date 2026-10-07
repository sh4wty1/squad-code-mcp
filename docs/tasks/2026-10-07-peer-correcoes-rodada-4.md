# Fatia Peer: correções das rodadas 4 e 5 e `kill-broker` no Linux

**Por quê:** a retomada da fatia Peer (`.specs/STATE.md`) pedia as asserções que a quarta verificação independente acusou como faltando. Ao rodar a suíte neste PC (Linux) ela travava: o `kill-broker` matava o próprio `bun test`. O código só tinha rodado no Windows até aqui, então a quinta verificação rodou no Linux.
**O quê:**
- `kill-broker` encerra só o processo que escuta em `127.0.0.1` na porta do broker. Antes, fora do Windows, encerrava também a própria CLI, toda sessão conectada ao broker e quem escutasse a mesma porta em outro endereço. Quando não acha o processo, diz isso em vez de "Broker stopped.".
- Asserções para os mutantes sobreviventes da rodada 4: `cwd` que não é texto (X5) e `hint` da recusa `unknown_peer` de `/list-peers` (X1).
- `ready` sem argumentos responde o erro normal de número errado em vez de erro interno do JSON-RPC.
- Quinta verificação independente, a primeira no Linux: FAIL, relatório em `.specs/features/peer/validation.md`, lições L-013 a L-017.
- Testes para o que a rodada 5 apontou e que só se distingue fora do Windows: broker destacado (PEER-34), `/unregister` pelo fechamento da entrada padrão (PEER-33) e PID de outro usuário vivo (PEER-14).
- Tarefas T12, T13 e T14 em `.specs/features/peer/tasks.md`; prompt modelo de fatia em `ROADMAP.md` pede branch, PR e suíte nos dois sistemas.
**Como:** `lsof -ti tcp@127.0.0.1:<porta> -sTCP:LISTEN` em `broker/cli.ts`; `?.` na leitura dos argumentos em `broker/server.ts`; asserções em `broker/test/unit/register.test.ts`, `broker/test/unit/presence.test.ts`, `broker/test/integration/broker.test.ts` e `broker/test/integration/server.test.ts`. Commits `5582b22`, `b22f83a`, `d04ea3e` e `f5dd547` em `feat/peer`, no remoto.
**Verificação:** de dentro de `broker/`, `bun x tsc --noEmit && bun test`: 86 testes passando, 488 asserções, 10 s, no Linux com Bun 1.3.14. As três asserções da rodada 5 foram conferidas pelo verificador contra os mutantes: passam no código certo e falham no mutante.
**Pendências:**
- Nenhuma verificação independente rodou depois de `f5dd547`; o `validation.md` gravado é o FAIL da rodada 5 e o `validate_state.py` acusa isso.
- A suíte não rodou no Windows depois dos commits de hoje. Esperado lá: 85 passando e 1 pulado.
- Revisão por `/the-judge`, `ROADMAP.md`, descrição do PR #2, traceability de `spec.md`, status de `tasks.md` e handoff do `STATE.md`.
- Decisões de spec em aberto: PEER-19 diz que o home não vem de `HOME`, o que é falso no POSIX; `SIGINT` e `SIGTERM` funcionam no Linux e não têm teste; PEER-35 não diz "só o broker"; `ready` aceita o número como texto ou lista de um item; `POST //register` é roteado como `/register`; métodos que não são `POST` respondem 200.
- `kill-broker` apontado para uma porta onde outro programa responde `/health` encerraria esse programa (inferido por leitura, não executado).
- macOS não foi executado.
