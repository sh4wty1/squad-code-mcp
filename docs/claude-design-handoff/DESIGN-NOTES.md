# DESIGN-NOTES: o que o handoff do Claude Design implica para a spec

Fonte: `Squad TUI.dc.html` (678 linhas) dentro de
`docs/claude-design-handoff/TUI de observabilidade de squad Claude.zip`, mais
`screenshots/orbit.png`, `screenshots/orbit2.png` e `uploads/pasted-…png`.
Comparado com `docs/start-document/START.md` e `docs/claude-design-handoff/PROMPT.md`.
`support.js` foi ignorado (runtime do Claude Design).

Como ler este documento:

- **[L]** = lido no arquivo (dado mock, função de render ou handler de tecla). `(Lnnn)` é a
  linha do HTML.
- **[I]** = inferência minha a partir do que foi lido.
- **[A]** = o design é ambíguo ou se contradiz; as leituras possíveis estão listadas, nenhuma
  foi escolhida.

Abreviações do design: `mot` mother, `ldr` leader, `w1..w3` workers, `jdg` judge, `hum` dev.

Sobre as imagens: os dois screenshots são renders da tela "órbita" (02b) e não trazem nada
que o HTML não tenha. O upload é um esboço à mão com Mother, Leader (tech lead), Agent 1 a 4
e Judge/Reviewer ligados por linhas tracejadas; a tela "órbita" reproduz esse arranjo. **[I]**
A órbita e o quarto worker vieram desse esboço, não do PROMPT.md.

---

## 1. Telas e estados

O HTML desenha 12 frames estáticos (L585-598) e um frame interativo. Todos em 120×40.

| # | Frame | Estava no PROMPT.md? |
|---|---|---|
| 01 | Visão principal | sim |
| 02 | Topologia (estrela) | sim |
| 02b | Topologia (órbita), alternada com `v` | **não** |
| 03 | Detalhe de thread | sim |
| 04 | Perguntas (abertas + histórico + detalhe) | **não** |
| 05 | Modal de resposta: múltipla escolha | **não** |
| 06 | Modal de resposta: texto livre, uma linha | **não** |
| 07 | Modal de resposta: texto expandido (`ctrl+e`) | **não** |
| 08 | Gate humano (modal) | sim |
| 09 | Estado "tudo idle" | sim |
| 10 | Estado "erro" (worker bloqueado) | sim |
| 11 | Legenda e atalhos (tela `?`) | sim |

O PROMPT.md dizia que a TUI "não controla os agentes, exceto pelo gate humano" e não pedia
tela de perguntas. O design acrescentou a aba 4 e os três modais de resposta, o que bate com a
Fase 3 do START.md, não com o brief.

### 1.0 Moldura comum a todas as telas [L] (L196-218)

- **Linha 0:** `squad-tui`, projeto (`portal-89fm`), feature (`› player ao vivo com setlist`),
  `workflow tlc`, contador `? N` de perguntas abertas ao dev, `broker ● conectado`, relógio
  `hh:mm:ss`.
  - `? N` tem fundo vermelho se alguma aberta é bloqueante, amarelo se só há não-bloqueantes,
    cinza se zero.
- **Linha 1:** abas `1 principal`, `2 topologia`, `3 thread`, `4 perguntas` (com contador),
  `? ajuda`. À direita, um selo de alerta: `⚠ gate pendente · g` ou `⚠ 1 agente bloqueado`.
- **Linha 38 (só nas telas principal e perguntas):** por agente, tokens acumulados e custo em
  dólar (`mot 41k 0.62  ldr 88k 1.32 …`), depois `│ $` total. À direita, nesta prioridade:
  toast da última ação, alerta do estado (`⚠ aguarda o dev`, `○ ocioso desde 14:53`,
  `⚠ w2 bloqueado 1m24s`) ou `rework TKT-12 ⟳ 1/2` da mensagem selecionada.
- **Linha 39:** atalhos da tela atual.

Dados necessários: nome do projeto, nome da feature, workflow, estado da conexão com o broker,
perguntas abertas (quantas, se há bloqueante), gate pendente (sim/não), agentes bloqueados
(quantos, há quanto tempo), tokens e custo por agente.

### 1.1 Visão principal (01) [L] (L255-289)

Três painéis.

**Esquerda, "agentes · 6"**: quatro linhas por agente:
1. glifo de status, nome, status entre colchetes (`[idle] [working] [waiting] [blocked] [done]`
   e a variante `[waiting ?]` para quem espera o dev);
2. rótulo do papel (`objetivo`, `tech lead`, `worker`, `judge`), um texto de atividade
   (`TKT-12`, `TKT-12/13`, `rev TKT-13`, `2 perguntas → dev`, `gate do dev`, `3/3 tickets`,
   `7/7 critérios`, `escalou TKT-13`, `sem ticket`, `TKT-14 ✓`), contador `⟳1/2` e, se o
   agente tem pergunta não-bloqueante aberta, a contagem regressiva `? 3:08`;
3. uma de três coisas: motivo do bloqueio (`⚠ RADIO_API_KEY ausente`), a pergunta bloqueante
   (`? Q-07 bloqueante · dev`) ou as skills truncadas (ou `sem loadout`).

**Esquerda, embaixo, "tickets"**: por ticket: id, título, worker dono, `⟳ n/2`, status
(`[working] [review] [done] [blocked] [waiting]`) e `? dev` quando espera o dev.

**Centro, "feed · thread tlc"**: colunas `hora  de  para  kind  corpo`. O corpo é um resumo
curto (22 colunas). Indicador `● ao vivo` / `‖ pausado` / `○ ocioso`. Dois tipos de linha que
não são mensagens entre peers:
- `⚠ w2 [blocked] RADIO_API_KEY ausente` (vermelho);
- `⟳ Q-05 timeout · default aplicado: HH:mm` (amarelo).

Kinds que aparecem: `task`, `result`, `review`, `question`, `verdict`. Só esses cinco (L98).

**Direita, "detalhe"** (L231-253), conforme a seleção:
- *Mensagem:* `msg #0413`, kind, de, para, hora, ticket + título, `rework ⟳ n/2`, corpo
  completo, critérios da spec com ✓/✗ (só em verdict), as últimas 5 mensagens do mesmo ticket
  com o total (`thread TKT-12 · 6 msgs`) e o loadout do worker dono do ticket. Mensagem sem
  ticket mostra `ticket — kickoff da spec`.
- *Linha de bloqueio:* `⚠ worker-2 [blocked]`, `desde 14:29:41 · há 1m24s`, ticket, **motivo**
  (`GET /v1/setlist → 401` + explicação), **última ação** (`3 tentativas, mesma resposta; parou
  e escalou ao leader`), a cadeia de **escalação** (as perguntas w2→ldr, ldr→mot, mot→hum),
  `? Q-09 aguarda o dev`, loadout, e atalhos `b responder Q-09` / `enter thread TKT-13`.
- *Linha de timeout:* rótulo `evento do broker`, hora e texto.
- *Nada selecionado (idle):* ver 1.7.

### 1.2 Topologia estrela (02) [L] (L291-351)

Caixas para dev, mother, leader, worker-1..3 e judge. Cada caixa: glifo, nome, status,
atividade + `⟳`. Workers têm uma linha extra: `? Q-07 aguarda o dev` ou as skills.

Arestas e rótulos: dev–mother (`gate · perguntas ? 2`), mother–leader (`task ▼ ▲ result ·
? perguntas` e `▲ escala após rework 2/2`), leader–workers (`task + loadout`), workers–judge
(`result`), judge–leader (`verdict · review`, `rework ⟳ · approve ✓`). Notas fixas: `workers
nunca se falam`, `máx 2 reworks/ticket`, `perguntas sobem até a mother, que deduplica`.

