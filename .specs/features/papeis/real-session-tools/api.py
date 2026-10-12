"""api.py register <name> <role> | api.py post <name> <path> <json> | api.py human <path> <json>
A stand-in for a session or for the dev, calling the test broker by its routes. Ids stay in state/ids.json."""
import json, os, subprocess, sys, urllib.request
url = "http://127.0.0.1:" + os.environ["SQUAD_PORT"]
ids_path = os.path.join(os.path.dirname(os.environ["SQUAD_DB"]), "ids.json")
ids = json.load(open(ids_path)) if os.path.exists(ids_path) else {}
def call(path, body):
    path = "/" + path.lstrip("/")  # Git Bash rewrites an argument that starts with a slash
    r = urllib.request.Request(url + path, json.dumps(body).encode(), {"content-type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(r).read())
    except urllib.error.HTTPError as e:
        return {"http": e.code, "body": e.read().decode()}
cmd = sys.argv[1]
if cmd == "register":
    name, role = sys.argv[2], sys.argv[3]
    # the pid of the broker: alive for as long as the test runs
    out = subprocess.run(["netstat", "-ano", "-p", "TCP"], capture_output=True, text=True).stdout
    pid = next(int(l.split()[-1]) for l in out.splitlines() if l.split()[:3] == ["TCP", "127.0.0.1:" + os.environ["SQUAD_PORT"], "0.0.0.0:0"])
    res = call("/register", {"pid": pid, "cwd": os.getcwd(), "git_root": None, "name": name, "role": role})
    if "id" in res:
        ids[name] = res["id"]; json.dump(ids, open(ids_path, "w")); print("registered", name)
    else:
        print(res)
elif cmd == "post":
    print(call(sys.argv[3], {"id": ids[sys.argv[2]], **json.loads(sys.argv[4])}))
elif cmd == "human":
    print(call(sys.argv[2], {"human_token": open(os.environ["SQUAD_TOKEN_FILE"]).read().strip(), **json.loads(sys.argv[3])}))
