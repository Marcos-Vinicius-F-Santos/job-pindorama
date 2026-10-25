"""Padrões de privacidade compartilhados (tools/privacy_utils.py): remoção antes do envio à IA e
reconhecimento da identidade local. Os dados abaixo são inventados e montados em partes, para
que a própria auditoria (tools/check_privacy.py) não os leia como dados reais."""

import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import privacy_utils as pu  # noqa: E402

CPF = ".".join(["529", "982", "247"]) + "-25"
CNPJ = ".".join(["11", "222", "333"]) + "/0001-81"
EMAIL = "maria.teste" + "@" + "provedor.com.br"
PHONE = "+55 11 9" + " 8765-4321"
ADDRESS = "R Das Flores Azuis, 10, Centro, Cidadela - SP, CEP 12345-678"
GOOGLE_KEY = "AIza" + "A" * 35
ANTHROPIC_KEY = "sk-ant-" + "b1" * 15
OPENAI_KEY = "sk-proj-" + "c2" * 15

PROFILE = f"""- **Nome:** Maria Teste
- **Telefone:** {PHONE}
- **E-mail:** {EMAIL}
- **CNPJ:** {CNPJ}
- **CPF:** {CPF}
- **Endereço Fiscal:** {ADDRESS}
- **Stack:** Python, SQL
"""


class Redact(unittest.TestCase):
    def test_removes_identifiers_and_keeps_the_rest(self):
        out = pu.redact(PROFILE)
        for secret in (CPF, CNPJ, EMAIL, "8765-4321", "Flores Azuis", "12345-678"):
            self.assertNotIn(secret, out)
        self.assertIn("Maria Teste", out)
        self.assertIn("Python, SQL", out)

    def test_contact_data_survives_only_when_asked(self):
        kept = pu.redact(PROFILE, keep_contact=True)
        self.assertIn(EMAIL, kept)
        self.assertIn("8765-4321", kept)
        self.assertNotIn(CPF, kept)
        self.assertNotIn(CNPJ, kept)
        self.assertNotIn("Flores Azuis", kept)

    def test_api_keys_never_pass(self):
        text = f"chaves: {GOOGLE_KEY} {ANTHROPIC_KEY} {OPENAI_KEY}"
        out = pu.redact(text, keep_contact=True)
        self.assertEqual(out.count("[CHAVE REMOVIDA]"), 3)

    def test_placeholders_are_left_alone(self):
        text = "Fale com jane.doe@example.org ou 000.000.000-00, fone (11) 99999-9999"
        self.assertEqual(pu.redact(text), text)

    def test_empty_text(self):
        self.assertEqual(pu.redact(""), "")


class LocalIdentifiers(unittest.TestCase):
    def patterns(self):
        return [(re.compile(p, re.IGNORECASE), d) for p, d in pu.local_identifiers(PROFILE)]

    def test_finds_who_the_person_is(self):
        descs = {d for _, d in self.patterns()}
        self.assertTrue({"E-mail pessoal", "Telefone pessoal", "CNPJ", "CPF", "CEP"} <= descs)
        self.assertTrue(any("Endereço" in d for d in descs))

    def test_phone_matches_other_formats(self):
        pats = [p for p, d in self.patterns() if d == "Telefone pessoal"]
        for variant in ("(11) 98765-4321", "11 987654321", "+55 (11) 9 8765 4321", "11987654321"):
            self.assertTrue(any(p.search(variant) for p in pats), variant)
        self.assertFalse(any(p.search("11 98765-4322") for p in pats))

    def test_street_matches_regardless_of_case_and_spacing(self):
        pats = [p for p, d in self.patterns() if "Endereço" in d]
        self.assertTrue(any(p.search("rua  das flores   azuis, 10") for p in pats))

    def test_templates_identify_nobody(self):
        template = "- **E-mail:** seu.email@example.com\n- **Telefone:** +55 11 99999-9999\n- **CPF:** 000.000.000-00\n"
        self.assertEqual(pu.local_identifiers(template), [])


if __name__ == "__main__":
    unittest.main()