**Aresta ativa:** uma aresta pintada com a cor de quem fala, com a legenda
`▶ ativa jdg → ldr [review] TKT-13 · parcial: 4/5 checados · 14:32:05`. Sem aresta ativa:
`○ nenhuma aresta ativa · squad ocioso`.

**Painel lateral "arestas"** (L336-351): aresta ativa; últimas 6 mensagens; perguntas abertas
(id, origem, ticket, `[BLOQ]` ou contagem regressiva); **volume por aresta** (top 5 pares
de→para com contagem e barra); reworks por ticket.

**[A] O que define a aresta ativa.** No mock ela é escolhida à mão por cenário (L162-172): no
cenário normal é o par da última mensagem (`jdg → ldr`); nos cenários de gate e de erro é
`mot → hum`, que é a troca *pendente*, não a última mensagem. Leituras: (a) par da mensagem
mais recente; (b) troca que está aguardando resposta. O design não escolhe.

**[L]** O desenho da estrela não tem caminho para destacar worker → leader (uma pergunta de
worker); a órbita tem (L305 vs L352-355).

### 1.3 Topologia órbita (02b) [L] (L356-393)

Mesmos dados da estrela, outro arranjo, alternado com `v`. Diferenças: arestas tracejadas e um
quarto nó `○ worker-4 [slot] · não alocado · spawn sob demanda`, com a legenda `┌┄┐ slot livre`.

Usa glifos fora da lista do PROMPT.md: cantos arredondados `╭ ╮ ╯ ╰` e traços `┆ ┄ ┅ ┇`. O
PROMPT.md restringia as bordas a `┌─┐│└┘├┤┬┴┼`.

### 1.4 Detalhe de thread (03) [L] (L395-437)

Desenhada só para o TKT-12, com dados fixos.

**Cabeçalho:** `worker-1 · thread tlc · aberto 14:20:11 · fechado 14:44:02 · ⟳ 1/2`.

**Linha do tempo**, uma entrada por evento: hora, glifo, kind, de → para, uma anotação e o corpo:

| Evento | Anotação |
|---|---|
| task ldr→w1 | (linha extra: `loadout: tlc-implement · coding-guidelines · …`) |
| result w1→jdg | `6m36s · 18.4k tok` (duração da etapa e tokens gastos nela) |
| verdict jdg→ldr | `REWORK ⟳ 1/2 · 4/5` |
| task ldr→w1 | `rework 1/2` |
| question w1→hum | `Q-07 [BLOQUEANTE] · via ldr → mot`, corpo com pergunta **e resposta**: `→ dev: infinito com backoff (3m52s)` |
| result w1→jdg | `11m22s · 22.9k tok` |
| verdict jdg→ldr | `APPROVE · 5/5` |
| result ldr→mot | `ticket fechado` |

Rodapé: `fluxo task ▶ result ▶ ✗ rework ▶ task ▶ ? dev ▶ result ▶ ✓ approve ▶ mother`.

**Painel direito, "judge · nota por critério":**
- tabela critério × rodada: número do critério na spec (1, 2, 3, 4, 6), texto, colunas `v1` e
  `v2` com ✓/✗;
- resumo por rodada: `v1 14:28:03 ✗ rework 4/5`, `v2 14:43:50 ✓ approve 5/5`;
- **notas do judge**: texto livre por critério e por rodada
  (`3 v1 player fica em erro ao derrubar o HLS…`);
- `avaliado com`: skills do judge;
- `pergunta no thread`: `Q-07 ✓ respondida pelo dev em 3m22s`;
- `custo do thread`: `w1 41.3k tok $0.62   jdg 18.0k $0.27`.

"Nota" aqui é passa/não passa mais um comentário. Não há nota numérica.

### 1.5 Perguntas (04) e modais de resposta (05-07) [L] (L439-525)

**Lista "perguntas abertas · N"** com selo `N bloqueante`. Por pergunta: id (`Q-07`),
`[BLOQUEANTE]` ou `timeout 3:08`, agente de origem, ticket, idade (`há 2m27s`), texto, opções
numeradas ou `default X · worker-2 segue com o default`, e `via w1 → ldr → mot` + nota de
dedup. Rodapé: `bloqueantes primeiro · depois por tempo restante`.

**"histórico · N resolvidas"**: hora da resolução, id, origem, ticket, texto e uma de duas
linhas: `✓ respondida pelo dev: <resposta>` ou `⟳ default aplicado: <default> · timeout, sem
resposta`. Mais recentes primeiro.

**Detalhe da pergunta selecionada:**
- id, bloqueante/timeout, `aberta há …`;
- contexto: ticket + título + `rework 1/2`; `thread tlc · msg #0416 · 14:29:40`; origem com
  `(só ele pausa)` ou `(segue com o default)`; rota `w1 → ldr → mot → dev`; dedup
  (`leader perguntou o mesmo · mesclada`);
- **pergunta**; **por quê** (justificativa: `A spec exige "reconexão após queda" mas não
  define limite; o judge reprovou a v1 nesse critério.`);
- opções `1 2 3` + `4 outra resposta (texto livre)`, ou `default X · aplicado em 3:08 se você
  não responder`;
- **ao responder** (efeito: `worker-1 retoma o TKT-12 (rework 1/2) assim que você confirmar.`).

Vazio: `○ nenhuma pergunta aberta · o squad não depende de você agora.`

**Modal** `? responder Q-07 · BLOQUEANTE` (ou `· timeout 3:08`): repete contexto, rota, por
quê, a pergunta e o efeito. Duas formas:
- múltipla escolha: opções + `outra resposta…`; teclas `1-4`, `↑↓`/`j k`, `enter`, `esc`;
- texto: caixa de uma linha (3 linhas de altura) ou expandida (8 linhas), cursor `█`, contador
  `N chars`; teclas `enter` enviar, `ctrl+e` expandir/recolher, `ctrl+u` limpar, `esc` cancelar.

Comportamentos lidos nos handlers (L609-662):
- escolher a opção 4 troca o modal para texto livre;
- `enter` com texto vazio não envia;
- `enter` sempre envia, mesmo no modo expandido: não há como digitar quebra de linha;
- se o timeout estoura com o modal aberto, o modal fecha sozinho e o texto digitado se perde;
- ao responder, entra no feed `hum → mot [result] Q-07: <resposta>`, aparece o toast
  `✓ Q-07 respondida`, a pergunta vai para o histórico e o agente de origem volta a `[working]`.

As perguntas do mock:

| | Q-07 | Q-08 | Q-09 |
|---|---|---|---|
| Origem / ticket | w1 / TKT-12 | w2 / TKT-13 | w2 / TKT-13 |
| Bloqueante | sim | não | sim |
| Opções | 3 + texto | nenhuma | nenhuma |
| Default / timeout | nenhum | `logo da 89` / 240 s | nenhum |
| Pergunta | retry infinito ou 5 tentativas? | placeholder ou logo? | **"Pode fornecer a RADIO_API_KEY?"** |

### 1.6 Gate humano (08) [L] (L526-544)

Modal sobre a visão principal escurecida. Conteúdo:
- `mother pede aprovação antes de uma ação irreversível`;
- `ação: entrega final · merge feat/player-ao-vivo → main`;
- `efeito: deploy automático em produção (portal-89fm)`;
- `thread: tlc · 3 tickets · 1 rework · 34 min · $10.17`;
- `perguntas: ✓ 2 respondidas pelo dev  ⟳ 2 com default aplicado`;
- **resumo** em prosa (cita a resposta à Q-07);
- **diff stat** por arquivo (caminho, linhas alteradas, barra `+++--`) e total
  `6 files changed, 471 insertions(+), 41 deletions(-)`;
