// The logs that reproduce the scenarios of the prototype, one per frame: the events of its
// arrays (`MAIN`, `FINAL`, `ERR_X`...) with their times, summaries and ids as `seq`, and
// the events the prototype does not have and the derivation needs: who joined, the turns,
// the tokens. Those take a fraction between two ids, so that `seq` and time stay in the
// same order. Where the ids of the prototype go back in time the event takes another seq:
// the six first entries (1 to 6) and the result of worker-2 in the scenario `perm` (460).

import type { Criterion, Envelope, PlannedTicket, SquadEvent } from "../../shared/contract.ts";
import { SQUAD } from "../../shared/derive.ts";
import type { PriceTable } from "../../tui/config.ts";
import type { Modal, Ui } from "../../tui/view.ts";

export interface FrameLog {
  events: SquadEvent[];
  // the clock of the frame
  now: number;
  // the seq of the selected line of the feed
  selected: number | null;
  // the ticket of the thread screen, when it is not the one of the selected line
  ticket?: string;
  // what the state of the screen of the frame has that the one every frame starts with does not
  ui?: Partial<Ui>;
}

// The dollars of the prototype are its thousands of tokens times 0.015
export const PRICES: PriceTable = { frame: { input: 15, output: 15, cache_write: 15, cache_read: 15 } };

// The same hour on the screen in any time zone
function at(t: string): number {
  const [h, m, s] = t.split(":").map(Number);
  return new Date(2026, 9, 7, h, m, s).getTime();
}

function env(seq: number, t: string, from: string, to: string | null = null, tk: string | null = null, summary = "", body = ""): Envelope {
  const role_from = SQUAD.find((a) => a.name === from)?.role ?? from;
  return { seq, ts: at(t), feature_id: null, from, role_from, to, summary, body, ticket_ref: tk };
}

const [MOT, LDR, W1, W2, W3, JDG, HUM] = ["mother", "leader", "worker-1", "worker-2", "worker-3", "judge", "human"] as const;

const task = (seq: number, t: string, from: string, to: string, tk: string | null, s: string, b: string): SquadEvent => ({
  ...env(seq, t, from, to, tk, s, b),
  kind: "task",
});

const result = (seq: number, t: string, from: string, to: string, tk: string | null, s: string, b: string, task_seq?: number): SquadEvent => ({
  ...env(seq, t, from, to, tk, s, b),
  kind: "result",
  task_seq,
});

// A mark is whether the criterion passed, its text, its number in the spec (its position
// when absent) and the note of the judge
type Mark = [pass: number, text: string, n?: number, note?: string];
function verdict(seq: number, t: string, tk: string, outcome: "approve" | "rework", s: string, b: string, result_seq: number, marks: Mark[]): SquadEvent {
  const criteria: Criterion[] = marks.map(([pass, text, n, note], i) => ({ n: n ?? i + 1, text, pass: pass === 1, ...(note ? { note } : {}) }));
  return { ...env(seq, t, JDG, LDR, tk, s, b), kind: "verdict", result_seq, outcome, criteria };
}

function ask(
  seq: number, t: string, from: string, to: string, tk: string | null, s: string, b: string,
  question_id: number, asked_by: string, blocking: boolean, more: { why?: string; options?: string[]; default?: string; timeout_s?: number } = {}
): SquadEvent {
  return { ...env(seq, t, from, to, tk, s, b), kind: "question", question_id, asked_by, blocking, why: "", ...more };
}

function answer(
  seq: number, t: string, from: string, to: string, tk: string | null, s: string, b: string,
  question_id: number, text: string, resolved_by: "human" | "agent" | "timeout_default" | "result_default"
): SquadEvent {
  return { ...env(seq, t, from, to, tk, s, b), kind: "answer", question_id, answer: text, resolved_by };
}

const gate = (seq: number, t: string, s: string, b: string, gate_id: number, scope: "delivery" | "action", action: string, effect: string): SquadEvent => ({
  ...env(seq, t, MOT, HUM, null, s, b),
  kind: "gate",
  gate_id,
  scope,
  action,
  effect,
});

const decided = (seq: number, t: string, s: string, b: string, gate_id: number, decision: "approve" | "reject" | "comment"): SquadEvent => ({
  ...env(seq, t, HUM, MOT, null, s, b),
  kind: "gate_decision",
  gate_id,
  decision,
});

