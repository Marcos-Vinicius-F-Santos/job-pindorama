"""Guards for the /rank command spec.

The command is a markdown spec (the spec IS the implementation), so these
tests pin the invariants that would break silently: the header format that
lint_skills.py enforces, and the persistence of scoring-agent gaps/strengths
into seen_jobs.json (previously computed in Step 2 and thrown away after
Step 5's terminal output).
"""
import importlib.util
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

try:
    import yaml  # noqa: F401 - only probing availability for the lint integration test
    _HAVE_YAML = True
except ImportError:
    _HAVE_YAML = False

REPO = Path(__file__).resolve().parent.parent
COMMAND = REPO / ".claude" / "commands" / "rank.md"
SCRAPER_SKILL = REPO / ".claude" / "skills" / "job-scraper" / "SKILL.md"
EVALUATION = (
    REPO / ".claude" / "skills" / "job-application-assistant" / "04-job-evaluation.md"
)


def _sections(text: str) -> dict[str, str]:
    """Split a command spec into {heading: body} by '##' headers.

    Splitting this way lets a fork's extra sections (e.g. this fork's
    '## Blocker logging') sit between the ones under test without shifting
    which text a given assertion sees.
    """
    parts = text.split("\n## ")
    result = {}
    for part in parts[1:]:
        heading, _, body = part.partition("\n")
        result[heading.strip()] = body
    return result