- `judge: ✓ TKT-12 5/5  ✓ TKT-13 1/1  ✓ TKT-14 1/1`;
- `[a]provar  [r]ejeitar  [c]omentar   esc fechar`.

Enquanto o gate está pendente: selo `⚠ gate pendente · g` na linha de abas, `⚠ aguarda o dev`
no rodapé, mother `[waiting] gate do dev`, demais agentes `[done]`. O gate **não** entra na
lista de perguntas: o contador mostra `? 0` (L166).

No feed, o pedido aparece como `mot → hum [question] gate: aprovar entrega final?` e a decisão
como `hum → mot [verdict] entrega aprovada`, seguida de
`mot → ldr [result] merge feito · thread encerrado` (L136-140).

**[L]** As três teclas só fecham o modal e mostram um toast (`✓ gate aprovado`, `✗ gate
rejeitado`, `comentário enviado`). **Não existe campo para escrever o comentário**, nem motivo
para a rejeição (L643).

### 1.7 Estado "tudo idle" (09) [L] (L169-171, L233, L284)

Todos `[idle]` com `sem objetivo` / `sem tickets` / `sem ticket` / `sem review`. Feed inteiro
em cinza, fechado pela faixa `── squad ocioso desde 14:53:31 · aguardando objetivo ──`. Sem
seleção, o painel de detalhe vira um resumo da sessão:
- `última entrega ✓ player ao vivo c/ setlist · aprovada pelo dev 14:53:20 · merge
  feat/player-ao-vivo`;
- tickets com `⟳ n/2` e worker;
- `perguntas ao dev: ✓ 2 respondidas · ⟳ 2 com default aplicado`;
- `sessão: duração 35 min · mensagens 31`;
- `j/k navega o histórico`.

Tokens e custo continuam visíveis depois da entrega.

### 1.8 Estado "erro" (10) [L] (L142-147, L172-175)

worker-2 `[blocked]` com `⚠ RADIO_API_KEY ausente`, ticket TKT-13 `[blocked]`, leader
`[waiting] escalou TKT-13`, mother `[waiting] Q-09 → dev`. Selo `⚠ 1 agente bloqueado` e
`⚠ w2 bloqueado 1m24s`. Sequência no feed:

```
14:29:40  w2 → ldr  [question]  /v1/setlist responde 401
14:29:41  ⚠ w2 [blocked] RADIO_API_KEY ausente
14:30:02  ldr → mot [question]  TKT-13 precisa de credencial
14:30:20  mot → hum [question]  ? Q-09 [BLOQUEANTE] credencial
```

O bloqueio se desfaz respondendo a Q-09 (L174). Efeito declarado: `a mother grava no cofre do
projeto; worker-2 sai de [blocked]`.

**[A] `[blocked]` contra `[waiting ?]`.** worker-1 com a Q-07 bloqueante fica `[waiting ?]`;
worker-2 com a Q-09 bloqueante fica `[blocked]`. A legenda diz `[waiting ?] aguarda resposta
do dev` e `[blocked] precisa de intervenção`. Nos dois casos a saída é o dev responder uma
pergunta bloqueante. O design não diz qual é o critério que separa os dois.

**[A] `[idle]` contra `[done]`.** worker-3 com o TKT-14 aprovado aparece `[idle] TKT-14 ✓` no
cenário normal e `[done] TKT-14 ✓` no cenário de gate. A legenda diz `[done] ticket entregue` e
`[idle] sem ticket`. Leader e judge também ficam `[done]` no gate, e eles não entregam ticket.

### 1.9 Legenda e atalhos (11) [L] (L545-582)

Cores por papel (mother magenta, leader ciano, worker verde, judge amarelo, **dev branco**,
erro vermelho), cores por status (**`[working]` é azul**, não a cor do papel), kinds, glifos e
as 16 cores. A lista completa de teclas está na seção 3. Rodapé da tela:

> a TUI escreve só duas coisas, sempre para a mother: respostas às perguntas e o gate.

### 1.10 O que não foi desenhado [L por ausência]

- Broker desconectado (só existe `● conectado`).
- Agente offline ou sessão morta. Os cinco status não cobrem isso.
- Thread interrompido ou retomado.
- Mais de uma feature ou mais de um thread ao mesmo tempo (o cabeçalho mostra uma feature).
- Mais de um gate pendente.
- Rolagem ou excesso: o painel de agentes tem 26 linhas úteis e cada agente ocupa 4, então
  cabem 6 agentes; o painel de tickets comporta 3 (2 linhas cada). A estrela tem 3 posições de worker, a órbita 4.
- Terminal com tamanho diferente de 120×40.
- Interface dos filtros `f`, `t`, `/` (constam na ajuda, não têm tela nem handler).
- Navegação `[ ]` entre tickets na tela de thread e `tab`/`enter` nos nós da topologia
  (constam na barra de atalhos, não têm handler).
- Teto de custo, orçamento ou aviso de estouro.
- Qualquer ação de matar, pausar, reiniciar ou criar agente.

**[I]** O HTML tem correções específicas para largura de glifo: mede a largura do box-drawing e
reescala (L61, L81), e força `⚠` em modo texto com `U+FE0E` (L82). Isso indica que `⚠` e `⟳`
podem sair com largura dupla em terminais reais e quebrar o grid. Vale um teste cedo, qualquer
que seja a biblioteca.

---

## 2. Contrato de eventos

"START hoje" refere-se ao bloco `PeerEvent` / `QuestionEvent` / `AnswerEvent` do START.md.
A coluna "Situação" é **[I]** em todas as linhas: é a minha comparação entre o que o design
mostra **[L]** e o que o contrato carrega.

### 2.1 Mensagens

| Dado mostrado | START hoje | Situação |
|---|---|---|
| hora, de, para, kind, corpo completo | `ts`, `from`, `to`, `kind`, `body` | carrega |
| Resumo de uma linha no feed | só `body` | **falta campo** ou regra. No mock o resumo não é o começo do corpo (`rework: reconexão após queda` contra `TKT-12 não atende o critério…`). Ou existe um campo de assunto, ou a TUI trunca o corpo e o feed fica pior que o desenhado |
| `msg #0416` | `id` é uuid | **falta** número sequencial legível |
| Ticket da mensagem | `ticket_ref` | carrega |
| Mensagem sem ticket (`kickoff da spec`) | `ticket_ref` opcional | carrega |
| Loadout do worker | `loadout` = "skills extras" | parcial. O design mostra base + extras juntos (`tlc-implement coding-guidelines ponytail react-best-practices`) e mostra skills de mother, leader e judge, que não têm loadout. As skills base precisam vir de outro lugar (roles.json, Fase 4) |
| `workflow tlc` | `workflow` | carrega |
| Projeto e feature no cabeçalho | nada | **falta** (ver 2.7) |

### 2.2 Verdict e review

| Dado mostrado | START hoje | Situação |
|---|---|---|
| approve / rework | kind `verdict`, sem campo de resultado | **falta campo** de resultado. Sem ele o contador `⟳ n/2` não se calcula |
| Critérios com ✓/✗ | nada | **falta campo**: lista de critério (número na spec, texto, passou) |
| Nota do judge por critério | nada | **falta campo**: comentário por critério |
| Colunas v1 / v2 | nada | derivável pela ordem dos verdicts do ticket |
| `⟳ 1/2`, vermelho em 2/2 | nada | derivável contando verdicts de rework por ticket; o limite 2 é constante da spec |
| `[review] parcial: 4/5 checados` | kind `review` existe, sem definição | **semântica a definir**. O design usa `review` como progresso parcial do judge antes do verdict |

