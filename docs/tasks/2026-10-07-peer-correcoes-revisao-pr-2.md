# Correções da revisão do PR 2 (fatia Peer)

**Por quê:** a revisão do PR 2 com `the-judge` deixou 2 should-fix e 5 nits (F1 a F7). O mais sério: uma linha velha cujo PID passou a ser de outro processo prendia a posição do squad para sempre, e `kill-broker` dizia `Broker is not running.` com código 0 quando não conseguia parar o broker.

**O quê:** os sete achados corrigidos, um commit por tarefa (T15 a T21 de `.specs/features/peer/tasks.md`), mais um commit com as emendas da spec.
- F1: peer vivo é PID existente **e** heartbeat nos últimos 60 s. O prazo conta do maior entre `last_seen` e o instante em que o broker subiu ou voltou de uma pausa, então a sessão viva que atravessa uma queda do broker ou a suspensão da máquina não é derrubada. PEER-14 reescrito; PEER-42 e PEER-43 novos.
- F2: só `/health` decide `Broker is not running.`. Falha ao achar ou sinalizar o processo imprime `Could not stop the broker: <motivo>. It is still running.` e sai com 1. PEER-44 novo.
- F3: teste com um processo de isca em `127.0.0.2` na porta do broker. PEER-45 novo.
- F4: saiu o teste de unidade que não podia falhar; o de integração foi renomeado; PEER-19 passou a dizer `os.homedir()`.
- F5: README lista Windows e Linux e diz que macOS não foi testado.
- F6: SDK do MCP de 1.27.1 para 1.32.1, com a faixa em `^1.32.0`.
- F7: `broker/CLAUDE.md` sem as seções APIs, Testing e Frontend do `bun init`.

**Como:** `/tlc-spec-driven` sobre a feature `peer`. Arquivos: `broker/peers.ts` (`STALE_AFTER_MS`, `cleanStale`), `broker/cli.ts` (`kill-broker`), `broker/test/unit/presence.test.ts`, `broker/test/unit/config.test.ts`, `broker/test/integration/cli.test.ts`, `broker/test/integration/broker.test.ts`, `broker/package.json`, `broker/bun.lock`, `broker/README.md`, `broker/CLAUDE.md`, `.specs/features/peer/spec.md` e `tasks.md`. Commits `b96ef50` a `a247e09`, enviados ao PR 2.

**Verificação:** `bun x tsc --noEmit` saiu 0 e `bun test` passou depois de cada tarefa; no fim, 98 testes e 0 falhas. Cada teste novo foi visto falhar contra o código antigo ou contra uma mutação. A verificação independente (rodada 6, em `ec2aba6`) deu **FAIL**: nenhuma resposta do código contrária à spec, mas 5 de 27 mutações passavam pela suíte (heartbeat do servidor MCP sem requisito nem teste, dois caminhos de falha do `kill-broker`, listagem de nome sem heartbeat, e os 60 s conferidos só pela constante do código). As cinco foram fechadas em `a247e09` (T21, PEER-46 novo, `SQUAD_HEARTBEAT_INTERVAL_MS`) e reaplicadas numa cópia: todas morrem. A rodada 7 foi iniciada e interrompida a pedido do Lucas, sem veredito.

**Pendências:**
- A fatia fechou sem PASS da verificação independente; `validate_state.py peer` sai com 1 e a rastreabilidade da spec ficou em `Implementing`.
- F6: o ping pelo canal foi conferido pelos testes com cliente MCP de teste, não numa sessão real do Claude Code.
- Os testes novos de `kill-broker` só rodaram no Linux: dois são pulados no Windows (`lsof` falso), um esvazia o `PATH` e não foi rodado lá. O de PEER-45 é pulado onde `127.0.0.2` não aceita escuta (macOS sem alias).
- Uma sessão viva cujo heartbeat falha por mais de 60 s com o broker no ar sai e não volta sozinha; está registrado como suposição na spec.
