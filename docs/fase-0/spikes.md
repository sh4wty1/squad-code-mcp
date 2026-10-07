# Fase 0: spikes A e B

Rodados em 2026-10-07, Windows 11, Claude Code 2.1.292, Bun 1.3.14. Código descartável em
`C:\tmp\fase0-spikes`, fora do repositório: `canal.ts` (servidor de canal), `hook-log.ts` e
`.claude/settings.json` (27 hooks gravando o payload), `smoke.ts` (confere o servidor sem
Claude Code).

Uma sessão só, `3a4e67c3-7f43-4f63-8fee-38ca3b79e61a`, lançada numa janela nova com as
variáveis `CLAUDE*` removidas:

```powershell
claude --dangerously-load-development-channels server:spike
```

Modo de permissão `default`. Nenhum texto foi digitado na sessão: os três turnos foram
abertos por `POST` no servidor de canal. As evidências são `canal.jsonl` (o que o servidor
recebeu e mandou), `hooks.jsonl` (cada hook que disparou) e o transcript da sessão. Horas
em UTC.

| Spike | Resultado |
|---|---|
| A, relay de permissão pelo canal | Funciona, com `allow` e com `deny` |
| B, hook de início de turno aberto por canal | `UserPromptSubmit` dispara |

## Spike A: relay de permissão

**Pergunta.** Com a sessão parada num pedido de permissão, o pedido chega ao servidor de
canal e o veredito devolvido libera a sessão?

**O que a documentação promete.** Um servidor que declara
`experimental['claude/channel/permission']` e foi carregado com `--channels` ou com a flag
de desenvolvimento recebe `notifications/claude/channel/permission_request` com
`request_id`, `tool_name`, `description` e `input_preview`. O veredito volta como
`notifications/claude/channel/permission` com `request_id` e `behavior`. O diálogo local
continua aberto e vale a primeira resposta. Exige v2.1.234 ou mais nova.

**O que foi visto.** O servidor declarou só `claude/channel` e `claude/channel/permission`,
sem `tools`.

`allow`:

| Hora | Fonte | Evento |
|---|---|---|
| 17:55:18.125 | canal | push: "Use a tool Bash para rodar exatamente: echo spike-a > relay-allow.txt" |
| 17:55:20.164 | hook | `PreToolUse` Bash |
| 17:55:20.211 | canal | `permission_request` `rdwmg` recebido |
| 17:55:20.305 | hook | `PermissionRequest` |
| 17:55:26.314 | hook | `Notification` `permission_prompt` |
| 17:55:30 | disco | `relay-allow.txt` ainda não existe |
| 17:55:32.375 | canal | veredito `allow rdwmg` enviado |
| 17:55:33.483 | hook | `PostToolUse`, `duration_ms` 982 |
| 17:55:34.940 | hook | `Stop`; `relay-allow.txt` contém `spike-a` |

`deny`:

| Hora | Fonte | Evento |
|---|---|---|
| 17:55:45.043 | canal | push pedindo `echo spike-a > relay-deny.txt` |
| 17:55:46.584 | canal | `permission_request` `xwuqn` recebido |
| 17:55:55.172 | canal | veredito `deny xwuqn` enviado |
| 17:55:55.311 | hook | `PostToolBatch`: "The user doesn't want to proceed with this tool use..." |
| 17:55:56.236 | hook | `Stop`, última mensagem `negado`; `relay-deny.txt` não existe |

O pedido como chegou ao servidor:

```json
{"request_id":"rdwmg","tool_name":"Bash","description":"Write spike-a to relay-allow.txt",
 "input_preview":"{ \"command\": \"echo spike-a > relay-allow.txt\", \"description\": \"Write spike-a to relay-allow.txt\" }"}
```

- O pedido chegou ao servidor 47 ms depois do `PreToolUse`, antes do hook `PermissionRequest`.
- A sessão ficou parada 12 s (`allow`) e 9 s (`deny`) e andou 0,1 s depois de cada veredito.
- `description` é a descrição escrita pelo modelo; o comando só aparece em `input_preview`.

**Limite da evidência.** A conclusão de que foi o veredito que liberou a sessão vem dos
tempos acima; ninguém registrou a tela do terminal durante o teste.

**Não testado.**

- Resposta no terminal antes do veredito, e o que o servidor vê nesse caso.
- Veredito com `request_id` errado ou repetido.
- Outras tools além de Bash, e o modo `auto`.
- Servidor carregado por plugin (`plugin:nome@marketplace`) em vez de `server:nome`.

### O que muda no ADR-011

- O status pode sair de "Proposed (depende do spike de relay da Fase 0)" para "Accepted".
- Sai da lista de consequências negativas "não foi testado com canal de desenvolvimento".
- `permission_request` e `permission_decision` ficam no contrato; o plano de volta (hook
  que emite `blocked`, saída pelo terminal) não é necessário.