class RankCommandSpec(unittest.TestCase):
    def test_step2_dispatches_posting_scorer_and_returns_guard(self):
        """Scoring agents read untrusted postings, so they run as the shipped
        least-privilege `posting-scorer` definition (no Edit/Write), gate every
        body with tools/posting_guard.py, and return the verdict as `guard`."""
        text = COMMAND.read_text(encoding="utf-8")
        sections = _sections(text)
        step2 = sections["Passo 2: Coletar e pontuar em lote"]
        self.assertIn("posting-scorer", step2, "Step 2 must dispatch the posting-scorer agent")
        self.assertNotIn("general-purpose", step2, "Step 2 must no longer dispatch general-purpose agents")
        self.assertIn("posting_guard", step2, "Step 2 must run the integrity gate on each fetched body")
        self.assertIn('"guard"', step2, "Step 2's JSON must carry the gate verdict")
        step4 = sections["Passo 4: Atualizar o estado"]
        self.assertIn("guard", step4, "Step 4 must persist the gate verdict")
        # Step 5 embeds an example report whose "## Job Ranking" line would split
        # _sections early, so anchor on the next real heading instead.
        step5 = re.search(r"## Passo 5: Apresentar a lista final(.*?)\n## Regras importantes", text, re.DOTALL).group(1)
        self.assertIn("guard", step5, "Step 5 must surface a flagged posting")
        self.assertIn("⚠", step5)

    def test_step1_empty_candidates_still_sweeps_and_reports(self):
        """No new jobs must not bypass expiry maintenance of ranked jobs."""
        step1 = _sections(COMMAND.read_text(encoding="utf-8"))["Passo 1: Carregar o estado"]
        empty_branch = step1.partition("Se informar que não há candidatas")[2].partition("Then read")[0]
        self.assertIn(
            "python3 tools/rank_state.py sweep --write",
            empty_branch,
            "an empty candidate batch must still persist rule 6's expiry sweep",
        )
        self.assertNotIn("--exclude", empty_branch, "no jobs were re-scored on this path")
        for field in ("swept", "newly_expired", "closing_soon", "unparseable_deadlines"):
            self.assertIn(field, empty_branch, f"the empty-run report must consume {field}")
        self.assertIn("pule", empty_branch)
        self.assertIn("Passos 2-4", empty_branch, "an empty run must not fetch or score jobs")

    def test_agent_status_contract_matches_the_state_helper(self):
        """#534: `rank_state.py` owns the set of statuses a scoring agent may
        return (`AGENT_STATUSES`), and Step 2's JSON contract must name exactly
        that set. A status the spec offers but the tool lacks is rejected at
        write-back; one the tool accepts but the spec omits is never produced."""
        spec = importlib.util.spec_from_file_location("rank_state", REPO / "tools" / "rank_state.py")
        rank_state = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(rank_state)

        text = COMMAND.read_text(encoding="utf-8")
        union = re.search(r'"status":\s*("[a-z_]+"(?:\s*\|\s*"[a-z_]+")+)', text)
        self.assertIsNotNone(union, "Step 2's JSON contract must spell out the status union")
        self.assertEqual(set(re.findall(r'"([a-z_]+)"', union.group(1))), set(rank_state.AGENT_STATUSES))
        self.assertIn("unreachable", rank_state.AGENT_STATUSES)
        self.assertIn('"fetch_error"', text, "an unreachable result names its failure for the report")

    def test_command_file_exists_with_lint_compliant_header(self):
        self.assertTrue(COMMAND.is_file(), "command spec missing")
        first_line = COMMAND.read_text(encoding="utf-8").splitlines()[0]
        self.assertTrue(
            first_line.startswith("# /rank"),
            f"header must start with '# /rank' (lint_skills.py enforces it), got: {first_line!r}",
        )

    def test_step4_persists_gaps_and_strengths(self):
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step4 = sections.get("Passo 4: Atualizar o estado", "")
        self.assertIn('"gaps"', step4, "Step 4 must persist the gaps array into seen_jobs.json")
        self.assertIn('"strengths"', step4, "Step 4 must persist the strengths array into seen_jobs.json")

    def test_step4_documents_verbatim_no_accumulate_and_untrusted_data_rules(self):
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step4 = sections.get("Passo 4: Atualizar o estado", "")
        self.assertIn("ao pé da letra", step4, "Step 4 must require storing gaps/strengths verbatim, never reformatted")
        self.assertIn("substitui", step4, "Step 4 must state that --all re-scoring replaces, not accumulates, the arrays")
        self.assertIn("dado não confiável", step4, "Step 4 must restate that stored gaps/strengths are dado não confiável")

    def test_important_rules_link_honest_scoring_to_persistence(self):
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        rules = sections.get("Regras importantes", "")
        self.assertIn(
            "gravadas junto",
            rules,
            "Rule 5 must note that gaps are persisted (Step 4), not just printed (Step 5)",
        )

    def test_job_scraper_schema_note_mentions_strengths_and_gaps(self):
        text = SCRAPER_SKILL.read_text(encoding="utf-8")
        self.assertIn("strengths", text)
        self.assertIn("gaps", text)
        self.assertIn(
            "quem lê tolera a ausência",
            text,
            "schema note must say old entries lacking strengths/gaps are tolerated, never backfilled",
        )

    def test_job_scraper_schema_carries_deadline(self):
        """Pins the base field in the seen_jobs.json structure block and the
        never-infer note. Step 2's detail fetch already extracts the deadline, so
        /scrape writes it at first sight instead of leaving it to /rank (#319).
        """
        text = SCRAPER_SKILL.read_text(encoding="utf-8")
        self.assertIn(
            '"deadline": "YYYY-MM-DD" | null',
            text,
            "the seen_jobs.json structure block must carry the deadline field, "
            "or every later run has no stored value to re-derive urgency from",
        )
        self.assertIn(
            "nunca deduza um prazo",
            text,
            "the schema note must forbid guessing a deadline from null or from a missing key",
        )
        self.assertIn(
            "campo de base, não uma extensão do `/rank`",
            text,
            "the note must say the deadline is written when the job is first seen, "
            "not only when /rank re-scores it",
        )

    def test_verdict_is_written_to_location_verdict_not_bare_location(self):
        """`location` meant two incompatible things in seen_jobs.json: a place
        (scraper search output, driving the commute filter) and a PASS/FAIL/FLAG
        verdict (/rank Step 4), so a ranked entry could overwrite "Aarhus,
        Denmark" with "PASS" and no reader could tell which meaning a stored
        value carried (review finding F27B, 2026-08-19)."""
        text = COMMAND.read_text(encoding="utf-8")
        self.assertIn('"location_verdict"', text, "Step 2's agent JSON must use location_verdict")
        self.assertIn(
            '"location_verdict": "PASS"/"FAIL"/"FLAG"',
            text,
            "Step 4 must persist the verdict under location_verdict",
        )
        self.assertNotIn(
            '"location":',
            text,
            "the PASS/FAIL/FLAG verdict must never be written to the bare "
            "location key, which the scraper uses for a place",
        )
        self.assertIn(
            "antiga",
            text,
            "Step 4 must carry a migration rule for entries that stored the "
            "verdict under the old location key",
        )

    def test_job_scraper_schema_note_enumerates_the_veto_fields(self):
        """SKILL.md's "do not drop any of these fields" instruction cannot
        protect fields it does not name - and it omitted exactly the three
        rank.md calls tão importantes de gravar quanto a própria nota (review
        finding F27 Part A, 2026-08-19)."""
        text = SCRAPER_SKILL.read_text(encoding="utf-8")
        for field in ("location_verdict", "language_gate", "language_note"):
            self.assertIn(
                field,
                text,
                f"the seen_jobs schema note must enumerate {field} so the "
                "do-not-drop instruction covers it",
            )

    def test_evaluation_framework_acknowledges_language_gate_tracking(self):
        """04-job-evaluation.md is the authoritative file /rank tells its agents
        to read. Its Language Gate preamble once said the gate result "is not a
        field /scrape or /rank track" - written before the gate was wired into
        both consumers, and never updated. An agent reading that learns the
        opposite of what rank.md itself insists on ("These veto fields are as
        important to persist as the score itself"). The framework text must name
        the tracked fields and must not claim they are untracked."""
        text = EVALUATION.read_text(encoding="utf-8")
        gate = text.partition("## Filtro de idioma (Language Gate)")[2].partition("\n## ")[0]
        self.assertTrue(gate, "04-job-evaluation.md has no Language Gate section")
        self.assertIn(
            "language_gate",
            gate,
            "the Language Gate section must name the language_gate field /rank persists",
        )
        self.assertIn(
            "language_note",
            gate,
            "the Language Gate section must name the language_note field /rank persists",
        )
        self.assertNotIn(
            "not a field",
            gate,
            "stale claim: the gate result IS tracked by /scrape and /rank now",
        )

    def test_sweep_parses_stored_deadlines_defensively(self):
        """Rule 6's expiry sweep mutates status automatically from stored
        deadline values, and portals have shipped non-ISO shapes into
        seen_jobs.json ("ASAP" from jobindex, DD.MM.YYYY from jobbank,
        free text from jobdanmark's detail fallback). /outcome carries a
        defensive date-parse rule for mere display; the command that
        silently changes state needs one at least as much."""
        text = COMMAND.read_text(encoding="utf-8")
        self.assertIn(
            "Leia os prazos gravados com cautela",
            text,
            "rule 6's sweep must state the defensive-parse rule",
        )
        self.assertRegex(
            text,
            r"não seja uma data `YYYY-MM-DD`[^.]*tratado exatamente como um ausente",
            "a non-ISO stored deadline must be handled as absent, not compared or guessed at",
        )

    def test_step2_schema_includes_language_gate_fields(self):
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step2 = sections.get("Passo 2: Coletar e pontuar em lote", "")
        self.assertIn('"language_gate"', step2, "Step 2's scoring-agent JSON must include language_gate")
        self.assertIn('"language_note"', step2, "Step 2's scoring-agent JSON must include language_note")
        self.assertIn(
            '"PASS" | "FAIL" | "FLAG"',
            step2,
            "language_gate must use the same PASS/FAIL/FLAG verdict set as the location veto",
        )
        self.assertIn(
            "diferente de",
            step2,
            "spec must distinguish language_gate/language_note from the pre-existing 'language' field "
            "(which records the posting's own language, not a veto verdict) - the two are easy to conflate",
        )

    def test_step3_documents_language_veto(self):
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step3 = sections.get("Passo 3: Agregar e ordenar", "")
        self.assertIn(
            "Veto de idioma",
            step3,
            "Step 3 must document a Veto de idioma rule, mirroring the existing Location veto",
        )
        self.assertIn(
            "exclui a vaga da lista final",
            step3,
            "a language_gate FAIL must be documented as excluding the job, same as a location FAIL",
        )

    def test_step4_persists_language_gate_and_language_note(self):
        """Regression guard: language_gate/language_note were computed in Step 2 and used
        to decide Step 3's veto, but never written to seen_jobs.json - live-debugged and
        fixed once already (a real /rank run showed language_gate: null on every entry
        despite the run reporting real vetoes). This pins the fix in the spec text the
        same way test_step4_persists_gaps_and_strengths pins the sibling strengths/gaps
        persistence bug, so a future edit can't silently reintroduce either loss.
        """
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step4 = sections.get("Passo 4: Atualizar o estado", "")
        self.assertIn('"language_gate"', step4, "Step 4 must persist language_gate into seen_jobs.json")
        self.assertIn('"language_note"', step4, "Step 4 must persist language_note into seen_jobs.json")
        self.assertIn(
            "tão importantes de gravar quanto a própria nota",
            step4,
            "Step 4 must call out that the veto fields (location/language_gate/language_note) are not optional extras",
        )

    def test_step4_persists_deadline(self):
        """Sibling of test_step4_persists_language_gate_and_language_note: the deadline was
        computed in Step 2 and acted on in Step 3, but never written to seen_jobs.json, so
        the urgency marker fired exactly once and a later run had to re-fetch the posting to
        recover the date (#319). Pins the persistence in the Step 4 field list.
        """
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step4 = sections.get("Passo 4: Atualizar o estado", "")
        self.assertIn('"deadline"', step4, "Step 4 must persist the deadline into seen_jobs.json")
        self.assertIn(
            "do mesmo JSON do Passo 2",
            step4,
            "Step 4 must source the persisted deadline from the scoring agent's JSON, not from a guess",
        )
        self.assertIn(
            "ausência não é correção",
            step4,
            "Step 4 must keep an existing stored deadline when the agent returned null, "
            "so a fresh run never blanks a date the scraper already recorded",
        )

    def test_step3_reads_stored_deadline_without_fetch(self):
        """Persisting alone does not re-fire the marker: Step 3 must read the stored
        deadline back so urgency is re-derived on every run without re-reading the
        posting (which is the dead-URL source the field exists to replace).
        """
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step3 = sections.get("Passo 3: Agregar e ordenar", "")
        self.assertIn(
            "`deadline` gravado",
            step3,
            "Step 3 must take the deadline from seen_jobs.json for a job that already carries one",
        )
        self.assertIn(
            "não custa coleta",
            step3,
            "Step 3 must state that the stored value não custa coleta - that is the entire point of persisting it",
        )

    def test_step3_documents_expiry_sweep_over_ranked_entries(self):
        """Rule 6: entries this run did not re-score still get their stored deadline checked,
        enforcing the only-open-positions rule beyond the moment of fetching.
        """
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step3 = sections.get("Passo 3: Agregar e ordenar", "")
        self.assertIn(
            "Varredura de vencimento",
            step3,
            "Step 3 must document a sweep over already-ranked entries this run did not re-score",
        )
        self.assertIn(
            "comparação de datas com valores já no disco",
            step3,
            "the sweep must be a pure on-disk comparison - no fetch, no agent",
        )
        step5 = sections.get("Ranking de vagas - YYYY-MM-DD", "")
        self.assertIn(
            "Encerrando em breve",
            step5,
            "Step 5's template must name the Encerrando em breve heading rule 6 lists under",
        )

    def test_step3_sweep_states_its_two_boundary_rules(self):
        """The sweep's behaviour on the majority case, and its reversibility.

        Most `seen_jobs.json` entries predate the deadline column and carry no
        `deadline` at all, so "left alone" versus "inferred from first_seen" is
        the difference between a no-op and retiring jobs on a date nobody set.
        And a status change made without a fetch needs a stated way back, or
        `expired` reads as terminal and a wrongly swept job looks unrecoverable.
        """
        step3 = _sections(COMMAND.read_text(encoding="utf-8")).get("Passo 3: Agregar e ordenar", "")
        self.assertIn(
            "sem nunca chutar",
            step3,
            "rule 6 must say an entry with no stored deadline is left alone - it is the "
            "majority case, and inferring one would retire jobs on a date nobody set",
        )
        self.assertIn(
            "revivida por um `--all` posterior",
            step3,
            "rule 6 must state that --all re-scores expired entries, or the sweep is an "
            "irreversible automated status change",
        )

    def test_step4_sweep_is_named_as_the_exception_to_idempotency(self):
        """Rule 6 mutates exactly the entries Step 4 says are skipped.

        Step 4's closing line predates the sweep and says already-`ranked` jobs
        are skipped unless `--all` re-scores them. Rule 6 rewrites some of those
        same entries to `expired` with no `--all` and no re-score, so the two
        sections contradict each other unless the exception is named. An
        implementer following Step 4 literally skips the sweep, which is the
        whole feature.
        """
        step4 = _sections(COMMAND.read_text(encoding="utf-8")).get("Passo 4: Atualizar o estado", "")
        self.assertIn(
            "exceção deliberada",
            step4,
            "Step 4's idempotency line must name rule 6's sweep as its exception, or the "
            "spec tells the reader both that already-ranked entries are skipped and that "
            "they are swept",
        )

    def test_step4_null_deadline_rule_states_its_interlock_with_the_sweep(self):
        """Absence-is-not-a-correction is load-bearing, not politeness.

        A `null` from a fetch that degraded to a listing page would erase a real
        stored date; because rule 6 leaves an entry with no stored deadline
        alone, that erasure also makes the entry permanently unsweepable. The
        two rules interlock, and an unexplained constraint is the kind that gets
        simplified away later.
        """
        step4 = _sections(COMMAND.read_text(encoding="utf-8")).get("Passo 4: Atualizar o estado", "")
        self.assertIn(
            "imortal para a varredura",
            step4,
            "the null-overwrite rule must state why it matters here: erasing a stored "
            "deadline also removes the entry from rule 6's reach forever",
        )

    def test_step5_reports_the_sweep_counts(self):
        """A background status mutation with no reported count is the failure mode
        this whole change set exists to object to."""
        step5 = _sections(COMMAND.read_text(encoding="utf-8")).get("Ranking de vagas - YYYY-MM-DD", "")
        self.assertIn(
            "Varri",
            step5,
            "Step 5's template must report how many already-ranked entries the sweep "
            "checked and how many it retired - it rewrites seen_jobs.json silently otherwise",
        )

    def test_step4_persists_the_sweeps_expiry(self):
        """The sweep must write its result, or it reproduces the very bug it fixes.

        Step 4's expiry line is scoped to what the Step 2 agents returned. The sweep
        runs over entries this run did not re-score, so without its own persistence
        line the transition happens in reasoning only and disk never changes.
        """
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step4 = sections.get("Passo 4: Atualizar o estado", "")
        self.assertIn(
            "aposentadas pela varredura da regra 6 do Passo 3",
            step4,
            "Step 4 must persist the Step 3 rule 6 sweep's expiries, not just the ones "
            "the scoring agents reported",
        )

    def test_step5_documents_language_flag_marker(self):
        # Note: _sections() splits on every "\n## " line, including the "## Job
        # Ranking - YYYY-MM-DD" line inside Step 5's own fenced example template -
        # so the presentation rules that follow that example live under that key,
        # not "Passo 5: Apresentar a lista final" itself. Matches how the existing
        # gaps/strengths tests above only probe Step 4, never Step 5, for the same
        # reason - documented here since it's easy to trip over when adding a new
        # Step-5-content test.
        sections = _sections(COMMAND.read_text(encoding="utf-8"))
        step5_rules = sections.get("Ranking de vagas - YYYY-MM-DD", "")
        self.assertIn(
            "language_gate: FLAG",
            step5_rules,
            "Step 5's presentation rules must document the ⚠ marker + language_note callout "
            "for a shortlisted FLAG job, mirroring the existing location FLAG treatment",
        )

    @unittest.skipUnless(
        _HAVE_YAML,
        "PyYAML not installed (the CI Python-test job omits it; the lint job runs lint_skills.py directly)",
    )
    def test_lint_skills_passes(self):
        result = subprocess.run(
            [sys.executable, str(REPO / "tools" / "lint_skills.py")],
            cwd=REPO,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, f"lint_skills.py failed:\n{result.stdout}{result.stderr}")