### 2.3 Tickets

O START.md só tem `ticket_ref`. O design trata ticket como entidade.

| Dado mostrado | Situação |
|---|---|
| Lista de tickets, título, worker dono | **falta**. O título do ticket (`player de áudio`) é diferente do resumo do task (`player de áudio HLS`). Precisa de um evento de criação de ticket, ou de título e dono no primeiro `task` |
| Status do ticket (`working`, `review`, `done`, `blocked`, `waiting`) | **falta**, mas é derivável: task enviado → working; result ao judge → review; verdict approve → done; pergunta bloqueante aberta → waiting; agente bloqueado → blocked. É decisão da spec se o broker emite ou a TUI deriva |
| Critérios da spec atribuídos ao ticket (`Critérios 1–4 e 6`) | hoje está no texto do `body`; estruturar é opcional |
| `aberto` / `fechado` do ticket | derivável (primeiro task, último approve) |
| `ticket fechado` reportado à mother | **[A]** a tela de thread mostra `ldr → mot [result] ticket fechado` às 14:44:02; o feed principal não tem essa linha, só um `3/3 tickets aprovados` às 14:45:41. O leader reporta por ticket ou em lote? |

### 2.4 Estado do agente

O START.md não tem evento de estado. O design mostra, por agente: status, texto de atividade,
ticket atual, contador de rework e pergunta pendente.

| Dado mostrado | Situação |
|---|---|
| Lista de agentes com nome e papel, inclusive os que nunca falaram (worker-3 idle, slot do worker-4) | **falta tipo de evento** (entrada/saída de peer com papel), ou a TUI precisa ler o registro de peers além do log. O START.md diz que a TUI "lê o log de eventos" |
| Status `idle / working / waiting / blocked / done` | **falta tipo de evento**. Parte é derivável do fluxo; `blocked` não é |
| `[waiting ?]` | derivável: o agente é `asked_by` de uma pergunta bloqueante aberta |
| Texto de atividade (`rev TKT-13`, `escalou TKT-13`, `2 perguntas → dev`) | derivável só em parte. **[A]** não dá para saber se o design espera texto reportado pelo agente ou montado pela TUI |
| Bloqueio: motivo, desde quando, **última ação** | **falta tipo de evento** (ver 2.6) |

### 2.5 Perguntas e respostas

| Dado mostrado | START hoje | Situação |
|---|---|---|
| Agente de origem | `asked_by` | carrega |
| Bloqueante | `blocking` | carrega |
| Opções | `options` | carrega (ver contradição C5) |
| Default, timeout, contagem regressiva | `default`, `timeout_s`, `ts` | carrega, com a dúvida do relógio abaixo |
| Idade da pergunta | `ts` | carrega |
| Ticket | `ticket_ref` | carrega |
| Id `Q-07` | `question_id: string` | carrega se o broker gerar ids curtos sequenciais. **[L]** o id já aparece na mensagem do worker ao leader (`w3 → ldr [question] Q-05 formato de data?`, L112), antes de chegar à mother. No contrato, `question_id` só existe na `QuestionEvent` emitida pela mother |
| **Por quê** | nada | **falta campo** |
| **Ao responder** (efeito) | nada | **falta campo** |
| Rota `w1 → ldr → mot → dev` | nada | no mock é sempre a cadeia inteira (L447, L494). Pode ser texto fixo da topologia; se for para refletir os saltos reais, **falta** ligar a pergunta original do worker à `QuestionEvent` |
| Dedup (`leader perguntou o mesmo · mesclada`) | `dedup_of: string[]` | parcial. `dedup_of` aponta para `question_id`s, mas as perguntas agrupadas (de worker e de leader) não têm `question_id` no contrato. Mesma lacuna da linha acima |
| `thread tlc · msg #0416` | nada | precisa do número sequencial e do vínculo com a mensagem de origem |
| Resposta e quem resolveu | `answer`, `resolved_by` | carrega |
| Tempo até a resposta | `ts` dos dois eventos | derivável, com a dúvida do relógio abaixo |
| Histórico | question + answer no log | derivável, desde que o log sobreviva ao fim do thread |
| Linha de timeout no feed | `AnswerEvent` com `resolved_by: "timeout_default"` | carrega, mas `from` e `role_from` de um evento gerado pelo broker não estão definidos: `Role \| "human"` não tem valor para "sistema". O design rotula essas linhas como `evento do broker` |

**[A] De quando o timeout conta.** O design usa dois relógios diferentes:
- Q-05: o worker pergunta às 14:21:00 dizendo `Sem resposta em 4min sigo com HH:mm` e o
  timeout sai às 14:25:00: quatro minutos depois da pergunta **do worker**.
- Q-08: a mother encaminha às 14:31:15, timeout de 240 s, expira às 14:35:15: quatro minutos
  depois do **encaminhamento pela mother**.
- Na tela de thread, a Q-07 aparece como respondida em `3m52s` na linha do tempo (contando da
  pergunta do worker, 14:29:10) e em `3m22s` no painel lateral (contando do encaminhamento,
  14:29:40).

A spec precisa fixar: o relógio começa quando o agente pergunta ou quando a pergunta chega ao dev.

**[A] Perguntas que não mostram encaminhamento.** Q-05 e Q-06 foram resolvidas (timeout e dev)
sem nenhuma linha `mot → hum` no feed. Q-07 e Q-08 têm essa linha. Leituras: (a) omissão do
mock; (b) o encaminhamento nem sempre vira mensagem visível. A Q-08 também não tem a pergunta
original do worker no feed.

**[L]** As referências `msg #` das perguntas no mock apontam para mensagens erradas (a da Q-08
cai num `result`, a da Q-09 em outro cenário). A intenção de ligar pergunta a mensagem é clara;
os números não servem de exemplo.

### 2.6 Eventos de sistema

O design tem duas linhas de feed sem `de → para` nem kind (L225-226):

| Linha | START hoje | Situação |
|---|---|---|
| `⟳ Q-05 timeout · default aplicado: HH:mm` | `AnswerEvent` por timeout | carrega (ressalva do `from` acima) |
| `⚠ w2 [blocked] RADIO_API_KEY ausente` | nada | **falta tipo de evento**: agente bloqueado, com agente, ticket, motivo curto, detalhe (`GET /v1/setlist → 401`) e última ação. Também falta o par "desbloqueado", para a duração `há 1m24s` e para o selo sumir |

**[I]** Para o timeout disparar sem a TUI aberta e sem sessão Claude viva, o broker precisa de
um temporizador próprio. A tecla `q` diz `sair (o broker segue rodando)`.

### 2.7 Tokens e custo

O START.md não tem nada sobre uso. O design mostra quatro granularidades:

| Dado mostrado | Onde |
|---|---|
| Tokens e custo acumulados por agente | rodapé (`w1 126k 1.89`) |
| Custo total da sessão | rodapé (`$ 6.58`), gate (`$10.17`) |
| Tokens e custo por agente **por ticket** | thread (`w1 41.3k tok $0.62 · jdg 18.0k $0.27`) |
| Tokens **por etapa** | thread (`6m36s · 18.4k tok` em cada result) |

**Falta tipo de evento** de uso: agente, ticket (ou thread), tokens e custo, com frequência
suficiente para o rodapé andar.

