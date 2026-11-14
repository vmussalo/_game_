"""FarmSim Online – testipalvelin: jakaa pelin tiedostot ja jäljittelee api/farm.php-rajapintaa muistissa.

Käyttö (FarmSimOnline-kansiossa):  python scripts/mock_server.py 8770
Vain paikalliseen testaukseen – oikea palvelinkoodi on api/farm.php.
"""
import hashlib
import json
import os
import re
import secrets
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
NAME_RE = re.compile(r"^[\w .\-]{2,20}$", re.UNICODE)
WORDS = ["KANA", "LEHMÄ", "SIKA", "PELTO", "VILJA", "HEINÄ", "TRAKTORI", "SIILO", "LAMMAS", "OHRA", "KAURA", "NAURIS"]
FARMS = {}


def key(name):
    return hashlib.sha256(name.strip().lower().encode("utf-8")).hexdigest()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *args):
        pass

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path.endswith("/api/farm.php"):
            q = parse_qs(u.query)
            a = q.get("a", [""])[0]
            if a == "check":
                return self.send_json({"ok": True})
            if a == "top":
                me = q.get("me", [""])[0].lower()
                rows = sorted(
                    [f for f in FARMS.values() if f.get("meta")],
                    key=lambda f: -f["meta"].get("worth", 0),
                )[:50]
                return self.send_json({"ok": True, "entries": [
                    {"r": i + 1, "n": f["name"], "f": f["meta"].get("farm", ""), "g": f["meta"].get("region", ""),
                     "y": f["meta"].get("year", 1), "w": f["meta"].get("worth", 0), "me": f["name"].lower() == me}
                    for i, f in enumerate(rows)]})
            return self.send_json({"ok": False, "error": "action"}, 400)
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        if not u.path.endswith("/api/farm.php"):
            return self.send_json({"ok": False, "error": "notfound"}, 404)
        n = int(self.headers.get("Content-Length", 0))
        try:
            j = json.loads(self.rfile.read(n).decode("utf-8"))
        except ValueError:
            return self.send_json({"ok": False, "error": "json"}, 400)
        a, name = j.get("a"), str(j.get("name", ""))
        if not NAME_RE.match(name.strip()):
            return self.send_json({"ok": False, "error": "name"}, 400)
        k = key(name)
        f = FARMS.get(k)
        now = time.time()
        if a == "create":
            if f:
                return self.send_json({"ok": False, "error": "taken"}, 409)
            code = "%s-%04d" % (secrets.choice(WORDS), secrets.randbelow(10000))
            token = secrets.token_hex(16)
            FARMS[k] = {"name": name.strip(), "code": code, "token": token, "state": None, "savedAt": 0, "meta": None}
            return self.send_json({"ok": True, "code": code, "token": token, "now": now})
        if a == "login":
            if not f or f["code"] != str(j.get("code", "")).upper():
                return self.send_json({"ok": False, "error": "auth"}, 403)
            f["token"] = secrets.token_hex(16)
            return self.send_json({"ok": True, "token": f["token"], "state": f["state"], "savedAt": f["savedAt"], "now": now})
        if a == "save":
            if not f or f["token"] != j.get("token"):
                return self.send_json({"ok": False, "error": "token"}, 403)
            f["state"] = j.get("state")
            f["meta"] = j.get("meta")
            f["savedAt"] = now
            return self.send_json({"ok": True, "savedAt": now})
        if a == "delete":
            if not f or f["code"] != str(j.get("code", "")).upper():
                return self.send_json({"ok": False, "error": "auth"}, 403)
            del FARMS[k]
            return self.send_json({"ok": True, "deleted": True})
        return self.send_json({"ok": False, "error": "action"}, 400)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8770
    print("FarmSim Online -testipalvelin: http://127.0.0.1:%d/" % port)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
