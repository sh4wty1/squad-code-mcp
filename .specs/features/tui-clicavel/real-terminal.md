# TUI clicável: conferência em terminal real

Registro da conferência da seção "Conferência em terminal real" da spec. A fatia fecha com ela
quase toda por fazer: em 2026-10-13 o dev decidiu registrar RT-02 a RT-07 como não conferidos e
fechar o resto da fatia sem eles.

Os comandos, de dentro de `broker/`, num Windows Terminal de 120×40 ou mais:

- RT-01: `bun tui/mouse-probe.ts`
- RT-02 a RT-07: `bun run demo`, que abre o frame `01` (três perguntas abertas, o que basta para o
  modal de RT-05) sobre um broker de teste numa porta livre

| Item | Resultado | Terminal | Data |
| ---- | --------- | -------- | ---- |
| RT-01 | Funcionou, segundo o dev: os relatórios chegaram à sonda. Não registrado: a versão do terminal e a coluna e a linha nos quatro cantos | Windows Terminal, versão não registrada | 2026-10-13 |
| RT-02 | Não conferido: o dev decidiu fechar a fatia sem a conferência | - | 2026-10-13 |
| RT-03 | Não conferido: o dev decidiu fechar a fatia sem a conferência | - | 2026-10-13 |
| RT-04 | Não conferido: o dev decidiu fechar a fatia sem a conferência. Quantos relatórios o terminal manda por passo da roda continua sem medida | - | 2026-10-13 |
| RT-05 | Não conferido: o dev decidiu fechar a fatia sem a conferência | - | 2026-10-13 |
| RT-06 | Não conferido: o dev decidiu fechar a fatia sem a conferência. O comportamento do `shift` + arrasto é do terminal e não tem teste automático | - | 2026-10-13 |
| RT-07 | Não conferido: o dev decidiu fechar a fatia sem a conferência | - | 2026-10-13 |
| RT-08 | Não exercitado: nenhum terminal Linux interativo nesta fatia | - | 2026-10-13 |

## O que cobre o que não foi conferido

Os testes num pseudo-terminal cobrem o caminho dos bytes, não o terminal:

- `test/integration/mouse-probe.test.ts`: relatórios escritos na entrada de um pseudo-terminal do
  Windows chegam inteiros ao `stdin` do Bun 1.4.2 em modo cru.
- `test/integration/tui-mouse.test.ts`: a TUI num pseudo-terminal sobre um broker real troca de
  tela com o relatório de um clique na aba `2 topologia` e sai com 0 pelo clique em `q sair`,
  com `ESC [ ? 1000 l` antes de `ESC [ ? 1049 l`.

O que só um terminal mostra fica sem prova: a coluna e a linha que o Windows Terminal manda em
cada canto, quantos relatórios ele manda por passo da roda (o feed anda três linhas por
relatório, CLK-28), o `shift` + arrasto com o mouse ligado, e se o shell recebe relatórios
depois de cada saída da TUI.

## Defeitos

Nenhum registrado, porque a conferência não rodou. Nenhuma tarefa nova sai daqui.
