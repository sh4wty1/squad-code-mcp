# Papéis: handoff para o Codex

Escrito em 2026-10-12 pela sessão do Claude Code que executou a fatia, e atualizado no mesmo
dia depois da primeira volta de verificação. Use este documento se aquela sessão não fechou
a fatia. Ele se basta: você não precisa da skill
`tlc-spec-driven` nem do histórico do chat.

## O que é

`squad-code-mcp` roda sessões do Claude Code como um squad (mother, leader, workers, judge)
sobre um broker MCP. A fatia **Papéis** liga uma sessão real ao contrato: o plugin
(`plugin/`: servidor MCP, dois hooks, quatro skills de protocolo, `roles.json`), o launcher
(`broker/launch.ts`, comando `squad start <papel>`) e o arquivo de credencial que o servidor
deixa para os hooks.

- Spec, a fonte da verdade: `.specs/features/papeis/spec.md`, 75 requisitos (PAP-01 a PAP-75).
- Desenho: `.specs/features/papeis/design.md`. Decisões: `.specs/STATE.md`, AD-015 a AD-020.
- Tarefas: `.specs/features/papeis/tasks.md`. As 26 estão feitas e commitadas.
- Estado do projeto: a seção "Handoff" de `.specs/STATE.md`.

## Onde está

- Branch `feat/papeis`, saído da `main` em `f162184`. **Só local, nada no remoto.**
- O código de produção é o de `6609630`. Depois dele só entraram testes e documentos; o
  último commit de teste é `8f4e442`.
- Windows, `8f4e442`: `tsc` 0 e 1626 pass, 5 skip, 0 fail. Linux (contêiner
  `oven/bun:1.4.2` sobre clone limpo), `8f4e442`: `tsc` 0 e 3 de 3 execuções com 1630 pass,
  1 skip, 0 fail. A asserção do modo `0600` de PAP-06, pulada no Windows, passa no Linux.
- Sessões reais: `.specs/features/papeis/real-sessions.md`.
- O repositório tem um segundo worktree, `squad-code-mcp.worktrees/tui-clicavel`, de outro
  trabalho do dev. Não toque nele.

## A verificação até aqui

- **Volta 1**, sobre `f162184..0848c8f`: FAIL, sem defeito de produção. Cinco mutantes
  vivos em três testes fracos (PAP-37, PAP-08 e PAP-31). Relatório:
  `.specs/features/papeis/validation-round-1.md`.
- **Correções**: T24 (`efb6d74`), T25 (`fa75877`) e T26 (`8f4e442`), só de teste.
- **Volta 2**, sobre `f162184..8f4e442`: rodava como sub-agente daquela sessão quando isto
  foi escrito. Ela sobrescreve `.specs/features/papeis/validation.md`. É a segunda de três;
  depois da terceira, o resíduo e a decisão voltam para o dev.

## O que falta

A fatia só fecha com um relatório de verificação independente com PASS. Comece por
reconciliar: `git status --porcelain`, `git log --oneline -5`, e abra
`.specs/features/papeis/validation.md`. Se ele é igual a `validation-round-1.md`, a volta 2
não terminou: siga o caminho A. Se é o relatório da volta 2 (tem a seção "Voltas" e a faixa
`f162184..8f4e442`), siga o B com FAIL ou o C com PASS.

### A. Não há relatório da volta 2: você é o Verifier

Você não escreveu código, teste nem relatório desta fatia, então pode verificar. Nesta
sessão você **não corrige nada**: só verifica e escreve o relatório.

1. Trabalhe numa cópia física, nunca neste checkout:
   `git clone --no-hardlinks <este repositório> <dir temporário>`, depois
   `bun install --frozen-lockfile` em `<dir temporário>/broker`. Sem junction nem link para o
   `node_modules` daqui.
2. Leia a spec e, para cada um dos 75 requisitos, ache o `arquivo:linha` do teste e a
   asserção que prova o resultado que a spec define. Sem `arquivo:linha`, o requisito não
   está coberto. Onde a spec não define um valor preciso, marque "lacuna de precisão da
   spec"; não aprove uma asserção vaga.
3. As quatro skills (`plugin/skills/<papel>/SKILL.md`) são prosa: o teste
   `broker/test/unit/skills.test.ts` só confere estrutura, tools citadas e comandos
   literais. Leia cada uma contra PAP-62 a PAP-72, PAP-74 e PAP-75, cláusula a cláusula, e
   cite a linha da frase que manda ou proíbe. Confira também que nenhuma skill manda usar
   uma tool que o papel não tem (`toolsFor` em `broker/tools.ts`) nem um campo que a tool
   não aceita.
4. Rode na cópia, de dentro de `broker/`: `bun node_modules/typescript/bin/tsc --noEmit` e
   `bun test` (cerca de 4 minutos). Nunca `bun x tsc`.
5. Sensor: 8 mutações de comportamento ou mais, uma por vez, só na cópia, sobre
   `plugin/hooks/usage.ts`, `nudge.ts`, `stop.ts`, `session.ts`, `broker/server.ts` (arquivo
   de credencial), `broker/roles.ts` e `broker/launch.ts`. Rode os testes que deveriam
   falhar, restaure com `git checkout -- <arquivo>` e confira que a cópia está limpa.
   Nunca `git stash`. Mutante que sobrevive é lacuna.
6. Confira `real-sessions.md` contra `real-sessions-log.txt`: cada um de RS-01 a RS-14 diz o
   que foi exercitado, com evidência, ou que não foi e por quê.
