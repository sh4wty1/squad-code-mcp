# ADR-003: A identidade do peer vem do registro, nunca do corpo da chamada

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: Lucas Fassi
- **Tags**: broker, identidade

## Contexto e problema

No upstream o remetente é um campo que quem chama preenche, e o `id` aleatório do peer aparece nas listagens e serve de endereço. Num squad com papéis, um agente que erra o próprio nome ou o de outro corrompe o log, e uma sessão relançada ganha um id novo e perde o que estava endereçado ao antigo.

## Critérios

- `from` confiável em todo evento, porque topologia e status dependem dele.
- Uma sessão morta relançada tem de reassumir o mesmo lugar.
- O MVP tem no máximo seis sessões, com nomes conhecidos de antemão.

## Opções consideradas

- **Nome e papel dados no lançamento, estáveis, como endereço; `id` aleatório como credencial secreta.**
- O broker atribuir o nome no registro. Ganha se o launcher deixar de existir; hoje o nome precisa ser conhecido antes para relançar uma sessão no mesmo lugar.
- Manter o `id` do upstream como endereço. Descartada: muda a cada sessão.

## Decisão

Opção escolhida: **nome e papel do registro**. Os nomes são `mother`, `leader`, `judge` e `worker-1` a `worker-3`. `from` e `role_from` são carimbados pelo broker a partir da credencial. O `id` nunca aparece em listagens. As entregas são endereçadas ao nome, e um nome relançado herda as pendentes.

### Consequências positivas

- Um agente não consegue escrever em nome de outro pelas tools.
- Relançar uma sessão com o mesmo nome recupera entregas e estado.

### Consequências negativas

- Depende do launcher para definir nome e papel no ambiente.
- A credencial é segredo só contra as tools: um agente com shell alcança o broker em localhost (limite aceito, ADR-008).
- Segunda mother, leader ou judge e quarto worker são recusados; crescer o squad exige mudar esta decisão.

## Links

- `.design/squad-mvp.md`, Key decision 2 e slice Peer
- ADR-009 (o registro também prova o canal)
