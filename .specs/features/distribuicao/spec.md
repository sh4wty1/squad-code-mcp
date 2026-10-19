# Distribuição Specification

Fonte: o pedido do dev de 2026-10-19; a fatia não está em `.design/squad-mvp.md`. Depende
do STATE AD-015 (o plugin alcança `broker/` por caminho relativo) e do AD-019 (`roles.json`).
Onde o pedido não decide, a escolha está em "Assumptions & Open Questions".

## Problem Statement

Hoje o `squad` só existe para quem clonou este repositório e rodou `bun link` em `broker/`,
e num Bun recém-instalado (1.3.14, do winget) o `bun link` não criou o comando na primeira
vez. Quem quer usar o squad no próprio projeto não tem um caminho de instalação. O MVP está
fechado, e o README ainda diz "under construction".

## Goals

- [x] Numa máquina sem o repositório, `bun add -g github:sh4wty1/squad-code-mcp` instala o comando `squad`, no Windows e no Linux.
- [x] Dentro de outro repositório git, `squad status`, `squad start mother` (até o diálogo do canal) e `squad tui` funcionam com o pacote instalado.
- [x] O README explica só esse caminho, e a suíte de `broker/` continua passando.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Publicar no npm, criar tag ou release | Só com o sim do dev; o spike mostrou que o GitHub basta |
| Instalar as skills de `plugin/roles.json` no projeto, ou avisar quais faltam | Decidido pelo dev em 2026-10-19: fica como está, com `/setup-fassi-skills` |
| Mover o desenvolvimento deste repositório para a raiz | Decidido pelo dev em 2026-10-19: continua com `bun link` em `broker/` |
| Pôr a pasta de bins do Bun no PATH | É da instalação do Bun; o README diz onde ela está |
| Comandos de atualizar e de remover o pacote | São do Bun (`bun add -g`, `bun remove -g`); o pedido não os inclui |
| Tirar do pacote `docs/`, `.specs/`, `.design/` | O pedido só tira os testes; o resto não roda e não quebra nada |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Como tirar os testes do pacote | `.gitattributes` com `broker/test export-ignore`, sem `files` no `package.json` | No spike, `bun add -g github:` instalou `broker/test` com `files` declarado: o Bun baixa o tarball do GitHub, que é um `git archive` e só respeita `export-ignore`. Efeito colateral: o "Download ZIP" do GitHub também sai sem os testes | n |
| Qual commit o README instala | Sem `#ref`: o branch padrão, `main` | Não há tag nem release, e criar uma é do dev | n |
| Nome e versão do pacote | `squad-code-mcp`, `0.1.0`, sem `private` | O nome é o do repositório e está livre no npm; `private` impediria o npm se o dev o escolher depois | n |
| Dependências do pacote da raiz | As `dependencies` de `broker/package.json`, iguais; nenhuma `devDependency` | O pacote só roda; `broker/package.json` segue sendo o do desenvolvimento, e um teste prende as duas listas iguais | n |
| `bun` no PATH das sessões | Exigido, como já era | O `.mcp.json` e os hooks chamam `bun`; quem instala com `bun add -g` tem o Bun | n |
| O `squad` do `bun link` e o do pacote na mesma máquina | O último instalado ganha | Os dois criam o mesmo bin; o dev deste repositório usa o `bun link` | n |

Dimensões implícitas: falha de dependência externa (GitHub fora do ar, rede) é do `bun add`, que já
termina com erro; as outras dimensões não se aplicam a esta fatia.

**Open questions:** nenhuma.

---

## User Stories

### P1: Instalar o squad com um comando ⭐ MVP

**User Story**: Como dev que não clonou o repositório, quero instalar o `squad` com um comando para usá-lo no meu projeto.

**Why P1**: É a fatia.

**Acceptance Criteria**:

