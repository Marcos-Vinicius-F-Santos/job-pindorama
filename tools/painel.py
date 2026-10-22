#!/usr/bin/env python3
"""Painel local da busca de vagas: a parte mecânica do /scrape em botões.

Para quem não usa terminal nem conversa com o Claude: um servidor pequeno, só no
próprio computador (127.0.0.1), abre uma página no navegador com

  * Buscar vagas  - roda `tools/scrape_run.py search` nas prioridades escolhidas;
  * Vagas novas   - a lista, com filtros, avisos do posting_signals e link;
                    "Me interessa" grava encaixe médio e "Descartar" grava baixo
                    em job_scraper/seen_jobs.json (`scrape_run.record`), então a
                    busca seguinte não mostra a vaga de novo;
  * Me interessam - as vagas marcadas aqui, com o comando para o Claude avaliar;
  * Candidaturas  - as linhas de job_search_tracker.csv.

Nada aqui chama o Claude: avaliar a vaga e escrever currículo e carta continuam
no /apply e no /rank.

Segurança: só escuta em 127.0.0.1; cada execução gera um token, embutido na
página, que todo pedido de escrita precisa mandar; pedidos com Host de outro
nome são recusados (contra DNS rebinding). As vagas são dados de terceiros: a
página as mostra como texto, nunca como HTML, e o arquivo da busca fica fora do
repositório (pasta temporária), como no scrape_run.

Uso:
  python3 tools/painel.py [--port 8765] [--no-browser]
"""

import argparse
import csv
import json
import os
import secrets
import subprocess
import sys
import tempfile
import threading
import webbrowser
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import scrape_run  # noqa: E402

ROOT = scrape_run.ROOT
PAGE = Path(__file__).resolve().parent / "painel" / "index.html"
MAX_BODY = 1_000_000

DECISIONS = {
    "interesse": {"fit": "medium", "status": "new"},
    "descartar": {"fit": "low", "status": "skipped"},
}


# ---------------------------------------------------------------------------
# Dados (funções puras, testadas sem servidor)
# ---------------------------------------------------------------------------

def results_path(day: str | None = None) -> Path:
    """O arquivo da busca do painel: na pasta temporária, nunca no repositório."""
    return Path(tempfile.gettempdir()) / f"painel_busca_{day or date.today().isoformat()}.json"


