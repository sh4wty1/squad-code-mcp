# Importar a segunda rodada de frames da TUI do Claude Design

**Por quê:** o handoff do Claude Design pedia para implementar `Squad TUI.dc.html`. O zip do repositório era da primeira rodada e não tinha os estados pedidos em `PROMPT-estados-faltantes-2.md` (permissão, `stalled`, `planned`, `dropped`, recusa). A fatia TUI leitura depende de Event e Feature, que ainda não existem, então o código da TUI não foi escrito agora.
**O quê:** a versão atual do design está no repositório e documentada. O item "Segunda rodada de frames" do `ROADMAP.md` foi marcado.
**Como:** leitura do projeto `342a75e9-…` pelo `DesignSync` (depois de `/design-login`). `Squad TUI.dc.html` (938 linhas) substituiu o de 786 dentro de `docs/claude-design-handoff/TUI de observabilidade de squad Claude (1).zip`; `support.js` é idêntico ao que já estava lá. Seção 7 acrescentada a `docs/claude-design-handoff/DESIGN-NOTES.md`: frames 12 a 25, permissão, `stalled`, plano, recusas, o que o design decidiu por conta própria e o que deixou de ser "Não está no design" em `.design/squad-mvp.md`.
**Verificação:** o HTML dentro do zip é byte a byte o do projeto remoto (`cmp`); a resposta do `get_file` veio com `truncated: false`. Os números de linha citados na seção 7 foram conferidos por `grep` no arquivo. O protótipo não foi aberto num navegador: os frames foram lidos no código, não vistos.
**Pendências:**
- Implementar a TUI: fatia TUI leitura, via `/tlc-spec-driven`, depois de Event e Feature.
- `.design/squad-mvp.md` ainda diz "Não está no design" em oito linhas da fatia TUI leitura; não foi alterado.
- Decidir D2 a D5 da seção 7.6 (id `P-01`, trava do `a`, linhas de sistema sintetizadas pela TUI) antes da spec da fatia.
- A lista do que o Claude Design decidiu por conta própria na primeira rodada continua pendente no `ROADMAP.md`: ela está na conversa do Claude Design, não nos arquivos do projeto.
