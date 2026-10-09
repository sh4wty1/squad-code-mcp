# Sincronizar com o GitHub e mesclar o PR 6

**Por quê:** o clone local estava em `feat/peer`, 114 commits atrás da `main`, e a próxima fatia (TUI leitura) parte da `main` com o prompt dela já no roadmap.
**O quê:** repositório local sincronizado com o GitHub, PR 6 (`docs/tui-leitura-prompt`) mesclado e o prompt da fatia TUI leitura entregue ao usuário.
**Como:** `git fetch --all --prune --tags`; `main` avançada por fast-forward; `gh pr merge 6 --merge --delete-branch` (commit de merge, como os PRs anteriores); troca para a `main` e remoção do branch local `feat/peer`, já todo contido nela. Nenhum arquivo editado à mão: o único arquivo que mudou foi o `ROADMAP.md`, pelo merge.
**Verificação:** `git branch -vv` mostra a `main` em `735ec40`, igual a `origin/main`; `git log origin/main..feat/peer` deu 0 commits antes de apagar o branch; o PR 6 estava `MERGEABLE` e `CLEAN`, sem checks configurados.
**Pendências:** rodar a fatia TUI leitura numa sessão nova com o prompt do `ROADMAP.md`. O branch `docs/design-rodada-2` tem 2 commits fora da `main` (a divisão da fatia TUI em duas, que a `main` não seguiu); foi enviado ao GitHub como está, sem PR, só para não ficar preso a uma máquina. Decidir se ele ainda serve ou se pode ser apagado.
