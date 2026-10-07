# ADR-012: Spec endereçada por commit, e um worktree por papel

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: Lucas Fassi
- **Tags**: git, feature

## Contexto e problema

Cada papel trabalha num worktree próprio para não pisar nos outros, e a mother fica no checkout principal. A feature era aberta com `spec_ref`, um caminho no repositório. O pre-mortem achou que o kickoff travava no git: se a mother estivesse no branch da feature, o worktree do leader nesse branch falhava, porque o git não admite o mesmo branch em dois worktrees; se estivesse no branch base com a spec sem commit, leader e workers não encontravam o arquivo. E o launcher criava o worktree do worker no branch do primeiro ticket, sem resposta para o segundo.

## Critérios

- A spec tem de ser legível de qualquer worktree.
- Nenhum branch em checkout em dois lugares.
- Uma sessão de worker viva atende mais de um ticket.

## Opções consideradas

- **Spec commitada no branch da feature e lida por commit; checkout principal sempre no branch base; o worker cria o branch do ticket.**
- Spec commitada no branch base antes da feature. Descartada: muda o branch base sem gate.
- Mother e leader no mesmo checkout. Descartada: desfaz o isolamento por papel.

## Decisão

Opção escolhida: **spec por commit**.

- A mother cria o branch da feature a partir do branch base, commita a spec nele e volta ao branch base antes de abrir a feature.
- `feature_opened` leva `spec_ref` e `spec_commit`, ambos obrigatórios; todo papel lê a spec por `git show <spec_commit>:<spec_ref>`.
- Worktrees: o do leader no branch da feature; o do judge no commit sob avaliação; o do worker em HEAD destacado, criando o branch de cada ticket a partir do branch da feature ao receber o `task`.
- O worker faz commit e envia `result`; quem integra no branch da feature é o leader, depois do `approve`.

### Consequências positivas

- O kickoff não depende de em que branch a mother estava.
- A spec que o squad leu é identificável mesmo que o arquivo mude depois.

### Consequências negativas

- A mother precisa trocar de branch duas vezes antes de abrir a feature; o broker não confere isso, só exige o campo.
- Uma spec corrigida no meio da feature não chega a ninguém sem um aviso da mother, porque todos leem o commit da abertura.
- O launcher copia os `.env*` para cada worktree novo; credenciais ficam duplicadas em disco.

## Links

- `.design/squad-mvp.md`, slices Feature e Papéis
- ADR-008
