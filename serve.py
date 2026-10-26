"""Serve planner.html locally, relay /api/* to aion2.exchange for market prices,
and serve /g2g/rate (cheapest G2G kinah offers, USD per 1M) for the RMT value.

Run:  python serve.py      (opens http://127.0.0.1:8765/planner.html)
"""
import json
import os
import time
import urllib.request
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get("PORT", 8765))
UPSTREAM = os.environ.get("AION2_UPSTREAM", "https://aion2.exchange")
CACHE_SECONDS = 600
_cache = {}

# G2G listing for AION 2 kinah, Siel - Elyos [NA West] (price is USD per 1M kinah)
G2G_SEARCH = os.environ.get("G2G_SEARCH", (
    "https://sls.g2g.com/v3/offer/search?region_id=dfced32f-2f0a-4df5-a218-1e068cfadffa"
    "&filter_attr=lgc_37781_dropdown_11:lgc_37781_dropdown_11_64650&sort={sort}"
    "&seo_term=aion-2-kinah&page_size=20&group=0&currency=USD&country=US&v=v2"))


def g2g_offers(sort):
    req = urllib.request.Request(G2G_SEARCH.format(sort=sort), headers={"User-Agent": "Mozilla/5.0 (personal price check)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        results = json.load(r).get("payload", {}).get("results", [])
    return [{"seller": o.get("username"), "price": o.get("converted_unit_price") or o.get("unit_price"),
             "satisfaction": o.get("satisfaction_rate"), "orders": o.get("total_success_order"), "level": o.get("user_level")}
            for o in results if (o.get("converted_unit_price") or o.get("unit_price"))]


def g2g_rate():
    """G2G's own ranking (recommended) and the cheapest offers, both in G2G's order."""
    return json.dumps({"recommended": g2g_offers("recommended_v4"), "lowest": g2g_offers("lowest_price"),
                       "at": int(time.time())}).encode()


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/g2g/rate":
            return self._cached("/g2g/rate", g2g_rate)
        if not self.path.startswith("/api/"):
            return super().do_GET()
        self._cached(self.path, self._upstream)

    def _upstream(self):
        req = urllib.request.Request(UPSTREAM + self.path,
                                     headers={"User-Agent": "aion2-transfer-crafting-calculator/0.1 (personal use)"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read()

    def _cached(self, key, fetch):
        hit = _cache.get(key)
        if hit and time.time() - hit[0] < CACHE_SECONDS:
            return self._send(200, hit[1])
        try:
            body = fetch()
            _cache[key] = (time.time(), body)
            self._send(200, body)
        except Exception as e:
            self._send(502, json.dumps({"error": f"{type(e).__name__}: {e}"}).encode())

    def _send(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        if self.path.startswith(("/api/", "/g2g/")):
            super().log_message(fmt, *args)


class Server(ThreadingHTTPServer):
    allow_reuse_address = False  # on Windows reuse lets a second copy share the port silently


if __name__ == "__main__":
    url = f"http://127.0.0.1:{PORT}/planner.html"
    try:
        server = Server(("127.0.0.1", PORT), partial(Handler, directory=str(Path(__file__).parent)))
    except OSError:
        print(f"Already running at {url}")
        if not os.environ.get("NO_BROWSER"):
            webbrowser.open(url)
        raise SystemExit
    print(f"Transfer Crafting Calculator running at {url}  (Ctrl+C to stop)")
    if not os.environ.get("NO_BROWSER"):
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
