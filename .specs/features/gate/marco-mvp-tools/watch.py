"""Streams what the dev would notice: new events of the log (compact), the seals of line 1 of
the TUI, and the mother's terminal going idle after a turn (a prompt with no spinner)."""
import json, os, sys, time, urllib.request

D = os.path.dirname(os.path.abspath(__file__))
url = "http://127.0.0.1:7931"
cursor = int(sys.argv[1]) if len(sys.argv) > 1 else 0
seal = None
idle = None
SKIP = {"usage", "turn_started"}

def now(name):
    try:
        return open(os.path.join(D, name + ".now.txt"), encoding="utf-8").read()
    except OSError:
        return ""

while True:
    try:
        events = json.load(urllib.request.urlopen(f"{url}/events?after={cursor}", timeout=3))["events"]
    except Exception:
        events = []
    for e in events:
        cursor = e["seq"]
        if e["kind"] in SKIP:
            continue
        extra = {k: e[k] for k in ("to", "peer", "ticket_ref", "question_id", "gate_id", "scope", "decision", "behavior", "tool_name", "outcome", "error", "attempted_kind") if e.get(k) not in (None, "")}
        print(f"EV {e['seq']} {e['kind']} {e.get('from')} {json.dumps(extra, ensure_ascii=False)} | {(e.get('summary') or '')[:90]}", flush=True)
    lines = now("tui").splitlines()
    s = lines[1][60:].strip() if len(lines) > 1 else ""
    if s != seal:
        seal = s
        print(f"TUI-SEAL {s!r}", flush=True)
    m = now("mother")
    busy = "esc to interrupt" in m
    if busy != idle:
        idle = busy
        if not busy:
            print("MOTHER-IDLE", flush=True)
    time.sleep(2)