// As the broker writes it: the summary is the tool and the description, the body the input
function permission(seq: number, t: string, from: string, tk: string | null, description: string, input_preview: string): SquadEvent {
  return {
    ...env(seq, t, from, HUM, tk, `Bash: ${description}`, input_preview),
    kind: "permission_request",
    request_id: `r${seq}`,
    tool_name: "Bash",
    description,
    input_preview,
  };
}

const opened = (seq: number, t: string, title: string, slug: string, spec_commit: string): SquadEvent => ({
  ...env(seq, t, MOT, "*"),
  kind: "feature_opened",
  title,
  workflow: "tlc",
  branch: `feat/${slug}`,
  base_branch: "main",
  spec_ref: `.specs/features/${slug}/spec.md`,
  spec_commit,
});

const closed = (seq: number, t: string, outcome: "delivered" | "abandoned", b: string): SquadEvent => ({
  ...env(seq, t, MOT, "*", null, "", b),
  kind: "feature_closed",
  outcome,
});

const plan = (seq: number, t: string, tickets: PlannedTicket[]): SquadEvent => ({ ...env(seq, t, LDR), kind: "plan", tickets });

const joined = (seq: number, t: string, peer: string): SquadEvent => ({
  ...env(seq, t, "broker"),
  kind: "peer_joined",
  peer,
  role: SQUAD.find((a) => a.name === peer)!.role,
});

const left = (seq: number, t: string, peer: string): SquadEvent => ({ ...env(seq, t, "broker"), kind: "peer_left", peer, reason: "died" });

const blocked = (seq: number, t: string, from: string, tk: string, reason: string, detail: string, last_action: string): SquadEvent => ({
  ...env(seq, t, from, null, tk),
  kind: "blocked",
  reason,
  detail,
  last_action,
});

const refused = (seq: number, t: string, peer: string, error: string): SquadEvent => ({
  ...env(seq, t, "broker"),
  kind: "refused",
  peer,
  attempted_kind: "task",
  error,
});

const turn = (seq: number, t: string, from: string): SquadEvent => ({ ...env(seq, t, from), kind: "turn_started" });

// The accumulated tokens of the session of the agent
const usage = (seq: number, t: string, from: string, tokens: number, session = "s1"): SquadEvent => ({
  ...env(seq, t, from),
  kind: "usage",
  session_id: `${from}-${session}`,
  model: "frame",
  input: tokens,
  output: 0,
  cache_write: 0,
  cache_read: 0,
});

const FEAT1 = "player ao vivo com setlist";
// The task of TKT-12 has the criteria 1 to 4 and 6 of the spec, and the one of TKT-13 the
// criterion 5. The notes are the ones the judge wrote of the third and of the sixth.
const CR5 = (a: number, b: number, c: number, d: number, e: number, note3?: string, note6?: string): Mark[] => [
  [a, "play/pause e volume", 1],
  [b, "metadados da faixa", 2],
  [c, "reconexão após queda", 3, note3],
  [d, "acessível por teclado", 4],
  [e, "funciona no iOS", 6, note6],
];
const SETLIST: Mark[] = [[1, "setlist atualiza em ≤30s", 5]];

// The first entries of the six, and what the mother spent talking to the dev before the feature
const JOINS1 = [
  joined(1, "14:02:10", MOT),
  joined(2, "14:02:18", LDR),
  joined(3, "14:03:01", W1),
  joined(4, "14:03:02", W2),
  joined(5, "14:03:04", W3),
  joined(6, "14:03:30", JDG),
  usage(6.1, "14:10:00", MOT, 9300),
];

const OPEN1 = opened(401, "14:17:48", FEAT1, "player-ao-vivo", "a3f9c21");
const PLAN1: PlannedTicket[] = [
  { ticket_ref: "TKT-12", title: "player de áudio" },
  { ticket_ref: "TKT-13", title: "API da setlist", depends_on: ["TKT-12"] },
  { ticket_ref: "TKT-14", title: "data na setlist" },
];
const W2RES = (seq: number) =>
  result(seq, "14:30:55", W2, JDG, "TKT-13", "/api/setlist + cache 30s", "/api/setlist pronto: normaliza artista, faixa e horário; cache em memória de 30s. +144 −3, 9 testes.", 407);

// The text of a question is the body of its first `question`, as `QS` and `H05` to `H12` of
// the prototype have it; an escalation copies the reason and the options (QST-13)
const Q07 = { why: 'A spec exige "reconexão após queda" mas não define limite; o judge reprovou a v1 nesse critério.', options: ["infinito com backoff", "5 tentativas", "configurável"] };
const Q08 = { why: "~12% das faixas do upstream chegam sem capa." };
const Q09 = { why: "/v1/setlist responde 401; a chave não está no .env do worktree do worker-2.", options: ["pronto", "não vou fornecer"] };

