"""Provedores de IA (tools/ai_providers.py): configuração no .env, escolha do provedor e chamadas.

Nenhum teste fala com a rede nem lê o .env ou as CLIs reais da máquina."""

import io
import json
import os
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import ai_providers as ai  # noqa: E402

KEY = "AIza" + "Z" * 35
OTHER_KEY = "sk-ant-" + "q9" * 14


class Isolated(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = Path(self.tmp.name) / ".env"
        clean = {k: v for k, v in os.environ.items() if not k.startswith(("GEMINI_", "OPENAI_", "ANTHROPIC_", "AI_"))}
        patches = [
            mock.patch.dict(os.environ, clean, clear=True),
            mock.patch.object(ai, "ENV_PATH", self.env),
            mock.patch.object(ai.shutil, "which", return_value=None),
            mock.patch.object(ai, "RETRY_DELAYS", ()),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(self.tmp.cleanup)


class Settings(Isolated):
    def test_save_writes_env_and_never_returns_the_key(self):
        out = ai.save_settings({"provider": "gemini", "consent": True,
                                "providers": {"gemini": {"model": "gemini-2.5-pro", "api_key": KEY}}})
        self.assertIn(f"GEMINI_API_KEY={KEY}", self.env.read_text(encoding="utf-8"))
        self.assertNotIn(KEY, json.dumps(out))
        gem = next(p for p in out["providers"] if p["id"] == "gemini")
        self.assertEqual((gem["has_key"], gem["key_hint"], gem["model"]), (True, "••••" + KEY[-4:], "gemini-2.5-pro"))
        self.assertEqual((out["provider"], out["consent"], out["active"]["mode"]), ("gemini", True, "api_key"))

    def test_other_lines_survive_and_blank_key_keeps_the_saved_one(self):
        self.env.write_text("# meu comentário\nOUTRA=1\nGEMINI_API_KEY=" + KEY + "\n", encoding="utf-8")
        ai.save_settings({"providers": {"gemini": {"model": "gemini-2.5-flash", "api_key": ""}}})
        text = self.env.read_text(encoding="utf-8")
        self.assertIn("# meu comentário", text)
        self.assertIn("OUTRA=1", text)
        self.assertIn(f"GEMINI_API_KEY={KEY}", text)

    def test_clear_key(self):
        ai.save_settings({"providers": {"claude": {"api_key": OTHER_KEY}}})
        out = ai.save_settings({"providers": {"claude": {"clear_key": True}}})
        self.assertNotIn(OTHER_KEY, self.env.read_text(encoding="utf-8"))
        self.assertFalse(next(p for p in out["providers"] if p["id"] == "claude")["has_key"])

    def test_rejects_values_that_could_inject_env_lines(self):
        for bad in ({"provider": "skynet"},
                    {"providers": {"gemini": {"api_key": "abc12345\nAI_PROVIDER=openai"}}},
                    {"providers": {"gemini": {"model": "x y"}}},
                    {"providers": {"gemini": {"model": "x\nFOO=1"}}},
                    {"providers": {"openai": {"base_url": "ftp://x"}}},
                    {"providers": {"openai": {"base_url": "http://evil.example/v1"}}},
                    {"providers": {"nope": {}}}):
            with self.assertRaises(ValueError, msg=bad):
                ai.save_settings(bad)
        self.assertFalse(self.env.exists())

    def test_consent_is_off_until_given(self):
        self.assertFalse(ai.has_consent())
        ai.save_settings({"consent": True})
        self.assertTrue(ai.has_consent())
        ai.save_settings({"consent": False})
        self.assertFalse(ai.has_consent())


class Choosing(Isolated):
    def test_explicit_choice_wins_even_without_key(self):
        self.assertEqual(ai.get_ai_provider({"AI_PROVIDER": "claude", "GEMINI_API_KEY": KEY}).name, "claude")
        self.assertEqual(ai.get_ai_provider({"AI_PROVIDER": "chatgpt"}).name, "openai")

    def test_auto_picks_the_first_with_a_key(self):
        self.assertEqual(ai.get_ai_provider({"AI_PROVIDER": "auto", "ANTHROPIC_API_KEY": OTHER_KEY}).name, "claude")
        self.assertEqual(ai.get_ai_provider({"OPENAI_API_KEY": "sk-" + "x" * 40}).name, "openai")

    def test_nothing_configured_is_reported_not_hidden(self):
        p = ai.get_ai_provider({})
        self.assertFalse(p.is_available())
        info = p.get_info()
        self.assertEqual(info["mode"], "none")
        self.assertEqual(info["provider"], "openai")
        self.assertEqual(info["label"], "Codex / OpenAI (não configurado)")
        with self.assertRaises(ai.ProviderError) as cm:
            p.generate("oi")
        self.assertIn(".env.example", str(cm.exception))

    def test_a_cli_is_enough_when_there_is_no_key(self):
        with mock.patch.object(ai.shutil, "which", side_effect=lambda cmd: "/usr/bin/" + cmd):
            self.assertEqual(ai.get_ai_provider({}).get_info()["mode"], "cli")

    def test_auto_prefers_codex_before_other_provider_keys(self):
        with mock.patch.object(ai.shutil, "which", side_effect=lambda cmd: "/usr/bin/codex" if cmd == "codex" else None):
            provider = ai.get_ai_provider({"AI_PROVIDER": "auto", "ANTHROPIC_API_KEY": OTHER_KEY})
        self.assertEqual(provider.name, "openai")
        self.assertEqual(provider.mode, "cli")

    def test_find_cli_is_symmetric_and_strictly_checks_path(self):
        with mock.patch.object(ai.shutil, "which", side_effect=lambda cmd: f"/bin/{cmd}" if cmd == "codex" else None) as mock_which:
            p_openai = ai.Provider("openai", {})
            p_gemini = ai.Provider("gemini", {})
            p_claude = ai.Provider("claude", {})
            self.assertEqual(p_openai.cli_bin, "/bin/codex")
            self.assertIsNone(p_gemini.cli_bin)
            self.assertIsNone(p_claude.cli_bin)
            checked = {call.args[0] for call in mock_which.call_args_list}
            self.assertEqual(checked, {"codex", "agy", "claude"})

    def test_codex_openai_env_first_execution(self):
        env = {
            "AI_PROVIDER": "openai",
            "OPENAI_API_KEY": "sk-proj-test1234567890",
            "OPENAI_MODEL": "gpt-4o-mini",
        }
        p = ai.get_ai_provider(env)
        self.assertEqual(p.name, "openai")
        self.assertEqual(p.mode, "api_key")
        self.assertTrue(p.is_available())
        info = p.get_info()
        self.assertEqual(info["provider"], "openai")
        self.assertEqual(info["model"], "gpt-4o-mini")
        self.assertIn("gpt-4o-mini via API", info["label"])
        reply = {"choices": [{"message": {"content": "Olá via OpenAI"}}]}
        with mock.patch.object(ai, "_post_json", return_value=reply) as post:
            res = p.generate("Diga olá")
        self.assertEqual(res, "Olá via OpenAI")
        self.assertEqual(post.call_args.args[0], "https://api.openai.com/v1/chat/completions")


class Calls(Isolated):
    def test_gemini_key_goes_in_a_header_not_in_the_url(self):
        reply = {"candidates": [{"content": {"parts": [{"text": "olá "}, {"text": "mundo"}]}}]}
        with mock.patch.object(ai, "_post_json", return_value=reply) as post:
            out = ai.Provider("gemini", {"GEMINI_API_KEY": KEY}).generate("oi", system_instruction="seja breve")
        url, headers, payload = post.call_args.args[:3]
        self.assertEqual(out, "olá mundo")
        self.assertNotIn(KEY, url)
        self.assertEqual(headers["x-goog-api-key"], KEY)
        self.assertEqual(payload["systemInstruction"]["parts"][0]["text"], "seja breve")

    def test_claude_and_openai_parse_their_replies(self):
        with mock.patch.object(ai, "_post_json", return_value={"content": [{"type": "text", "text": "ok"}]}):
            self.assertEqual(ai.Provider("claude", {"ANTHROPIC_API_KEY": OTHER_KEY}).generate("oi"), "ok")
        reply = {"choices": [{"message": {"content": "certo"}}]}
        with mock.patch.object(ai, "_post_json", return_value=reply) as post:
            p = ai.Provider("openai", {"OPENAI_API_KEY": "sk-" + "x" * 40, "OPENAI_MODEL": "o3-mini"})
            self.assertEqual(p.generate("oi"), "certo")
        payload = post.call_args.args[2]
        self.assertNotIn("temperature", payload)  # modelos o* só aceitam a padrão
        self.assertIn("max_completion_tokens", payload)

    def test_custom_openai_endpoint_needs_no_key_and_uses_max_tokens(self):
        reply = {"choices": [{"message": {"content": "local"}}]}
        with mock.patch.object(ai, "_post_json", return_value=reply) as post:
            p = ai.Provider("openai", {"OPENAI_BASE_URL": "http://localhost:11434/v1", "OPENAI_MODEL": "llama3"})
            self.assertEqual((p.mode, p.generate("oi")), ("api_key", "local"))
        self.assertEqual(post.call_args.args[0], "http://localhost:11434/v1/chat/completions")
        self.assertIn("max_tokens", post.call_args.args[2])

    def test_http_errors_never_leak_the_key_and_are_retried_only_when_transient(self):
        def boom(code):
            return urllib.error.HTTPError("u", code, "x", {}, io.BytesIO(f"bad key {KEY}".encode()))
        with mock.patch("urllib.request.urlopen", side_effect=boom(401)) as op:
            with self.assertRaises(ai.ProviderError) as cm:
                ai.Provider("gemini", {"GEMINI_API_KEY": KEY}).generate("oi")
        self.assertNotIn(KEY, str(cm.exception))
        self.assertIn("401", str(cm.exception))
        self.assertEqual(op.call_count, 1)
        with mock.patch.object(ai, "RETRY_DELAYS", (0, 0)), \
                mock.patch("urllib.request.urlopen", side_effect=boom(429)) as op:
            with self.assertRaises(ai.ProviderError):
                ai.Provider("gemini", {"GEMINI_API_KEY": KEY}).generate("oi")
        self.assertEqual(op.call_count, 3)

    def test_model_name_cannot_rewrite_the_url(self):
        with self.assertRaises(ai.ProviderError):
            ai.Provider("gemini", {"GEMINI_API_KEY": KEY, "GEMINI_MODEL": "x:generate?key=1#"}).generate("oi")

    def test_cli_gets_the_prompt_on_stdin_in_an_empty_folder(self):
        done = mock.Mock(returncode=0, stdout="resposta\n".encode(), stderr=b"")
        p = ai.Provider("claude", {})
        p.cli_bin = "/usr/bin/claude"
        with mock.patch.object(ai.subprocess, "run", return_value=done) as run:
            self.assertEqual(p.generate("texto da vaga & mais", system_instruction="sys"), "resposta")
        cmd = run.call_args.args[0]
        self.assertEqual(cmd, ["/usr/bin/claude", "-p"])
        self.assertEqual(run.call_args.kwargs["input"], "sys\n\ntexto da vaga & mais".encode())
        self.assertNotEqual(Path(run.call_args.kwargs["cwd"]).resolve(), ROOT)

    def test_agy_refuses_a_prompt_the_command_line_cannot_carry(self):
        p = ai.Provider("gemini", {})
        p.cli_bin = "agy"
        with self.assertRaises(ai.ProviderError):
            p.generate("x" * (ai.MAX_ARGV_CHARS + 1))

    def test_check_connection_reports_failures_as_data(self):
        out = ai.check_connection("claude", {})
        self.assertFalse(out["ok"])
        self.assertIn("Configurações", out["message"])


if __name__ == "__main__":
    unittest.main()
