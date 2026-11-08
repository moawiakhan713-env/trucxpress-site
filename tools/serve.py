"""Local preview with the same clean URLs as the live site.

    python3 tools/serve.py        # then open http://localhost:8080

/contact serves contact.html, like .htaccess does on Hostinger.
(Forms do not send locally: there is no PHP here.)
"""
import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        name = path.strip('/')
        if name and '/' not in name and '.' not in name and (ROOT / f'{name}.html').is_file():
            self.path = f'/{name}.html' + self.path[len(path):]
        return super().send_head()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
print(f'TrucXpress preview: http://localhost:{port}')
http.server.ThreadingHTTPServer(('', port), functools.partial(Handler, directory=str(ROOT))).serve_forever()