const MAIN = [
  OPEN1,
  task(402, "14:18:02", MOT, LDR, null, "spec: player ao vivo com setlist", "Objetivo aprovado pelo dev: player de áudio ao vivo fixo no topo do portal, com a música atual e as últimas 10 da setlist. Spec em specs/player-ao-vivo.md (6 critérios). Quebre em tickets."),
  ask(403, "14:18:40", LDR, MOT, null, "setlist vem da API ou do CMS?", "A setlist vem da API da rádio ou é cadastrada no CMS? Isso muda o escopo do ticket de dados.", 4, LDR, false),
  answer(404, "14:19:05", MOT, LDR, null, "API /v1/setlist, polling 30s", "API da rádio: GET /v1/setlist, sem webhook. Polling a cada 30s é aceitável.", 4, "API /v1/setlist, polling 30s", "agent"),
  plan(405, "14:19:50", PLAN1),
  task(406, "14:20:11", LDR, W1, "TKT-12", "player de áudio HLS", "Implementar o player do stream HLS: play/pause, volume e metadados da faixa atual. Acessível por teclado. Critérios 1–4 e 6 da spec."),
  task(407, "14:20:12", LDR, W2, "TKT-13", "API da setlist + cache", "Criar /api/setlist consumindo /v1/setlist da rádio: normalizar campos e cachear por 30s. Critério 5 da spec."),
  task(408, "14:20:13", LDR, W3, "TKT-14", "formato de data da setlist", "Formatar o horário de cada faixa da setlist no fuso de Brasília."),
  ask(409, "14:21:00", W3, LDR, "TKT-14", "Q-05 formato de data?", "Formato de data na setlist?", 5, W3, false, { default: "HH:mm" }),
  ask(410, "14:21:30", MOT, HUM, "TKT-14", "? Q-05 timeout 4min", "Q-05 encaminhada ao dev. Não-bloqueante, default HH:mm; o prazo de 4min começa agora, na chegada ao dev.", 5, W3, false, { default: "HH:mm", timeout_s: 240 }),
  ask(411, "14:23:40", W2, LDR, "TKT-13", "Q-06 público ou autenticado?", "Endpoint /api/setlist público ou autenticado?", 6, W2, true),
  ask(412, "14:23:52", MOT, HUM, "TKT-13", "? Q-06 [BLOQUEANTE]", "Q-06 encaminhada ao dev (bloqueante). Só o worker-2 está pausado.", 6, W2, true),
  answer(413, "14:24:10", HUM, W2, "TKT-13", "Q-06: público, só leitura", "Resposta do dev pela TUI, entregue a quem perguntou: público, só leitura.", 6, "público, só leitura", "human"),
  answer(414, "14:25:30", "broker", W3, "TKT-14", "", "Q-05 expirou 4min depois de chegar ao dev. worker-3 seguiu com o default HH:mm.", 5, "HH:mm", "timeout_default"),
  result(415, "14:26:47", W1, JDG, "TKT-12", "player + controles, 4 arquivos", "PlayerBar.tsx, useHlsStream.ts, NowPlaying.tsx e testes. +312 −18. Testado no Chrome e no Firefox.", 406),
  result(416, "14:27:30", W3, JDG, "TKT-14", "horários em HH:mm (BRT)", "formatTime() com Intl, fuso America/Sao_Paulo. +38 −2.", 408),
  verdict(417, "14:28:03", "TKT-12", "rework", "rework: reconexão após queda", 'TKT-12 não atende o critério "reconexão após queda do stream". Ao derrubar o HLS o player fica em erro e não tenta reconectar.\nEsperado: retry com backoff e retomada sem ação do usuário.', 415, CR5(1, 1, 0, 1, 1, "player fica em erro ao derrubar o HLS; nenhuma tentativa de reconexão.")),
  task(418, "14:28:30", LDR, W1, "TKT-12", "rework 1/2: retry c/ backoff", "Rework 1/2. Adicionar retry com backoff exponencial no useHlsStream e retomar a reprodução sem ação do usuário. Não mexer no layout."),
  verdict(419, "14:28:52", "TKT-14", "approve", "approve 1/1", "Horários corretos no fuso de Brasília.", 416, [[1, "horário legível na setlist"]]),
  ask(420, "14:29:10", W1, LDR, "TKT-12", "Q-07 retry infinito ou 5?", "Reconexão do stream: retry infinito ou desistir após 5 tentativas?", 7, W1, true, Q07),
  ask(421, "14:29:25", LDR, MOT, "TKT-12", "Q-07 encaminhada", "Encaminhando Q-07 do worker-1: a spec não define limite de reconexão.", 7, W1, true, Q07),
  ask(422, "14:29:40", MOT, HUM, "TKT-12", "? Q-07 [BLOQUEANTE]", "Q-07 encaminhada ao dev (bloqueante). Só o worker-1 está pausado.", 7, W1, true, Q07),
  ask(423, "14:30:20", W2, LDR, "TKT-13", "Q-10 caixa alta nos artistas?", "Nomes de artista: caixa alta ou como vêm do upstream?", 10, W2, false, { default: "como vêm do upstream" }),
  ask(424, "14:30:35", MOT, HUM, "TKT-13", "? Q-10 timeout 4min", "Q-10 encaminhada ao dev (não-bloqueante, default: como vêm do upstream).", 10, W2, false, { default: "como vêm do upstream", timeout_s: 240 }),
  W2RES(425),
  answer(426, "14:30:56", "broker", W2, "TKT-13", "", "worker-2 entregou o TKT-13 antes de a Q-10 ser respondida. Vale o default: como vêm do upstream.", 10, "como vêm do upstream", "result_default"),
  ask(427, "14:31:02", W2, LDR, "TKT-13", "Q-08 faixa sem capa?", "Setlist sem capa: placeholder genérico ou logo da 89?", 8, W2, false, { ...Q08, default: "logo da 89" }),
  ask(428, "14:31:15", MOT, HUM, "TKT-13", "? Q-08 timeout 4min", "Q-08 encaminhada ao dev (não-bloqueante, default: logo da 89).", 8, W2, false, { ...Q08, default: "logo da 89", timeout_s: 240 }),
  ask(429, "14:31:20", JDG, W2, "TKT-13", "Q-11 cache invalida na troca?", "O cache invalida quando a música muda antes dos 30s?", 11, JDG, false),
  ask(430, "14:31:34", LDR, MOT, "TKT-12", "Q-12 limite de reconexão?", "Até quando o player deve tentar reconectar?", 12, LDR, false),
  { ...env(431, "14:31:36", MOT, null, "TKT-12"), kind: "question_merged", question_id: 12, into: 7 } satisfies SquadEvent,
  answer(432, "14:31:48", W2, JDG, "TKT-13", "Q-11: sim, via ETag", "Sim: o polling usa If-None-Match com o ETag do upstream e invalida o cache ao receber 200.", 11, "sim, via ETag do upstream", "agent"),
];

