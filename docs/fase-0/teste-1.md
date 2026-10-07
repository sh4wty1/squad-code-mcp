# Fase 0, teste 1: uma feature com quatro sessões

Rodado em 2026-10-07, no Windows, com o claude-peers do upstream sem alteração
(`louislva/claude-peers-mcp`) e Claude Code 2.1.292. Quatro sessões (mother, leader, um
worker, judge), cada uma com um rascunho de meia página do papel, levaram uma feature de
dois tickets, o segundo dependendo do primeiro, do kickoff ao pedido de aprovação do merge.
Mensagens em texto livre. Do kickoff ao pedido: cerca de quatro minutos.

Repositório descartável: `C:\tmp\fase0`, com um worktree por papel.

## Resultado

O contrato de eventos não precisa de kind nem de aresta nova.

| Suposição do design | Resultado |
|---|---|
| Uma sessão parada acorda com o push do canal | Confirmada nas quatro sessões |
| A regra de git da slice Feature funciona (spec commitada no branch da feature, mother volta ao branch base, leitura por `git show <commit>:<caminho>`) | Confirmada; leader, worker e judge leram a spec pelo hash |
| O ticket B só sai depois de o A ser aprovado e integrado | Confirmada |
| Os agentes mandam a mensagem devida antes de encerrar o turno | Confirmada; nenhum agente parou devendo mensagem |

## O que os agentes sentiram falta, e onde o design já responde

| Falta relatada | Resposta no design |
|---|---|
| Worker: dizer "recebi e comecei" | `turn_started` e status derivado (ADR-006) |
| Worker: recontar critérios e escopo ao judge | O judge lê o `task` do ticket por `/history` |
| Worker: escrever à mão para quem o judge manda o veredito | Aresta judge → leader fixa e nomes estáveis (ADR-003) |
| Judge: veredito em prosa, sem formato por critério | `verdict` com `criteria` estruturado (ADR-004) |
| Mother: pedido de aprovação como texto solto, sem registro de pendência | `gate` com `action` e `effect` (ADR-008) |
| Leader: integração e despacho não avisados à mother na hora | A mother e a TUI leem o log; o leader manda só o relatório em lote |

## Achados

1. **Permissão.** `--permission-mode acceptEdits` não cobre as tools do servidor MCP: a
   primeira chamada de enviar mensagem parou num pedido de permissão em cada sessão. O
   launcher precisa liberar as tools do squad de saída (default 3 da slice Papéis).
2. **Avisos de recebimento.** Cinco das treze mensagens foram só "recebi" (mother 2,
   leader 1, worker 2). O contrato não tem kind para isso e o broker as recusaria.
3. **O worker não fica sabendo do veredito.** Soube da aprovação do ticket A pelo texto do
   ticket B; da aprovação do B, nunca.
4. **Pergunta para baixo.** A mother quis perguntar ao leader se o hash da spec era visível
   no worktree dele e não tinha como; o contrato só tem perguntas subindo.
5. **Variáveis herdadas.** Uma sessão lançada de dentro de outra sessão do Claude Code
   herda `CLAUDE_CODE_CHILD_SESSION` e fica sem gravar transcript. O launcher precisa
   limpar as variáveis `CLAUDE*` do ambiente, senão o hook de uso não tem o que ler.

## Decisões

Tomadas por Lucas Fassi em 2026-10-07: o contrato não muda em nenhuma das três. Estão
registradas na slice Papéis de `.design/squad-mvp.md`.

- Achado 2: as skills de papel proíbem aviso de recebimento, porque cada um custa um turno
  do destinatário.
- Achado 3: o `verdict` não é entregue ao dono do ticket. Rework chega como `task`; numa
  aprovação o worker não tem o que fazer.
- Achado 4: não criar pergunta de cima para baixo. Uma ocorrência, e a regra do
  `spec_commit` resolve o caso.

## O que não foi exercitado

A tarefa era simples: o judge aprovou os dois tickets de primeira e ninguém teve dúvida
real. Ficaram sem teste a escalação de pergunta até o dev, o rework, o limite de dois
reworks, o bloqueio e mais de um worker. Isso é comportamento das skills de papel (slice
Papéis), não formato de evento.

Os outros dois spikes da Fase 0 (relay de permissão e hook de início de turno) estão em
`spikes.md`.