7. Escreva `.specs/features/papeis/validation.md` neste repositório, em português, no
   formato de `validation-round-1.md`, por cima do arquivo que está lá: faixa `f162184..HEAD`,
   uma seção "Voltas" com o que a volta 1 achou e o que você fez, uma linha
   por requisito com resultado esperado, `arquivo:linha`, asserção e PASS ou GAP; o gate com
   os números; a tabela do sensor; o julgamento de cada linha de "Leituras da spec" de
   `tasks.md`; e o veredito. PASS só com todo requisito evidenciado, nenhum mutante vivo e
   gate verde.
8. Rode `python .claude/skills/tlc-spec-driven/scripts/validate_state.py papeis --root .` e
   diga o código de saída. Com FAIL ele sai diferente de zero: não ajuste o relatório para
   passar.

### B. O relatório da volta 2 diz FAIL: você corrige

1. Cada lacuna vira uma correção: escreva primeiro o teste que a spec pede, veja-o falhar,
   corrija o mínimo, rode o gate, e faça **um commit por correção**.
2. Não enfraqueça, pule nem apague teste para passar. Se um teste está errado em relação à
   spec, pare e pergunte ao dev.
3. Quem corrigiu não verifica: a nova verificação é de outra sessão ou de outro agente, pelo
   caminho A. O limite são três voltas de verificação e duas já foram: depois da terceira,
   o resíduo e a decisão voltam para o dev.

### C. O relatório da volta 2 diz PASS: fechamento

1. Em `spec.md`: status `Verified` nos 75 requisitos e a linha "Coverage"; as caixas de
   "Goals" e de "Success Criteria", com os números de Windows e Linux acima.
2. Em `tasks.md`: `**Status**: Done`.
3. Em `ROADMAP.md`: marcar a fatia Papéis e as duas pendências já resolvidas (formato do
   `roles.json` conferido contra o manifest; modo de permissão decidido), e reescrever o
   parágrafo "Agora".
4. Em `.specs/STATE.md`: trocar **só** o corpo da seção `## Handoff`, apontando para a
   fatia Gate. A seção `## Decisions` não se toca.
5. Commit com `validation.md` e, se mudaram, `.specs/lessons.json` e `.specs/LESSONS.md`.
6. `git push` e o PR sem merge: só com o sim do dev na hora.

## Regras do repositório

- Comandos de teste rodam de dentro de `broker/`. Gate rápido: `bun test test/unit`
  (cerca de 100 s). Gate completo: `bun node_modules/typescript/bin/tsc --noEmit && bun test`.
- `EVT-43` em `test/integration/routes.test.ts` falha de vez em quando por poucos ms, e
  `PEER-28` e `PEER-29` em `test/integration/server.test.ts` estouraram os 5 s uma vez com a
  máquina ocupada: rode de novo uma vez.
- Os testes do plugin ficam em `broker/test/` e importam `../../../plugin/...`.
- O nome de cada teste começa pelo requisito: `PAP-14: ...`. Limite da spec é afirmado com
  o literal (2000, 10, 20, `0600`), não com a constante importada do código.
- Commit: uma frase imperativa em inglês, minúsculas, sem prefixo de Conventional Commits,
  sem ponto final (veja `git log`). A linha de coautoria dos commits anteriores é do Claude;
  use a sua, ou nenhuma.
- Código, comentários, nomes de teste e as skills em inglês; specs e relatórios em português.
- Windows: o caminho do repositório tem espaço, `HOME` não existe, e o git escreve caminhos
  com `/`. Passe caminhos como argumentos separados.

## O que nunca fazer

- `git push`, force-push, merge na `main`, `reset`, `stash` ou troca de branch neste
  checkout sem o dev pedir.
- Subir `broker.ts` ou `server.ts` à mão sem `SQUAD_DB` e `SQUAD_TOKEN_FILE` temporários: o
  default escreve no home do dev.
- Rodar o `claude` de verdade fora de um repositório descartável. Uma sessão de teste sobe
  com `SQUAD_PORT`, `SQUAD_DB`, `SQUAD_TOKEN_FILE` e `SQUAD_WORKTREES` temporários e sem as
  variáveis `CLAUDE*`. Como repetir: o fim de `real-sessions.md`.
- Mudar o texto de um requisito da spec. Se dois requisitos se contradizem, pare e pergunte.
- Mexer no que é da fatia Gate: pedido e decisão de gate, modais de gate e de permissão da
  TUI, teclas `g` e `x`.

## O que a execução mudou na spec

- **PAP-32**: o caso do `permission_request` aberto saiu da lista dos não bloqueados, por
  decisão do dev em 2026-10-12. Contradizia PAP-28 e o contrato.
- **PAP-08 e PAP-31**: texto completado a pedido da volta 1 e confirmado pelo dev em
  2026-10-12. PAP-08 diz o que se observa (sucesso e `peer_joined` no registro; `peer_left`
  e código 0 no encerramento); PAP-31 diz que status diferente de 200 é leitura que falhou.
- **PAP-74 e PAP-75**: novos, de dois defeitos vistos em sessões reais. A mother tomou o
  diretório do plugin pelo projeto; worker e judge pararam depois de `ready` sem chamar
  `state`. Corrigidos em `6609630` e confirmados pelo dev em 2026-10-12.

## Pontos em aberto para o dev (não são lacunas da spec)

- Em `haiku`, a mother perguntou ao dev com `ask` em vez de `escalate`, e não chamou
  `unblocked` depois da credencial.
- Todo comando do projeto e todo comando composto pede permissão.
- O launcher não repassa Ctrl+C; lê o log também para a mother; `claude.cmd` não testado.
- Um `.env` de projeto com `SQUAD_*` chegaria aos hooks pelo Bun.
- A linha de status do `README.md`, o `broker/README.md` e o comentário no topo de
  `broker/server.ts` ainda descrevem a forma `server:squad`.