const G01 = gate(439, "14:51:58", "G-01 entrega final", "G-01: peço aprovação para o merge de feat/player-ao-vivo em main. Dispara deploy automático em produção.", 1, "delivery", "merge feat/player-ao-vivo → main", "deploy automático em produção");
const FINAL = [
  answer(433, "14:33:02", HUM, W1, "TKT-12", "Q-07: infinito com backoff", "Resposta do dev pela TUI, entregue a quem perguntou: infinito com backoff.", 7, "infinito com backoff", "human"),
  turn(433.1, "14:33:03", W1),
  answer(434, "14:35:15", "broker", W2, "TKT-13", "", "Q-08 expirou 4min depois de chegar ao dev. worker-2 seguiu com o default.", 8, "logo da 89", "timeout_default"),
  turn(434.1, "14:35:16", W2),
  result(435, "14:39:52", W1, JDG, "TKT-12", "backoff + retomada automática", 'useHlsStream com backoff exponencial e evento "reconnected"; a reprodução retoma sozinha. +86 −12.', 418),
  verdict(436, "14:43:50", "TKT-12", "approve", "approve 5/5", "Todos os critérios atendidos. Stream derrubado 3x: retomou em ~2s em todas.", 435, CR5(1, 1, 1, 1, 1, "retoma em ~2s; backoff 1s·2s·4s nos logs, sem limite (Q-07).", "autoplay exige gesto no iOS, como a spec prevê.")),
  verdict(437, "14:45:30", "TKT-13", "approve", "approve 1/1", "Cache e invalidação por ETag ok, inclusive sob rate limit.", 425, SETLIST),
  result(438, "14:45:41", LDR, MOT, null, "3/3 tickets aprovados", "Relatório: TKT-12, TKT-13 e TKT-14 aprovados pelo judge. 1 rework no TKT-12."),
];
const APPROVED = decided(440, "14:53:20", "G-01 aprovado", "Decisão do dev no G-01: aprovado.", 1, "approve");
const END = closed(441, "14:53:31", "delivered", 'Merge em main concluído. A feature "player ao vivo com setlist" foi entregue.');

