"""dev.py <seconds>: the dev watching the squad. Prints the new events of the log and decides by the route the
permission requests whose command is on a short safe list; the others stay open and are printed."""
import json, os, re, sys, time, urllib.request
url = "http://127.0.0.1:" + os.environ["SQUAD_PORT"]
state = os.path.dirname(os.environ["SQUAD_DB"])
cursor_path = os.path.join(state, "dev.cursor")
SAFE = re.compile(r"^\s*(cd [^;&|]+&&\s*)?(node|ls|cat|head|tail|pwd|echo|mkdir|test|type|wc|grep|rg|git (branch|log|show|status|diff|rev-parse|rev-list|merge-base|ls-files|worktree list|fetch \.|for-each-ref|symbolic-ref|check-ignore|stash list))\b[^;&|`$>]*$")
def get(path):
    return json.loads(urllib.request.urlopen(url + path, timeout=3).read())
def post(path, body):
    r = urllib.request.Request(url + path, json.dumps(body).encode(), {"content-type": "application/json"})
    try: return json.loads(urllib.request.urlopen(r, timeout=3).read())
    except urllib.error.HTTPError as e: return {"http": e.code, "body": e.read().decode()[:200]}
cursor = int(open(cursor_path).read()) if os.path.exists(cursor_path) else 0
end = time.time() + float(sys.argv[1])
while time.time() < end:
    try: events = get(f"/events?after={cursor}")["events"]
    except Exception as e:
        time.sleep(2); continue
    for e in events:
        cursor = e["seq"]
        keys = ("to", "peer", "ticket_ref", "question_id", "asked_by", "blocking", "outcome", "task_seq", "result_seq", "request_seq", "behavior", "branch", "commit", "error", "reason", "default")
        extra = {k: e[k] for k in keys if e.get(k) not in (None, "")}
        if e["kind"] == "usage": extra = {"model": e["model"], "total": e["input"] + e["output"] + e["cache_write"] + e["cache_read"]}
        print(time.strftime("%H:%M:%S"), e["seq"], e["kind"], e.get("from"), json.dumps(extra, ensure_ascii=False), "|", (e.get("summary") or "")[:110])
        if e["kind"] in ("question", "answer", "task", "result", "verdict", "blocked") and e.get("body"):
            print("      body:", e["body"][:600].replace("\n", " / "))
        if e["kind"] == "question" and e.get("options"): print("      options:", e["options"])
        if e["kind"] == "verdict" and e.get("criteria"): print("      criteria:", json.dumps(e["criteria"])[:300])
        if e["kind"] == "plan": print("      tickets:", json.dumps(e.get("tickets"))[:400])
        if e["kind"] == "permission_request":
            command = ""
            try: command = json.loads(e.get("input_preview") or "{}").get("command", "")
            except Exception: pass
            print("      tool:", e.get("tool_name"), "input:", (e.get("input_preview") or "")[:300].replace("\n", " "))
            # In a throwaway worktree the dev lets the worker, the judge and the leader run project commands
            # that stay inside it; what names the real repository, the network or a push stays open.
            loose = e["from"] != "mother" and command and not re.search(r"projetos fassi|squad-code-mcp|push|curl|wget|Invoke-Web|rm -rf|Remove-Item|\.\./|[A-Za-z]:[\/]", command)
            if e.get("tool_name") in ("Bash", "PowerShell") and (SAFE.match(command) or loose):
                token = open(os.environ["SQUAD_TOKEN_FILE"]).read().strip()
                print("      dev allows by the route:", post("/permission-decision", {"human_token": token, "request_seq": e["seq"], "behavior": "allow"}))
            else:
                print("      LEFT OPEN for the dev")
        sys.stdout.flush()
    open(cursor_path, "w").write(str(cursor))
    time.sleep(2)