class PostedDateStalenessSpec(unittest.TestCase):
    """Step 3 must consume the posted_date #391 persists.

    The field exists because a 27-month-old posting ranked Strong Fit at
    position 1 of 133 (#390): the scoring agent noticed the age and wrote it
    into prose nothing reads. Persistence alone changes nothing - these pin
    that /rank actually derives a signal from the stored date, and that the
    signal keeps the schema's own boundary rules (flag never veto, no
    inference for absent values, rule 6's defensive parse).
    """

    def setUp(self):
        self.step3 = _sections(COMMAND.read_text(encoding="utf-8")).get(
            "Passo 3: Agregar e ordenar", ""
        )
        self.assertTrue(self.step3, "Step 3 section missing from rank.md")
        # The spec hard-wraps its prose; assertions match against collapsed
        # whitespace so a rewrap never fails a pin the text still honors.
        self.flat = " ".join(self.step3.split())

    def test_step3_consumes_posted_date(self):
        self.assertIn(
            "`posted_date`",
            self.step3,
            "Step 3 never reads the posted_date /scrape persists, so a posting's "
            "age is stored but still invisible at rank time - the exact #390 gap",
        )
        self.assertIn(
            "⚠",
            self.step3.split("`posted_date`", 1)[1][:600],
            "the staleness rule must surface age as a visible ⚠ marker, like the "
            "location and language FLAG treatments",
        )

    def test_staleness_is_a_flag_never_a_veto(self):
        self.assertRegex(
            self.flat,
            r"[Ii]dade é sinal, nunca veto",
            "staleness must keep FLAG semantics - the #390 posting was 27 months "
            "old AND still live, so excluding on age would bury real openings",
        )

    def test_staleness_never_inferred_for_absent_values(self):
        self.assertRegex(
            self.flat,
            r"sem `posted_date`.*não recebe alerta nem chute",
            "entries predating the field must get no staleness signal - inferring "
            "age from first_seen would flag jobs on a date nobody posted",
        )
        self.assertIn(
            "`first_seen`",
            self.step3,
            "the rule must name first_seen as the forbidden inference source",
        )

    def test_staleness_parses_posted_date_defensively(self):
        self.assertRegex(
            self.flat,
            r"leitura cautelosa da regra 6 vale onde quer que um `posted_date` gravado seja comparado",
            "posted_date comparisons must carry rule 6's defensive-parse rule - the "
            "contract test pins the field's presence, not its format, and portals "
            "have shipped free-text shapes into stored date fields before",
        )


