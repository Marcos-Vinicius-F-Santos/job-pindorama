"""Tests for tools/scrape_run.py - the mechanical half of /scrape.

The bookkeeping these pin was redone by hand on every real run: reading the
query lines, skipping what was seen (by URL whatever its key, or by
company+title), noticing the same posting on two portals under different
company spellings ("FindMe" on Remotar, "FINDME TECNOLOGIA LTDA" on Sólides),
and recording without clobbering /rank's fields. No network: a fake runner
stands in for the portal CLIs.
"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import scrape_run  # noqa: E402
from scrape_run import (  # noqa: E402
    SeenIndex,
    build_args,
    collect,
    installed_portals,
    load_seen,
    parse_queries,
    record,
    same_company,
    target_seniority,
)

REPO = Path(__file__).resolve().parent.parent
TOOL = REPO / "tools" / "scrape_run.py"

QUERIES = """# Buscas

### Prioridade 1: Produto

```
gupy-search: -q "product manager" --remote
remotar-search: -q "product manager" --category produto --no-international
gupy-search: -q "[YOUR_PRIMARY_JOB_TITLE_1]" --state [YOUR_REGION]
site:catho.com.br "product manager"
```

### Prioridade 2: IA

```
solides-search: -q "ia" --remote --format table
naoexiste-search: -q "x"
```

### Prioridade 4: Amplo

```
gupy-search: -q "projetos"
```

## Filtro de local