const ERR_X = [
  blocked(442, "14:29:41", W2, "TKT-13", "RADIO_API_KEY ausente", "GET /v1/setlist → 401. A RADIO_API_KEY não está no .env do worktree do worker-2.", "bun test src/api, 3 tentativas"),
  ask(443, "14:29:50", W2, LDR, "TKT-13", "Q-09 chave fora do worktree", "A RADIO_API_KEY não está no worktree do worker-2. Coloque-a no .env de lá e confirme.", 9, W2, true, Q09),
  ask(444, "14:30:02", LDR, MOT, "TKT-13", "Q-09 encaminhada", "Credencial fora do alcance do squad. Encaminhando Q-09.", 9, W2, true, Q09),
  ask(445, "14:30:20", MOT, HUM, "TKT-13", "? Q-09 [BLOQUEANTE]", "Q-09 encaminhada ao dev (bloqueante).", 9, W2, true, Q09),
];
const OFF = left(446, "14:30:12", W2);
const ON = [joined(447, "14:34:05", W2), turn(447.1, "14:34:06", W2)];

const ESC_X = [
  result(448, "14:36:10", W1, JDG, "TKT-12", "v2: backoff + retomada", "Backoff exponencial sem limite; retoma do ponto em que parou. +86 −12.", 418),
  verdict(449, "14:38:40", "TKT-12", "rework", "rework 2/2: retoma atrasado", "Reconecta, mas volta ~40s atrás do ao vivo. Num stream ao vivo precisa voltar na borda.", 448, CR5(1, 1, 0, 1, 1, "volta ~40s atrás do ao vivo.")),
  task(450, "14:39:05", LDR, W1, "TKT-12", "rework 2/2 (último): borda", "Rework 2/2, o último permitido. Ao reconectar, pular para a borda ao vivo do HLS."),
  verdict(451, "14:41:00", "TKT-13", "approve", "approve 1/1", "Cache e ETag ok.", 425, SETLIST),
  result(452, "14:46:20", W1, JDG, "TKT-12", "v3: liveSyncPosition", "Ao reconectar usa liveSyncPosition do hls.js. +41 −9.", 450),
  verdict(453, "14:47:30", "TKT-12", "rework", "reprovado 3ª vez: iOS", "Reconexão agora correta, mas no iOS o áudio não volta a tocar depois de reconectar.", 452, CR5(1, 1, 1, 1, 0, undefined, "no iOS o áudio não volta a tocar depois de reconectar.")),
  // 454 is the line of the limit, which is no event
  ask(455, "14:47:55", LDR, MOT, "TKT-12", "escalado: reprovado 3x", "TKT-12 reprovado 3 vezes (v1, v2, v3). Atingi o limite de 2 reworks e não posso mandar outro. Bloqueante: replanejar o ticket, aceitar com ressalva ou cancelar?", 13, LDR, true),
  turn(455.1, "14:47:56", MOT),
];
const DROP_X = [
  ask(466, "14:48:10", MOT, HUM, "TKT-12", "? Q-13 [BLOQUEANTE]", "Q-13: TKT-12 escalado pelo leader, reprovado 3x. Replanejar, aceitar com ressalva ou descartar?", 13, LDR, true),
  answer(467, "14:50:02", HUM, MOT, "TKT-12", "Q-13: descartar, tentar de novo", "Resposta do dev: descartar o TKT-12 e tentar de novo, com o iOS como critério central de um ticket novo.", 13, "descartar, tentar de novo", "human"),
  answer(468, "14:50:20", MOT, LDR, "TKT-12", "descartar · nova tentativa", "Resposta à escalação: descartar o TKT-12 e planejar uma nova tentativa do player, centrada no iOS.", 13, "descartar · nova tentativa", "agent"),
  plan(469, "14:51:10", [{ ...PLAN1[0]!, dropped: true }, { ticket_ref: "TKT-13", title: "API da setlist" }, PLAN1[2]!, { ticket_ref: "TKT-15", title: "player no iOS" }]),
  // The prototype has worker_busy here; with every worker free the broker cannot write it
  refused(470, "14:51:25", LDR, "unplanned_ticket"),
  refused(471, "14:51:40", LDR, "ticket_dropped"),
  refused(472, "14:51:52", LDR, "ticket_dropped"),
  refused(473, "14:52:05", LDR, "ticket_dropped"),
];