def load_results(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def unseen(results: dict | None, seen_path: Path = scrape_run.SEEN, tracker_path: Path = scrape_run.TRACKER) -> dict:
    """O arquivo da busca sem as vagas que já foram marcadas (aqui ou no /scrape) depois dela."""
    if not results:
        return {"meta": None, "new": []}
    index = scrape_run.load_seen(seen_path, tracker_path)
    rows = [r for r in results.get("new", []) if isinstance(r, dict)
            and not index.match(r.get("company"), r.get("title"), r.get("url"))]
    return {**results, "new": rows}


def mark(results: dict | None, urls: list, decision: str, seen_path: Path = scrape_run.SEEN) -> dict:
    """Grava a decisão das vagas escolhidas, achadas pela URL no arquivo da busca.

    A página manda só URLs: os campos gravados vêm do arquivo da busca, nunca do
    navegador.
    """
    if decision not in DECISIONS:
        raise ValueError(f"decisão desconhecida: {decision}")
    by_url = {r.get("url"): r for r in (results or {}).get("new", []) if isinstance(r, dict) and r.get("url")}
    rows, missing = [], []
    for url in urls:
        row = by_url.get(url)
        if row is None:
            missing.append(url)
            continue
        rows.append({
            "title": row.get("title"), "company": row.get("company"), "url": row.get("url"),
            "date": row.get("date"), "deadline": row.get("deadline"), "portal": row.get("portal"),
            "source": "painel", **DECISIONS[decision],
        })
    out = scrape_run.record(rows, seen_path)
    out["missing"] = missing
    return out


def saved(seen_path: Path = scrape_run.SEEN) -> list:
    """As vagas marcadas como "me interessa" no painel, mais recentes primeiro."""
    try:
        state = json.loads(seen_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    rows = [
        {k: e.get(k) for k in ("title", "company", "url", "first_seen", "posted_date", "deadline", "portal", "status")}
        for e in state.get("seen", {}).values()
        if e.get("source") == "painel" and e.get("fit") != "low"
    ]
    return sorted(rows, key=lambda r: r.get("first_seen") or "", reverse=True)


def applications(tracker_path: Path = scrape_run.TRACKER) -> list:
    if not tracker_path.exists():
        return []
    with tracker_path.open(encoding="utf-8", newline="") as fh:
        return [dict(row) for row in csv.DictReader(fh)]


def priorities(queries_path: Path = scrape_run.QUERIES) -> list:
    """As prioridades com linhas de busca prontas (as do modelo, com [YOUR_...], não contam)."""
    try:
        calls = scrape_run.parse_queries(queries_path.read_text(encoding="utf-8"))
    except OSError:
        return []
    count = {}
    for prio, portal, _ in calls:
        count.setdefault(prio, set()).add(portal)
    return [{"priority": p, "queries": sum(1 for c in calls if c[0] == p), "portals": len(count[p])} for p in sorted(count)]


# ---------------------------------------------------------------------------
# Busca em segundo plano
# ---------------------------------------------------------------------------

class SearchJob:
    """Uma busca por vez, rodando o scrape_run num processo à parte."""

    def __init__(self, out: Path):
        self.out = out
        self.lock = threading.Lock()
        self.running = False
        self.started = None
        self.error = None
        self.summary = None

    def status(self) -> dict:
        with self.lock:
            return {"running": self.running, "started": self.started, "error": self.error, "summary": self.summary}

    def start(self, prios: list, jobage: int) -> bool:
        with self.lock:
            if self.running:
                return False
            self.running, self.error, self.summary = True, None, None
            self.started = datetime.now().isoformat(timespec="seconds")
        cmd = [sys.executable, str(ROOT / "tools" / "scrape_run.py"), "search",
               "--priority", ",".join(str(p) for p in prios), "--jobage", str(jobage), "--out", str(self.out)]
        threading.Thread(target=self._run, args=(cmd,), daemon=True).start()
        return True

    def _run(self, cmd: list) -> None:
        try:
            proc = subprocess.run(cmd, capture_output=True, cwd=ROOT, timeout=1800,
                                  env={**os.environ, "PYTHONIOENCODING": "utf-8"})
            text = proc.stdout.decode("utf-8", errors="replace")
            err = proc.stderr.decode("utf-8", errors="replace").strip()
            with self.lock:
                self.summary = "\n".join(l for l in text.splitlines() if not l.startswith("saved="))
                self.error = (err or f"a busca terminou com erro ({proc.returncode})") if proc.returncode else None
        except Exception as exc:  # a página precisa saber que falhou, seja como for
            with self.lock:
                self.error = str(exc)
        finally:
            with self.lock:
                self.running = False


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

def make_handler(token: str, job: SearchJob, allowed_hosts: set):
    class Handler(BaseHTTPRequestHandler):
        server_version = "painel/1.0"

        def log_message(self, fmt, *args):  # sem log de cada pedido no terminal
            pass

        def _send(self, code: int, body, ctype: str = "application/json; charset=utf-8") -> None:
            data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            if ctype.startswith("text/html"):
                self.send_header("Content-Security-Policy",
                                 "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
                                 "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
            self.end_headers()
            self.wfile.write(data)

        def _host_ok(self) -> bool:
            return (self.headers.get("Host") or "").lower() in allowed_hosts

        def do_GET(self):
            if not self._host_ok():
                return self._send(403, {"error": "host não permitido"})
            path = self.path.split("?", 1)[0]
            if path == "/":
                html = PAGE.read_text(encoding="utf-8").replace("__PAINEL_TOKEN__", token)
                return self._send(200, html.encode("utf-8"), "text/html; charset=utf-8")
            if path == "/api/status":
                return self._send(200, {"search": job.status(), "priorities": priorities(),
                                        "has_results": job.out.exists(), "today": date.today().isoformat()})
            if path == "/api/results":
                return self._send(200, unseen(load_results(job.out)))
            if path == "/api/saved":
                return self._send(200, {"saved": saved()})
            if path == "/api/applications":
                return self._send(200, {"applications": applications()})
            return self._send(404, {"error": "não encontrado"})

        def do_POST(self):
            try:
                length = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                length = -1
            if not 0 <= length <= MAX_BODY:
                self.close_connection = True
                return self._send(413, {"error": "pedido grande demais"})
            # Lê o corpo antes de qualquer recusa: responder sem ler faz o Windows cortar a conexão.
            raw = self.rfile.read(length)
            if not self._host_ok():
                return self._send(403, {"error": "host não permitido"})
            if not secrets.compare_digest(self.headers.get("X-Painel-Token") or "", token):
                return self._send(403, {"error": "token inválido"})
            try:
                body = json.loads(raw or b"{}")
            except json.JSONDecodeError:
                return self._send(400, {"error": "JSON inválido"})
            if not isinstance(body, dict):
                return self._send(400, {"error": "o pedido precisa ser um objeto JSON"})
            path = self.path.split("?", 1)[0]
            if path == "/api/search":
                prios = [int(p) for p in body.get("priorities", []) if str(p).isdigit()]
                jobage = int(body.get("jobage") or 14)
                if not prios:
                    return self._send(400, {"error": "escolha ao menos uma prioridade"})
                if not 1 <= jobage <= 365:
                    return self._send(400, {"error": "jobage fora de 1 a 365"})
                if not job.start(prios, jobage):
                    return self._send(409, {"error": "já há uma busca em andamento"})
                return self._send(202, {"started": True})
            if path == "/api/mark":
                urls = [u for u in body.get("urls", []) if isinstance(u, str)]
                try:
                    return self._send(200, mark(load_results(job.out), urls, str(body.get("decision"))))
                except ValueError as exc:
                    return self._send(400, {"error": str(exc)})
            return self._send(404, {"error": "não encontrado"})

    return Handler


def serve(port: int, open_browser: bool) -> None:
    token = secrets.token_urlsafe(24)
    job = SearchJob(results_path())
    server = ThreadingHTTPServer(("127.0.0.1", port), None)
    real_port = server.server_address[1]
    allowed = {f"127.0.0.1:{real_port}", f"localhost:{real_port}"}
    server.RequestHandlerClass = make_handler(token, job, allowed)
    url = f"http://127.0.0.1:{real_port}/"
    print(f"Painel aberto em {url}  (feche esta janela para encerrar)", flush=True)
    if open_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main(argv=None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="painel.py", description="Painel local da busca de vagas; veja o docstring.")
    parser.add_argument("--port", type=int, default=8765, help="porta local (padrão 8765; 0 = qualquer livre)")
    parser.add_argument("--no-browser", action="store_true", help="não abrir o navegador")
    args = parser.parse_args(argv)
    try:
        serve(args.port, not args.no_browser)
    except OSError as exc:
        print(f"painel: não consegui abrir a porta {args.port} ({exc}); tente --port 0", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