gupy-search: -q "fora de seção"
"""


def job(id_, title, company, url, **extra):
    return {"id": id_, "title": title, "company": company, "location": "Remoto", "date": "2026-10-19",
            "url": url, "description": extra.pop("description", ""), **extra}


class Queries(unittest.TestCase):
    def test_only_query_lines_inside_priority_sections(self):
        calls = parse_queries(QUERIES)
        self.assertEqual([(p, portal) for p, portal, _ in calls], [
            (1, "gupy-search"), (1, "remotar-search"), (2, "solides-search"), (2, "naoexiste-search"), (4, "gupy-search"),
        ])
        self.assertEqual(calls[1][2], ["-q", "product manager", "--category", "produto", "--no-international"])

    def test_template_placeholders_are_not_searches(self):
        self.assertNotIn("[YOUR_PRIMARY_JOB_TITLE_1]", json.dumps(parse_queries(QUERIES)))

    def test_jobage_and_json_are_added_and_the_line_format_replaced(self):
        self.assertEqual(build_args(["-q", "ia", "--format", "table"], 14), ["-q", "ia", "--jobage", "14", "--format", "json"])
        self.assertEqual(build_args(["-q", "x", "--jobage", "7"], 14), ["-q", "x", "--jobage", "7", "--format", "json"])


class Profile(unittest.TestCase):
    def test_target_seniority_from_claude_md(self):
        self.assertEqual(target_seniority("- **Senioridade-alvo:** pleno, senior, especialista <!-- códigos -->"),
                         ["pleno", "senior", "especialista"])
        self.assertIsNone(target_seniority("- **Senioridade-alvo:** [YOUR_TARGET_SENIORITY] <!-- x -->"))
        self.assertIsNone(target_seniority("# sem a linha"))


class Portals(unittest.TestCase):
    def test_enabled_flag_and_cli_presence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, front in (("a-search", "name: a\n"), ("b-search", "name: b\nenabled: false  # off\n"), ("c-search", "name: c\n")):
                (root / name / "cli" / "src").mkdir(parents=True)
                (root / name / "SKILL.md").write_text(f"---\n{front}---\n# x\n", encoding="utf-8")
                if name != "c-search":
                    (root / name / "cli" / "src" / "cli.ts").write_text("", encoding="utf-8")
            self.assertEqual(installed_portals(root), {"a-search": True, "b-search": False})

    def test_the_shipped_portals_are_found(self):
        found = installed_portals()
        for name in ("gupy-search", "solides-search", "vagas-search", "infojobs-search", "remotar-search",
                     "greenhouse-search", "programathor-search", "michaelpage-search", "geekhunter-search",
                     "trampos-search", "roberthalf-search", "pcd-search", "agrobase-search", "agrosearch-search",
                     "digai-search", "empregos-search"):
            self.assertIn(name, found)


class Identity(unittest.TestCase):
    def test_company_names_without_legal_suffix_and_as_prefix(self):
        self.assertTrue(same_company("FindMe", "FINDME TECNOLOGIA LTDA"))
        self.assertTrue(same_company("Acme S.A.", "acme"))
        self.assertFalse(same_company("Stone", "Stefanini Group"))
        self.assertFalse(same_company("", "Acme"))

    def test_seen_by_url_whatever_the_key_or_by_company_and_title(self):
        idx = SeenIndex()
        idx.add("Omie", "Product Manager Junior", "https://x/1")
        self.assertTrue(idx.match("Outra", "Outro título", "https://x/1"))
        self.assertTrue(idx.match("OMIE LTDA", "Product Manager  Junior", None))
        self.assertFalse(idx.match("Omie", "Product Manager Senior", "https://x/2"))

    def test_seen_jobs_and_tracker_both_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            seen = Path(tmp) / "seen.json"
            seen.write_text(json.dumps({"seen": {"legacy key/with slash": {"title": "PO", "company": "Acme", "url": "https://a/1"}}}), encoding="utf-8")
            tracker = Path(tmp) / "t.csv"
            tracker.write_text("date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source,deadline\n"
                               "2026-10-01,Beta,,Product Manager,,,applied,,,,,,https://b/9,\n", encoding="utf-8")
            idx = load_seen(seen, tracker)
            self.assertTrue(idx.match("x", "y", "https://a/1"))
            self.assertTrue(idx.match("Beta", "Product Manager", None))


class Collect(unittest.TestCase):
    def setUp(self):
        self.responses = {
            ("gupy-search", "product manager"): [
                job("1", "Product Manager Pleno", "Zeta", "https://zeta.gupy.io/jobs/1",
                    description="Nossa atuação é híbrida (3x presenciais)."),
                job("2", "Product Owner", "Omie", "https://omie.gupy.io/jobs/2"),
            ],
            ("remotar-search", "product manager"): [
                dict(job("10", "Technical Product Manager", "FindMe", "https://remotar.com.br/job/10"), workplace_type="remote",
                     apply_url="https://findme.vagas.solides.com.br/vaga/939473?origem=remotar"),
                dict(job("11", "Product Manager IA", "Nova", "https://remotar.com.br/job/11"),
                     apply_url="https://nova.inhire.app/vagas/abc"),
                dict(job("12", "Product Ops", "Mesma", "https://remotar.com.br/job/12"),
                     apply_url="https://remotar.com.br/job/12/candidatar"),
                job("1", "Product Manager Pleno", "Zeta", "https://zeta.gupy.io/jobs/1"),  # same URL again
            ],
            ("solides-search", "ia"): [
                dict(job("939473", "Technical Product Manager", "FINDME TECNOLOGIA LTDA", "https://vagas.solides.com.br/vaga/939473"),
                     workplace_type="hybrid"),
                job("5", "Product Manager Junior", "Kappa", "https://vagas.solides.com.br/vaga/5"),
                dict(job("6", "Gerente de Produto", "Lambda", "https://vagas.solides.com.br/vaga/6"), seniority="Gerência"),
            ],
        }
        self.calls_made = []

    def runner(self, portal, args):
        self.calls_made.append((portal, args))
        q = args[args.index("-q") + 1]
        if portal == "solides-search" and q == "quebra":
            return None, "SEARCH_FAILED"
        return self.responses.get((portal, q), []), None

    def run_collect(self, seen=None, calls=None):
        portals = {"gupy-search": True, "remotar-search": True, "solides-search": True, "vagas-search": False}
        calls = calls if calls is not None else [c for c in parse_queries(QUERIES) if c[0] in (1, 2)]
        hosts = {"gupy-search": {"gupy.io"}, "remotar-search": {"remotar.com.br"}, "solides-search": {"vagas.solides.com.br"}}
        return collect(calls, portals, seen or SeenIndex(), ["pleno", "senior"], 14, runner=self.runner, workers=2,
                       hosts=hosts)

    def test_dedup_cross_portal_and_counts(self):
        seen = SeenIndex()
        seen.add("Omie", "Product Owner", "https://outra-url")
        out = self.run_collect(seen)
        titles = [(r["company"], r["title"], r["portal"], r["also_on"]) for r in out["new"]]
        self.assertIn(("Zeta", "Product Manager Pleno", "gupy-search", []), titles)
        self.assertIn(("FindMe", "Technical Product Manager", "remotar-search", ["solides-search"]), titles)
        self.assertNotIn("Omie", [t[0] for t in titles])  # seen by company+title
        c = out["meta"]["counts"]
        self.assertEqual((c["seen_before"], c["cross_portal"], c["new"]), (1, 1, 6))

    def test_signals_attached_to_each_new_posting(self):
        out = self.run_collect()
        by_title = {r["title"]: r for r in out["new"]}
        self.assertEqual(by_title["Product Manager Pleno"]["signals"]["workplace"], "hybrid")
        self.assertEqual(by_title["Product Manager Junior"]["signals"]["seniority_verdict"], "mismatch")
        self.assertTrue(by_title["Product Manager Junior"]["signals"]["verdict"].startswith("posting_signals: ⚠"))
        # Same posting on two portals with different work-model labels.
        self.assertEqual(by_title["Technical Product Manager"]["signals"]["workplace_conflict"],
                         {"remotar-search": "remote", "solides-search": "hybrid"})
        self.assertIn("portais discordam do modelo de trabalho (remotar-search: remote; solides-search: hybrid)",
                      by_title["Technical Product Manager"]["signals"]["verdict"])
        self.assertNotIn("workplace_conflict", by_title["Product Manager Pleno"]["signals"])
        # An aggregator's posting points to where the full text is read.
        self.assertEqual(by_title["Technical Product Manager"]["full_posting"],
                         {"portal": "solides-search", "url": "https://findme.vagas.solides.com.br/vaga/939473?origem=remotar"})
        self.assertEqual(by_title["Product Manager IA"]["full_posting"], {"portal": None, "url": "https://nova.inhire.app/vagas/abc"})
        self.assertNotIn("full_posting", by_title["Product Ops"])  # the same portal: nothing more to read
        self.assertNotIn("full_posting", by_title["Product Manager Pleno"])
        # No level in the title: the portal's own seniority field is used.
        self.assertEqual(by_title["Gerente de Produto"]["signals"]["seniority_source"], "portal")
        self.assertEqual(by_title["Gerente de Produto"]["signals"]["seniority_verdict"], "mismatch")

    def test_disabled_unknown_and_failing_portals_are_reported_not_run(self):
        calls = parse_queries(QUERIES) + [(2, "vagas-search", ["-q", "x"]), (2, "solides-search", ["-q", "quebra"])]
        out = self.run_collect(calls=calls)
        meta = out["meta"]
        self.assertEqual(meta["skipped_portals"], ["vagas-search"])
        self.assertEqual(meta["unknown_portals"], ["naoexiste-search"])
        self.assertNotIn("vagas-search", [p for p, _ in self.calls_made])
        self.assertEqual(meta["portals"]["solides-search"]["errors"], [{"query": "quebra", "error": "SEARCH_FAILED"}])
        for _, args in self.calls_made:
            self.assertEqual(args[-2:], ["--format", "json"])


class Record(unittest.TestCase):
    def test_record_keeps_explicit_visa_flag(self):
        with tempfile.TemporaryDirectory() as tmp:
            seen = Path(tmp) / "job_scraper" / "seen_jobs.json"
            rows = [{**job("1", "Backend Engineer", "Acme", "https://acme.example/jobs/1"),
                     "visa_sponsorship": True, "fit": "high"}]
            scrape_run.record(rows, seen, today="2026-10-20")
            entry = json.loads(seen.read_text(encoding="utf-8"))["seen"]["acme_backend-engineer"]
            self.assertTrue(entry["visa_sponsorship"])

    def test_appends_with_canonical_key_and_never_overwrites(self):
        with tempfile.TemporaryDirectory() as tmp:
            seen = Path(tmp) / "job_scraper" / "seen_jobs.json"
            rows = [
                {**job("1", "Product Manager", "Stone", "https://remotar.com.br/job/1"), "portal": "remotar-search", "fit": "high"},
                {**job("2", "Analista", "Kappa", "https://k/2"), "portal": "solides-search", "fit": "low"},
                {**job("3", "Sem fit", "X", "https://x/3"), "fit": "talvez"},
            ]
            first = record(rows, seen, today="2026-10-20")
            self.assertEqual((first["added"], first["invalid"]), (2, ["https://x/3"]))
            state = json.loads(seen.read_text(encoding="utf-8"))["seen"]
            entry = state["stone_product-manager"]
            self.assertEqual(entry, {
                "title": "Product Manager", "company": "Stone", "url": "https://remotar.com.br/job/1",
                "first_seen": "2026-10-20", "posted_date": "2026-10-19", "deadline": None,
                "fit": "high", "status": "new", "portal": "remotar-search", "source": "cli",
            })
            self.assertEqual(state["kappa_analista"]["status"], "skipped")

            state["stone_product-manager"].update(status="ranked", rank_score=81)
            seen.write_text(json.dumps({"seen": state}), encoding="utf-8")
            again = record(rows[:1], seen, today="2026-10-21")
            self.assertEqual((again["added"], again["already_seen"]), (0, 1))
            kept = json.loads(seen.read_text(encoding="utf-8"))["seen"]["stone_product-manager"]
            self.assertEqual((kept["status"], kept["rank_score"], kept["first_seen"]), ("ranked", 81, "2026-10-20"))


class Cli(unittest.TestCase):
    def test_refuses_to_write_fetched_postings_inside_the_repo(self):
        p = subprocess.run([sys.executable, str(TOOL), "search", "--out", str(REPO / "x.json")], capture_output=True, cwd=REPO)
        self.assertEqual(p.returncode, 2)
        self.assertIn("refusing to write inside the repo", p.stderr.decode("utf-8"))

    def test_unknown_seniority_code_exits_2(self):
        p = subprocess.run([sys.executable, str(TOOL), "search", "--accept", "chefe", "--out", str(Path(tempfile.gettempdir()) / "x.json")],
                           capture_output=True, cwd=REPO)
        self.assertEqual(p.returncode, 2)

    def test_the_template_has_no_ready_queries(self):
        # The upstream template only has [YOUR_...] lines until /setup runs.
        if "[YOUR_PRIMARY_JOB_TITLE_1]" not in scrape_run.QUERIES.read_text(encoding="utf-8"):
            self.skipTest("personalized fork: search-queries.md has real queries")
        p = subprocess.run([sys.executable, str(TOOL), "search", "--out", str(Path(tempfile.gettempdir()) / "x.json")],
                           capture_output=True, cwd=REPO)
        self.assertEqual(p.returncode, 2)
        self.assertIn("/setup", p.stderr.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
