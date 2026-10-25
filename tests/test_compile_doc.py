"""tools/compile_doc.py: só documentos do /apply e de entrevista, sempre sem execução de comandos pelo LaTeX."""

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import compile_doc  # noqa: E402


class Target(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        for d in ("cv", "cover_letters", "tools", "documents/interview", "documents/cv"):
            (self.root / d).mkdir(parents=True, exist_ok=True)
        for f in ("cv/main_acme_pm.tex", "cover_letters/cover_acme_pm.tex", "cover_letters/Cover_acme_pm.tex",
                  "documents/interview/prep_acme_pm.tex", "documents/cv/main_acme_pm.tex",
                  "cv/main_example.tex", "cv/outro.tex", "tools/main_x.tex"):
            (self.root / f).write_text("x", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_engine_follows_the_folder(self):
        self.assertEqual(compile_doc.target("cv/main_acme_pm.tex", self.root)[1], "lualatex")
        self.assertEqual(compile_doc.target("cover_letters/cover_acme_pm.tex", self.root)[1], "xelatex")
        self.assertEqual(compile_doc.target("cover_letters/Cover_acme_pm.tex", self.root)[1], "xelatex")
        self.assertEqual(compile_doc.target("documents/interview/prep_acme_pm.tex", self.root)[1], "lualatex")

    def test_refuses_anything_else(self):
        for path in ("cv/outro.tex", "tools/main_x.tex", "documents/cv/main_acme_pm.tex",
                     "cv/../tools/main_x.tex", "cv/main_example.tex",
                     "cv/main_nao_existe.tex", "cover_letters/cover_acme_pm.pdf",
                     str(Path(self.tmp.name).parent / "main_x.tex")):
            with self.assertRaises(ValueError, msg=path):
                compile_doc.target(path, self.root)

    def test_command_always_disables_shell_escape(self):
        tex = self.root / "cv" / "main_acme_pm.tex"
        for flag in ("--disable-write18", "-no-shell-escape"):
            cmd = compile_doc.command("lualatex", tex, flag)
            self.assertEqual(cmd, ["lualatex", flag, "-interaction=nonstopmode", "-halt-on-error", "main_acme_pm.tex"])
            self.assertFalse(any(part in ("-shell-escape", "--shell-escape", "--enable-write18") for part in cmd))

    def test_clean_only_touches_this_document(self):
        cv = self.root / "cv"
        for name in ("main_acme_pm.aux", "main_acme_pm.log", "main_acme_pm.pdf", "main_outra.aux"):
            (cv / name).write_text("x", encoding="utf-8")
        removed = compile_doc.clean(cv / "main_acme_pm.tex")
        self.assertEqual(sorted(removed), ["main_acme_pm.aux", "main_acme_pm.log"])
        self.assertTrue((cv / "main_acme_pm.pdf").exists() and (cv / "main_outra.aux").exists()
                        and (cv / "main_acme_pm.tex").exists())


if __name__ == "__main__":
    unittest.main()