**[I]** No mock todo custo é tokens × US$ 15 por milhão (41k → 0.62, 126k → 1.89): taxa única,
sem separar entrada, saída e cache, nem modelo. Custo real exige essa separação. Também falta
decidir a fonte: o broker não enxerga o consumo de uma sessão do Claude Code, então alguém
precisa reportar (o próprio agente, um hook ou a leitura do transcript).

### 2.8 Gate

O START.md tem o kind `gate` sem nenhum campo. O modal precisa de:

| Dado mostrado | Situação |
|---|---|
| Ação (`merge feat/player-ao-vivo → main`) e efeito (`deploy automático em produção`) | **falta campo** |
| Resumo em prosa | pode ser o `body` |
| Diff stat por arquivo + totais | **falta campo** estruturado, ou vai como texto no `body` |
| Agregados do thread (tickets, reworks, duração, custo, perguntas respondidas/default, critérios por ticket) | deriváveis do log, se 2.2, 2.3 e 2.7 existirem |
| Gate pendente ou decidido | **falta** id de gate e evento de decisão (aprovar / rejeitar / comentar, com texto) |

### 2.9 Ciclo de vida e sessão

| Dado mostrado | Situação |
|---|---|
| Projeto e feature | **falta**: evento de abertura do objetivo ou do thread |
| `thread encerrado`, `ocioso desde`, `aguardando objetivo` | **falta**: evento de encerramento. Hoje é só texto num `result` |
| `última entrega … merge feat/player-ao-vivo` | **falta**: branch e resultado da entrega |
| `sessão: duração 35 min · mensagens 31` | derivável |
| `broker ● conectado` | não é evento; é o estado da conexão da TUI |
| Aresta ativa, volume por aresta, duração por etapa | deriváveis |

### 2.10 Resumo das lacunas

- **Tipos de evento que faltam:** estado/presença do agente; agente bloqueado e desbloqueado;
  uso de tokens e custo; decisão de gate; abertura e encerramento de thread/feature; criação de
  ticket (se não for derivado).
- **Campos que faltam em eventos existentes:** resumo de linha; número sequencial; resultado do
  verdict; critérios com passou/nota; "por quê" e "efeito" na pergunta; ação, efeito e diff
  stat no gate; id de pergunta desde a origem; um valor de `role_from` para o broker.
- **Semântica a definir:** `review`; de quando conta o timeout; diferença entre `blocked` e
  `waiting ?`; diferença entre `idle` e `done`.

---

## 3. Escrita

Teclas que mudam estado fora da TUI. Tudo aqui é **[L]** dos handlers (L625-662) e da tela de
ajuda (L574-579), salvo indicação.

| # | Ação | Tecla | O que vai para o broker | Lacunas do design |
|---|---|---|---|---|
| 1 | Responder pergunta com uma opção | `enter` no modal de múltipla escolha | id da pergunta + o **texto** da opção (não o índice) | nenhuma |
| 2 | Responder pergunta com texto | `enter` no modal de texto | id da pergunta + texto, sem espaços nas pontas, nunca vazio | sem quebra de linha; sem máscara para segredo (Q-09 pede uma chave de API) |
| 3 | Aprovar o gate | `a` | decisão de aprovar | sem confirmação, para uma ação descrita como irreversível com deploy em produção |
| 4 | Rejeitar o gate | `r` | decisão de rejeitar | sem campo de motivo |
| 5 | Comentar no gate | `c` | "comentário enviado" | **sem campo de texto**. **[A]** não se sabe se comentar resolve o gate ou o mantém pendente |

Não há mais nenhuma. A tela de ajuda afirma isso em texto: `a TUI escreve só duas coisas,
sempre para a mother: respostas às perguntas e o gate`. Isso coincide com o START.md.

**[I]** São dois caminhos de escrita no broker (resposta e decisão de gate), ambos destinados à
mother. No feed do design a resposta aparece como `hum → mot`.

Teclas que **não** escrevem: `1 2 3 4 ?` (telas), `j k ↑ ↓`, `tab`, `enter` fora de modal
(abre thread ou pergunta), `esc` (volta; no modal cancela sem responder; no gate fecha sem
decidir), `b` (pula para a próxima bloqueante), `h` (foco no histórico), `v` (estrela/órbita),
`g` (abre o gate pendente), `p` (pausa o feed, estado local), `f t /` (filtros), `[ ]`,
`ctrl+e`, `ctrl+u`, `q` (sai; o broker continua).

As teclas `n`, `i`, `e` trocam o cenário do protótipo e não fazem parte da TUI.

Mudanças de estado que o design mostra e que **não** vêm da TUI, logo são do broker ou dos agentes:
- aplicar o default no timeout (linha `evento do broker`);
- marcar agente como bloqueado e desbloqueá-lo;
- a mother gravar a credencial "no cofre do projeto";
- a mother fazer o merge depois do gate.

---

## 4. Questões abertas do START.md

| Questão | Veredito | Sustentação no design |
|---|---|---|
| **Launcher** | Restringe (pouco) | **[L]** Só na órbita: `○ worker-4 [slot] · não alocado · spawn sob demanda` (L383). **[I]** Pressupõe que alguém cria workers automaticamente, o que não combina com subir sessões à mão. Não diz quem cria. A estrela não tem esse slot |
| **Distribuição** | Não toca | Nada no design |
| **Log** (JSONL, SQLite ou os dois) | Restringe (pouco) | **[L]** `msg #0416`, `thread TKT-12 · 6 msgs`, `volume por aresta`, histórico navegável depois do encerramento (`j/k navega o histórico`). **[I]** Exige ordem total com número sequencial, consulta por ticket e por pergunta, e retenção após o thread fechar. Os dois formatos atendem; não decide |
| **TUI: Ink ou Textual** | Não toca | **[L]** Requisitos que a escolha tem de cumprir: grid fixo 120×40; modal sobreposto com o fundo escurecido (`g.dim()`, L670-671); campo de texto com cursor e modo expandido; relógio e contagens regressivas de 1 em 1 segundo (L604); bold; 16 cores com variantes claras. **[I]** Verificar em ambas a sobreposição de modal e a largura de `⚠` e `⟳` |
| **Escrita da TUI** (tool/endpoint ou socket) | Restringe o destino, não o transporte | **[L]** `a TUI escreve só duas coisas, sempre para a mother` (L579); `broker ● conectado` (L201); `q · sair (o broker segue rodando)` (L574). **[I]** Dois comandos bastam. O indicador de conexão pressupõe um broker vivo com o qual a TUI mantém vínculo; não diz qual |
| **Perguntas: roteamento via Mother ou direto** | Responde: sempre via Mother | **[L]** Rota `w1 → ldr → mot → dev` inclusive nas bloqueantes Q-07 e Q-09 (L447); `perguntas sobem até a mother, que deduplica` (L322); `Duplicata do leader mesclada` (L122). Não há atalho direto em nenhuma tela. **[A]** Ressalva: Q-05 e Q-06 não mostram o encaminhamento pela mother no feed (ver 2.5) |
| **Perguntas: timeout padrão** | Restringe | **[L]** As duas não-bloqueantes do mock usam 4 minutos (`tout:240`, L152; `Sem resposta em 4min`, L112). Exibido como `m:ss`. **[I]** É valor de mock, mas fixa a ordem de grandeza (minutos) e o formato. **[A]** Não define de quando o relógio conta (ver 2.5) |
| **Perguntas: bloqueante sem resposta por muito tempo** | Não responde; assume espera indefinida | **[L]** Só existe a idade (`aberta há 2m27s`), o selo vermelho `? N` e `(só ele pausa)`. Não há expiração, lembrete, escalação nem estado "abandonada". Os outros agentes seguem trabalhando (w2 `[working]` enquanto w1 espera a Q-07) |
| **Memória** | Não toca | **[L]** As respostas ficam no histórico da sessão e são citadas adiante (gate: `conforme sua resposta à Q-07`; nota do judge: `sem limite (Q-07)`). **[I]** Isso é reuso dentro do thread. Nada indica persistência depois dele |
| **Custo** (teto, quem mata) | Não responde; restringe a medição | **[L]** Tokens e US$ por agente, total, por ticket e por etapa (ver 2.7). Não há teto, orçamento, alerta nem ação de matar sessão. **[I]** Um teto precisaria de elemento novo na tela; a medição por agente e por ticket já é exigida pelo design mesmo sem teto |
| **Persistência** (retomar thread) | Não toca | **[L]** Não há estado interrompido, retomado, nem agente offline. O idle mostra o histórico completo de um thread **encerrado**, o que é retenção, não retomada |
| **Nome do projeto** | Não toca | **[L]** O binário da TUI aparece como `squad-tui` (L198). É rótulo de mock |