const COMMENT = decided(456, "14:53:02", "comentário: autoplay iOS?", 'Comentário do dev no G-01: "Antes do merge, confirme que o player não faz autoplay no iOS." O gate continua pendente; a mother vai reemitir o G-01.', 1, "comment");
const G02 = (seq: number, t: string) =>
  gate(seq, t, "G-02 excluir branch v0", "G-02: peço aprovação para excluir do remoto a branch abandonada feat/player-v0.", 2, "action", "git push origin --delete feat/player-v0", "a branch abandonada some do remoto, sem volta");

const LONGCMD = [
  "curl -sS --retry 3 \\",
  '  -H "Authorization: Bearer $RADIO_API_KEY" \\',
  '  -H "Accept: application/json" \\',
  '  "https://api.radio89.com.br/v1/setlist?limit=50&include=artist,cover,program" \\',
  "  | jq '[.items[] | {artist: .artist.name, track: .title, played_at, cover: .cover.url // null}]' \\",
  "  > src/api/__fixtures__/setlist.json \\",
  "  && bun test src/api/setlist.test.ts --update-snapshots \\",
  "  && rm -rf .cache/setlist ~/.cache/radio89 \\",
  '  && git add -A && git commit -m "chore: fixture da setlist" \\',
  '  && echo "fixture: $(jq length src/api/__fixtures__/setlist.json) faixas"',
].join("\n");
const PREQ = permission(459, "14:30:10", W1, "TKT-12", "Rodar os testes do player", "bun test src/player");
const PREQ2 = permission(460, "14:30:41", W2, "TKT-13", "Atualizar a fixture da setlist", LONGCMD);
const PREQ3 = permission(461, "14:31:50", JDG, "TKT-13", "Rodar a suíte da API para revisar", "bun test src/api --coverage");
const PDEC: SquadEvent = { ...env(462, "14:31:52", HUM, W1, "TKT-12", "allow: Bash"), kind: "permission_decision", request_seq: 459, behavior: "allow" };
const PREQX = permission(487, "14:55:02", W1, null, "Apagar a branch local da feature", "git branch -d feat/player-ao-vivo");

const PLAN2 = plan(465, "14:20:02", [...PLAN1, { ticket_ref: "TKT-15", title: "player no iOS", depends_on: ["TKT-12"] }]);
const V13 = [verdict(474, "14:37:40", "TKT-13", "approve", "approve 1/1", "Cache e invalidação por ETag ok.", 425, SETLIST), turn(474.1, "14:37:41", LDR)];
const REASON = "o dev trocou a prioridade; a busca de programas entra antes";
const OPEN2 = opened(473, "15:12:04", "busca de programas", "busca-programas", "7d02e4b");

// The turns that leave each agent as the prototype draws it: the leader works from the
// plan on and reads the verdicts, worker-1 works from each task, the judge from the result
// of worker-2. The turn after a message is also what counts as the reaction to it.
const TURNS = [
  turn(405.2, "14:19:52", LDR),
  turn(406.1, "14:20:12", W1),
  turn(418.1, "14:28:31", W1),
  turn(419.2, "14:28:54", LDR),
  turn(425.1, "14:30:56", JDG),
];

// The tokens of the feature of each agent, at the end of a turn in which it owed nothing.
// The mother had 9300 before the feature.
type Tokens = Partial<Record<"mot" | "ldr" | "w1" | "w2" | "w3" | "jdg", number>>;
function tokens(spent: Tokens): SquadEvent[] {
  const ends: [keyof Tokens, number, string, string][] = [
    ["mot", 402.1, "14:18:03", MOT],
    ["ldr", 405.1, "14:19:51", LDR],
    ["w2", 411.1, "14:23:41", W2],
    ["w1", 415.1, "14:26:48", W1],
    ["w3", 416.1, "14:27:31", W3],
    ["jdg", 419.1, "14:28:53", JDG],
  ];
  return ends.flatMap(([id, seq, t, name]) => (spent[id] === undefined ? [] : [usage(seq, t, name, spent[id]! + (id === "mot" ? 9300 : 0))]));
}

