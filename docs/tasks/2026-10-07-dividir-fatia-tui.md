# Dividir a fatia TUI leitura em TUI telas e TUI ao vivo

**Por quê:** os frames do Claude Design ficaram completos, mas a fatia TUI leitura só podia começar depois de Event e Feature, porque lê `GET /events`. A parte de desenho não depende do broker.
**O quê:** a ordem passa a ser Peer → TUI telas → Event → Feature → TUI ao vivo → Question → Papéis → Gate. TUI telas entrega o buffer de 120×40, as funções de desenho portadas do protótipo e um teste por frame de leitura, com estado fixo. TUI ao vivo liga as telas ao log e à derivação.
**Como:** tabela de slices, linha `Order` e um parágrafo no início da seção TUI leitura de `.design/squad-mvp.md` (a seção e a âncora continuam as mesmas); tabela de fatias de `ROADMAP.md` e de `RUN_FATIAS.md`; decisão AD-005 em `.specs/STATE.md`. O design também passou a dizer que os desenhos pedidos já existem (frames 12 a 25).
**Verificação:** só documentos. Conferido que a tabela de `RUN_FATIAS.md` tem todas as linhas com a mesma largura e que não sobrou "TUI leitura" como nome de fatia em `ROADMAP.md` e `RUN_FATIAS.md`.
**Pendências:**
- `.specs/features/peer/spec.md` ainda cita "Fatia TUI leitura"; não foi alterado para não colidir com o trabalho do PR #2.
- As linhas "Não está no design" da tabela de estados da seção TUI leitura continuam lá; a seção agora avisa que são anteriores aos frames.
- As slices Question e Gate continuam com status `design`, embora os frames delas também existam.
- O branch `docs/design-rodada-2` parte de `feat/peer` e não foi enviado ao remoto.
