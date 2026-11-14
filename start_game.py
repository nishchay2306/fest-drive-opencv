"""Serve Fest Drive on a local, camera-enabled browser origin."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser


GAME_ROOT = Path(__file__).resolve().parent / "game"


def main():
    handler = partial(SimpleHTTPRequestHandler, directory=str(GAME_ROOT))
    with ThreadingHTTPServer(("127.0.0.1", 8000), handler) as server:
        url = f"http://127.0.0.1:{server.server_port}/"
        print(f"Fest Drive: {url}", flush=True)
        print("Keep this terminal open while playing. Press Ctrl+C to stop.", flush=True)
        webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("Fest Drive server stopped.")


if __name__ == "__main__":
    main()
