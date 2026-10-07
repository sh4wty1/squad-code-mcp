# ADR-005: A pergunta é uma entidade com id único e uma única resolução

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: Lucas Fassi
- **Tags**: contrato, perguntas

## Contexto e problema

O dev só deve responder o que o squad não consegue decidir sozinho. Uma dúvida nasce num worker, sobe por leader e mother e pode chegar ao dev; no caminho pode ser respondida, mesclada com outra ou perder a validade. Sem identidade própria, cada encaminhamento vira uma mensagem nova e ninguém sabe qual resposta vale.

## Critérios

- Uma dúvida, uma resposta, rastreável da origem ao fim.
- Não parar o squad por dúvidas que têm um default razoável.
- A resposta e o timeout podem chegar no mesmo instante.

## Opções consideradas

- **Entidade com id dado pelo broker, mantido na escalação, com uma única resolução.**
- A resposta do dev descer por mother e leader até o worker. Ganha se cada nível puder reinterpretar a resposta; custa tokens de dois agentes para repassar texto.
- Atalho direto ao dev para bloqueantes. Descartada: todo encaminhamento é um evento visível, e a rota é sempre pela mother.

## Decisão

Opção escolhida: **entidade com resolução única**.

- Não-bloqueante: o agente segue com o default na hora. A pergunta fecha no primeiro de três fatos: resposta, timeout (240 s por padrão, contados a partir de quando chega ao dev), ou o `result` do próprio agente para aquele ticket.
- Bloqueante: só o agente de origem pausa, e espera sem prazo.
- Resposta e timeout simultâneos: vale o primeiro a gravar; o outro recebe `question_closed`.
- Só se mesclam perguntas com o mesmo `blocking`, e o `result` do `asked_by` fecha também a pergunta mesclada.

### Consequências positivas

- Uma resposta do dev chega direto ao `asked_by`, sem gasto de repasse.
- Uma pergunta não fica aberta depois que o ticket dela foi entregue.

### Consequências negativas

- Uma resposta do dev pode chegar depois de o worker já ter seguido com o default; quem corrige é o judge, ao custo de um dos dois reworks.
- Uma dúvida que precisa de diálogo vira várias perguntas.
- Uma bloqueante parada num holder agente não entra na aba Perguntas; o que a mostra é o status `stalled` do holder (ADR-006).

## Links

- `.design/squad-mvp.md`, Key decision 4 e slice Question
