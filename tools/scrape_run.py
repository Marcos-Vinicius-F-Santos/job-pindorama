#!/usr/bin/env python3
"""The mechanical half of /scrape: run the portal searches, deduplicate, flag.

/scrape mixes judgment (how well does a posting fit?) with bookkeeping (run
thirty searches, drop what was seen before, notice the same job on two
portals, record what was shown). The bookkeeping was prose the model redid by
hand each run, with ad hoc scripts; this tool makes it the same every time.
The fit call stays with the model.

  search   Reads the query lines of .claude/skills/job-scraper/search-queries.md
           (`<portal>-search: <args>` inside the "### Prioridade N" sections),
           runs each enabled portal CLI with `--jobage` and `--format json`,
           and writes one JSON file:
             * new postings only - a posting is "seen" when its URL matches any
               job_scraper/seen_jobs.json entry (whatever its key), or its
               company+title matches a seen entry or a job_search_tracker.csv row;
             * the same posting found twice (two portals, or one portal listing
               it twice, e.g. for two cities) is kept once, with `also_on`
               listing the other portals (company names are compared without
               legal suffixes, and "FindMe" matches "FINDME TECNOLOGIA LTDA");
             * a posting relayed by an aggregator (Remotar, Agrobase: an
               `apply_url` to the company's own posting) gets `full_posting`:
               {"portal": <installed portal that reads that URL, or null>,
               "url": <apply_url>}, so the full text is read there, not from
               the aggregator's summary;
             * when those portals label the work model differently ("remote"
               on one, "hybrid" on another), `signals.workplace_conflict` maps
               each portal to its label and the verdict says so;
             * each new posting carries `signals` from tools/posting_signals.py
               (workplace, internal selection, exclusivity, intermediary,
               seniority against the profile's Senioridade-alvo);
             * `meta.portals` has per-portal call/result/error counts for the
               health check, plus the portals skipped (`enabled: false`) and the
               query lines naming a portal that is not installed.
  record   Appends classified postings to job_scraper/seen_jobs.json under the
           canonical tools/job_key.py key. Existing entries are never
           overwritten (their /rank fields stay intact).

Fetched content is third-party data: `search` writes its file outside the
repo (system temp directory by default), like tools/fetch_page.py.

Usage:
  python3 tools/scrape_run.py search [--priority 1,2,3 | --all] [--jobage 14]
                                     [--accept LEVELS] [--out FILE] [--workers 4]
  python3 tools/scrape_run.py record --in FILE

Exit codes: 0 done (even when some searches failed - they are in meta);
2 usage error or unreadable input.
"""

import argparse
import csv
import json
import re
import shlex
import subprocess
import sys
import tempfile
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from job_key import make_key  # noqa: E402
from posting_signals import LEVELS, analyse, verdict  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
QUERIES = ROOT / ".claude" / "skills" / "job-scraper" / "search-queries.md"
LOCAL_QUERIES = ROOT / "documents" / "perfil" / "search-queries.md"
LOCAL_ANSWERS = ROOT / "documents" / "perfil" / "respostas.json"
SKILLS = ROOT / ".agents" / "skills"
SEEN = ROOT / "job_scraper" / "seen_jobs.json"
TRACKER = ROOT / "job_search_tracker.csv"
PROFILE = ROOT / "CLAUDE.md"
CALL_TIMEOUT = 120

QUERY_LINE = re.compile(r"^([a-z0-9-]+-search):\s+(.+)$")
LEGAL_SUFFIXES = {"ltda", "sa", "s", "a", "eireli", "me", "epp", "inc", "llc", "ltd", "corp", "co", "gmbh", "plc"}


# ---------------------------------------------------------------------------
# Inputs
# ---------------------------------------------------------------------------