1. WHEN o dev roda `bun add -g github:sh4wty1/squad-code-mcp` THEN o Bun SHALL instalar o pacote `squad-code-mcp` e criar o comando `squad` na pasta de bins globais do Bun, apontando para `broker/cli.ts` do pacote.
2. The pacote instalado SHALL ter `broker/` e `plugin/` lado a lado na sua pasta, de modo que `pluginDir()` e o `${CLAUDE_PLUGIN_ROOT}/../broker/server.ts` do `.mcp.json` resolvam dentro dele.
3. The pacote instalado SHALL resolver `@modelcontextprotocol/sdk` a partir de `broker/server.ts` sem nenhum `bun install` em `broker/`.
4. The pacote instalado pelo GitHub SHALL NOT conter `broker/test`.
5. The `dependencies` do `package.json` da raiz SHALL ser iguais às de `broker/package.json`, e o `bin.squad` da raiz SHALL apontar para um arquivo que existe.

**Independent Test**: com `BUN_INSTALL` numa pasta temporária, `bun add -g github:sh4wty1/squad-code-mcp#<branch>` e listar a pasta do pacote e a de bins.

---

### P1: Rodar o squad de dentro de outro projeto ⭐ MVP

**User Story**: Como dev, quero rodar `squad` de dentro do meu repositório para subir o squad nele.

**Why P1**: Instalar sem rodar não fecha nada.

**Acceptance Criteria**:

1. WHEN o dev roda `squad status` dentro de outro repositório git, com o broker parado, THEN o `squad` SHALL escrever `Broker is not running.` e sair com 0.
2. WHEN o dev roda `squad start mother` dentro de outro repositório git THEN o launcher SHALL abrir o Claude Code com o plugin da pasta do pacote instalado, até o diálogo do canal de desenvolvimento.
3. WHEN o dev roda `squad tui` dentro de outro repositório git, num terminal de 120×40 ou maior, THEN o `squad` SHALL abrir a TUI, que desenha a sua primeira tela (a principal ou a de broker fora do ar) e sai com `q`.

**Independent Test**: num repositório git novo, fora deste, com o `squad` instalado como em P1.

---

### P1: README do caminho instalado ⭐ MVP

**User Story**: Como dev que chega ao repositório, quero ler como instalar e rodar sem clonar.

**Why P1**: O caminho só existe para quem o acha.

**Acceptance Criteria**:

1. The README SHALL explicar a instalação só com `bun add -g github:sh4wty1/squad-code-mcp`, sem `bun link`.
2. The README SHALL dizer como achar a pasta de bins do Bun (`bun pm bin -g`) para pô-la no PATH.
3. The README SHALL NOT ter a linha "Status: under construction".

**Independent Test**: ler o README.

---

### P1: A suíte continua passando ⭐ MVP

**User Story**: Como dev deste repositório, quero a suíte de `broker/` passando nos dois sistemas.

**Why P1**: O pedido pede.

**Acceptance Criteria**:

1. WHEN a suíte de `broker/` roda no Windows e no Linux THEN ela SHALL passar, com `tsc` saindo com 0.

**Independent Test**: `bun test` e `tsc --noEmit` em `broker/`, no Windows e no contêiner `oven/bun:1.4.2`.

---

## Edge Cases

- IF a pasta de bins do Bun não está no PATH THEN o Bun SHALL avisar ao instalar, e o README SHALL dizer como achá-la (DIST-10).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| DIST-01 | P1: Instalar, AC 1 | Execute | Verified |
| DIST-02 | P1: Instalar, AC 2 | Execute | Verified |
| DIST-03 | P1: Instalar, AC 3 | Execute | Verified |
| DIST-04 | P1: Instalar, AC 4 | Execute | Verified |
| DIST-05 | P1: Instalar, AC 5 | Execute | Verified |
| DIST-06 | P1: Rodar, AC 1 | Execute | Verified |
| DIST-07 | P1: Rodar, AC 2 | Execute | Verified |
| DIST-08 | P1: Rodar, AC 3 | Execute | Verified |
| DIST-09 | P1: README, AC 1 | Execute | Verified |
| DIST-10 | P1: README, AC 2 | Execute | Verified |
| DIST-11 | P1: README, AC 3 | Execute | Verified |
| DIST-12 | P1: Suíte, AC 1 | Execute | Verified |

**Coverage:** 12 total, 12 mapped to Execute, 0 unmapped.

---

## Success Criteria

- [x] Os três comandos funcionam de um repositório git fora deste, com o pacote instalado do GitHub, no Windows; no Linux, `squad status`.
- [x] Suíte de `broker/` passando no Windows e no Linux.
