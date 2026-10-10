# Question: rodada de correção 2

O Verifier independente deu FAIL em `7268928` (`validation.md`, rodada 2): gate verde, os
dez mutantes da rodada 1 mortos, 96 de 98 requisitos fechados, 48 de 51 mutações mortas.
Sobraram duas lacunas. A QST-58 foi corrigida na spec antes desta rodada: ela dizia "ou"
sem dizer quando.

Valem as regras, a matriz de testes e os gates de `tasks.md`. Um commit por tarefa, com a
tarefa marcada aqui.

## Tarefas

### F12: Um bloco com escape pendente não envia

**Lacuna**: lacuna 1 da rodada 2, `broker/tui.ts:180`. `key` segura um escape incompleto no fim do bloco e despacha o resto: `"\r\x1b"` e `"\r\x1b["` chegam a `input` como a tecla `\r` sozinha, e a resposta é enviada, no modo texto e no modo escolha.
**Where**: `broker/tui.ts`
**Requirement**: QST-78

- [ ] O laço diz ao redutor que o bloco tinha mais de uma tecla quando segurou um escape pendente: `key("\r\x1b")` e `key("\r\x1b[")` não fazem `POST`, com o modal no modo texto e no modo escolha (testes em `test/unit/tui-loop.test.ts`)
- [ ] `key("\r")` sozinho continua enviando, e um `esc` sozinho continua fechando o modal depois da espera de 40 ms
- [ ] Os testes de QST-78 que já existem passam sem mudar valor esperado
- [ ] Gate full passa

### F13: Não-bloqueante com opções, na lista e no detalhe

**Lacuna**: lacuna 2 da rodada 2 e mutantes Q16 e Q17, `broker/tui/screens/questions.ts:118` e `:147`. "Tem opções ou é bloqueante" só é testado para bloqueante.
**Where**: `broker/test/unit/tui-questions.test.ts`
**Requirement**: QST-56, QST-58

- [ ] Uma não-bloqueante com duas opções e default mostra na lista `opções 1 <a> · 2 <b> · 3 texto` e nenhuma linha `default`; no detalhe, as duas opções numeradas e `outra resposta (texto livre)`, e nenhuma linha `default`
- [ ] O teste falha com `if (q.blocking)` no lugar da regra, na lista e no detalhe
- [ ] Gate build passa
