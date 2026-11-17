"""Tiny local web server for previewing the site.

Run it with:  python3 tools/serve.py
Then open:    http://localhost:4173
"""
import functools
import http.server
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 4173


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Always serve the newest version of each file while editing.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
        print(f"Serving {ROOT} at http://localhost:{PORT}")
        server.serve_forever()