---

## 5. Novidades: o que o design assume e o START.md não menciona

Cada item pede uma decisão: **adotar**, **cortar** ou **adiar** para depois do MVP. A coluna
"Sugestão" é opinião minha **[I]**, não vem do design.

### Mudam o contrato ou o broker

| # | Novidade | Evidência [L] | Custo | Sugestão |
|---|---|---|---|---|
| N1 | **Tokens e custo** por agente, por ticket e por etapa | rodapé; thread `18.4k tok`, `$0.62`; gate `$10.17` | Evento novo e uma fonte de dados que o broker não tem hoje | Adotar por agente; adiar por ticket e por etapa. Liga com a questão aberta de Custo |
| N2 | **Estado do agente** como dado de primeira classe, com `blocked` (motivo, desde, última ação) | painel de agentes; cenário de erro | Evento novo; protocolo nas skills de papel para reportar | Adotar. Definir antes `blocked` × `waiting ?` e `idle` × `done` |
| N3 | **Ticket como entidade** (título, dono, status, lista) | painel `tickets`; `TK` (L99) | Evento de criação ou derivação na TUI | Adotar derivando do log; título e dono no primeiro task |
| N4 | **Verdict estruturado**: critérios numerados, passou/não, nota por critério, comparação v1/v2 | L118, L422-430 | Campos novos no verdict; o judge precisa emitir estruturado | Adotar critérios + passou; nota por critério pode adiar |
| N5 | **Pergunta com "por quê" e "efeito ao responder"** | `why`, `eff` (L151-153) | Dois campos; a mother precisa redigir | Adotar "por quê"; "efeito" pode adiar |
| N6 | **Id de pergunta desde a origem** (`Q-05` já na mensagem do worker) e rota visível | L112, L447 | Muda quem cria a pergunta: hoje é só a mother | Decidir junto com o roteamento |
| N7 | **Gate com payload**: ação, efeito, diff stat, agregados | L526-540 | Campos novos; a mother precisa montar o diff stat | Adotar ação + resumo + diff stat como texto; agregados derivados |
| N8 | **Ciclo de vida do thread/feature**: projeto, feature, encerramento, "ocioso desde", "última entrega" | cabeçalho; L140; L233 | Eventos de abertura e encerramento | Adotar o mínimo (abrir e encerrar) |
| N9 | **Resumo de uma linha** por mensagem, separado do corpo | campos `s` e `b` em todo o mock | Um campo a mais em todo evento | Adotar; é barato e o feed depende disso |
| N10 | **Evento de sistema do broker** no feed | `sys:'q'`, `sys:'err'` | Valor de papel para o broker | Adotar |

### Mudam o comportamento do squad

| # | Novidade | Evidência [L] | Sugestão |
|---|---|---|---|
| N11 | **Segredo pela TUI**: a Q-09 pede uma chave de API em texto livre e `a mother grava no cofre do projeto` | L153 | **Cortar do MVP**, ou decidir explicitamente. A resposta passaria em claro por um log append-only e pelo contexto da mother. "Cofre do projeto" não existe no START.md |
| N12 | **Judge pergunta direto ao worker** e o worker responde direto | `jdg → w2 [question]`, `w2 → jdg [result]` (L125-126) | Decidir. O fluxo de perguntas do START.md só descreve worker → leader → mother → dev |
| N13 | **Worker sob demanda** (`worker-4 [slot] · spawn sob demanda`) | L383 | Adiar. Liga com a questão do Launcher |
| N14 | **Não-bloqueante: o agente segue com o default imediatamente**, e a resposta do dev pode substituí-lo depois: `worker-2 troca o default pela sua resposta; nada é refeito` | L152; w2 entrega o TKT-13 às 14:30:55, antes de a Q-08 chegar ao dev | Decidir. **[A]** O design não diz o que acontece se a resposta chegar depois de o trabalho estar entregue ou aprovado |
| N15 | **Resposta do dev como instrução livre que gera trabalho**: `Abra um ticket separado para buscar capas… depois da entrega` | texto de exemplo do frame 07 (L593) | Decidir se a mother pode abrir tickets a partir de uma resposta. **[I]** é só texto de exemplo, mas mostra o uso esperado |
| N16 | **A mother faz o merge**, e o merge dispara deploy automático em produção | L140, L530 | Decidir quem executa a ação irreversível depois do gate |
| N17 | **`review` como progresso parcial** do judge | L127 | Definir ou cortar o kind |
| N18 | **A mother responde ela mesma** perguntas do leader, com kind `result` | L107-108 | Compatível com "cada nível tenta responder"; ver C1 sobre o kind |

### Só TUI

| # | Novidade | Evidência [L] | Sugestão |
|---|---|---|---|
| N19 | **Aba Perguntas** com histórico e três modais de resposta | frames 04-07 | Adotar; é a Fase 3 |
| N20 | **"Outra resposta" sempre disponível** na múltipla escolha, limitada a 3 opções + texto (teclas `1-4`) | L453, L500, L630-633 | Adotar; ver C5 |
| N21 | **Topologia órbita** como segunda visualização | frame 02b | Adiar. Mesma informação da estrela e usa glifos que o brief proibia |
| N22 | **Painel "arestas"**: volume por aresta, últimas mensagens, reworks | L336-351 | Adotar; tudo derivado |
| N23 | **Filtros** por papel (`f`), ticket (`t`) e busca (`/`) | só na ajuda (L575) | Adiar; não foram desenhados |
| N24 | **Pausar o feed** (`p`) e pular para a próxima bloqueante (`b`) | L646, L658 | Adotar; baratos |
| N25 | **Métricas por etapa**: duração de cada result, tempo até a resposta | L397-401, L433 | Adotar a duração (derivada); tokens por etapa dependem de N1 |
| N26 | **Dois esquemas de cor** (one-dark, xterm) e dois estilos de seleção | L45-49 | Cortar. São controles do protótipo; a TUI real usa as cores do terminal |
| N27 | **Indicador de conexão com o broker** | L201 | Adotar e desenhar o estado desconectado, que falta |

---

## 6. Contradições entre o design e o START.md

**C1. Os kinds `answer` e `gate` não existem no design.** **[L]** O design só usa `task`,
`result`, `review`, `question`, `verdict` (L98). No lugar dos dois que faltam:

