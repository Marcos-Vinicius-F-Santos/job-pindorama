"""Aba Configurações do painel e arquivos servidos (tools/painel.py): a chave nunca volta para a página,
gravar exige o token e nada de IA roda sem o aviso de privacidade confirmado."""

import http.client
import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import ai_providers  # noqa: E402
import painel  # noqa: E402

KEY = "AIza" + "Y" * 35


class SettingsServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        tmp = Path(cls.tmp.name)
        cls.env = tmp / ".env"
        clean = {k: v for k, v in os.environ.items() if not k.startswith(("GEMINI_", "OPENAI_", "ANTHROPIC_", "AI_"))}
        cls.patches = [
            mock.patch.dict(os.environ, clean, clear=True),
            mock.patch.object(ai_providers, "ENV_PATH", cls.env),
            mock.patch.object(ai_providers.Provider, "_find_cli", lambda self: None),
        ]
        for p in cls.patches:
            p.start()
        cls.token = "t0k3n"
        job = painel.SearchJob(tmp / "busca.json")
        claude = painel.AgentJob(tmp / "claude", claude_bin=None, documents=tmp / "documents", answers=tmp / "r.json")
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), None)
        cls.port = cls.server.server_address[1]
        cls.server.RequestHandlerClass = painel.make_handler(cls.token, job, {f"127.0.0.1:{cls.port}"}, claude)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        for p in cls.patches:
            p.stop()
        cls.tmp.cleanup()

    def request(self, method, path, body=None, token=True):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["X-Painel-Token"] = self.token
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")
        conn.close()
        return res.status, data, res

    def test_a_new_install_has_no_ai_and_says_so(self):
        status, data, _ = self.request("GET", "/api/settings")
        s = json.loads(data)
        self.assertEqual(status, 200)
        self.assertEqual({p["id"] for p in s["providers"]}, {"gemini", "openai", "claude"})
        self.assertEqual((s["consent"], s["active"]["mode"]), (False, "none"))

    def test_saving_needs_the_token_and_never_echoes_the_key(self):
        body = {"provider": "gemini", "providers": {"gemini": {"api_key": KEY, "model": "gemini-2.5-flash"}}}
        before = self.env.read_text(encoding="utf-8") if self.env.exists() else ""
        self.assertEqual(self.request("POST", "/api/settings", body, token=False)[0], 403)
        self.assertEqual(self.env.read_text(encoding="utf-8") if self.env.exists() else "", before)
        status, data, _ = self.request("POST", "/api/settings", body)
        self.assertEqual(status, 200)
        self.assertNotIn(KEY, data)
        self.assertNotIn(KEY, self.request("GET", "/api/settings")[1])
        self.assertNotIn(KEY, self.request("GET", "/api/status")[1])
        self.assertIn(KEY, self.env.read_text(encoding="utf-8"))

    def test_bad_settings_are_a_400_not_a_write(self):
        before = self.env.read_text(encoding="utf-8") if self.env.exists() else ""
        status, data, _ = self.request("POST", "/api/settings", {"providers": {"gemini": {"model": "a b"}}})
        self.assertEqual(status, 400)
        self.assertIn("modelo", json.loads(data)["error"])
        self.assertEqual(self.env.read_text(encoding="utf-8") if self.env.exists() else "", before)

    def test_batch_screening_waits_for_consent(self):
        self.request("POST", "/api/settings", {"consent": False, "providers": {"gemini": {"api_key": KEY}}})
        status, data, _ = self.request("POST", "/api/batch-screen", {"urls": ["https://x.example/1"]})
        self.assertEqual(status, 400)
        self.assertIn("privacidade", json.loads(data)["error"])

    def test_files_endpoint_serves_only_finished_documents(self):
        status, data, _ = self.request("GET", "/api/file?path=cv/main_example.tex")
        self.assertEqual(status, 403)
        self.assertIn("tipo", json.loads(data)["error"])
        self.assertEqual(self.request("GET", "/api/file?path=.env")[0], 403)
        self.assertEqual(self.request("GET", "/api/file?path=../../etc/passwd")[0], 403)
        self.assertEqual(self.request("GET", "/api/file?path=documents/perfil/respostas.json")[0], 403)

    def test_unconfigured_status_and_blocked_actions_scenarios_1_and_3(self):
        # Limpa o .env temporário para garantir que nada está configurado
        if self.env.exists():
            self.env.unlink()

        status, data, _ = self.request("GET", "/api/status")
        self.assertEqual(status, 200)
        s = json.loads(data)
        self.assertFalse(s["claude"]["available"])
        self.assertEqual(s["claude"]["mode"], "none")
        self.assertEqual(s["provider"]["mode"], "none")
        self.assertEqual(s["provider"]["label"], "Nenhuma IA configurada")

        # Cenário 3: POST /api/batch-screen sem configuração retorna 400 amigável
        status, data, _ = self.request("POST", "/api/batch-screen", {"urls": ["https://remotar.com.br/job/1"]})
        self.assertEqual(status, 400)
        self.assertIn("Nenhum provedor de IA configurado", json.loads(data)["error"])
        self.assertIn(".env.example", json.loads(data)["error"])

        # Cenário 3: POST /api/claude sem configuração retorna 400 amigável
        status, data, _ = self.request("POST", "/api/claude", {"step": "perfil", "confirm": True})
        self.assertEqual(status, 400)
        self.assertIn("Nenhum provedor de IA configurado", json.loads(data)["error"])
        self.assertIn(".env.example", json.loads(data)["error"])


if __name__ == "__main__":
    unittest.main()

