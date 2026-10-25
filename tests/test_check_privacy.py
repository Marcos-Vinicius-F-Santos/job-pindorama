"""Auditoria pré-push (tools/check_privacy.py): acha vazamentos sem mostrá-los e sem trazer dados de ninguém no código."""

import contextlib
import io
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import check_privacy  # noqa: E402

GOOGLE_KEY = "AIza" + "K" * 35
LEAK = "Zorg Testovich"


def git(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True)


class SourceIsClean(unittest.TestCase):
    def test_no_personal_data_is_written_in_the_tool_sources(self):
        for name in ("check_privacy.py", "privacy_utils.py", "painel_ia.py", "ai_providers.py"):
            text = (ROOT / "tools" / name).read_text(encoding="utf-8")
            self.assertEqual(check_privacy.check_text(text, check_privacy.GENERIC_PATTERNS), [], name)


class Audit(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)
        git(self.root, "init", "-q")
        shutil.copy(ROOT / ".gitignore", self.root / ".gitignore")
        (self.root / ".privacy-patterns").write_text(f"# nomes que não podem aparecer\n{LEAK}\n", encoding="utf-8")
        for patch in (mock.patch.object(check_privacy, "ROOT", self.root),
                      mock.patch.object(check_privacy, "EXTRA_PATTERNS_FILE", self.root / ".privacy-patterns")):
            patch.start()
            self.addCleanup(patch.stop)

    def run_audit(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = check_privacy.main()
        return code, out.getvalue()

    def test_clean_repo_passes(self):
        (self.root / "README.md").write_text("nada sensível\n", encoding="utf-8")
        git(self.root, "add", "-A")
        code, out = self.run_audit()
        self.assertEqual(code, 0, out)

    def test_leaks_are_found_in_tracked_and_in_new_files_without_printing_them(self):
        (self.root / "tracked.md").write_text(f"chave {GOOGLE_KEY}\n", encoding="utf-8")
        git(self.root, "add", "tracked.md")
        (self.root / "novo.md").write_text(f"contato: {LEAK}\n", encoding="utf-8")  # nem entrou no git ainda
        code, out = self.run_audit()
        self.assertEqual(code, 1)
        self.assertIn("tracked.md", out)
        self.assertIn("novo.md", out)
        self.assertNotIn(GOOGLE_KEY, out)
        self.assertNotIn(LEAK, out)

    def test_forbidden_files_and_lost_ignore_rules_are_reported(self):
        (self.root / "service.pem").write_text("x", encoding="utf-8")
        git(self.root, "add", "-f", "service.pem")
        (self.root / ".gitignore").write_text("# regras apagadas\n", encoding="utf-8")
        code, out = self.run_audit()
        self.assertEqual(code, 1)
        self.assertIn("PROIBIDO", out)
        self.assertIn("GITIGNORE", out)

    def test_removing_a_leak_is_not_a_violation(self):
        (self.root / "a.md").write_text(f"{LEAK}\n", encoding="utf-8")
        git(self.root, "add", "a.md")
        git(self.root, "-c", "user.name=t", "-c", "user.email=t@t.test", "commit", "-qm", "x")
        (self.root / "a.md").write_text("limpo\n", encoding="utf-8")
        git(self.root, "add", "a.md")
        self.assertEqual(self.run_audit()[0], 0)


if __name__ == "__main__":
    unittest.main()