| Situação | START.md | Design |
|---|---|---|
| Resposta do dev | `answer`, de human | `hum → mot [result]` (L114) |
| Resposta de um agente a outro | não definido | `[result]` (L108, L126) |
| Pedido de gate | `gate` | `mot → hum [question]` (L136) |
| Decisão do gate | `gate` | `hum → mot [verdict]` (L139) |

**[I]** A origem é o PROMPT.md, que listou só cinco kinds. Com isso `result` ficou com três
sentidos no design (entrega, resposta, relatório). Ou a spec mantém os sete kinds e a TUI ganha
cores e legenda para `answer` e `gate`, ou adota a sobrecarga do design.

**C2. "Thread" tem dois níveis no design e um no START.md.** **[L]** START.md:
`thread // agrupa a troca de um ticket`, com `workflow` travado por thread. O design chama de
"thread tlc" a feature inteira (`feed · thread tlc`, `Thread tlc encerrado`,
`thread: tlc · 3 tickets`) e de "thread TKT-12" a troca de um ticket, que aparece *dentro* do
thread tlc (`worker-1 · thread tlc · aberto…`). **[I]** Falta um nome e um identificador para o
nível de cima (feature/run), que é também onde moram projeto, workflow, custo total e gate.

**C3. Timeout como evento.** **[L]** START.md: o broker registra um `AnswerEvent` com
`resolved_by: "timeout_default"`. Design: uma linha de sistema sem remetente, destinatário nem
kind, rotulada `evento do broker`. **[I]** É conciliável (a TUI desenha esse `AnswerEvent` de
forma especial), mas a spec precisa dizer quem é o `from` e que `role_from` ele leva.

**C4. Quem cria a pergunta e quando ela ganha id.** **[L]** START.md: `QuestionEvent` é
"emitida pela mother após filtrar/deduplicar", sempre `to: "human"`, e só ela tem
`question_id`. Design: o id aparece já na mensagem do worker ao leader (L112, L113, L121) e a
tela de thread mostra a pergunta como `w1 → hum` (L400). **[A]** Pode ser liberdade do mock ao
escrever os resumos; se for intencional, o id nasce na origem e a mother só encaminha.

**C5. Opções e texto livre.** **[L]** START.md: `options` = múltipla escolha, "ausente = texto
livre", ou seja, um ou outro. Design: a múltipla escolha sempre tem a quarta opção `outra
resposta (texto livre)`. **[I]** A resposta nunca fica restrita às opções; quem recebe um
`answer` não pode presumir que ele é um dos valores de `options`.

**C6. Identificador de mensagem.** **[L]** START.md: `id` é uuid. Design: `msg #0416`,
sequencial, usado como referência cruzada na tela de perguntas. **[I]** Os dois podem
coexistir, mas o sequencial precisa existir.

**C7. Número de workers.** **[L]** START.md: "Worker 1..N". Design: 3 posições fixas na
estrela, 4 na órbita, 6 agentes no painel esquerdo, sem rolagem. **[I]** Ou a spec fixa um
máximo (3 ou 4 workers) para o MVP, ou o layout precisa ser redesenhado para N.

**C8. Fluxo de perguntas do judge.** **[L]** START.md: "Fluxo de perguntas: Worker → Leader →
Mother → dev". Design: o judge pergunta direto ao worker e recebe a resposta direto (L125-126).
O START.md não proíbe (a proibição é entre workers), mas também não prevê.

**C9. Relatório de ticket à mother.** **[L]** Contradição interna do design, não com o
START.md: a tela de thread mostra o leader reportando cada ticket fechado; o feed mostra um
único relatório em lote. Ver 2.3.

Sem contradição, para registro: máximo de 2 reworks e escalação à mother (`▲ escala após
rework 2/2`); `blocking` = só o agente de origem pausa (`só ele pausa`); default e timeout só
em não-bloqueantes; gate com aprovar / rejeitar / comentar; TUI escrevendo só respostas e gate;
workers sem falar entre si.

---

## 7. Rodadas de estados faltantes (frames 12 a 25)

Fonte: `Squad TUI.dc.html` (938 linhas) importado do projeto do Claude Design em 2026-10-07 e
gravado no zip desta pasta. As seções 1 a 6 descrevem a versão de 678 linhas, que continua no
zip como `Squad TUI (antes da spec).dc.html`; os `(Lnnn)` delas não valem para o arquivo novo.
Aqui `(Lnnn)` é a linha do arquivo novo. `support.js` não mudou.

Pedidos: `PROMPT-estados-faltantes.md` (frames 12 a 21) e `PROMPT-estados-faltantes-2.md`
(frames 22 a 25 e correções em 11, 12, 14 e 15). São 45 frames estáticos (L793-837) e o
interativo.

### 7.1 Frames

| # | Frame | O que mostra |
|---|---|---|
| 12 | broker desconectado | tela congelada; rodapé `○ broker inacessível · reconexão automática a cada 1s · tentativa N · responder, gate e permissão desabilitados` (L435) |
| 13a-c | agente offline / topologia / de volta | `◌ [offline]`, `◌ sessão morta há …`; linhas de sistema `○ w2 saiu` e `● w2 voltou` |
| 14 | pedido de permissão pendente | refeito: visão principal com `worker-1 [blocked x]` e o modal fechado |
| 15a-b | ticket escalado e seu thread | `[escalated] ⟳ 2/2`; thread com v1 v2 v3 terminando em `question ldr → mot` |
| 16a-c | gate: rejeitar, comentar, campo vazio | texto obrigatório em `r` e `c`; `enter` vazio não envia |
| 17 | gate: confirmar aprovação | `a` pede `y`; `esc` volta ao gate |
| 18a-b | gate comentado e reemitido | o selo continua; mesmo `G-01`, versão 2 |
| 19a-b | dois gates | selo com contagem; fila com `]` e `[` |
| 20a-b | Q-09 reescrita; resposta recusada | a pergunta pede ação no worktree, não a chave; prazo venceu antes do envio |
| 21 | terminal pequeno | 80×24: `atual 80 × 24 · necessário 120 × 40`, `q sair` |
| 22a | permissão: modal | ver 7.2 |
| 22b | respondida no terminal | aviso, `a` e `d` deixam de valer |
| 22c-d | dois pedidos | selo `⚠ 2 permissões · x`; fila `pedido 1 de 2` |
| 22e-f | comando longo | 8 linhas visíveis; `a` travado até o fim da prévia |
| 22g | três pendências | pergunta na aba 4 e no `? N`; permissão e gate como selos |
| 22h | permissão decidida | `hum → w1 [permission_decision] permitido` |
| 23a-b | agente `stalled`, painel e topologia | ver 7.3 |
| 24a-d | plano publicado, primeira task, plano republicado, thread de ticket planejado | ver 7.4 |
| 25a-b | ticket descartado, recusas e thread do descartado | ver 7.4 e 7.5 |

Mudanças nos frames antigos: a legenda (11) passa a ter 7 status de agente, 8 de ticket, 9
kinds e as linhas de sistema, e o texto final vira `a TUI escreve três coisas: respostas a
perguntas, decisões de gate e decisões de pedido de permissão` (L779-781). O kind `review` saiu.
O painel do feed se chama `feed · feature player ao vivo`, não mais `thread tlc`.

### 7.2 Pedido de permissão [L] (L710-736, L873-885)

- **Dados do pedido:** id `P-01`, agente, ticket, tool, descrição, entrada, hora (L173-176).
- **Status:** `[blocked x]`, com o `x` em branco, contra `[blocked]` da credencial. A terceira
  linha do agente mostra `x Bash · bun test src/player` (L401). A legenda separa os dois:
  `[blocked]` "impedimento externo · resolve fora", `[blocked x]` "permissão pendente · sai
  com tecla".
