"""events.py: the log of the test broker, one line per event."""
import json, os, urllib.request
for e in json.load(urllib.request.urlopen("http://127.0.0.1:" + os.environ["SQUAD_PORT"] + "/events?after=0"))["events"]:
    extra = {k: e[k] for k in ("to", "peer", "ticket_ref", "question_id", "outcome", "task_seq", "result_seq", "request_seq", "behavior", "tool_name", "blocking", "model", "input", "output", "cache_write", "cache_read", "error", "reason") if e.get(k) not in (None, "")}
    s = (e.get("summary") or "")[:90]
    print(e["seq"], e["kind"], e.get("from"), json.dumps(extra, ensure_ascii=False), ("| " + s) if s else "")
