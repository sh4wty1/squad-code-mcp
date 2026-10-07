# Fatia Peer: correções da rodada 4 e `kill-broker` no Linux

**Por quê:** a retomada da fatia Peer (`.specs/STATE.md`) pedia as asserções que a quarta verificação independente acusou como faltando. Ao rodar a suíte neste PC (Linux) ela travava: o `kill-broker` matava o próprio `bun test`. O código só tinha rodado no Windows até aqui.
**O quê:**
- `kill-broker` encerra só o processo que escuta na porta do broker. Antes, fora do Windows, encerrava também a própria CLI e toda sessão com conexão aberta ao broker.
- Asserções para os dois mutantes sobreviventes da rodada 4: `cwd` que não é texto é recusado com `missing_field` (X5) e a recusa `unknown_peer` de `/list-peers` traz `hint` (X1).
- `ready` sem argumentos responde o erro normal de número errado em vez de erro interno do JSON-RPC.
- Tarefas T12 e T13 registradas em `.specs/features/peer/tasks.md`.
**Como:** `lsof -ti tcp:<porta> -sTCP:LISTEN` em `broker/cli.ts`; `?.` na leitura dos argumentos em `broker/server.ts`; asserções em `broker/test/unit/register.test.ts`, `broker/test/integration/broker.test.ts` e `broker/test/integration/server.test.ts`. Commits locais `5582b22` e `b22f83a` em `feat/peer`, sem push.
**Verificação:** de dentro de `broker/`, `bun x tsc --noEmit && bun test`: 85 testes passando, 486 asserções, 10 s, no Linux com Bun 1.3.14. Sem a correção do `lsof` a suíte não termina (o runner recebe SIGTERM). Removendo a guarda de `ready`, o teste de PEER-29 falha.
**Pendências:**
- Decidir entre fechar a fatia ou rodar a quinta verificação independente; nenhuma verificação independente rodou depois destes commits, e o `validation.md` gravado ainda é o FAIL da rodada 4.
- `git push`, `ROADMAP.md`, descrição do PR #2, traceability de `spec.md` e status de `tasks.md`.
- Sem decisão na spec: `ready` aceitar o número como texto ou lista de um item; `POST //register` roteado como `/register`; métodos que não são `POST` respondendo 200.
- O caminho do `kill-broker` no macOS não foi executado (mesmo comando `lsof`, não testado lá).