const TOKM: Tokens = { mot: 41100, ldr: 88000, w1: 126000, w2: 97333, w3: 22000, jdg: 64000 };
const TOKF: Tokens = { mot: 58000, ldr: 121333, w1: 171333, w2: 112000, w3: 22000, jdg: 193333 };
const TOKA: Tokens = { mot: 49333, ldr: 101333, w1: 148000, w2: 104000, w3: 22000, jdg: 118000 };

// The events in the order of seq, each with the feature that was open when it was written
type Part = SquadEvent | Part[];
const flat = (parts: Part[]): SquadEvent[] => parts.flatMap((part) => (Array.isArray(part) ? flat(part) : [part]));
function log(clock: string, selected: number | null, ...parts: Part[]): FrameLog {
  let open: number | null = null;
  let features = 0;
  const events = flat(parts)
    .sort((a, b) => a.seq - b.seq)
    .map((e) => {
      if (e.kind === "feature_opened") open = ++features;
      const stamped = { ...e, feature_id: e.kind === "peer_joined" || e.kind === "peer_left" ? null : open };
      if (e.kind === "feature_closed") open = null;
      return stamped;
    });
  return { events, now: at(clock), selected };
}

const until = (list: SquadEvent[], seq: number) => list.filter((e) => e.seq <= seq);

const main = [JOINS1, MAIN, TURNS, tokens(TOKM)];
const gated = [JOINS1, MAIN, FINAL, G01, TURNS, tokens(TOKF)];
// Delivered: what the mother spends after closing is of the session only
const idle = [JOINS1, MAIN, FINAL, END, TURNS, tokens(TOKF), usage(441.1, "14:53:40", MOT, 70000)];
// Until the approve of TKT-14
const early = [JOINS1, until(MAIN, 419), until(TURNS, 419.9)];
// Until the question of worker-1 reaches the dev
const asked = [JOINS1, until(MAIN, 422), until(TURNS, 422.9)];
const planned = [JOINS1, until(MAIN, 405), tokens({ mot: 6000, ldr: 11333 })];
const escalated = [early, W2RES(425), ESC_X, tokens({ mot: 52000, ldr: 117333, w1: 188000, w2: 104000, w3: 22000, jdg: 141333 })];
const permitted = [early, PREQ, W2RES(460), turn(460.1, "14:30:56", JDG), tokens({ mot: 38000, ldr: 84000, w1: 109333, w2: 92000, w3: 22000, jdg: 48000 })];
const abandoned = [JOINS1, MAIN, FINAL.slice(0, 4), V13, TURNS, tokens(TOKA), usage(476.1, "14:41:20", MOT, 60000)];
const offline = [asked, OFF, tokens({ mot: 39333, ldr: 81333, w1: 121333, w2: 61333, w3: 22000, jdg: 52000 })];
const stalled = [
  JOINS1,
  until(MAIN, 419).filter((e) => e.seq !== 418),
  turn(405.2, "14:19:52", LDR),
  turn(406.1, "14:20:12", W1),
  // The leader read the question of worker-2 and nothing after it
  turn(411.2, "14:23:42", LDR),
  // 464 in the prototype: the turn of worker-2 ends without the result
  usage(414.5, "14:26:00", W2, 58000),
  tokens({ mot: 36000, ldr: 79333, w1: 104000, w3: 22000, jdg: 46000 }),
];
const error = [early, ERR_X, tokens({ mot: 47333, ldr: 92000, w1: 118000, w2: 54000, w3: 22000, jdg: 31333 })];
const partial = [joined(483, "15:02:24", MOT), joined(484, "15:02:31", LDR), usage(484.1, "15:03:10", MOT, 9300)];

// The modal of a frame: in the text mode, unless it has a choice
const modal = (question: number, more: Partial<Modal>): Modal => ({ question, choice: null, text: "", expanded: false, sending: false, refused: false, ...more });
const TXT06 = "logo da 89, com o nome do programa no ar";
const TXT07 = "Logo da 89 por enquanto, na versão quadrada para caber no card do mobile. Abra um ticket separado para buscar capas no Discogs/MusicBrainz depois da entrega; não bloqueia esta feature.";