def parse_queries(text: str) -> list:
    """(priority, portal, args) for every query line under a "### Prioridade N" heading."""
    calls, priority = [], None
    for line in text.splitlines():
        heading = re.match(r"^###\s+Prioridade\s+(\d+)", line)
        if heading:
            priority = int(heading.group(1))
            continue
        if line.startswith("## "):
            priority = None
            continue
        m = QUERY_LINE.match(line.strip())
        # A line still carrying a template placeholder ("[YOUR_REGION]") is not a
        # search yet: /setup has not filled it in.
        if m and priority is not None and not re.search(r"\[YOUR_[A-Z0-9_]+\]", m.group(2)):
            try:
                args = shlex.split(m.group(2))
            except ValueError:
                continue
            calls.append((priority, m.group(1), args))
    return calls


def active_queries_path(path: Path | None = None) -> Path:
    """Use the private, local search plan when the candidate has configured it."""
    if path is not None:
        return path
    return LOCAL_QUERIES if LOCAL_QUERIES.exists() else QUERIES


def local_target_seniority(path: Path = LOCAL_ANSWERS):
    """Read seniority from the ignored local form without exposing the profile in Git."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    values = data.get("senioridade") if isinstance(data, dict) else None
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return None
    result = [str(value).strip().lower() for value in values if str(value).strip().lower() in LEVELS]
    return result or None


def portal_enabled(skill_dir: Path) -> bool:
    """On unless the SKILL.md frontmatter says `enabled: false`."""
    text = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    front = re.match(r"^---\n(.*?)\n---", text, re.S)
    return not (front and re.search(r"^enabled:\s*false\b", front.group(1), re.M))


# A host literal in a portal CLI's sources: the hosts that CLI reads. Same rule
# as tests/test_apply_host_check.py, so both agree on what "installed" covers.
HOST_LITERAL = re.compile(r"https?://([A-Za-z0-9.-]+\.[A-Za-z]{2,})")
NON_PORTAL_HOSTS = {"schema.org", "www.w3.org", "w3.org", "example.com", "localhost", "github.com"}


def portal_hosts(skills: Path = SKILLS) -> dict:
    """{portal: hosts its CLI reads}, `www.` dropped (subdomains match later)."""
    out = {}
    for d in sorted(skills.glob("*-search")):
        src = d / "cli" / "src"
        if not src.is_dir():
            continue
        hosts = set()
        for f in src.rglob("*.ts"):
            for h in HOST_LITERAL.findall(f.read_text(encoding="utf-8")):
                h = h.lower()
                if h not in NON_PORTAL_HOSTS:
                    hosts.add(h[4:] if h.startswith("www.") else h)
        out[d.name] = hosts
    return out


def portal_for_url(url, hosts_by_portal: dict):
    """The installed portal whose CLI reads this URL (host or subdomain match), or None."""
    m = re.match(r"https?://([^/?#:]+)", str(url or ""), re.I)
    if not m:
        return None
    host = m.group(1).lower()
    best, best_len = None, 0
    for portal, hosts in hosts_by_portal.items():
        for h in hosts:
            if (host == h or host.endswith("." + h)) and len(h) > best_len:
                best, best_len = portal, len(h)
    return best


def installed_portals(skills: Path = SKILLS) -> dict:
    """name -> enabled, for every .agents/skills/*-search with a CLI."""
    out = {}
    for d in sorted(skills.glob("*-search")):
        if (d / "SKILL.md").exists() and (d / "cli" / "src" / "cli.ts").exists():
            out[d.name] = portal_enabled(d)
    return out


def target_seniority(profile_text: str):
    """The Senioridade-alvo codes from CLAUDE.md, or None when absent or still a placeholder."""
    m = re.search(r"\*\*Senioridade-alvo:\*\*\s*([^<\n]*)", profile_text)
    if not m or "[" in m.group(1):
        return None
    codes = [c.strip().lower() for c in m.group(1).split(",") if c.strip()]
    codes = [c for c in codes if c in LEVELS]
    return codes or None


# ---------------------------------------------------------------------------
# Identity
# ---------------------------------------------------------------------------

def norm(text) -> str:
    folded = unicodedata.normalize("NFKD", str(text or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", folded).strip()


def company_tokens(name) -> list:
    tokens = norm(name).split()
    while tokens and tokens[-1] in LEGAL_SUFFIXES:
        tokens.pop()
    return tokens


def same_company(a, b) -> bool:
    """Equal without legal suffixes, or one name is a word-prefix of the other ("FindMe" / "FINDME TECNOLOGIA LTDA")."""
    ta, tb = company_tokens(a), company_tokens(b)
    if not ta or not tb:
        return False
    short, long_ = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    return long_[: len(short)] == short


class SeenIndex:
    """URLs and (company, title) pairs already seen, matched as /scrape Step 2 says."""

    def __init__(self):
        self.urls = set()
        self.by_title = {}

    def add(self, company, title, url=None):
        if url:
            self.urls.add(url)
        if title:
            self.by_title.setdefault(norm(title), []).append(company)

    def match(self, company, title, url=None) -> bool:
        if url and url in self.urls:
            return True
        return any(same_company(company, c) for c in self.by_title.get(norm(title), []))


def load_seen(seen_path: Path = SEEN, tracker_path: Path = TRACKER) -> SeenIndex:
    index = SeenIndex()
    if seen_path.exists():
        for entry in json.loads(seen_path.read_text(encoding="utf-8")).get("seen", {}).values():
            index.add(entry.get("company"), entry.get("title"), entry.get("url"))
    if tracker_path.exists():
        with tracker_path.open(encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                index.add(row.get("company"), row.get("role"), row.get("source") or None)
    return index


# ---------------------------------------------------------------------------
# Running the portals
# ---------------------------------------------------------------------------

def build_args(args: list, jobage: int) -> list:
    """The query line's own flags win; --jobage and --format json are added when absent."""
    out = list(args)
    if "--jobage" not in out and "--jobage-minutes" not in out:
        out += ["--jobage", str(jobage)]
    if "--format" in out:
        i = out.index("--format")
        del out[i:i + 2]
    return out + ["--format", "json"]


def run_cli(portal: str, args: list):
    """(results, None) or (None, error) for one `search` call."""
    try:
        proc = subprocess.run(
            ["bun", "run", f".agents/skills/{portal}/cli/src/cli.ts", "search", *args],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=CALL_TIMEOUT,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return None, f"{type(exc).__name__}: {exc}"
    if proc.returncode != 0:
        return None, proc.stderr.strip()[:300] or f"exit {proc.returncode}"
    try:
        return json.loads(proc.stdout).get("results", []), None
    except (json.JSONDecodeError, AttributeError):
        return None, "saída não é o JSON do contrato"


def collect(calls, portals: dict, seen: SeenIndex, accept, jobage: int, runner=run_cli, workers: int = 4,
            hosts: dict | None = None) -> dict:
    hosts = portal_hosts() if hosts is None else hosts
    stats = {name: {"calls": 0, "ok": 0, "results": 0, "errors": []} for name, on in portals.items() if on}
    skipped = sorted(name for name, on in portals.items() if not on)
    unknown = sorted({p for _, p, _ in calls if p not in portals})
    runnable = [(prio, p, build_args(a, jobage)) for prio, p, a in calls if portals.get(p)]

    def one(call):
        prio, portal, args = call
        results, err = runner(portal, args)
        return prio, portal, args, results, err

    with ThreadPoolExecutor(max(1, workers)) as ex:
        outcomes = list(ex.map(one, runnable))

    collected, seen_before, cross = 0, 0, 0
    new, urls_now = [], set()
    labels = {}  # id(row) -> {portal: workplace_type}, to spot portals that disagree
    for prio, portal, args, results, err in outcomes:
        st = stats[portal]
        st["calls"] += 1
        query = args[args.index("-q") + 1] if "-q" in args else args[args.index("--query") + 1] if "--query" in args else ""
        if err is not None:
            st["errors"].append({"query": query, "error": err})
            continue
        st["ok"] += 1
        st["results"] += len(results)
        visa_query = "--visa-sponsorship" in args or "--visa" in args
        for r in results:
            if not isinstance(r, dict):
                continue
            url, title, company = r.get("url"), r.get("title"), r.get("company")
            if url and url in urls_now:
                continue  # the same posting from two queries of this run
            collected += 1
            if url:
                urls_now.add(url)
            if seen.match(company, title, url):
                seen_before += 1
                continue
            twin = next((n for n in new if norm(n.get("title")) == norm(title) and same_company(n.get("company"), company)), None)
            if twin is not None:
                cross += 1
                if portal != twin["portal"] and portal not in twin["also_on"]:
                    twin["also_on"].append(portal)
                if r.get("workplace_type"):
                    labels.setdefault(id(twin), {}).setdefault(portal, r["workplace_type"])
                if visa_query or r.get("visa_sponsorship") is True:
                    twin["visa_sponsorship"] = True
                continue
            row = dict(r)
            row.update(portal=portal, priority=prio, query=query, also_on=[])
            if visa_query or r.get("visa_sponsorship") is True:
                row["visa_sponsorship"] = True
            row["signals"] = analyse(str(r.get("description") or ""), str(title or ""), str(company or ""), accept,
                                     r.get("seniority"))
            if r.get("workplace_type"):
                labels[id(row)] = {portal: r["workplace_type"]}
            apply_url = r.get("apply_url")
            if isinstance(apply_url, str) and re.match(r"https?://", apply_url, re.I):
                reader = portal_for_url(apply_url, hosts)
                if reader != portal:
                    row["full_posting"] = {"portal": reader, "url": apply_url}
            new.append(row)

    for row in new:
        by_portal = labels.get(id(row), {})
        if len(set(by_portal.values())) > 1:
            row["signals"]["workplace_conflict"] = by_portal
        row["signals"]["verdict"] = verdict(row["signals"])

    return {
        "meta": {
            "date": date.today().isoformat(),
            "jobage": jobage,
            "accept": accept,
            "portals": stats,
            "skipped_portals": skipped,
            "unknown_portals": unknown,
            "counts": {"collected": collected, "seen_before": seen_before, "cross_portal": cross, "new": len(new)},
        },
        "new": new,
    }


# ---------------------------------------------------------------------------
# Recording
# ---------------------------------------------------------------------------

FITS = {"high", "medium", "low"}
STATUSES = {"new", "skipped", "expired", "unreachable"}


def record(rows: list, seen_path: Path = SEEN, today: str | None = None) -> dict:
    today = today or date.today().isoformat()
    state = json.loads(seen_path.read_text(encoding="utf-8")) if seen_path.exists() else {"seen": {}}
    state.setdefault("seen", {})
    added, kept, invalid = 0, 0, []
    for row in rows:
        fit, status = row.get("fit"), row.get("status") or ("skipped" if row.get("fit") == "low" else "new")
        if fit not in FITS or status not in STATUSES or not row.get("title"):
            invalid.append(row.get("url") or row.get("title"))
            continue
        key = make_key(str(row.get("company") or ""), str(row.get("title") or ""), str(row.get("url") or ""))
        if key in state["seen"]:
            kept += 1
            continue
        entry = {
            "title": row.get("title"),
            "company": row.get("company"),
            "url": row.get("url"),
            "first_seen": today,
            "posted_date": row.get("date"),
            "deadline": row.get("deadline"),
            "fit": fit,
            "status": status,
            "portal": row.get("portal"),
            "source": row.get("source") or "cli",
        }
        if row.get("visa_sponsorship") is True:
            entry["visa_sponsorship"] = True
        state["seen"][key] = entry
        added += 1
    seen_path.parent.mkdir(parents=True, exist_ok=True)
    seen_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"added": added, "already_seen": kept, "invalid": invalid, "total": len(state["seen"])}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _force_utf8_output() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8")


def _inside_repo(path: Path) -> bool:
    try:
        path.resolve().relative_to(ROOT)
    except ValueError:
        return False
    return True


def summary(result: dict) -> str:
    m = result["meta"]
    c = m["counts"]
    lines = [f"scrape_run: {c['collected']} coletadas; {c['seen_before']} já vistas; "
             f"{c['cross_portal']} repetidas (mesma empresa e título, em outro portal ou outra busca); {c['new']} novas"]
    for name, st in m["portals"].items():
        flag = " ⚠ zero resultados" if st["ok"] and not st["results"] else ""
        err = f"; {len(st['errors'])} erro(s)" if st["errors"] else ""
        if st["calls"]:
            lines.append(f"  {name}: {st['ok']}/{st['calls']} buscas, {st['results']} resultados{err}{flag}")
    if m["skipped_portals"]:
        lines.append(f"  pulados (desligados): {', '.join(m['skipped_portals'])}")
    if m["unknown_portals"]:
        lines.append(f"  linhas de busca para portal não instalado: {', '.join(m['unknown_portals'])}")
    flagged = sum(1 for r in result["new"] if r["signals"]["verdict"] != "posting_signals: none")
    lines.append(f"  sinais: {flagged} das {c['new']} novas com ⚠ (veja `signals` no arquivo)")
    return "\n".join(lines)


def main(argv=None) -> int:
    _force_utf8_output()
    parser = argparse.ArgumentParser(prog="scrape_run.py", description="The mechanical half of /scrape; see module docstring.")
    sub = parser.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search", help="run the portal searches, deduplicate, flag")
    s.add_argument("--priority", default="1,2,3", help="comma list of priorities to run (default 1,2,3)")
    s.add_argument("--all", action="store_true", help="every priority in the file")
    s.add_argument("--jobage", type=int, default=2, help="days (default 2), unless the query line sets its own")
    s.add_argument("--accept", default=None, help="seniority codes; default: Senioridade-alvo in CLAUDE.md")
    s.add_argument("--queries", type=Path, default=QUERIES,
                   help="search plan file (default: public template)")
    s.add_argument("--out", type=Path, default=None, help="results file (default: system temp dir; never inside the repo)")
    s.add_argument("--workers", type=int, default=4, help="parallel CLI calls (default 4; keep it low)")
    r = sub.add_parser("record", help="append classified postings to job_scraper/seen_jobs.json")
    r.add_argument("--in", dest="infile", type=Path, required=True, help="JSON list of postings with fit/status")
    args = parser.parse_args(argv)

    if args.cmd == "record":
        try:
            data = json.loads(args.infile.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"scrape_run: {exc}", file=sys.stderr)
            return 2
        rows = data.get("new", data) if isinstance(data, dict) else data
        print(json.dumps(record(rows if isinstance(rows, list) else []), ensure_ascii=False))
        return 0

    out = args.out or Path(tempfile.gettempdir()) / f"scrape_run_{date.today().isoformat()}.json"
    if _inside_repo(out):
        print(f"scrape_run: refusing to write inside the repo ({out}); fetched postings are untrusted data "
              "and belong in the session scratchpad or the temp directory", file=sys.stderr)
        return 2
    if args.accept is not None:
        accept = [c.strip().lower() for c in args.accept.split(",") if c.strip()]
        bad = [c for c in accept if c not in LEVELS]
        if bad:
            print(f"scrape_run: unknown level(s) {', '.join(bad)} (known: {', '.join(LEVELS)})", file=sys.stderr)
            return 2
    else:
        accept = target_seniority(PROFILE.read_text(encoding="utf-8")) if PROFILE.exists() else None

    try:
        calls = parse_queries(args.queries.read_text(encoding="utf-8"))
    except OSError as exc:
        print(f"scrape_run: {exc}", file=sys.stderr)
        return 2
    if not args.all:
        wanted = {int(p) for p in args.priority.split(",") if p.strip().isdigit()}
        calls = [c for c in calls if c[0] in wanted]
    if not calls:
        print("scrape_run: nenhuma linha de busca pronta nas prioridades pedidas (as do modelo têm marcadores "
              "[YOUR_...]: rode o /setup, ou escreva as linhas `<portal>-search: ...` em search-queries.md)",
              file=sys.stderr)
        return 2

    result = collect(calls, installed_portals(), load_seen(), accept, args.jobage, workers=args.workers)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(summary(result))
    print(f"saved={out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
