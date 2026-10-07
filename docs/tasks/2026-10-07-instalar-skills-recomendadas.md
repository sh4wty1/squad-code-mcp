# Instalar as skills recomendadas do fassi-skills

**Por quê:** o README pede que cada dev rode `/setup-fassi-skills` para ter o conjunto de skills que o projeto usa; nenhuma estava instalada no projeto.
**O quê:** cinco skills instaladas para o Claude Code: `tlc-spec-driven`, `the-judge`, `tlc-discover`, `create-adr`, `the-fool`. São as que o `ROADMAP.md` cita pelo nome.
**Como:** `npx --yes @tech-leads-club/agent-skills install -s <skill> -a claude-code`, uma por vez, na raiz do repositório. Os arquivos ficam em `.claude/skills/`, que o `.gitignore` já ignora.
**Verificação:** `.claude/skills/<nome>/SKILL.md` existe para as cinco; `git status` continuou limpo após a instalação.
**Pendências:** `skill-architect`, `gh-address-comments`, `spec-driven-eval`, `security-threat-model` e `harness-eval` ficaram de fora por escolha; a primeira passa a servir na fatia Papéis.
