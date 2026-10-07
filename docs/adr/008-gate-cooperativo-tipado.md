# ADR-008: Gate humano cooperativo, com uma decisão final, escopo e commit

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: Lucas Fassi
- **Tags**: contrato, gate, segurança

## Contexto e problema

Merge ou push no branch base, deploy, migração de dados e a entrega final da feature pedem aprovação humana. O broker roda em localhost e os agentes têm shell, então nenhuma barreira dele é inviolável. O red team achou ainda que a regra "fechar como `delivered` exige gate aprovado" aceitava qualquer gate: a aprovação de uma ação intermediária liberava a entrega final. E o gate não dizia qual commit estava sendo aprovado.

## Critérios

- O dev aprova exatamente o que vai ser executado.
- A entrega final nunca passa sem um gate próprio.
- Não fingir isolamento que o MVP não tem.

## Opções consideradas

- **Controle cooperativo: uma decisão final por gate, `scope` e `commit` no pedido, execução por quem pediu.**
- O dev executar o merge à mão depois de aprovar. Ganha se o push disparar deploy e nenhuma sessão puder ter essa permissão; custa a fase 5 deixar de fechar a feature sozinha.
- Isolamento real do broker contra chamadas por fora das tools. Fora do escopo do MVP.

## Decisão

Opção escolhida: **controle cooperativo tipado**.

- Um gate tem exatamente uma decisão final (`approve` ou `reject`); `comment` não decide.
- `gate.scope` é `delivery` ou `action`; `gate.commit` é obrigatório em `delivery`.
- Fechar a feature como `delivered` exige um gate `delivery` aprovado; gate `delivery` com ticket do plano em aberto é recusado (`tickets_open`).
- A ação é executada só por quem a pediu, depois de `approve`, exatamente como descrita. Se o branch da feature mudou de commit, a mother pede um gate novo.
- A credencial humana da TUI é gerada pelo broker e fica fora de qualquer worktree.
- Segredos não passam pelo broker: uma pergunta pede que o dev coloque a credencial no lugar e confirme.

### Consequências positivas

- A regra do broker para a entrega final deixa de ser vazia.
- O que foi aprovado é identificável por commit.

### Consequências negativas

- Não é barreira de segurança: um agente com shell alcança o broker e lê a credencial humana. Limite aceito para o MVP.
- A conferência do commit na execução é regra da skill, não do broker.

## Links

- `.design/squad-mvp.md`, Key decision 7 e slice Gate
