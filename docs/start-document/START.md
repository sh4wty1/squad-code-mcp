# Projeto: squad de agentes Claude Code com observabilidade

## Antes de codar
Rode /tlc-discover (ou /grill-with-docs) comigo sobre este documento. Feche as questões
abertas do final, registre as decisões como ADRs (/create-adr) e só então rode /tlc-plan
para quebrar em tarefas. Não escreva código antes da spec aprovada.

## Visão
Um MCP que coloca várias sessões do Claude Code para trabalhar como um squad, cada uma
com um papel, trocando mensagens por um broker. Uma TUI separada mostra em tempo real
quem fala com quem e permite ao dev responder as perguntas em aberto dos agentes.
Base: fork estendido do claude-peers-mcp (<url do repo>).

## Papéis (topologia em estrela, workers nunca falam entre si)
- **Mother:** dona do objetivo e interface com o dev. Filtra e deduplica as perguntas
  e aprova a entrega final.
- **Leader:** quebra a spec em tickets, escolhe o loadout de skills de cada worker por
  ticket e responde as dúvidas técnicas que conseguir antes de escalar.
- **Worker 1..N:** genéricos, um ticket por vez, usando o loadout recebido.
- **Judge:** avalia a entrega contra a spec e devolve approve ou rework para o Leader.

Fluxo de trabalho: Mother → Leader → Workers → Judge → (rework) Leader → Mother → dev.
Máximo de 2 reworks por ticket; depois disso escala para a Mother.

Fluxo de perguntas: Worker → Leader → Mother → dev. Cada nível tenta responder antes
de escalar.

## Arquitetura (decidida)
- **Broker (MCP):** fork do claude-peers. Mantém a stack do original.
  Adiciona papel por peer, threads, perguntas e um log de eventos append-only.
  É o único escritor do estado.
- **Skills de papel:** instruções e protocolo de cada papel. Não ficam no broker.
- **TUI:** processo separado. Lê o log de eventos e escreve apenas respostas a
  perguntas e decisões do gate humano, sempre via broker, nunca direto no storage.
  Não depende de nenhuma sessão Claude estar viva.
- **Isolamento:** um git worktree por worker para evitar conflito de arquivos.

## Contrato de eventos (ponto de partida, refinar na spec)
```ts
type Role = "mother" | "leader" | "worker" | "judge";

type EventKind =
  | "task" | "result" | "review" | "verdict"  // fluxo de trabalho
  | "question" | "answer"                     // perguntas em aberto
  | "gate";                                   // aprovação humana

// Evento base trocado entre peers e gravado no log
type PeerEvent = {
  id: string;                  // uuid
  ts: number;                  // epoch ms
  from: string;                // nome do peer, ou "human" quando vem da TUI
  to: string | "*" | "human";  // destinatário, broadcast ou dev
  role_from: Role | "human";
  kind: EventKind;
  body: string;
  thread?: string;             // agrupa a troca de um ticket
  ticket_ref?: string;
  workflow?: "tlc" | "matt-pocock";  // travado por thread
  loadout?: string[];          // skills extras escolhidas pelo leader
};

// Pergunta para o dev (emitida pela mother após filtrar/deduplicar)
type QuestionEvent = PeerEvent & {
  kind: "question";
  to: "human";
  question_id: string;
  asked_by: string;            // agente que originou a dúvida
  blocking: boolean;           // true = só o agente de origem pausa
  options?: string[];          // múltipla escolha; ausente = texto livre
  default?: string;            // obrigatório se non-blocking
  timeout_s?: number;          // só para non-blocking
  dedup_of?: string[];         // question_ids agrupados pela mother
};

// Resposta registrada pelo broker (vinda da TUI ou do timeout)
type AnswerEvent = PeerEvent & {
  kind: "answer";
  question_id: string;
  answer: string;
  resolved_by: "human" | "timeout_default";  // auditável depois
};
```

## Skills consumidas
Registry: https://github.com/sh4wty1/fassi-skills (manifest.json). O projeto NÃO copia
skills; ele referencia por nome, e o setup instala só o subconjunto útil aqui:
- **Mother:** tlc-discover, grill-with-docs, to-spec, the-fool, create-adr
- **Leader:** tlc-plan, to-tickets, help-me, the-jury
- **Worker (base):** tlc-implement, implement, coding-guidelines, ponytail, write-commit, codenavi
- **Worker (loadout):** qualquer skill do registry, escolhida via help-me por ticket
- **Judge:** spec-driven-eval, ponytail-review, security-best-practices, break-ui,
  web-quality-audit, review-animations

Regra do registry a respeitar: uma feature fica num único workflow (tlc ou matt-pocock)
da spec até a verificação. O Leader trava isso no início do thread.

## Fases
1. **Broker:** fork + papéis + threads + log de eventos. Validar com 2 sessões trocando
   mensagens.
2. **TUI (leitura):** feed, lista de agentes, topologia, detalhe de thread.
   O design vem do Claude Design (vou anexar).
3. **Perguntas em aberto:** kinds question/answer, roteamento via Mother, bloqueante vs
   timeout com default, caminho de escrita TUI → broker.
4. **Skills de papel + roles.json:** mapeamento papel → skills, no mesmo padrão do
   manifest.
5. **Gate humano:** a Mother pausa antes de ações irreversíveis e da entrega final;
   a TUI aprova, rejeita ou comenta.
6. **(Depois do MVP) Segundo cérebro:** skill de busca em grafo sobre vault markdown,
   com índice JSON incremental, seeds BM25 e expansão por links com penalidade de hubs.
   Embeddings ficam fora do MVP.

## Fora do escopo do MVP
- Malha entre workers
- Embeddings / busca semântica
- Execução remota ou multi-máquina
- UI web

## Questões abertas (fechar na entrevista)
- **Launcher:** as sessões sobem manualmente, por um script ou pelo próprio MCP?
- **Distribuição:** plugin do Claude Code que empacota MCP + skills de papel, ou MCP e
  skills separados?
- **Log:** JSONL em arquivo, tabela SQLite do broker ou os dois?
- **TUI:** Ink (mesmo ecossistema do fork) ou Textual?
- **Escrita da TUI:** chamada a uma tool/endpoint do broker ou socket próprio?
- **Perguntas:**
  - Confirmar o roteamento via Mother, ou permitir pergunta direta em casos bloqueantes?
  - Timeout padrão?
  - Pergunta bloqueante sem resposta por muito tempo: o que acontece?
- **Memória:** respostas do dev viram contexto persistente (ADR, segundo cérebro) ou
  morrem com o thread?
- **Custo:** teto de tokens por thread? Quem mata a sessão quando estoura?
- **Persistência:** o squad retoma um thread interrompido?
- **Nome do projeto**