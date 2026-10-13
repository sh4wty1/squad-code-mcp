"""standin.py <name> <role>: registers with its own pid, keeps the id in state/ids.json and sends the heartbeat until killed."""
import json, os, sys, time, urllib.request
url = "http://127.0.0.1:" + os.environ["SQUAD_PORT"]
ids_path = os.path.join(os.path.dirname(os.environ["SQUAD_DB"]), "ids.json")
def call(path, body):
    r = urllib.request.Request(url + path, json.dumps(body).encode(), {"content-type": "application/json"})
    return json.loads(urllib.request.urlopen(r).read())
name, role = sys.argv[1], sys.argv[2]
res = call("/register", {"pid": os.getpid(), "cwd": os.getcwd(), "git_root": None, "name": name, "role": role})
ids = json.load(open(ids_path)) if os.path.exists(ids_path) else {}
ids[name] = res["id"]; ids[name + ".pid"] = os.getpid()
json.dump(ids, open(ids_path, "w"))
while True:
    time.sleep(15)
    try: call("/heartbeat", {"id": res["id"]})
    except Exception: pass