class RankBatchLimitSpec(unittest.TestCase):
    """The expensive fetch-and-score batch is bounded independently of output."""

    def setUp(self):
        self.sections = _sections(COMMAND.read_text(encoding="utf-8"))

    def test_step0_documents_default_limit_distinct_from_top(self):
        step0 = self.sections.get("Passo 0: Interpretar a entrada", "")
        self.assertIn("`--limit <N>`", step0)
        self.assertIn("padrão 10", step0)
        self.assertIn("`--top <N>`", step0)
        self.assertIn(
            "São independentes",
            step0,
            "--limit must bound scoring without being confused with shortlist size",
        )

    def test_step1_applies_limit_via_the_state_tool(self):
        step1 = self.sections.get("Passo 1: Carregar o estado", "")
        self.assertIn(
            "tools/rank_state.py candidates --limit 10",
            step1,
            "Step 1 must select candidates with the CLI, passing --limit through to it",
        )
        self.assertIn(
            "deferred",
            step1,
            "deferred jobs must remain eligible for a later run - the tool's own output "
            "must document that they keep their current status",
        )

    def test_step5_reports_deferral_and_how_to_continue(self):
        report = self.sections.get("Ranking de vagas - YYYY-MM-DD", "")
        self.assertIn("vagas adiadas", report)
        self.assertIn("rode `/rank` de novo para continuar", report)


