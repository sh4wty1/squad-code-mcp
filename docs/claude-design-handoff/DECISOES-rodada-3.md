# O que o Claude Design decidiu por conta própria na terceira rodada

Resposta dele ao pedido de `PROMPT-estados-faltantes-3.md` (frames 09a, 09b, 11 e 26 a 30),
colada como veio. Nada aqui foi decidido pela spec: cada item é para adotar, cortar ou
mudar na fatia TUI leitura.

## Linha 0

- Com feature aberta: `portal-89fm › título workflow tlc`.
- Sem feature aberta: `○ sem feature aberta`, em cinza.
- Antes de qualquer feature: `○ nenhuma feature ainda`.
- Título longo: o lado direito (`? N`, broker, relógio) é desenhado primeiro, e o título
  ocupa só o espaço que sobra, cortado com `…`. O `workflow tlc` nunca é cortado.
- Sem o nome do projeto, entra o rótulo cinza `feature` antes do título.

## Linhas de sistema

- Abertura: `▶ feature aberta · <título>` em magenta claro, a cor da mother.
- Abandonada: `✗ feature encerrada · abandonada` em amarelo, contra o `✓` verde da entregue.
- Entrada de peer: `● ldr entrou`, em verde.

## Feed

- Segunda feature: as linhas da anterior continuam visíveis em cinza, acima de uma régua
  `▲ anterior · <título> · ✓ entregue`, e `k` rola até elas.
- Sem feature:
  - As linhas da feature encerrada ficam em cinza, menos a de encerramento, que mantém a
    cor para o desfecho ser visível de relance.
  - A faixa fica logo abaixo da linha de encerramento.
  - O que acontece depois do encerramento (o P-01 do 29c) aparece em cor normal, abaixo
    da faixa.
- Com alerta ativo (29): o feed continua cinza. O alerta aparece no painel de agentes, nos
  selos e no rodapé.

## Faixa

- Com alerta, vira `squad sem feature desde 14:53:31 · N fora de [idle]`.
- No 28, vira `broker no ar desde 15:02:10 · nenhuma feature ainda`.

## Rodapé com alerta

- Mostra o alerta e o ocioso juntos, em forma curta: `⚠ w2 ◌ w3 · ○ ocioso desde 14:53`.

## Agente nunca lançado

- Glifo `·` (já estava no arquivo, como separador) e rótulo `[não lançado]`, tudo em cinza.
- Na topologia, o rótulo vai para a segunda linha do nó, porque não cabe ao lado de
  `worker-n`.
- O título do painel vira `agentes · 2/6 no ar`.

## Tokens

- Com feature aberta, o rodapé mostra por padrão a feature (`│ feature ≈$X est.`), e a
  tecla nova `t` alterna para a sessão inteira.
- Sem feature só existe a sessão, e `t` apenas avisa.
- O resumo da tela "tudo idle" ganhou a linha `custo ≈$X est.`.

## Resumo da tela "tudo idle"

- Duração e mensagens agora são calculadas da abertura até o encerramento. Por isso o 09a
  mostra 36 min, não mais os 35 fixos.
- Na abandonada, o ticket que ficou pelo meio aparece como `○ TKT-12 … parou em [working]`,
  junto do motivo ou de "sem motivo registrado".

## Painel de tickets vazio

- Diz o que vem a seguir em vez de ficar em branco, por exemplo
  `○ nenhum ticket ainda · o leader publica o plano ao receber a spec`.

## Dados e frames existentes

- O 09a não tem mais as linhas do gate no feed; o 09b tem.
- A abertura (14:17:48) entrou no início do log principal. Isso desloca em um os números
  das mensagens.
- No 29, a Q-09 não continua aberta.
- O P-01 da variante do 29 é um `git branch -d` feito depois do encerramento.
- O texto do rodapé do frame 25 foi encurtado para não bater no novo rótulo `feature`.
