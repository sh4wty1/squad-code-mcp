"""decide.py <allow|deny>: the decision of the dev for the latest open permission request, by the route."""
import json, os, sys, urllib.request
url = "http://127.0.0.1:" + os.environ["SQUAD_PORT"]
events = json.load(urllib.request.urlopen(url + "/events?after=0"))["events"]
req = [e for e in events if e["kind"] == "permission_request"][-1]
if len(sys.argv) > 2 and req["from"] == sys.argv[2]: sys.exit("the latest request is of " + sys.argv[2] + ": left for the dev to read")
print("request", req["seq"], req["from"], req.get("tool_name"), json.dumps(req.get("input_preview"))[:160])
body = {"human_token": open(os.environ["SQUAD_TOKEN_FILE"]).read().strip(), "request_seq": req["seq"], "behavior": sys.argv[1]}
r = urllib.request.Request(url + "/permission-decision", json.dumps(body).encode(), {"content-type": "application/json"})
try:
    print("decision", sys.argv[1], urllib.request.urlopen(r).read().decode())
except urllib.error.HTTPError as e:
    print("decision", sys.argv[1], e.code, e.read().decode())
