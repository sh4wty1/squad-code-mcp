"""Drive an interactive program in a ConPTY and script keys by what the screen shows.

usage: real-session-driver.py <cwd> <script.json> <out-prefix> -- <command...>
script.json: {"env": {...}, "unset_prefix": "CLAUDE", "steps": [{"wait": "regex", "timeout": 60, "send": "\r", "pause": 1}, ...], "tail": 5}
A step waits for its regex on the screen, then sends its keys ("send") and runs its command ("run": ["cmd", "arg"]).
A step with "required": false goes on without them when the regex does not show.
Writes <out-prefix>.screens.txt with the screen at each step. While a step waits, text put in <out-prefix>.in is
typed into the program, <out-prefix>.now.txt has the current screen and a file <out-prefix>.stop ends the run.
"""
import sys, os, json, time, re, subprocess, threading
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

# What a person at the terminal does while a step waits: <out-prefix>.in is typed into the
# program and removed, with Enter after it when it ends in a line break, and
# <out-prefix>.now.txt has the screen of the moment. A file <out-prefix>.stop ends the run.
last_now = 0.0
def live():
    global last_now, alive
    if os.path.exists(out + ".stop"):
        alive = False
        return
    if os.path.exists(out + ".in"):
        typed = open(out + ".in", encoding="utf-8").read()
        os.remove(out + ".in")
        proc.write(typed.rstrip("\n"))
        if typed.endswith("\n"):
            time.sleep(0.7)
            proc.write("\r")
        log.write(f"\n----- typed {typed!r} @ {time.strftime('%H:%M:%S')}\n")
        log.flush()
    if time.time() - last_now > 3:
        last_now = time.time()
        with open(out + ".now.txt", "w", encoding="utf-8") as f:
            f.write(text() + "\n")

for i, step in enumerate(script["steps"]):
    deadline = time.time() + step.get("timeout", 60)
    pattern = step.get("wait")
    found = pattern is None
    while not found and time.time() < deadline and alive:
        if re.search(pattern, text(), re.S):
            found = True
            break
        live()
        time.sleep(0.3)
    snap(f"step {i} wait={pattern!r} found={found}")
    if not found and step.get("required", True):
        print(f"step {i}: {pattern!r} not found")
        break
    time.sleep(step.get("pause", 0.5))
    if "send" in step and alive and found:
        proc.write(step["send"])
    if "run" in step and found:
        # a command of the test itself, such as the decision of the dev for an open request
        done = subprocess.run(step["run"], capture_output=True, text=True, encoding="utf-8", errors="replace")
        log.write(f"\n----- run {step['run']!r} exit={done.returncode}\n{done.stdout}{done.stderr}\n")
        log.flush()
    print(f"step {i}: ok")

time.sleep(script.get("tail", 2))
snap("end")
try:
    proc.terminate(force=True)
except Exception:
    pass