- O modal da TUI precisa mostrar `input_preview`: `description` sozinha não diz o comando.
- Continua valendo a regra de fechar o pedido em qualquer evento posterior do mesmo peer:
  o spike não viu nenhum aviso de fechamento, mas também não testou a resposta no terminal.

## Spike B: hook de início de turno

**Pergunta.** Qual hook dispara no início de um turno aberto por um evento de canal?

**O que a documentação promete.** Nada sobre canais. A página de hooks diz que
`UserPromptSubmit` dispara em prompt digitado e também em tarefa agendada, subagente em
background reportando e mensagem de outra sessão.

**O que foi visto.** `UserPromptSubmit` disparou nos três turnos abertos por canal, o
primeiro numa sessão em que nada tinha sido digitado:

| Push no canal | `UserPromptSubmit` | Atraso |
|---|---|---|
| 17:55:04.874 | 17:55:05.016 | 142 ms |
| 17:55:18.125 | 17:55:18.276 | 151 ms |
| 17:55:45.043 | 17:55:45.162 | 119 ms |

Payload do primeiro:

```json
{"session_id":"3a4e67c3-7f43-4f63-8fee-38ca3b79e61a",
 "transcript_path":"C:\\Users\\Dev\\.claude\\projects\\C--tmp-fase0-spikes\\3a4e67c3-7f43-4f63-8fee-38ca3b79e61a.jsonl",
 "cwd":"C:\\tmp\\fase0-spikes",
 "scratchpad_dir":"C:\\Users\\Dev\\AppData\\Local\\Temp\\claude\\C--tmp-fase0-spikes\\3a4e67c3-7f43-4f63-8fee-38ca3b79e61a\\scratchpad",
 "prompt_id":"63733010-c749-424d-8c78-5f7480c17955",
 "permission_mode":"default",
 "hook_event_name":"UserPromptSubmit",
 "prompt":"<channel source=\"spike\">\nResponda apenas: pong\n</channel>"}
```

Todos os hooks da sessão, na ordem, com os campos além dos comuns (`session_id`,
`transcript_path`, `cwd`, `scratchpad_dir`, `hook_event_name`):

| Hook | Vezes | Quando | Campos próprios |
|---|---|---|---|
| `SessionStart` | 1 | ao abrir | `source: "startup"`, `model` |
| `InstructionsLoaded` | 1 | ao abrir | `file_path`, `memory_type`, `load_reason` |
| `UserPromptSubmit` | 3 | início de cada turno | `prompt_id`, `permission_mode`, `prompt` |
| `PreToolUse` | 2 | antes do Bash | `tool_name`, `tool_input`, `tool_use_id` |
| `PermissionRequest` | 2 | diálogo abre | `tool_name`, `tool_input`, `permission_suggestions` |
| `Notification` | 2 | 6 s com o diálogo aberto | `message`, `notification_type: "permission_prompt"` |
| `PostToolUse` | 1 | só no `allow` | `tool_response`, `duration_ms` |
| `PostToolBatch` | 2 | depois do Bash, também no `deny` | `tool_calls` |
| `MessageDisplay` | 3 | texto da resposta | `turn_id`, `message_id`, `index`, `final`, `delta` |
| `Stop` | 3 | fim de cada turno | `stop_hook_active`, `last_assistant_message`, `background_tasks`, `session_crons`, `effort` |

- O `prompt` de um turno aberto por canal começa com `<channel source="...">`.
- No transcript, a entrada do turno traz `"origin":{"kind":"channel","server":"spike"}`.
- `Stop` recebe `transcript_path`, o que responde também o spike de fim de turno listado
  nas perguntas abertas do design.
- O transcript foi gravado (292 KB), então a limpeza das variáveis `CLAUDE*` funcionou.

Ficaram sem registro, por decisão: `WorktreeCreate`, `WorktreeRemove`, `FileChanged`,
`PreModelSwitch`, `PostModelSwitch` e `Setup`.

**Não testado.**

- Turno digitado na mesma sessão, para comparar o payload.
- Evento que chega com a sessão ocupada. A documentação diz que eventos acumulados são
  entregues juntos no turno seguinte; não se sabe se isso gera um `UserPromptSubmit` ou vários.

### O que muda no ADR-006

- O status pode perder a ressalva "a marca de início de turno depende de um spike da Fase 0".
- `turn_started` é emitido pelo hook `UserPromptSubmit` e `usage` pelo hook `Stop`, como
  decidido. O plano de volta (o servidor MCP emite `turn_started` no push, `stalled` com
  tolerância em segundos) não é necessário, e a consequência negativa que o descreve sai.
- Entre o push e o `turn_started` há cerca de 150 ms em que o agente já recebeu o evento e
  ainda não está em turno. A regra de `stalled` não deve disparar nessa janela.
- Fica uma pergunta para a fatia Papéis: eventos acumulados num turno só marcam um
  `turn_started`?
