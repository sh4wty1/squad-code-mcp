# TUI clicável Specification

Fonte: pedido do dev em 2026-10-12 e as quatro decisões dele nesse dia (linhas marcadas `y`
em "Assumptions & Open Questions"). Esta fatia não está em `.design/squad-mvp.md`: o design
do MVP e os frames do Claude Design foram feitos só para teclado
(`docs/claude-design-handoff/PROMPT.md`: "nenhum elemento que dependa de mouse; tudo
navegável por teclado"). A fatia mantém essa regra e acrescenta o mouse por cima dela. Ela
parte das specs das fatias TUI leitura (`TUI-nn`) e Question (`QST-nn`), do AD-010 e do
AD-014 de `.specs/STATE.md`.

## Problem Statement

A TUI só aceita teclado. O dev olha uma linha do feed, uma aba ou uma pergunta e precisa
contar teclas para chegar aonde o olho já está. O terminal sabe dizer em que célula o mouse
clicou, e a TUI não pede nem lê essa informação. Esta fatia faz a TUI pedir os relatórios de
mouse ao terminal e tratar cada clique como a tecla que o elemento clicado já tem. O mouse
não faz nada que uma tecla não faça.

## Goals

- [ ] Num terminal de 120×40 ou maior, o dev troca de tela, seleciona e abre uma linha do feed, um ticket e uma pergunta, rola com a roda e opera o modal de resposta com o mouse.
- [ ] Toda tecla das fatias TUI leitura e Question continua fazendo o que faz, e todo efeito de um clique é o de uma tecla que já existe.
- [ ] Nenhum clique grava uma resposta por engano: pelo mouse, o envio só sai de um clique no atalho `enter` do modal, e nunca do segundo clique de um clique duplo.
- [ ] O terminal volta ao que era por qualquer saída da TUI: nenhum relatório de mouse chega ao shell depois.
- [ ] A suíte passa no Windows e no Linux.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Movimento do ponteiro sem botão (hover), arrastar, botão do meio, botão direito, roda horizontal | Nenhum tem tecla correspondente; o pedido de movimento (modos 1002 e 1003) enche a entrada de relatórios |
| Elemento novo na tela: botão, realce sob o ponteiro, barra de rolagem | Os frames continuam sendo os casos de teste (AD-010); a fatia só muda uma linha da tela de ajuda (CLK-55) |
| Posicionar o cursor do campo de texto com o clique | O campo só acrescenta no fim (fora de escopo também na Question) |
| Clique num nó da topologia ou num agente do painel de agentes | Nenhuma tecla seleciona um nó ou um agente; o clique só dá o foco ao painel (CLK-19) |
| Clique numa opção do painel de detalhe da aba Perguntas | O modal abre pelo clique na pergunta selecionada (CLK-24) e a opção é marcada nele |
| Rolagem do feed independente da seleção | O feed não tem deslocamento próprio (TUI-32); a roda move a seleção |
| Clique nos atalhos listados na tela de ajuda | A ajuda é legenda; os atalhos clicáveis são os da linha 39 e os do detalhe da aba Perguntas |
| Modais de gate e de permissão | Fatia Gate; ver "O que esta fatia deixa para a Gate" |
| Mouse na tela de terminal pequeno e na tela congelada | CLK-12 e CLK-13: nenhuma das duas é a tela do estado |
| macOS | Não exercitado em nenhuma fatia |
| Qualquer rota nova do broker, e qualquer escrita da TUI além de `POST /answer` | O mouse só alcança o envio que o teclado já faz (CLK-49) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| **Ordem no roadmap** (pergunta ao dev) | Entre Papéis e Gate, dependendo só da Question. O MVP passa a ter oito fatias, e a Gate passa a depender desta | A Gate já nasce com os modais clicáveis, pela mesma regra do modal de resposta | y |
| **O que é clicável** (pergunta ao dev) | Os quatro grupos: navegar (abas, linhas, tickets, perguntas, painéis), roda, atalhos e selos, modal de resposta | Resposta do dev em 2026-10-12 | y |
| **Como o mouse envia uma resposta** (pergunta ao dev) | O clique numa opção só a marca. O envio sai do `enter` ou de um clique no atalho `enter confirmar` ou `enter enviar` da linha 39 | A resposta fica no log e nada a apaga; um clique errado não pode gravar | y |
| **Onde a spec é escrita** (pergunta ao dev) | Worktree à parte, branch `spec/tui-clicavel` saído da `main` | A sessão da fatia Papéis trabalhava no checkout principal em `feat/papeis` | y |
| O `stdin` do Bun em modo cru entrega os relatórios de mouse no Windows Terminal | Sim. É a primeira coisa a ver funcionando: a sonda de CLK-17, rodada pelo dev num Windows Terminal, antes de qualquer outra tarefa. Se os relatórios não chegam, a execução para e volta ao dev | Não verificado: nenhuma fatia leu mouse, e um agente não clica num terminal. A colagem delimitada (modo 2004), que chega pelo mesmo caminho, também não foi provada em terminal real (riscos do Handoff). O dev rodou a sonda num Windows Terminal em 2026-10-13 e os relatórios chegaram | y |
| Protocolo pedido ao terminal | Modo 1000 (botões) com coordenadas SGR (modo 1006) | O formato SGR é só texto ASCII, sem limite de coluna, e distingue pressão de soltura. O formato antigo manda bytes que a TUI leria como teclas | n |
| Regra geral do clique | Todo efeito de um relatório é o de uma tecla, ou de uma sequência de teclas, que já existe naquele estado | É o que mantém a regra do design ("tudo navegável por teclado") e deixa os testes compararem com o redutor de teclas | n |
| Seleção de texto com o mouse ligado | Com os relatórios ligados o terminal deixa de selecionar texto com o arrasto simples. A tecla `m` desliga e liga os relatórios, e `SQUAD_TUI_MOUSE=0` sobe a TUI com eles desligados. No Windows Terminal e na maioria dos terminais Linux, `shift` + arrasto seleciona mesmo com eles ligados | Copiar um trecho do feed é uso comum, e a tecla `m` está livre. O comportamento do `shift` é do terminal e fica para a conferência em terminal real (RT-06) | n |
| `SQUAD_TUI_MOUSE` vazia | Vale como ausente: mouse ligado | L-036: toda variável de texto diz o que o vazio significa | n |
| Aviso de `m` na linha 39 | Nenhum. A tecla aparece só na tela de ajuda e no aviso de 4 s | Um atalho novo na linha 39 mudaria a última linha de todos os frames | n |
| Clique num ticket do painel de tickets | Abre o thread daquele ticket | A tela principal não tem seleção de ticket; o thread do ticket é alcançável por `3` e `[` `]` | n |
| Clique no contador `? N` da linha 0 | Como a tecla `4` | O contador é o das perguntas que esperam o dev, e a aba 4 é a lista delas | n |
| Clique no rótulo de custo da linha 38 (`│ feature ≈$…` ou `│ sessão ≈$…`) | Como a tecla `t` | É o que a tecla alterna, e é o único texto da linha 38 com tecla | n |
| Selos da linha 1 | Só os que anunciam tecla são clicáveis: o de gate (`· g`) e o de permissão (`· x`). Até a fatia Gate eles dão o aviso `chega com a fatia Gate`, como as teclas | Os outros selos não têm tecla | n |
| Atalho de duas teclas (`j/k`, `[ ]`, `↑↓`) | O clique vale pela tecla cujo caractere foi clicado; o separador e a descrição não fazem nada | A descrição serve às duas teclas e não diz qual | n |
| Atalho de faixa (`1-4`, `1-N`) | Não faz nada | As abas e as opções do modal são clicáveis nelas mesmas | n |
| Passo da roda | Três linhas no feed; um item no thread, na lista de perguntas e no histórico | A linha do feed tem uma linha de tela; os outros itens têm duas ou mais | n |
| A roda e o foco | A roda dá o foco ao painel que ela rola, como um clique | Na aba Perguntas `j` e `k` só rolam o histórico com o foco nele; assim o efeito da roda continua sendo o de teclas | n |
| Clique duplo fora do modal | Sem regra própria: são dois cliques. Sobre uma linha não selecionada do feed, o primeiro seleciona e o segundo abre | É o que o dev espera de um clique duplo | n |
| Clique duplo com o modal aberto | O clique que chega menos de 500 ms depois do anterior não faz nada | Um clique em `enter abrir` ou numa pergunta abre o modal, e o segundo clique do duplo cairia sobre `enter confirmar` (mesmas colunas da linha 39) ou fora da caixa: enviaria a primeira opção ou fecharia o modal. 500 ms é o intervalo de clique duplo padrão do Windows | n |
| Clique fora da caixa do modal | Fecha como `esc`, também com texto digitado | Decidido pelo dev junto com o grupo "modal de resposta"; `esc` perde o texto do mesmo jeito | y |
| Clique em `outra resposta…` | Vai ao modo texto, como marcar a linha e dar `enter` | Decidido pelo dev junto com o grupo "modal de resposta"; não envia nada | y |
| Modificadores no clique | `ctrl` e `alt` não mudam o que o clique faz. `shift` + clique não chega à TUI nos terminais que o usam para selecionar | Nenhuma tecla da TUI depende de modificador com o mouse | n |
| Tela congelada (broker sem responder) | O mouse não faz nada; o teclado continua como hoje | Ela desenha sempre a tela principal em cinza, qualquer que seja a tela do estado: um clique ali não tem a tecla certa a imitar | n |
| Com que tela o clique é comparado | Com o último desenho escrito no terminal | É o que o dev viu ao clicar. O laço desenha depois de cada mudança de estado, e só o relógio muda entre o desenho e o clique | n |
| Processo morto sem aviso | O terminal fica com os relatórios ligados até o dev rodar `reset` ou fechar a aba | Nenhum processo desfaz o pedido depois de morto; é o mesmo limite da tela alternativa (TUI-60) | n |
| Tabela de desvios dos frames | Classe nova, D4: linha que a fatia TUI clicável acrescenta e o protótipo, feito só para teclado, não tem. Só a linha de CLK-55 a usa | AD-010: toda linha diferente de um frame tem classe declarada | n |
| Registro no `STATE.md` | A regra geral do clique entra como decisão nova (`AD`) na execução da fatia, depois de a Papéis ser mesclada | A Papéis acrescentou AD-015 a AD-020 no branch dela; numerar agora, a partir da `main`, colidiria | n |
| Testes | `bun test`, só unidade, como nas outras telas: o leitor de relatórios e o redutor são funções puras; o laço recebe entrada, saída e relógio injetados. O que só um terminal real mostra está em "Conferência em terminal real" | Convenção em uso; um agente não clica | n |

**Open questions:** none - all resolved or logged above. A linha do `stdin` no Windows é
uma suposição com dono e data de conferência: a primeira tarefa da execução.

Implicit-requirement dimensions: validação de entrada → CLK-03, CLK-09 a CLK-11, CLK-53
(formato do relatório, célula fora da grade, valor da variável). Falha parcial → CLK-07 e
CLK-08 (relatório partido entre leituras, relatório que não termina). Idempotência e
repetição → CLK-46 (clique duplo no modal), CLK-06 (a soltura do botão não repete o
clique), QST-79 por CLK-47 (um envio por vez). Fronteira de autenticação → N/A porque o
envio pelo clique usa o caminho do teclado, com a credencial lida na hora (AD-014, CLK-49).
Limite de taxa → N/A porque cada relatório da roda é um passo e o terminal dita quantos
manda. Concorrência e ordem → CLK-15 (relatórios e teclas de uma leitura, na ordem de
chegada) e CLK-14 (o desenho com que o clique é comparado). Ciclo de vida do dado → N/A
porque a fatia não guarda nada em disco. Observabilidade → CLK-17 (sonda) e CLK-50 (aviso
ao ligar e desligar). Falha de dependência externa → CLK-10 (terminal que responde no
formato antigo), CLK-56 (terminal que não manda relatório: o teclado continua inteiro).
Integridade de transição → CLK-02 (o terminal é restaurado em toda saída), CLK-40 e CLK-47
(estados do modal).

---

## Definições

Valem as das specs TUI leitura e Question. Mais:

- **Relatório**: a sequência `ESC [ <`, três inteiros decimais `b`, `x` e `y` separados por `;`, e o final `M` (pressão) ou `m` (soltura). `x` é a coluna e `y` a linha, contadas de 1.
- **Botão do relatório**: `b` sem os bits 4 (`shift`), 8 (`alt`) e 16 (`ctrl`).
- **Clique**: relatório de final `M` com botão 0.
- **Roda para cima** e **roda para baixo**: relatórios de final `M` com botão 64 e 65.
- **Célula do relatório**: coluna `x − 1` e linha `y − 1` da grade de 120×40, com origem em 0.
- **Tela desenhada**: o último desenho que a TUI escreveu no terminal.
- **Como a tecla K**: o estado da tela depois do relatório é o que a tecla `K` daria ao mesmo estado, pelas regras de TUI-62, TUI-63, QST-64 a QST-67 e QST-72 a QST-76.
- **Atalho**: um par de tecla e descrição da linha 39, ou da linha `enter responder   b próxima bloqueante` do detalhe da aba Perguntas.
- **Atalho simples**: o que nomeia uma tecla: `tab`, `enter`, `esc`, `b`, `g`, `x`, `p`, `h`, `?`, `q`, `ctrl+e`, `ctrl+u`.
- **Atalho de duas teclas**: `j/k`, `[ ]` e `↑↓`.
- **Atalho de faixa**: `1-4` e `1-N` do modal.
- **Caixa do modal**: as células da caixa do modal de resposta, borda incluída; a margem vazia em volta dela não é da caixa.
- **Mouse ligado**: a TUI pediu os relatórios ao terminal e não desfez o pedido.

---

## User Stories

### P1: O terminal conta onde o mouse clicou ⭐ MVP

**User Story**: Como dev, quero que a TUI leia o clique e a roda do terminal sem que nada disso vire tecla ou texto, e que devolva o terminal como estava.

**Why P1**: Sem a leitura não há clique; lida errado, um relatório vira `esc`, dígitos e letras, que trocam de tela e entram no texto de uma resposta.

**Acceptance Criteria**:

1. **CLK-01** WHEN a TUI sobe com o mouse ligado THEN ela SHALL escrever `ESC [ ? 1000 h` e `ESC [ ? 1006 h` depois da sequência que entra na tela alternativa.
2. **CLK-02** WHEN a TUI sai por `q`, por `ctrl+c`, por `SIGTERM`, por erro não tratado ou por clique no atalho `q` THEN ela SHALL escrever `ESC [ ? 1006 l` e `ESC [ ? 1000 l` antes da sequência que deixa a tela alternativa, com o mouse ligado ou desligado.
3. **CLK-03** The TUI SHALL ler como um relatório toda sequência `ESC [ <` seguida de três inteiros decimais separados por `;` e de `M` ou `m`, em qualquer tamanho do terminal.
4. **CLK-04** The TUI SHALL não tratar nenhum caractere de um relatório como tecla nem acrescentá-lo ao texto do modal de resposta.
5. **CLK-05** WHEN um clique chega THEN a TUI SHALL fazer o que as histórias abaixo definem para a célula do relatório, e WHEN uma roda para cima ou para baixo chega THEN SHALL fazer o que a história da roda define para ela.
6. **CLK-06** IF um relatório não é um clique, uma roda para cima nem uma roda para baixo THEN a TUI SHALL não mudar o estado da tela: a soltura de qualquer botão, o botão do meio, o direito, a roda horizontal e todo relatório com o bit 32 (movimento).
7. **CLK-07** WHEN um relatório chega partido entre duas ou mais leituras da entrada THEN a TUI SHALL lê-lo como um só relatório.
8. **CLK-08** IF a entrada termina em `ESC [ <` seguido só de dígitos e `;`, e o resto não chega em 40 ms THEN a TUI SHALL descartar esses caracteres, sem tecla e sem texto.
9. **CLK-09** IF uma sequência começa por `ESC [ <` e chega a uma letra sem ter os três inteiros THEN a TUI SHALL descartá-la inteira, sem tecla e sem texto.
10. **CLK-10** IF a entrada tem `ESC [ M` seguido de três caracteres, o relatório no formato antigo THEN a TUI SHALL descartar os seis caracteres, sem tecla e sem texto, em qualquer tamanho do terminal.
11. **CLK-11** IF a célula de um relatório tem coluna fora de 0 a 119 ou linha fora de 0 a 39 THEN a TUI SHALL não mudar o estado da tela.
12. **CLK-12** WHILE o terminal tem menos de 120 colunas ou menos de 40 linhas the TUI SHALL não mudar o estado da tela, não sair e não fazer `POST` por relatório algum.
13. **CLK-13** WHILE o broker não responde às leituras the TUI SHALL não mudar o estado da tela nem sair por relatório algum.
14. **CLK-14** The TUI SHALL decidir o que um clique ou uma roda atinge pela tela desenhada: cada elemento vale nas células em que o último desenho o pôs.
15. **CLK-15** WHEN uma leitura da entrada traz relatórios e teclas THEN a TUI SHALL aplicá-los um a um, na ordem em que chegaram.
16. **CLK-16** IF uma leitura da entrada traz um relatório e um `\r` ou `\n`, e na vez dessa tecla o modal está aberto THEN a TUI SHALL tratá-la como a de um bloco colado (QST-78): um espaço no modo texto, nada no modo escolha, e nenhum envio.
17. **CLK-17** WHEN `bun tui/mouse-probe.ts` roda num terminal THEN ela SHALL ligar os relatórios como em CLK-01, escrever uma linha por relatório recebido com o botão, a coluna, a linha e `pressão` ou `soltura`, e em `q` ou `ctrl+c` desfazer o pedido como em CLK-02 e sair com 0; fora de um terminal SHALL sair com 1.

**Independent Test**: `bun tui/mouse-probe.ts` num Windows Terminal mostra uma linha a cada clique, soltura e passo da roda. `bun test test/unit/tui-mouse.test.ts` dá ao leitor relatórios inteiros, partidos, incompletos e no formato antigo.

---

### P1: Navegar com o clique ⭐ MVP

**User Story**: Como dev, quero clicar na aba, na linha do feed, no ticket ou na pergunta que estou olhando, em vez de contar teclas até ela.

**Why P1**: É o pedido: a TUI clicável.

**Acceptance Criteria** (todos valem sem modal aberto):

1. **CLK-18** WHEN um clique cai numa célula de uma aba da linha 1, o contador da aba `4 perguntas` incluído THEN a TUI SHALL fazer como a tecla da aba: `1`, `2`, `3`, `4` ou `?`.
2. **CLK-19** WHEN um clique cai numa célula de um painel da tela principal, borda incluída THEN a TUI SHALL dar o foco a esse painel: 0 para agentes e tickets, 1 para o feed, 2 para o detalhe.
3. **CLK-20** WHEN um clique cai numa linha do feed que não é a selecionada THEN a TUI SHALL selecionar essa linha, com o feed pausado ou não.
4. **CLK-21** WHEN um clique cai na linha selecionada do feed THEN a TUI SHALL fazer como a tecla `enter`.
5. **CLK-22** WHEN um clique cai numa linha de um ticket do painel de tickets, em qualquer das duas linhas dele na forma de duas linhas THEN a TUI SHALL mostrar a tela de thread desse ticket, na entrada mais recente.
6. **CLK-23** WHEN um clique cai no contador `? N` da linha 0 THEN a TUI SHALL fazer como a tecla `4`.
7. **CLK-24** WHEN, na aba Perguntas, um clique cai numa linha desenhada da pergunta selecionada e o foco está na lista THEN a TUI SHALL fazer como a tecla `enter`: abrir o modal dela, sem enviar nada.
8. **CLK-25** WHEN, na aba Perguntas, um clique cai numa linha desenhada de uma pergunta da lista fora do caso de CLK-24 THEN a TUI SHALL selecionar essa pergunta e dar o foco à lista.
9. **CLK-26** WHEN, na aba Perguntas, um clique cai numa célula da caixa do histórico THEN a TUI SHALL dar o foco ao histórico.
10. **CLK-27** IF um clique cai numa célula que nenhuma regra desta spec cita THEN a TUI SHALL não mudar o estado da tela: a linha 0 fora do contador, a régua, a faixa e o cabeçalho do feed, a linha `+N tickets`, um agente, o painel de detalhe, a topologia, o thread, a tela de ajuda e o lado direito da linha 38 mudam, no máximo, o foco de CLK-19.

**Independent Test**: com um broker de teste e o log de uma feature de dois tickets, clicar em `2 topologia`, em `1 principal`, numa linha do feed (o detalhe muda), outra vez nela (abre o thread), num ticket, em `? N` e numa pergunta.

---

### P1: Rolar com a roda ⭐ MVP

**User Story**: Como dev, quero rolar o feed, o thread, as perguntas e o histórico com a roda, no painel em que o ponteiro está.

**Why P1**: Grupo escolhido pelo dev; é o gesto que o mouse tem e o clique não.

**Acceptance Criteria** (todos valem sem modal aberto):

1. **CLK-28** WHEN uma roda chega com a célula na caixa do feed da tela principal THEN a TUI SHALL dar o foco ao feed e fazer como três teclas `k` (para cima) ou três teclas `j` (para baixo).
2. **CLK-29** WHEN uma roda chega com a célula na caixa do thread, a da esquerda da tela de thread THEN a TUI SHALL fazer como uma tecla `k` (para cima) ou `j` (para baixo).
3. **CLK-30** WHEN uma roda chega com a célula na caixa da lista da aba Perguntas THEN a TUI SHALL dar o foco à lista e fazer como uma tecla `k` (para cima) ou `j` (para baixo).
4. **CLK-31** WHEN uma roda chega com a célula na caixa do histórico da aba Perguntas THEN a TUI SHALL dar o foco ao histórico e fazer como uma tecla `k` (para cima) ou `j` (para baixo).
5. **CLK-32** IF uma roda chega com a célula fora dessas quatro caixas THEN a TUI SHALL não mudar o estado da tela.

**Independent Test**: com um feed de mais de 33 linhas, rolar para cima até a primeira e de volta; na aba Perguntas com mais de cinco resolvidas, rolar o histórico.

---

### P1: Atalhos e selos clicáveis ⭐ MVP

**User Story**: Como dev, quero clicar no atalho que a tela me mostra, em vez de procurar a tecla.

**Why P1**: Grupo escolhido pelo dev; é o que torna clicável o que não é linha: pausar, a próxima bloqueante, o ticket anterior, a ajuda.

**Acceptance Criteria**:

1. **CLK-33** WHEN um clique cai numa célula da tecla ou da descrição de um atalho simples THEN a TUI SHALL fazer como a tecla dele: `tab`, `enter`, `esc`, `b`, `g`, `x`, `p`, `h`, `?`, `q`, `ctrl+e` ou `ctrl+u`.
2. **CLK-34** WHEN um clique cai no caractere de uma das teclas de um atalho de duas teclas THEN a TUI SHALL fazer como essa tecla: `j` ou `k`, `[` ou `]`, `↑` ou `↓`; IF cai no separador ou na descrição dele THEN SHALL não mudar o estado da tela.
3. **CLK-35** IF um clique cai num atalho de faixa THEN a TUI SHALL não mudar o estado da tela.
4. **CLK-36** WHEN, sem modal aberto, um clique cai numa célula do selo de gate da linha 1 THEN a TUI SHALL fazer como a tecla `g`.
5. **CLK-37** WHEN, sem modal aberto, um clique cai numa célula do selo de permissão da linha 1 THEN a TUI SHALL fazer como a tecla `x`.
6. **CLK-38** IF, sem modal aberto, um clique cai num selo da linha 1 que não é o de gate nem o de permissão THEN a TUI SHALL não mudar o estado da tela.
7. **CLK-39** WHEN, sem modal aberto, um clique cai numa célula de `│ feature ≈$<total> est.` ou de `│ sessão ≈$<total> est.` da linha 38 THEN a TUI SHALL fazer como a tecla `t`.

**Independent Test**: clicar em `p pausa` (o título do feed mostra `○ pausado`) e outra vez nele; em `b bloqueante`; no thread, em `]` e em `[`; em `? ajuda` e em `esc voltar`; em `q sair` (a TUI sai e o shell não recebe relatório ao clicar depois).

---

### P1: Modal de resposta com o mouse ⭐ MVP

**User Story**: Como dev, quero marcar a opção com um clique e enviar com outro, num lugar que diz que envia, sem que um clique errado grave uma resposta.

**Why P1**: É a única tela em que o mouse alcança uma escrita, e a resposta não sai mais do log.

**Acceptance Criteria** (todos valem com o modal aberto):

1. **CLK-40** WHILE o modal está aberto the TUI SHALL dar a um clique só os efeitos de CLK-41 a CLK-46, e nenhum dos efeitos de CLK-18 a CLK-27 e de CLK-36 a CLK-39.
2. **CLK-41** WHEN, no modo escolha, um clique cai na linha de uma opção, em qualquer célula dela dentro da caixa do modal THEN a TUI SHALL marcar essa opção e não enviar nada, também quando ela já é a marcada.
3. **CLK-42** WHEN, no modo escolha, um clique cai na linha `outra resposta…` THEN a TUI SHALL passar ao modo texto com o campo vazio.
4. **CLK-43** WHEN um clique cai numa célula das linhas 0 a 38 que não é da caixa do modal THEN a TUI SHALL fazer como a tecla `esc`.
5. **CLK-44** IF um clique cai numa célula da caixa do modal que não é a linha de uma opção nem a linha `outra resposta…` THEN a TUI SHALL não mudar o estado da tela: o contexto, o texto da pergunta, o campo de texto, o aviso e a borda.
6. **CLK-45** WHEN um clique cai num atalho da linha 39 THEN a TUI SHALL fazer como CLK-33 a CLK-35 definem, com as teclas do modal: `enter` envia a opção marcada ou o texto com ao menos um caractere que não seja espaço, `esc` fecha, `ctrl+e` alterna o tamanho do campo, `ctrl+u` esvazia o campo, `↑` e `↓` movem a marca.
7. **CLK-46** IF um clique chega menos de 500 ms depois do clique anterior THEN a TUI SHALL não mudar o estado da tela nem enviar nada.
8. **CLK-47** WHILE um envio espera a resposta do broker the TUI SHALL não mudar o modal por relatório algum; WHILE o modal está no estado recusado the TUI SHALL aceitar só o clique que o fecha, por CLK-43 ou pelo atalho `esc`.
9. **CLK-48** IF uma roda chega THEN a TUI SHALL não mudar o estado da tela.
10. **CLK-49** The TUI SHALL não fazer, por causa de um relatório, nenhum pedido ao broker além do `POST /answer` do clique no atalho `enter`, enviado como o da tecla: um por resposta, com a credencial lida na hora do envio.

**Independent Test**: abrir uma pergunta com opções pelo clique, clicar na segunda opção (marca e não envia), clicar em `enter confirmar` (o log ganha o `answer`). Abrir outra, clicar em `outra resposta…`, digitar, clicar fora da caixa (fecha e nada é enviado). Dar um clique duplo em `enter abrir` sobre uma pergunta: o modal abre e nada é enviado.

---

### P2: Ligar e desligar o mouse

**User Story**: Como dev, quero desligar o mouse da TUI para selecionar e copiar texto com o terminal, e ligá-lo de volta.

**Why P2**: Com os relatórios ligados o arrasto simples deixa de selecionar. A navegação por clique funciona sem isto; copiar do feed, não.

**Acceptance Criteria**:

1. **CLK-50** WHEN `m` é pressionada sem modal aberto e com o mouse ligado THEN a TUI SHALL escrever `ESC [ ? 1006 l` e `ESC [ ? 1000 l` e avisar por 4 s `mouse desligado · o terminal seleciona texto`; WHEN é pressionada com o mouse desligado THEN SHALL escrever `ESC [ ? 1000 h` e `ESC [ ? 1006 h` e avisar por 4 s `mouse ligado`.
2. **CLK-51** WHILE o mouse está desligado the TUI SHALL descartar todo relatório que ainda chegue, sem tecla, sem texto e sem mudar o estado da tela.
3. **CLK-52** WHERE `SQUAD_TUI_MOUSE` é `0` the TUI SHALL subir com o mouse desligado, sem escrever as sequências de CLK-01; ausente, vazia ou `1`, SHALL subir com o mouse ligado.
4. **CLK-53** IF `SQUAD_TUI_MOUSE` tem outro valor THEN a TUI SHALL sair com código 1 e uma mensagem que cita a variável e o valor.
5. **CLK-54** WHILE o modal está aberto `m` SHALL ser texto, como hoje; WHILE o terminal tem menos de 120 colunas ou menos de 40 linhas `m` SHALL não mudar nada.
6. **CLK-55** The tela de ajuda SHALL ter, no painel de atalhos, uma linha com a tecla `m` e o texto `mouse liga / desliga · clique = tecla`, numa linha que o frame 11 não dá aos modais de gate e de permissão, declarada na tabela de desvios com a classe D4.

**Independent Test**: `m`, arrastar sobre o feed (o terminal seleciona), `m` de novo, clicar numa aba (troca). `SQUAD_TUI_MOUSE=0 bun tui.ts` sobe sem responder ao clique; `SQUAD_TUI_MOUSE=sim bun tui.ts` sai com 1.

---

### P1: Nada do que existe muda ⭐ MVP

**User Story**: Como dev que usa só o teclado, quero a TUI igual à de antes.

**Why P1**: O design manda tudo navegável por teclado, e os frames são os casos de teste.

**Acceptance Criteria**:

1. **CLK-56** The TUI SHALL dar a toda tecla de TUI-62, TUI-63, QST-64 a QST-67, QST-72 a QST-76 e QST-99 o efeito que ela tinha antes desta fatia, com o mouse ligado ou desligado e com o terminal mandando relatórios ou não.
2. **CLK-57** WHEN um frame do handoff é desenhado a partir do log e do estado dele THEN as 40 linhas SHALL ser as de antes desta fatia, a não ser a linha de CLK-55 na tela de ajuda.

**Independent Test**: os testes de teclas e de frames das fatias TUI leitura e Question passam sem alteração, fora a linha de CLK-55 no frame 11.

---

## Edge Cases

- WHEN a roda para cima chega sobre o feed sem linha selecionada THEN a TUI SHALL fazer como três teclas `k` desse estado: a primeira seleciona a última linha.
- WHEN um clique cai numa linha do feed e a linha clicada é a de um `question` de pergunta que espera o dev, já selecionada THEN a TUI SHALL abrir o modal dela pela regra de `enter` (QST-66), sem enviar nada.
- IF um clique cai na aba em que a TUI já está THEN a TUI SHALL fazer como a tecla dela faz nessa tela: `3` no thread volta ao ticket da linha selecionada, na entrada mais recente.
- WHEN o modal é aberto por um clique e o clique seguinte chega 500 ms ou mais depois THEN a TUI SHALL tratá-lo pelas regras do modal.
- IF `x` ou `y` de um relatório é 0 THEN a TUI SHALL tratá-lo como célula fora da grade (CLK-11).
- IF os inteiros de um relatório têm mais dígitos do que um inteiro seguro comporta THEN a TUI SHALL tratá-lo como célula fora da grade (CLK-11).
- WHEN o terminal é maior que 120×40 e o clique cai fora da grade THEN a TUI SHALL não mudar o estado da tela (CLK-11).
- WHEN o terminal volta a ter 120×40 depois de pequeno THEN os cliques SHALL valer de novo, sem a TUI pedir os relatórios outra vez.
- WHEN `m` desliga o mouse e a TUI sai THEN ela SHALL escrever as sequências de CLK-02 do mesmo jeito.
- IF o terminal não manda relatório algum, por não conhecer o modo 1000 THEN a TUI SHALL funcionar pelo teclado como antes (CLK-56).

---

## Conferência em terminal real

Um agente não clica. O que só um terminal mostra é conferido pelo dev, e o resultado fica
em `.specs/features/tui-clicavel/real-terminal.md`, com o terminal, a versão e a data de
cada item, e com o que ficou sem conferir.

| Item | O que conferir | Onde |
| ---- | -------------- | ---- |
| RT-01 | A sonda mostra uma linha por clique, por soltura e por passo da roda, com a coluna e a linha certas nos quatro cantos da janela | Windows Terminal, antes de qualquer outra tarefa |
| RT-02 | Clicar em cada aba troca de tela | Windows Terminal |
| RT-03 | Clicar numa linha do feed a seleciona; clicar outra vez abre | Windows Terminal |
| RT-04 | A roda rola o feed, o thread, a lista e o histórico; quantos relatórios o terminal manda por passo | Windows Terminal |
| RT-05 | No modal: marcar uma opção com o clique, enviar por `enter confirmar`, e um clique duplo em `enter abrir` não envia | Windows Terminal, com broker de teste |
| RT-06 | Com o mouse ligado, `shift` + arrasto seleciona texto; com `m`, o arrasto simples seleciona | Windows Terminal |
| RT-07 | Depois de `q`, de `ctrl+c` e de fechar a TUI por erro, clicar e rolar no shell não escreve nada | Windows Terminal |
| RT-08 | RT-01, RT-02 e RT-07 num terminal Linux | Um terminal Linux, ou registrar que não foi exercitado |

---

## O que esta fatia deixa para a Gate

- Os selos de gate e de permissão já valem como `g` e `x` (CLK-36, CLK-37): quando a Gate trocar o aviso pelos modais, o clique abre os modais sem mudança nesta fatia.
- Os modais de gate e de permissão seguem as regras do modal de resposta: o mouse fica preso ao modal (CLK-40), o clique marca e não decide (CLK-41), a decisão sai de um atalho da linha 39 que a nomeia (CLK-45), clicar fora fecha (CLK-43), e o clique que chega menos de 500 ms depois do anterior não faz nada (CLK-46).
- A tela de ajuda do frame 11 tem as linhas dos dois modais; a linha de CLK-55 não ocupa nenhuma delas.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CLK-01 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-02 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-03 | P1: O terminal conta onde o mouse clicou | T2 | Implementing |
| CLK-04 | P1: O terminal conta onde o mouse clicou | T2 | Implementing |
| CLK-05 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-06 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-07 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-08 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-09 | P1: O terminal conta onde o mouse clicou | T2 | Implementing |
| CLK-10 | P1: O terminal conta onde o mouse clicou | T2 | Implementing |
| CLK-11 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-12 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-13 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-14 | P1: O terminal conta onde o mouse clicou | T4 | Implementing |
| CLK-15 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-16 | P1: O terminal conta onde o mouse clicou | T2 | Implementing |
| CLK-17 | P1: O terminal conta onde o mouse clicou | - | Pending |
| CLK-18 | P1: Navegar com o clique | T5 | Implementing |
| CLK-19 | P1: Navegar com o clique | T7 | Implementing |
| CLK-20 | P1: Navegar com o clique | T7 | Implementing |
| CLK-21 | P1: Navegar com o clique | - | Pending |
| CLK-22 | P1: Navegar com o clique | T7 | Implementing |
| CLK-23 | P1: Navegar com o clique | T5 | Implementing |
| CLK-24 | P1: Navegar com o clique | - | Pending |
| CLK-25 | P1: Navegar com o clique | - | Pending |
| CLK-26 | P1: Navegar com o clique | - | Pending |
| CLK-27 | P1: Navegar com o clique | T7 | Implementing |
| CLK-28 | P1: Rolar com a roda | T7 | Implementing |
| CLK-29 | P1: Rolar com a roda | - | Pending |
| CLK-30 | P1: Rolar com a roda | - | Pending |
| CLK-31 | P1: Rolar com a roda | - | Pending |
| CLK-32 | P1: Rolar com a roda | - | Pending |
| CLK-33 | P1: Atalhos e selos clicáveis | T6 | Implementing |
| CLK-34 | P1: Atalhos e selos clicáveis | T6 | Implementing |
| CLK-35 | P1: Atalhos e selos clicáveis | T6 | Implementing |
| CLK-36 | P1: Atalhos e selos clicáveis | T5 | Implementing |
| CLK-37 | P1: Atalhos e selos clicáveis | T5 | Implementing |
| CLK-38 | P1: Atalhos e selos clicáveis | T5 | Implementing |
| CLK-39 | P1: Atalhos e selos clicáveis | T5 | Implementing |
| CLK-40 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-41 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-42 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-43 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-44 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-45 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-46 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-47 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-48 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-49 | P1: Modal de resposta com o mouse | - | Pending |
| CLK-50 | P2: Ligar e desligar o mouse | - | Pending |
| CLK-51 | P2: Ligar e desligar o mouse | - | Pending |
| CLK-52 | P2: Ligar e desligar o mouse | T3 | Implementing |
| CLK-53 | P2: Ligar e desligar o mouse | T3 | Implementing |
| CLK-54 | P2: Ligar e desligar o mouse | - | Pending |
| CLK-55 | P2: Ligar e desligar o mouse | - | Pending |
| CLK-56 | P1: Nada do que existe muda | T2 | Implementing |
| CLK-57 | P1: Nada do que existe muda | - | Pending |

**Coverage:** 57 total, 0 mapped to tasks, 57 unmapped: a fatia ainda não tem tarefas.

---

## Success Criteria

- [ ] Com um broker de teste e o log de uma feature de dois tickets, o dev vai da tela principal ao thread de um ticket, à aba Perguntas e ao envio de uma resposta sem tocar no teclado, a não ser para digitar o texto.
- [ ] Os testes de teclas e de frames das fatias TUI leitura e Question passam sem alteração, fora a linha de CLK-55.
- [ ] Um clique duplo em qualquer ponto da tela, com um broker de teste, não grava nenhum `answer`.
- [ ] Depois de sair da TUI por `q`, por `ctrl+c` e por erro, clicar no shell não escreve nada (RT-07).
- [ ] `bun node_modules/typescript/bin/tsc --noEmit` e `bun test` passam no Windows e no Linux, ou a spec registra qual dos dois ficou sem rodar.
- [ ] `real-terminal.md` tem o resultado de RT-01 a RT-08, ou o que ficou sem conferir.