- **Selo:** `⚠ permissão w1 · x`, ou `⚠ 2 permissões · x`, em ciano claro, antes do selo de
  gate (L308-309). Rodapé `⚠ w1 bloqueado há 1m30s`.
- **Tecla global `x`:** abre o pedido mais antigo de qualquer tela; sem pedido, toast `nenhum
  pedido de permissão`.
- **Modal:** título `⚠ permissão P-01 · w1 · Bash`; agente, ticket, tool, descrição seguida de
  `texto do agente, não diz o que roda`; caixa `entrada · Bash` com a entrada inteira, numerada
  por linha, fundo preto e negrito. Abaixo, o efeito de cada tecla.
- **Comando longo:** a caixa mostra 8 linhas (`PV=8`), quebra em 70 colunas, rola com `j/k`,
  `G` vai ao fim, e marca `1–8 de 11 · ▼ mais abaixo` ou `· fim`. **`a` só vale depois de
  rolar até o fim**; antes disso o toast diz `role a prévia até o fim · G`. `d` vale sempre.
- **Fila:** `]` e `[` trocam de pedido sem decidir; decidir um passa ao seguinte.
- **Respondido no terminal:** a TUI descobre quando o agente volta a agir. O modal fica cinza
  com `⚠ já respondido no terminal do worker-1 · a TUI soube às 14:31:02 … Nada foi enviado`,
  e o feed ganha a linha de sistema `✓ P-01 fechado · respondido no terminal de w1`.
- **Feed:** `w1 → hum [permission_request] Bash · bun test src/player` em ciano claro e
  `hum → w1 [permission_decision] permitido`, verde se permitido e vermelho se negado (L96).
  A coluna do corpo começa na 66 ou depois do kind, o que for maior (L328): é assim que
  `[permission_decision]` cabe.
- **Escrita:** `permission_decision` com `out` `permitido` ou `negado` e o id do pedido, de
  `hum` para o agente que pediu, não para a mother.

### 7.3 `stalled` e mensagem sem reação [L] (L183, L344-348, L402-405)

- Glifo `‖` e amarelo claro: `‖ worker-2 [stalled]`, terceira linha `‖ deve result TKT-13`,
  nota `‖` no ticket. Nó da estrela com borda amarela e a mesma linha.
- Selo `‖ w2 parado · deve result TKT-13` e rodapé `‖ w2 parado há 5m13s`.
- Linha de sistema no feed: `‖ w2 [stalled] deve result TKT-13`, com hora.
- Detalhe: desde quando, ticket, o que deve, a instrução de ir ao terminal dele, e a tabela de
  quem deve o quê (worker `result`, judge `verdict`, leader `task` de rework ou plano, todos
  `answer` de pergunta sua).
- **Sem reação:** `sem reação há 3m10s` em amarelo na terceira linha do agente, no mock no
  leader `[working]`. Só aparece se o agente não tem outra coisa nessa linha (offline,
  permissão, stalled e bloqueio vêm antes, L400-405).

### 7.4 Plano, `planned` e `dropped` [L] (L108, L184-185, L350-354, L408-416, L534-553)

- **Linha de sistema do plano:** `▶ plano v1 de ldr · 3 tickets · 1 dependência`. Republicado:
  `▶ plano v2 de ldr · 4 tickets · + TKT-15`. Com descarte: `▶ plano v2 de ldr · ✗ TKT-12 · +
  TKT-15`. Detalhe: versão, hora, `evento do log, não mensagem entre peers: não tem de/para`,
  a lista de tickets com dependência, `sem dono até a task`.
- **Painel de tickets:** título `tickets · plano vN`. Até 3 tickets, duas linhas cada, com
  `dep TKT-12` em cinza e dono `—`. **Com 4 ou mais, uma linha por ticket, sem título**
  (`TKT-12 ⟳0/2 [planned] —`), e cabem 7 (L409-411).
- **Cores:** `[planned]` ciano, `[dropped]` cinza com o id também em cinza.
- **Thread de ticket planejado:** `○ sem linha do tempo`, e só o que o plano diz: título,
  depende de, dono `—`, `⟳0/2`. Fluxo `▶ plano v1 ▶ aguarda TKT-12 ▶ task`.
- **Thread do descartado:** termina na linha de sistema `plano v2 · TKT-12 saiu · w1
  liberado`. Painel `desfecho`: `saiu do plano: não conta em 3/3`, `w1 liberado · sem ticket`,
  `nova tentativa TKT-15 [planned] · ⟳ 0/2 próprio · sem dono ainda`.

### 7.5 Recusas do broker [L] (L191-192, L356-357)

- Linha vermelha `✗ w1 recusado · task · worker_busy`; agrupada, `✗ ldr recusado · task ·
  ticket_dropped ×3`.
- Detalhe: agente, o kind tentado e o destinatário, o erro, `×3 · 14:51:40–52:05`, um texto do
  que houve, a regra de agrupamento e `Só leitura: a TUI não reenvia nem corrige`.

### 7.6 O que o Claude Design decidiu por conta própria nesta rodada [I]

Lido do arquivo, comparado com o `PROMPT-estados-faltantes-2.md`. A lista que o próprio Claude
Design escreveu ficou na conversa de lá e não está no projeto.

| # | Decisão | Custo para a implementação |
|---|---|---|
| D1 | Tecla global `x` para permissão e a variante `[blocked x]` | uma tecla e um caso a mais no rótulo de status |
| D2 | Id de pedido `P-01` | `.design/squad-mvp.md` não define id curto para pedido de permissão; ou o broker gera, ou a TUI numera |
| D3 | `a` travado até o fim da prévia em comando longo | estado de rolagem no modal; é regra de segurança, não só de tela |
| D4 | Linha de sistema `✓ P-01 fechado · respondido no terminal` | a TUI gera a linha ao ver o evento seguinte do agente; não há evento de fechamento no log |
| D5 | Linha de sistema `‖ w2 [stalled] …` no feed, com hora | `stalled` é derivado, não é evento. A hora teria de ser a do fim do turno (`usage`), e a linha é sintetizada pela TUI |
| D6 | Glifo `‖` para stalled | já era usado em `‖ pausado`; entra no teste de largura de glifo junto com `⚠` e `⟳` |
| D7 | Plano com número de versão (`plano v2`) e marcas `+ TKT-15` / `✗ TKT-12` | a versão é a contagem de eventos `plan` da feature; as marcas são a diferença para o plano anterior |
| D8 | Painel de tickets compacto a partir de 4, limite de 7 | sem rolagem; o oitavo ticket não aparece |
| D9 | Permissão e gate como selos, pergunta só no `? N` e na aba 4 | ordem fixa: permissão, depois gate |
| D10 | `permission_decision` com a cor do desfecho, como `verdict` e `gate_decision` | nenhuma |
| D11 | Cenário `w` no frame interativo | é do protótipo, não da TUI |

### 7.7 Contra `.design/squad-mvp.md`

A fatia TUI leitura marca como "Não está no design" estas linhas, que agora têm frame:
`offline` (13), broker desconectado (12), `stalled` e mensagem sem reação (23), `refused` com
contador (25a), modal de permissão (22), `planned` (24), `dropped` (25), terminal pequeno (21).
Os códigos `worker_busy`, `ticket_dropped` e `permission_closed` usados no mock existem no
contrato.

**[A]** O exemplo `w1 recusado · task · worker_busy` mostra um worker mandando `task`, o que a
topologia já recusaria por outro motivo. Vale como exemplo de formato, não de regra.