export const LOGS: Record<string, FrameLog> = {
  "01": log("14:32:07", 417, main),
  "02": log("14:32:07", 417, main),
  "03": log("14:44:10", null, JOINS1, MAIN, until(FINAL, 436), TURNS, tokens(TOKF)),
  "09a": log("15:07:44", null, idle),
  "09b": log("15:07:44", null, idle, G01, APPROVED),
  "10": log("14:31:05", 442, error),
  "11": log("14:32:07", 417, main),
  "12": log("14:32:07", 417, main),
  "13a": log("14:32:22", 446, offline),
  "13b": log("14:32:22", 446, offline),
  "13c": log("14:34:10", 447, asked, OFF, ON, tokens({ mot: 40000, ldr: 83333, w1: 121333, w2: 63333, w3: 22000, jdg: 52000 })),
  "14": log("14:31:40", 459, permitted),
  "15a": log("14:48:20", 455, escalated),
  "15b": log("14:48:20", 455, escalated),
  "18a": log("14:53:10", 456, gated, COMMENT),
  "19a": log("14:52:35", 458, gated, G02(458, "14:52:30")),
  "22c": log("14:31:40", 459, early, PREQ, PREQ2, tokens({ mot: 38000, ldr: 84000, w1: 109333, w2: 71333, w3: 22000, jdg: 44000 })),
  "22g": log("14:32:07", 472, main, PREQ3, G02(472, "14:31:58")),
  "22h": log("14:31:55", 462, permitted, PDEC),
  "23a": log("14:31:13", 414.5, stalled),
  "23b": log("14:31:13", 414.5, stalled),
  "24a": log("14:20:05", 405, planned),
  "24b": log("14:20:20", 406, planned, MAIN[5]!, TURNS[0]!, TURNS[1]!),
  "24c": log("14:20:08", 465, planned, PLAN2),
  "24d": { ...log("14:20:20", 406, planned, MAIN[5]!, TURNS[0]!, TURNS[1]!), ticket: "TKT-13" },
  "25a": log("14:52:10", 471, escalated.slice(0, 3), DROP_X, tokens({ mot: 57333, ldr: 126000, w1: 188000, w2: 104000, w3: 22000, jdg: 141333 })),
  "25b": log("14:52:10", 471, escalated.slice(0, 3), DROP_X, tokens({ mot: 57333, ldr: 126000, w1: 188000, w2: 104000, w3: 22000, jdg: 141333 })),
  "26a": log("14:17:52", 401, JOINS1, OPEN1, usage(401.1, "14:17:50", MOT, 10633)),
  "26b": log("15:12:09", 473, idle, OPEN2, usage(473.1, "15:12:06", MOT, 71333)),
  "27a": log("14:58:20", 475, abandoned, closed(475, "14:41:12", "abandoned", REASON)),
  "27b": log("14:58:20", 476, abandoned, closed(476, "14:41:12", "abandoned", "")),
  "27c": log("14:58:20", null, abandoned, closed(475, "14:41:12", "abandoned", REASON)),
  "28a": log("15:02:14", null),
  "28b": log("15:04:40", 484, partial),
  "28c": log("15:04:40", 484, partial),
  // worker-3 dies and worker-2 declares a block before the feature closes; both stay so
  "29a": log("15:07:44", null, idle, left(436.5, "14:44:20", W3), blocked(438.5, "14:50:10", W2, "TKT-13", "RADIO_API_KEY ausente", "GET /v1/setlist → 401.", "bun test src/api")),
  "29b": log("15:07:44", null, idle, left(436.5, "14:44:20", W3), blocked(438.5, "14:50:10", W2, "TKT-13", "RADIO_API_KEY ausente", "GET /v1/setlist → 401.", "bun test src/api")),
  "29c": log("14:57:40", 487, idle, PREQX),
  // The tab of questions, and the modal of answer over it
  "04": { ...log("14:32:07", 417, main), ui: { screen: "questions", question: 7 } },
  "05": { ...log("14:32:07", 417, main), ui: { screen: "questions", question: 7, modal: modal(7, { choice: 0 }) } },
  "06": { ...log("14:32:07", 417, main), ui: { screen: "questions", question: 8, modal: modal(8, { text: TXT06 }) } },
  "07": { ...log("14:32:07", 417, main), ui: { screen: "questions", question: 8, modal: modal(8, { text: TXT07, expanded: true }) } },
  "20a": { ...log("14:31:05", 442, error), ui: { screen: "questions", question: 9, modal: modal(9, { choice: 0 }) } },
  // The deadline of Q-08 came two seconds before: the answer the dev sent was refused
  "20b": { ...log("14:35:17", 417, main, FINAL.slice(0, 4)), ui: { screen: "questions", modal: modal(8, { text: TXT06, refused: true }) } },
};
