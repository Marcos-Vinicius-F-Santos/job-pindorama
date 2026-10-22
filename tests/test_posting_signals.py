"""Tests for tools/posting_signals.py - fit signals read from a posting's text.

The first real /scrape run after the Brazilian adaptation ranked postings from
their portal labels, and three failed on their own text: a Gupy job tagged
"Remoto" that said "4x presenciais" in another state, LinkedIn results
filtered to remote with "Híbrido" in the title, and a Gupy posting open only
to the company's own staff. The fixtures below are those phrasings (shortened);
the negative cases pin the false positives the patterns were narrowed against.
"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
from posting_signals import analyse, portal_seniority, seniority, verdict  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
TOOL = REPO / "tools" / "posting_signals.py"


class Workplace(unittest.TestCase):
    def wp(self, text, title=""):
        return analyse(text, title)["workplace"]

    def test_hybrid_in_the_text_beats_the_portal_remote_tag(self):
        text = ("Product Owner\nEmpresa · Remoto\n## Informações adicionais\n"
                "Nossa atuação é híbrida (4x presenciais e 1x em home office). Sede em Londrina/PR.")
        f = analyse(text)
        self.assertEqual(f["workplace"], "hybrid")
        self.assertIn("4x presenciais", f["workplace_evidence"][0])

    def test_hybrid_in_a_benefit_list_and_in_titles(self):
        self.assertEqual(self.wp("Benefícios: Modelo Híbrido; Auxílio Trabalho Remoto; Seguro de Vida"), "hybrid")
        self.assertEqual(self.wp("", "Product Manager (Híbrido)"), "hybrid")
        self.assertEqual(self.wp("", "Product Manager|Pleno|Híbrida"), "hybrid")
        self.assertEqual(self.wp("", "Project Analyst - São Paulo (Hybrid)"), "hybrid")

    def test_days_of_home_office_mean_the_rest_is_in_the_office(self):
        self.assertEqual(self.wp("Benefícios: 40 dias de home office; Vale refeição"), "hybrid")
        self.assertEqual(self.wp("Trabalho 3 dias por semana no escritório."), "hybrid")

    def test_onsite(self):
        self.assertEqual(self.wp("Modelo de Trabalho Presencial Flexível"), "onsite")
        self.assertEqual(self.wp("Vaga 100% presencial em Campinas."), "onsite")

    def test_remote_with_occasional_visits(self):
        text = ("Esta posição poderá contar com encontros esporádicos no escritório de São Paulo para "
                "alinhamentos. É importante ter disponibilidade para se deslocar quando necessário.")
        self.assertEqual(self.wp(text), "remote_with_visits")

    def test_remote_restricted_to_a_region(self):
        f = analyse("Trabalho remoto, mas é preciso residir próximo a alguma regional da empresa.")
        self.assertEqual(f["workplace"], "remote_restricted")

    def test_living_in_the_country_is_no_restriction(self):
        self.assertNotEqual(self.wp("This role is remote. You must be based in Brazil."), "remote_restricted")
        self.assertNotEqual(self.wp("Remoto. É preciso residir no Brasil."), "remote_restricted")

    def test_explicit_remote(self):
        self.assertEqual(self.wp("Local de trabalho: Home Office."), "remote")
        self.assertEqual(self.wp("We are a remote-first company."), "remote")

    def test_benefit_names_and_loose_words_are_not_evidence(self):
        # A hybrid company can pay "auxílio home office"; "presencial" alone is
        # culture talk; "híbrido" alone can be a car or a methodology.
        self.assertEqual(self.wp("Benefícios: Auxílio Home Office; VT e Fretado"), "unstated")
        self.assertEqual(self.wp("Valorizamos os momentos de colaboração presencial."), "unstated")
        self.assertEqual(self.wp("Experiência com veículos híbridos e elétricos."), "unstated")
        self.assertEqual(self.wp("Residência médica em clínica médica concluída."), "unstated")

    def test_a_portal_remote_tag_alone_is_unstated_not_remote(self):
        self.assertEqual(self.wp("Product Manager PL\nConstrumarket · Remoto\nRegime: CLT"), "unstated")


class OtherSignals(unittest.TestCase):
    def test_internal_selection(self):
        text = ("## Requisitos\n- Funcionário que tenha algum tipo de movimentação consultar tabela de "
                "movimentação e também consultar cargos elegíveis;")
        self.assertTrue(analyse(text)["internal"])
        self.assertTrue(analyse("Processo seletivo interno.")["internal"])
        self.assertFalse(analyse("Atuar junto aos times internos de produto.")["internal"])

    def test_exclusive_affirmative_posting(self):
        self.assertTrue(analyse("", "Gerente de Produtos (Agro) - Vaga Afirmativa para Mulheres")["affirmative_exclusive"])
        self.assertTrue(analyse("Vaga exclusiva para pessoas com deficiência.")["affirmative_exclusive"])

    def test_open_to_pcd_is_not_exclusive(self):
        # The Gupy "também para PcD" badge and its wording in postings.
        self.assertFalse(analyse("Vaga também para PcD (aberta a todas as pessoas)")["affirmative_exclusive"])
        self.assertFalse(analyse("Mais inclusão: essa vaga também é destinada a pessoas com deficiência.")["affirmative_exclusive"])

    def test_intermediary(self):
        self.assertTrue(analyse("This position is listed on behalf of a partner company.")["intermediary"])
        self.assertTrue(analyse("", "Technical Product Manager", "Jobgether")["intermediary"])
        self.assertTrue(analyse("Nosso cliente, empresa do segmento de varejo, busca PM.")["intermediary"])
        self.assertFalse(analyse("Foco em encantar o nosso cliente todos os dias.")["intermediary"])

    def test_recruiting_firm_hiring_for_its_clients(self):
        # Missed in a real /scrape run: a recruiting firm's posting on InfoJobs.
        text = ("As oportunidades são em empresas que atendemos: startups em altíssimo "
                "crescimento, com IA no centro do negócio.")
        self.assertTrue(analyse(text)["intermediary"])
        self.assertTrue(analyse("Vaga para uma de nossos clientes do setor financeiro.")["intermediary"])
        self.assertTrue(analyse("We are hiring for one of our clients in fintech.")["intermediary"])
        self.assertFalse(analyse("Atendemos clientes de todo o Brasil com excelência.")["intermediary"])


class Seniority(unittest.TestCase):
    def test_levels_from_titles(self):
        self.assertEqual(seniority("Product Manager Junior (Cash Management)"), ["junior"])
        self.assertEqual(seniority("Product Manager PL"), ["pleno"])
        self.assertEqual(seniority("Product Manager | Pleno a Sênior"), ["pleno", "senior"])
        self.assertEqual(seniority("SR Product Manager (AI First)"), ["senior"])
        self.assertEqual(seniority("Staff Product Manager - Occupational Health"), ["staff"])
        self.assertEqual(seniority("Principal Product Manager, HTS API Marketplace"), ["staff"])
        self.assertEqual(seniority("Group Product Manager"), ["gestao"])
        self.assertEqual(seniority("Estágio em Produto"), ["estagio"])

    def test_roman_numerals(self):
        self.assertEqual(seniority("Analista de Produtos II (Portfólio TIC)"), ["pleno"])
        self.assertEqual(seniority("Analista de Produtos III (Segurança Cibernética)"), ["senior"])
        # A numeral inside a named level is a step of that level, not another one.
        self.assertEqual(seniority("Product Manager Sênior I IA & Dados"), ["senior"])

    def test_no_false_levels(self):
        self.assertEqual(seniority("AI Product Manager"), [])
        self.assertEqual(seniority("Product Manager"), [])
        self.assertEqual(seniority("Desenvolvedor PL/SQL"), [])

    def test_verdict_against_accepted_levels(self):
        accept = ["pleno", "senior", "especialista"]
        self.assertEqual(analyse("", "Product Manager Junior", accept=accept)["seniority_verdict"], "mismatch")
        self.assertEqual(analyse("", "Product Manager | Pleno a Sênior", accept=accept)["seniority_verdict"], "ok")
        self.assertEqual(analyse("", "Product Manager", accept=accept)["seniority_verdict"], "unstated")
        self.assertEqual(analyse("", "Product Manager Junior")["seniority_verdict"], "not_checked")

    def test_portal_level_labels(self):
        # Labels as the portals print them (DigAÍ, Sólides, GeekHunter, VAGAS.com).
        self.assertEqual(portal_seniority("Pleno"), ["pleno"])
        self.assertEqual(portal_seniority("Sênior / Especialista"), ["senior", "especialista"])
        self.assertEqual(portal_seniority("Pleno, Sênior"), ["pleno", "senior"])
        self.assertEqual(portal_seniority("Gerência"), ["gestao"])
        self.assertEqual(portal_seniority("Coordenação / Supervisão"), ["gestao"])
        self.assertEqual(portal_seniority("Diretoria executiva / VP"), ["gestao"])
        self.assertEqual(portal_seniority("Gestão"), ["gestao"])
        self.assertEqual(portal_seniority("Estágio / trainee"), ["estagio"])
        self.assertEqual(portal_seniority("Sem experiência"), ["estagio"])
        self.assertEqual(portal_seniority("Operacional"), [])
        self.assertEqual(portal_seniority(None), [])

    def test_portal_level_only_when_the_title_names_none(self):
        accept = ["pleno", "senior", "especialista"]
        # The title has no level ("Gerente de Produto" is the PM role): the portal's "Gerência" decides.
        f = analyse("", "Gerente de Produto Técnico - Agentes com IA", accept=accept, portal_level="Gerência")
        self.assertEqual((f["seniority"], f["seniority_source"], f["seniority_verdict"]), (["gestao"], "portal", "mismatch"))
        self.assertIn("fora da faixa pelo portal (gestao)", verdict(f))
        # The title names a level: it wins over the portal field.
        f = analyse("", "Product Owner Júnior", accept=accept, portal_level="Pleno")
        self.assertEqual((f["seniority"], f["seniority_source"], f["seniority_verdict"]), (["junior"], "title", "mismatch"))
        f = analyse("", "Product Owner", accept=accept, portal_level="Sênior / Especialista")
        self.assertEqual((f["seniority_source"], f["seniority_verdict"]), ("portal", "ok"))
        f = analyse("", "Product Owner", accept=accept, portal_level=None)
        self.assertEqual((f["seniority_source"], f["seniority_verdict"]), (None, "unstated"))


class Verdict(unittest.TestCase):
    def test_none(self):
        self.assertEqual(verdict(analyse("Product Manager\nTrabalho 100% remoto.", "Product Manager")),
                         "posting_signals: none")

    def test_warning_quotes_the_evidence(self):
        line = verdict(analyse("Nossa atuação é híbrida (4x presenciais e 1x em home office)."))
        self.assertTrue(line.startswith("posting_signals: ⚠ híbrido"))
        self.assertIn("4x presenciais", line)


class Cli(unittest.TestCase):
    def run_tool(self, *args, stdin=""):
        return subprocess.run([sys.executable, str(TOOL), *args], input=stdin.encode("utf-8"),
                              capture_output=True, cwd=REPO)

    def test_single_from_stdin(self):
        p = self.run_tool("--json", stdin="Nossa atuação é híbrida (4x presenciais).")
        self.assertEqual(p.returncode, 0)
        self.assertEqual(json.loads(p.stdout.decode("utf-8"))["workplace"], "hybrid")

    def test_batch_keeps_ids_and_reads_the_results_wrapper(self):
        results = {"results": [
            {"id": 1, "url": "https://example.com/1", "title": "Product Manager (Híbrido)", "company": "A", "description": ""},
            {"id": 2, "url": "https://example.com/2", "title": "Product Manager", "company": "B", "description": "Trabalho 100% remoto."},
            {"id": 3, "url": "https://example.com/3", "title": "Product Manager", "company": "C", "description": "", "seniority": "Gerência"},
        ]}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "r.json"
            path.write_text(json.dumps(results), encoding="utf-8")
            p = self.run_tool("--batch", str(path), "--json", "--accept", "pleno,senior")
        self.assertEqual(p.returncode, 0)
        out = json.loads(p.stdout.decode("utf-8"))
        self.assertEqual([o["id"] for o in out], [1, 2, 3])
        self.assertEqual(out[0]["workplace"], "hybrid")
        self.assertEqual(out[1]["verdict"], "posting_signals: none")
        self.assertEqual(out[2]["seniority_verdict"], "mismatch")

    def test_unknown_level_exits_2(self):
        p = self.run_tool("--accept", "pleno,chefe", stdin="x")
        self.assertEqual(p.returncode, 2)
        self.assertIn("chefe", p.stderr.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
