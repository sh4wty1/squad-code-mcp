"""Drive an interactive program in a ConPTY and script keys by what the screen shows.

usage: real-session-driver.py <cwd> <script.json> <out-prefix> -- <command...>
script.json: {"env": {...}, "unset_prefix": "CLAUDE", "steps": [{"wait": "regex", "timeout": 60, "send": "\r", "pause": 1}, ...], "tail": 5}
Writes <out-prefix>.screens.txt with the screen at each step.
"""
import sys, os, json, time, re, threading
import pyte
from winpty import PtyProcess

cwd, script_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
cmd = sys.argv[sys.argv.index("--") + 1:]
script = json.load(open(script_path, encoding="utf-8"))
env = {k: v for k, v in os.environ.items() if not k.startswith(script.get("unset_prefix", "\0"))}
env.update(script.get("env", {}))
COLS, ROWS = 140, 50
screen = pyte.Screen(COLS, ROWS)
stream = pyte.Stream(screen)
proc = PtyProcess.spawn(cmd, cwd=cwd, env=env, dimensions=(ROWS, COLS))
lock = threading.Lock()
alive = True

def pump():
    global alive
    while True:
        try:
            data = proc.read(4096)
        except Exception:
            break
        if not data:
            break
        with lock:
            stream.feed(data)
    alive = False

threading.Thread(target=pump, daemon=True).start()

def text():
    with lock:
        return "\n".join(line.rstrip() for line in screen.display).rstrip()

log = open(out + ".screens.txt", "w", encoding="utf-8")
def snap(label):
    log.write(f"\n===== {label} @ {time.strftime('%H:%M:%S')}\n{text()}\n")
    log.flush()

for i, step in enumerate(script["steps"]):
    deadline = time.time() + step.get("timeout", 60)
    pattern = step.get("wait")
    found = pattern is None
    while not found and time.time() < deadline and alive:
        if re.search(pattern, text(), re.S):
            found = True
            break
        time.sleep(0.3)
    snap(f"step {i} wait={pattern!r} found={found}")
    if not found and step.get("required", True):
        print(f"step {i}: {pattern!r} not found")
        break
    time.sleep(step.get("pause", 0.5))
    if "send" in step and alive and found:
        proc.write(step["send"])
    print(f"step {i}: ok")

time.sleep(script.get("tail", 2))
snap("end")
try:
    proc.terminate(force=True)
except Exception:
    pass