class RankStateToolSpec(unittest.TestCase):
    """Guards for routing Step 1/3/4 through tools/rank_state.py (#395).

    /rank's Step 1 and Step 4 used to read the whole of seen_jobs.json into the
    conversation and write it back by hand - a cost paid on every run
    regardless of batch size, on a file that only grows. These tests pin that
    the spec now delegates that traffic to the CLI instead of re-describing a
    manual read/write, and - the condition attached to this change - that the
    write-back fields the tool must preserve are derived from Step 2's own
    JSON schema rather than retyped as a second, driftable list.
    """

    def setUp(self):
        self.text = COMMAND.read_text(encoding="utf-8")
        self.sections = _sections(self.text)

    def _step2_result_fields(self) -> list[str]:
        """The field names Step 2's scoring-agent JSON contract declares.

        Extracted from the fenced ```json block in Step 2 rather than
        hardcoded, so a future edit to that contract is what this test reads
        - it cannot silently drift from what agents actually return.
        """
        step2 = self.sections.get("Passo 2: Coletar e pontuar em lote", "")
        block = step2.split("```json", 1)[1].split("```", 1)[0]
        fields = re.findall(r'"([a-z_]+)":', block)
        self.assertTrue(fields, "could not extract Step 2's JSON field names - block shape changed")
        return fields

    def test_step1_never_reads_the_state_file_manually(self):
        step1 = self.sections.get("Passo 1: Carregar o estado", "")
        self.assertIn(
            "Nunca leia `job_scraper/seen_jobs.json` para dentro da conversa",
            step1,
            "Step 1 must forbid the manual read this fix removes",
        )
        self.assertIn("tools/rank_state.py candidates", step1)

    def test_step4_writes_back_through_apply_not_by_hand(self):
        step4 = self.sections.get("Passo 4: Atualizar o estado", "")
        self.assertIn(
            "tools/rank_state.py apply",
            step4,
            "Step 4 must write results with the CLI; re-emitting seen_jobs.json by hand "
            "reproduces the exact cost this fix removes",
        )
        self.assertIn(
            "nunca é relido para montá-lo",
            step4,
            "apply's own printed output, not a fresh read of the state file, must be what "
            "Step 5's report is built from",
        )

    def test_step4_preserves_every_field_step2_declares(self):
        """The condition on this change: Step 4's write-back semantics must
        survive the move into a script, for every field Step 2 promises to
        return - not just the ones a hand-picked list happens to name."""
        step4 = self.sections.get("Passo 4: Atualizar o estado", "")
        # `language` (the posting's own language) is Step 2 output the write-back
        # rules were never required to persist - 04-job-evaluation.md's Language
        # Gate section already documents it as informational, not stored state.
        # "scores" is a nested object of four dimension names (technical,
        # experience, behavioral, career) that Step 4 turns into rank_score /
        # rank_verdict, not persisted verbatim; "language" is informational
        # only, per 04-job-evaluation.md's Language Gate section.
        not_persisted_verbatim = {"key", "status", "language", "scores", "technical", "experience", "behavioral", "career"}
        must_persist = set(self._step2_result_fields()) - not_persisted_verbatim
        missing = [f for f in must_persist if f'"{f}"' not in step4]
        self.assertFalse(missing, f"Step 4 does not mention persisting: {missing}")

    def test_step4_documents_the_location_verdict_legacy_migration(self):
        step4 = self.sections.get("Passo 4: Atualizar o estado", "")
        self.assertIn(
            "nunca a chave `location` pura",
            step4,
            "Step 4 must forbid writing the verdict to the scraper's place field",
        )
        self.assertIn(
            "antiga",
            step4,
            "Step 4 must document the location_verdict-absent migration from the old location key",
        )

    def test_step4_documents_deadline_null_is_not_a_correction(self):
        step4 = self.sections.get("Passo 4: Atualizar o estado", "")
        self.assertIn(
            "ausência não é correção",
            step4,
            "a null deadline from the agent must never erase a stored one",
        )

    def test_step3_sweep_runs_through_the_tool(self):
        step3 = self.sections.get("Passo 3: Agregar e ordenar", "")
        self.assertIn(
            "tools/rank_state.py sweep",
            step3,
            "rule 6's expiry sweep must run through the CLI, not a manual re-read",
        )

    def test_tracker_stays_read_only(self):
        step4 = self.sections.get("Passo 4: Atualizar o estado", "")
        self.assertIn(
            "nunca se candidata",
            step4,
            "Step 4 must still state that job_search_tracker.csv is read-only for /rank",
        )

    def test_settings_and_guards_allow_the_new_tool(self):
        settings = json.loads((REPO / ".claude" / "settings.json").read_text(encoding="utf-8"))
        allow = settings["permissions"]["allow"]
        guards = (REPO / "tools" / "security_guards.py").read_text(encoding="utf-8")
        for entry in ("Bash(python tools/rank_state.py:*)", "Bash(python3 tools/rank_state.py:*)"):
            self.assertIn(entry, allow, f"{entry} missing from .claude/settings.json")
            self.assertIn(entry, guards, f"{entry} missing from security_guards.py's reviewed allowlist")


if __name__ == "__main__":
    unittest.main()
