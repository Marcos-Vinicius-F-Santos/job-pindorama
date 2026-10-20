"""Where the posting integrity gate (tools/posting_guard.py) is wired beyond /apply
Step 0 and /rank Step 2: the archive, /interview, and the trust-boundary rules.

Why this test exists: a gate that only runs in one place is bypassed the moment
a posting reaches the workflow another way - from the archive in /interview, or
pasted by hand. These pins keep each entry point naming the gate, and keep the
archive free of the excerpts the gate removed (counts only), so a stripped
payload is never re-read by a later session.
"""
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
APPLY = REPO / ".claude" / "commands" / "apply.md"
INTERVIEW = REPO / ".claude" / "commands" / "interview.md"
RESEARCH = REPO / ".claude" / "skills" / "job-application-assistant" / "09-web-research.md"


class ArchiveWiring(unittest.TestCase):
    def setUp(self):
        text = APPLY.read_text(encoding="utf-8")
        self.step6b = re.search(r"### Passo 6b: Registrar a candidatura(.*?)(?=### Campos de formulário)", text, re.DOTALL).group(1)

    def test_archive_stores_cleaned_text_with_counts_only(self):
        item7 = re.search(r"7\. \*\*Arquive a vaga agora\.\*\*(.*?)(?=\n\n|\Z)", self.step6b, re.DOTALL).group(1)
        self.assertIn("ao pé da letra", item7)  # still never a summary (test_apply_records_application pins it too)
        self.assertIn("posting_guard", item7)
        self.assertIn("contagens", item7)
        self.assertRegex(item7, r"nunca .*trechos", "removed content must not be re-archived as quotes")


class InterviewWiring(unittest.TestCase):
    def test_step1_gates_the_archived_posting_in_text_mode(self):
        text = INTERVIEW.read_text(encoding="utf-8")
        step1 = re.search(r"## Passo 1: Carregar o contexto da candidatura(.*?)(?=\n## Passo 2)", text, re.DOTALL).group(1)
        self.assertIn("posting_guard", step1)
        self.assertIn("--text", step1)


class OtherFrontDoors(unittest.TestCase):
    """The skill's own Step 1, /outcome's fresh-fetch archive and /interview's
    fetch fallback are the other places a posting enters; each names the gate."""

    def test_skill_step1_names_the_gate(self):
        text = (REPO / ".claude" / "skills" / "job-application-assistant" / "SKILL.md").read_text(encoding="utf-8")
        step1 = re.search(r"### Passo 1: Pesquisar e avaliar o encaixe(.*?)(?=### Passo 2)", text, re.DOTALL).group(1)
        self.assertIn("posting_guard", step1)
        self.assertIn("framework_version: 1.4.0", text)

    def test_outcome_fresh_fetch_is_gated(self):
        text = (REPO / ".claude" / "commands" / "outcome.md").read_text(encoding="utf-8")
        self.assertIn("posting_guard", text)

    def test_interview_fetch_fallback_is_gated(self):
        text = INTERVIEW.read_text(encoding="utf-8")
        step1 = re.search(r"## Passo 1: Carregar o contexto da candidatura(.*?)(?=\n## Passo 2)", text, re.DOTALL).group(1)
        fallback = re.search(r"2\. \*\*Planos B\*\*(.*?)(?=\n3\. )", step1, re.DOTALL).group(1)
        self.assertIn("posting_guard", fallback)

    def test_scratchpad_is_guarded_everywhere_the_gate_writes(self):
        for path in (APPLY, REPO / ".claude" / "agents" / "posting-fetcher.md", REPO / ".claude" / "agents" / "posting-scorer.md"):
            text = path.read_text(encoding="utf-8")
            with self.subTest(path=path.name):
                self.assertNotRegex(text, r"\$SCRATCHPAD/", "use ${SCRATCHPAD:?...} so an unset variable fails loudly")
                self.assertIn("${SCRATCHPAD:?", text)

    def test_fetch_agents_can_discover_installed_portals(self):
        for name in ("posting-fetcher.md", "posting-scorer.md"):
            text = (REPO / ".claude" / "agents" / name).read_text(encoding="utf-8")
            tools = re.search(r"^tools:\s*(.*)$", text, re.M).group(1)
            with self.subTest(agent=name):
                self.assertIn("Glob", tools, "rung 1 needs to find .agents/skills/*/SKILL.md")


class TrustBoundaryWiring(unittest.TestCase):
    def test_09_trust_boundary_names_the_gate(self):
        text = RESEARCH.read_text(encoding="utf-8")
        boundary = re.search(r"## Fronteira de confiança(.*?)(?=\n## )", text, re.DOTALL).group(1)
        self.assertIn("posting_guard", boundary)
        self.assertIn("framework_version: 1.2.0", text)


if __name__ == "__main__":
    unittest.main()
