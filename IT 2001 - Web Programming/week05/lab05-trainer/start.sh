#!/usr/bin/env bash
# Lab 05 Trainer on Linux / macOS:  bash start.sh
# The trainer runs PHP (WebAssembly) in a Web Worker, so it needs a web server; opening index.html directly does not work.
cd "$(dirname "$0")" || exit 1
PORT=5186
while (ss -ltn 2>/dev/null || netstat -an 2>/dev/null) | grep -q "[:.]$PORT " ; do PORT=$((PORT+1)); done
URL="http://127.0.0.1:$PORT/"
echo ""
echo "  Lab 05 Trainer is running at $URL"
echo "  Do NOT close this terminal while you practise. Stop it with Ctrl+C."
echo ""
( sleep 1; xdg-open "$URL" >/dev/null 2>&1 || open "$URL" >/dev/null 2>&1 ) &
exec python3 -c '
import http.server, sys
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".wasm": "application/wasm", ".js": "text/javascript"}
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
' "$PORT"
