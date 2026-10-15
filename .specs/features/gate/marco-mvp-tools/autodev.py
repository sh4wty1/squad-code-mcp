"""The dev deciding permission requests through the TUI only: for the oldest open request it
presses x, G and a in the TUI (or esc and leaves it open when the command goes outside the
throwaway directory, pushes or reaches the network). Writes one line per decision."""
import json, os, re, time, urllib.request

D = os.path.dirname(os.path.abspath(__file__))
url = "http://127.0.0.1:7931"
DANGER = re.compile(r"push|curl|wget|Invoke-Web|rm -rf|Remove-Item|squad-code-mcp\\\\broker|Fassi\\\\squad|\.\./\.\.", re.I)
handled = set()

def events():
    return json.load(urllib.request.urlopen(f"{url}/events?after=0", timeout=3))["events"]

def open_requests(log):
    decided = {e["request_seq"] for e in log if e["kind"] == "permission_decision"}
    out = []
    for e in log:
        if e["kind"] != "permission_request" or e["seq"] in decided:
            continue
        later = [x for x in log if x["seq"] > e["seq"] and (x.get("from") == e["from"] or (x["kind"] == "peer_left" and x.get("peer") == e["from"]))]
        if not later:
            out.append(e)
    return out

def press(keys):
    p = os.path.join(D, "tui.in")
    while os.path.exists(p):
        time.sleep(0.3)
    open(p, "w", encoding="utf-8").write(keys)
    while os.path.exists(p):
        time.sleep(0.3)
    time.sleep(1.5)

def screen():
    return open(os.path.join(D, "tui.now.txt"), encoding="utf-8").read()

while True:
    try:
        log = events()
    except Exception:
        time.sleep(2)
        continue
    pending = [e for e in open_requests(log) if e["seq"] not in handled]
    if pending:
        e = pending[0]
        label = "P-%02d" % ([x["seq"] for x in log if x["kind"] == "permission_request"].index(e["seq"]) + 1)
        preview = e.get("input_preview") or ""
        # The dev waits for the TUI to show the request before pressing x
        if "permiss" not in screen().splitlines()[1]:
            time.sleep(1)
            continue
        if "⚠ permissão P-" in screen() or "⚠ gate G-" in screen():
            press("\x1b")
        press("x")
        time.sleep(1)
        if f"⚠ permissão {label}" not in screen():
            press("\x1b")
            continue
        handled.add(e["seq"])
        if DANGER.search(preview):
            press("\x1b")
            print(time.strftime("%H:%M:%S"), "LEFT OPEN", e["seq"], e["from"], preview[:200].replace("\n", " "), flush=True)
        else:
            press("G")
            press("a")
            print(time.strftime("%H:%M:%S"), "ALLOWED by TUI", e["seq"], e["from"], preview[:160].replace("\n", " "), flush=True)
    time.sleep(2)
