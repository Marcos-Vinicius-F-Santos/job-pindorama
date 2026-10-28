"""Painel local (tools/painel.py): dados, segurança do servidor e da página."""

import base64
import http.client
import json
import sys
import tempfile
import threading
import unittest
from unittest import mock
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import painel  # noqa: E402
import painel_perfil  # noqa: E402

RESULTS = {
    "meta": {"date": "2026-10-22"},
    "new": [
        {"title": "Product Manager", "company": "Zeta", "url": "https://zeta.gupy.io/jobs/1", "date": "2026-10-20",
         "portal": "gupy-search", "signals": {"verdict": "posting_signals: none"}},
        {"title": "Product Owner", "company": "Omega", "url": "https://remotar.com.br/job/2", "date": "2026-10-19",
         "portal": "remotar-search", "signals": {"verdict": "posting_signals: none"}},
    ],
}


class Data(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.seen = self.dir / "seen_jobs.json"
        self.tracker = self.dir / "tracker.csv"

    def tearDown(self):
        self.tmp.cleanup()

    def test_delete_generated_curriculum_removes_only_its_files(self):
        cv = self.dir / "cv"
        cv.mkdir()
        for suffix in (".pdf", ".tex", ".aux", ".log"):
            (cv / f"main_acme_backend{suffix}").write_text("x", encoding="utf-8")
        other = cv / "main_other.pdf"
        other.write_text("keep", encoding="utf-8")

        with mock.patch.object(painel, "ROOT", self.dir):
            result = painel.delete_generated_document("cv/main_acme_backend.pdf")

        self.assertTrue(result["deleted"])
        self.assertFalse((cv / "main_acme_backend.pdf").exists())
        self.assertFalse((cv / "main_acme_backend.tex").exists())
        self.assertTrue(other.exists())

    def test_delete_rejects_non_curriculum_paths(self):
        with mock.patch.object(painel, "ROOT", self.dir):
            with self.assertRaises(ValueError):
                painel.delete_generated_document("documents/perfil/respostas.json")
            with self.assertRaises(ValueError):
                painel.delete_generated_document("cv/main_example.pdf")

    def test_mark_uses_the_search_file_not_the_browser(self):
        out = painel.mark(RESULTS, ["https://zeta.gupy.io/jobs/1", "https://evil.example/x"], "interesse", self.seen)
        self.assertEqual((out["added"], out["missing"]), (1, ["https://evil.example/x"]))
        entry = next(iter(json.loads(self.seen.read_text(encoding="utf-8"))["seen"].values()))
        self.assertEqual((entry["title"], entry["fit"], entry["status"], entry["source"]),
                         ("Product Manager", "medium", "new", "painel"))

    def test_discard_is_low_and_skipped(self):
        painel.mark(RESULTS, ["https://remotar.com.br/job/2"], "descartar", self.seen)
        entry = next(iter(json.loads(self.seen.read_text(encoding="utf-8"))["seen"].values()))
        self.assertEqual((entry["fit"], entry["status"]), ("low", "skipped"))

    def test_unknown_decision(self):
        with self.assertRaises(ValueError):
            painel.mark(RESULTS, [], "candidatar", self.seen)

    def test_marked_jobs_leave_the_list_and_only_interest_is_saved(self):
        painel.mark(RESULTS, ["https://zeta.gupy.io/jobs/1"], "interesse", self.seen)
        painel.mark(RESULTS, ["https://remotar.com.br/job/2"], "descartar", self.seen)
        self.assertEqual(painel.unseen(RESULTS, self.seen, self.tracker)["new"], [])
        self.assertEqual([s["title"] for s in painel.saved(self.seen)], ["Product Manager"])
        self.assertEqual(painel.unseen(None, self.seen, self.tracker), {"meta": None, "new": []})
        self.assertEqual([d["title"] for d in painel.discarded(self.seen)], ["Product Owner"])
        painel.restore_job("https://remotar.com.br/job/2", self.seen)
        self.assertEqual(painel.discarded(self.seen), [])
        self.assertEqual(len(painel.saved(self.seen)), 2)
        painel.record_applied("https://zeta.gupy.io/jobs/1", "Zeta", "Product Manager", "gupy-search", self.tracker, self.seen)
        self.assertEqual([s["title"] for s in painel.saved(self.seen)], ["Product Owner"])
        self.assertEqual(len(painel.enriched_applications(self.tracker, self.seen, self.dir)), 1)
        painel.remove_application("https://zeta.gupy.io/jobs/1", "skipped", self.tracker, self.seen)
        self.assertEqual(len(painel.enriched_applications(self.tracker, self.seen, self.dir)), 0)
        self.assertEqual([d["title"] for d in painel.discarded(self.seen)], ["Product Manager"])

    def test_visa_flag_survives_marking_for_interest_and_discard(self):
        visa_results = {
            "new": [
                {**RESULTS["new"][0], "visa_sponsorship": True},
                {**RESULTS["new"][1], "visa_sponsorship": True},
            ]
        }
        painel.mark(visa_results, [visa_results["new"][0]["url"]], "interesse", self.seen)
        painel.mark(visa_results, [visa_results["new"][1]["url"]], "descartar", self.seen)
        self.assertTrue(painel.saved(self.seen)[0]["visa_sponsorship"])
        self.assertTrue(painel.discarded(self.seen)[0]["visa_sponsorship"])

    def test_applications_read_the_tracker(self):
        self.tracker.write_text("date,company,role,status\n2026-10-01,Zeta,PM,applied\n", encoding="utf-8")
        self.assertEqual(painel.applications(self.tracker), [{"date": "2026-10-01", "company": "Zeta", "role": "PM", "status": "applied"}])
        self.assertEqual(painel.applications(self.dir / "nao-existe.csv"), [])

    def test_application_record_stores_job_details_and_manual_history(self):
        evolution = self.dir / "evolucao.json"
        record = painel.save_application_record({
            "url": "https://zeta.gupy.io/jobs/1",
            "company": "Zeta",
            "title": "Product Manager",
            "portal": "gupy-search",
            "location": "Brasil",
            "workplace_type": "remote",
            "description": "Descrição da vaga",
            "applied_date": "2026-10-27",
            "status": "interview",
            "cv_file": "cv/main_zeta_product_manager.pdf",
            "event_date": "2026-10-28",
            "event_stage": "Entrevista técnica",
            "event_feedback": "Boa base técnica",
            "event_questions": "Como você testa integrações?",
            "event_answers": "Expliquei o caso da Steam.",
        }, evolution, self.tracker, self.seen)
        self.assertEqual(record["application"]["status"], "interview")
        self.assertEqual(record["job"]["location"], "Brasil")
        self.assertEqual(record["history"][0]["stage"], "Entrevista técnica")
        stored = json.loads(evolution.read_text(encoding="utf-8"))
        self.assertIn("https://zeta.gupy.io/jobs/1", stored["applications"])

    def test_application_record_requires_controlled_status_and_cv(self):
        base = {"url": "https://zeta.example/job", "company": "Zeta", "title": "PM"}
        with self.assertRaisesRegex(ValueError, "resultado"):
            painel.save_application_record({**base, "status": "qualquer coisa", "cv_file": "cv.pdf"}, self.dir / "e.json", self.tracker, self.seen)
        with self.assertRaisesRegex(ValueError, "currículo"):
            painel.save_application_record({**base, "status": "applied"}, self.dir / "e.json", self.tracker, self.seen)

    def test_update_evolution_imports_tracker_and_counts_application_data(self):
        self.tracker.write_text("date,company,role,status,source,cv_file\n2026-10-01,Zeta,PM,applied,https://zeta.example/job,cv.pdf\n", encoding="utf-8")
        data = painel.update_evolution(self.dir / "evolucao.json", self.tracker, self.seen, self.dir / "documents")
        self.assertEqual(data["evolution"]["metrics"]["applications"], 1)
        self.assertEqual(data["evolution"]["metrics"]["applications_with_cv"], 1)
        self.assertIn("projects", data["validation"]["sources"])

    def test_application_assets_separate_original_and_vacancy_documents(self):
        with mock.patch.object(painel.painel_perfil, "list_uploads", return_value={"cv": [{"name": "original.pdf"}]}) \
                as uploads, mock.patch.object(painel, "list_generated_documents", return_value=[
                    {"kind": "cv", "path": "cv/main_zeta.pdf", "name": "main_zeta.pdf", "role": "PM", "company": "Zeta", "url": "https://zeta.example/job"},
                    {"kind": "carta", "path": "cover_letters/cover_zeta.pdf", "name": "cover_zeta.pdf", "role": "PM", "company": "Zeta", "url": "https://zeta.example/job"},
                    {"kind": "cv", "path": "cv/main_other.pdf", "name": "main_other.pdf", "role": "Dev", "company": "Other", "url": "https://other.example/job"},
                ]):
            assets = painel.list_application_assets("https://zeta.example/job")
        uploads.assert_called_once()
        self.assertEqual([item["value"] for item in assets["curricula"]], ["documents/cv/original.pdf", "cv/main_zeta.pdf"])
        self.assertEqual([item["value"] for item in assets["cartas"]], ["cover_letters/cover_zeta.pdf"])

    def test_priorities_skip_template_placeholders(self):
        q = self.dir / "q.md"
        q.write_text("### Prioridade 1: X\n```\ngupy-search: -q \"pm\"\nvagas-search: -q \"pm\"\n```\n"
                     "### Prioridade 2: Y\n```\ngupy-search: -q \"[YOUR_ROLE]\"\n```\n", encoding="utf-8")
        self.assertEqual(painel.priorities(q), [{"priority": 1, "queries": 2, "portals": 2}])

    def test_search_file_lives_outside_the_repo(self):
        self.assertFalse(str(painel.results_path().resolve()).startswith(str(ROOT.resolve())))

    def test_claude_drafting_needs_a_saved_evaluation(self):
        url = "https://zeta.gupy.io/jobs/1?a=1&b=2"
        prompt = painel.claude_prompt(url, "avaliar", self.dir)
        self.assertIn(url, prompt)
        self.assertIn(f"`{painel.PYTHON} tools/posting_guard.py", prompt)
        self.assertNotIn("{python}", prompt)
        with self.assertRaises(ValueError):
            painel.claude_prompt(url, "redigir", self.dir)
        with self.assertRaises(ValueError):
            painel.claude_prompt(url, "apagar", self.dir)
        painel.claude_file(url, "avaliar", self.dir).write_text("## Avaliação\nNota 63", encoding="utf-8")
        drafting = painel.claude_prompt(url, "redigir", self.dir)
        self.assertIn("<AVALIACAO>\n## Avaliação\nNota 63\n</AVALIACAO>", drafting)
        self.assertIn(f"`{painel.PYTHON} tools/compile_doc.py", drafting)
        self.assertNotIn("{python}", drafting)
        self.assertEqual(painel.claude_answers(url, self.dir), {"avaliar": "## Avaliação\nNota 63", "curriculo": None, "carta": None, "redigir": None, "entrevista": None})

    def test_profile_prompt_needs_a_document_and_carries_the_form_as_data(self):
        docs, answers = self.dir / "documents", self.dir / "respostas.json"
        with self.assertRaises(ValueError):
            painel.claude_prompt(painel.PERFIL_KEY, "perfil", self.dir, answers, docs)
        painel_perfil.save_upload("cv", "cv.pdf", base64.b64encode(b"%PDF-1.4 x").decode(), docs)
        self.assertIn("(formulário em branco)", painel.claude_prompt(painel.PERFIL_KEY, "perfil", self.dir, answers, docs))
        painel_perfil.save_answers({"genero": "neutro", "cargos": "PM\nPO"}, answers)
        prompt = painel.claude_prompt(painel.PERFIL_KEY, "perfil", self.dir, answers, docs)
        self.assertIn("<FORMULARIO>\nNos textos em português, escrever no: neutro\nCargos a buscar, um por linha: PM; PO\n</FORMULARIO>", prompt)
        self.assertIn("/setup pelo Caminho A", prompt)

    def test_claude_answer_files_are_named_by_hash_inside_the_folder(self):
        f = painel.claude_file("https://x/../../etc", "avaliar", self.dir)
        self.assertEqual(f.parent, self.dir)
        self.assertRegex(f.name, r"^[0-9a-f]{16}_avaliacao\.md$")

    def test_default_panel_provider_is_codex_openai(self):
        provider = painel.ai_providers.get_ai_provider({})
        self.assertEqual(provider.name, "openai")


class Server(unittest.TestCase):
    """O servidor de verdade, numa porta livre; nenhum pedido aqui grava nada."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.token = "t0k3n"
        job = painel.SearchJob(Path(cls.tmp.name) / "busca.json")
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), None)
        cls.port = cls.server.server_address[1]
        tmp = Path(cls.tmp.name)
        cls.documents = tmp / "documents"
        claude = painel.ClaudeJob(tmp / "claude", claude_bin="claude-que-nao-roda",
                                  documents=cls.documents, answers=tmp / "respostas.json")
        cls.server.RequestHandlerClass = painel.make_handler(cls.token, job, {f"127.0.0.1:{cls.port}"}, claude)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.tmp.cleanup()

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers or {})
        res = conn.getresponse()
        data = res.read().decode("utf-8")
        conn.close()
        return res.status, data, res

    def test_page_carries_the_token_and_a_csp(self):
        status, html, res = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn('content="t0k3n"', html)
        self.assertIn("frame-ancestors 'none'", res.getheader("Content-Security-Policy"))

    def test_writes_need_the_token(self):
        status, _, _ = self.request("POST", "/api/mark", {"urls": [], "decision": "interesse"})
        self.assertEqual(status, 403)
        status, _, _ = self.request("POST", "/api/search", {"priorities": [1]}, {"X-Painel-Token": "errado"})
        self.assertEqual(status, 403)

    def test_other_host_names_are_refused(self):
        status, _, _ = self.request("GET", "/api/status", headers={"Host": "evil.example:80"})
        self.assertEqual(status, 403)

    def test_bad_search_requests(self):
        h = {"X-Painel-Token": self.token, "Content-Type": "application/json"}
        self.assertEqual(self.request("POST", "/api/search", {"priorities": []}, h)[0], 400)
        self.assertEqual(self.request("POST", "/api/search", {"priorities": [1], "jobage": 999}, h)[0], 400)
        self.assertEqual(self.request("POST", "/api/mark", {"urls": [], "decision": "x"}, h)[0], 400)
        self.assertEqual(self.request("POST", "/api/mark", ["não", "é", "objeto"], h)[0], 400)

    def test_claude_only_for_jobs_marked_here(self):
        h = {"X-Painel-Token": self.token, "Content-Type": "application/json"}
        status, data, _ = self.request("POST", "/api/claude", {"url": "https://evil.example/x", "step": "avaliar"}, h)
        self.assertEqual(status, 400)
        self.assertIn("Me interessam", json.loads(data)["error"])
        self.assertEqual(self.request("POST", "/api/claude", {"url": "x", "step": "avaliar"})[0], 403)

    def test_profile_upload_and_form(self):
        h = {"X-Painel-Token": self.token, "Content-Type": "application/json"}
        pdf = {"kind": "cv", "name": "cv.pdf", "data": base64.b64encode(b"%PDF-1.4 x").decode()}
        self.assertEqual(self.request("POST", "/api/upload", pdf)[0], 403)
        status, data, _ = self.request("POST", "/api/upload", pdf, h)
        self.assertEqual((status, json.loads(data)["saved"]), (200, "cv.pdf"))
        self.assertTrue((self.documents / "cv" / "cv.pdf").is_file())
        self.assertEqual(self.request("POST", "/api/upload", {**pdf, "name": "cv.exe"}, h)[0], 400)
        status, data, _ = self.request("POST", "/api/profile", {"genero": "neutro", "extra": "x"}, h)
        self.assertEqual((status, json.loads(data)["answers"]), (200, {"genero": "neutro"}))
        status, data, _ = self.request("GET", "/api/profile")
        profile = json.loads(data)
        self.assertEqual(profile["answers"], {"genero": "neutro"})
        self.assertEqual([f["name"] for f in profile["files"]["cv"]], ["cv.pdf"])
        self.assertIn("status", profile["privacy"])

    def test_only_uploads_get_the_big_body_limit(self):
        self.assertEqual(painel.body_limit("/api/upload"), painel.MAX_UPLOAD_BODY)
        self.assertEqual(painel.body_limit("/api/upload?x=1"), painel.MAX_UPLOAD_BODY)
        for path in ("/api/profile", "/api/claude", "/api/uploadX"):
            self.assertEqual(painel.body_limit(path), painel.MAX_BODY)

    def test_results_empty_before_a_search(self):
        status, data, _ = self.request("GET", "/api/results")
        self.assertEqual((status, json.loads(data)), (200, {"meta": None, "new": []}))

    def test_clear_pending_and_search_all(self):
        h = {"X-Painel-Token": self.token, "Content-Type": "application/json"}
        status, data, _ = self.request("POST", "/api/clear-pending", {}, h)
        self.assertEqual(status, 200)
        self.assertIn("cleared", json.loads(data))
        status, data, _ = self.request("POST", "/api/search", {"all": True, "jobage": 2}, h)
        self.assertEqual(status, 202)
        status, data, _ = self.request("GET", "/api/discarded")
        self.assertEqual(status, 200)
        self.assertIn("discarded", json.loads(data))
        status, data, _ = self.request("GET", "/api/documents")
        self.assertEqual(status, 200)
        self.assertIn("documents", json.loads(data))


class Page(unittest.TestCase):
    def test_job_data_is_never_inserted_as_html(self):
        page = painel.PAGE.read_text(encoding="utf-8")
        for sink in ("innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval("):
            self.assertNotIn(sink, page)
        self.assertIn('rel: "noopener noreferrer"', page)


if __name__ == "__main__":
    unittest.main()
