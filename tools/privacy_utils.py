#!/usr/bin/env python3
"""Padrões de privacidade compartilhados pelo painel e pela auditoria pré-push.

Duas funções, uma fonte só de regexes:

  * `redact(texto)`: troca CPF, CNPJ, endereço, telefone, e-mail e chaves de API por
    marcadores antes de o texto ir para um provedor de IA na nuvem. A IA não precisa do
    CPF nem do endereço de casa para avaliar uma vaga.
  * `local_identifiers(texto)`: lê o perfil local da pessoa (que fica fora do git) e
    devolve padrões que identificam *aquela* pessoa. É assim que o `check_privacy.py`
    sabe o que procurar sem que nenhum dado pessoal esteja escrito no código do projeto.

Só biblioteca padrão. Nenhum dado de uma pessoa específica pode ser escrito aqui.
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Segredos: formato fixo, valem para qualquer pessoa
# ---------------------------------------------------------------------------

SECRET_PATTERNS: list[tuple[str, str]] = [
    (r"AIza[0-9A-Za-z_-]{35}", "Chave de API do Google"),
    (r"(?<![A-Za-z0-9])sk-ant-[A-Za-z0-9_-]{20,}", "Chave de API da Anthropic"),
    (r"(?<![A-Za-z0-9])sk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{20,}", "Chave de API da OpenAI"),
    (r"(?<![A-Za-z0-9])sk-[A-Za-z0-9]{32,}", "Chave de API (formato sk-)"),
    (r"gh[pousr]_[A-Za-z0-9]{36,}", "Token do GitHub"),
    (r"github_pat_[A-Za-z0-9_]{50,}", "Token do GitHub (fine-grained)"),
    (r"AKIA[0-9A-Z]{16}", "Chave de acesso da AWS"),
    (r"xox[baprs]-[A-Za-z0-9-]{10,}", "Token do Slack"),
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----", "Chave privada"),
]

# ---------------------------------------------------------------------------
# Identificadores brasileiros e contatos
# ---------------------------------------------------------------------------

CPF_RE = re.compile(r"(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)")
CNPJ_RE = re.compile(r"(?<!\d)\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}(?!\d)")
CEP_RE = re.compile(r"(?<!\d)\d{5}-\d{3}(?!\d)|(?<!\d)\d{2}\.\d{3}-\d{3}(?!\d)|(?<=CEP )\d{8}(?!\d)|(?<=CEP: )\d{8}(?!\d)")
RG_RE = re.compile(r"\bRG\b\s*[:nº°.]*\s*\d[\d.\-]{5,}[\dXx]")
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE_RE = re.compile(
    r"\+55[\s.-]*\(?\d{2}\)?[\s.-]*9?[\s.-]*\d{4}[\s.-]*\d{4}(?!\d)"   # +55 37 9 9999-9999
    r"|\(\d{2}\)[\s.-]*9?[\s.-]*\d{4}-?\d{4}(?!\d)"                    # (37) 99999-9999
    r"|(?<!\d)\d{2}[\s.-]9?\d{4}-\d{4}(?!\d)"                          # 37 99999-9999
)
# "R Nome da Rua, 43", "Rua Nome, 43, Bairro, Cidade - UF": `street` é o nome sem o tipo.
ADDRESS_RE = re.compile(
    r"\b(?:R|Rua|RUA|Av|AV|Avenida|AVENIDA|Al|Alameda|ALAMEDA|Tv|Travessa|TRAVESSA|Rod|Rodovia|RODOVIA"
    r"|Estr|Estrada|ESTRADA|Pça|Praça|PRAÇA)\.?\s+(?P<street>[A-ZÀ-Ý][^,\n]{2,60}?),\s*(?:n[º°o.]*\s*)?\d+[^\n]*"
)

# Domínios e valores de exemplo: aparecem em modelos e testes e não identificam ninguém.
_PLACEHOLDER_DOMAINS = re.compile(
    r"@(?:example\.[a-z]+|[\w-]+\.example|[\w-]+\.invalid|[\w-]+\.test|localhost|evil\.[a-z]+"
    r"|evil-[\w-]+\.[a-z]+|users\.noreply\.github\.com|noreply\.[\w.]+)$",
    re.IGNORECASE,
)
_PLACEHOLDER_WORDS = ("your", "seu_", "seu-", "seuemail", "exemplo", "example", "fulano", "nome@", "email@")

REDACTION_TOKENS = {
    "secret": "[CHAVE REMOVIDA]",
    "cpf": "[CPF REMOVIDO]",
    "cnpj": "[CNPJ REMOVIDO]",
    "rg": "[RG REMOVIDO]",
    "cep": "[CEP REMOVIDO]",
    "address": "[ENDEREÇO REMOVIDO]",
    "phone": "[TELEFONE REMOVIDO]",
    "email": "[E-MAIL REMOVIDO]",
}


def is_placeholder_email(value: str) -> bool:
    low = value.lower()
    return bool(_PLACEHOLDER_DOMAINS.search(low)) or any(w in low for w in _PLACEHOLDER_WORDS)


def is_placeholder_digits(value: str) -> bool:
    """000.000.000-00, 99999-9999, 12345678: números de modelo, não de uma pessoa."""
    digits = re.sub(r"\D", "", value)
    return len(set(digits)) <= 2 or digits in ("12345678901", "1234567890", "123456789")


def is_placeholder_phone(value: str) -> bool:
    """(11) 99999-9999: o que importa é o número do assinante, não o DDD nem o 55."""
    return is_placeholder_digits(re.sub(r"\D", "", value)[-8:])


# ---------------------------------------------------------------------------
# Remoção antes de enviar a um provedor de IA
# ---------------------------------------------------------------------------

def redact(text: str, keep_contact: bool = False) -> str:
    """Troca dados sensíveis por marcadores.

    Sempre: chaves de API, CPF, CNPJ, RG, CEP e endereço de rua.
    Também telefone e e-mail, a menos que `keep_contact` (só o currículo precisa deles).
    """
    if not text:
        return text

    def sub(pattern: re.Pattern | str, token: str, s: str, placeholder_check=None) -> str:
        rx = re.compile(pattern) if isinstance(pattern, str) else pattern

        def repl(m: re.Match) -> str:
            if placeholder_check and placeholder_check(m.group(0)):
                return m.group(0)
            return token
        return rx.sub(repl, s)

    out = text
    for pat, _ in SECRET_PATTERNS:
        out = sub(pat, REDACTION_TOKENS["secret"], out)
    out = sub(CNPJ_RE, REDACTION_TOKENS["cnpj"], out, is_placeholder_digits)
    out = sub(CPF_RE, REDACTION_TOKENS["cpf"], out, is_placeholder_digits)
    out = sub(RG_RE, REDACTION_TOKENS["rg"], out)
    out = sub(ADDRESS_RE, REDACTION_TOKENS["address"], out)
    out = sub(CEP_RE, REDACTION_TOKENS["cep"], out)
    if not keep_contact:
        out = sub(PHONE_RE, REDACTION_TOKENS["phone"], out, is_placeholder_phone)
        out = sub(EMAIL_RE, REDACTION_TOKENS["email"], out, is_placeholder_email)
    return out


# ---------------------------------------------------------------------------
# Padrões da pessoa dona deste clone, lidos do perfil local
# ---------------------------------------------------------------------------

def digits_pattern(digits: str, optional_prefix: str = "") -> str:
    """Regex que aceita os mesmos dígitos com qualquer formatação entre eles."""
    body = r"\D{0,3}".join(re.escape(d) for d in digits)
    return rf"(?<!\d){optional_prefix}{body}(?!\d)"


def local_identifiers(text: str) -> list[tuple[str, str]]:
    """Padrões (regex, descrição) que identificam a pessoa descrita em `text`.

    Pensado para o perfil local: e-mail, telefone, CPF, CNPJ, CEP e rua. Valores de
    modelo (example.org, 99999-9999, 000.000.000-00) são ignorados.
    """
    found: dict[str, str] = {}

    for m in EMAIL_RE.finditer(text):
        if not is_placeholder_email(m.group(0)):
            found[re.escape(m.group(0))] = "E-mail pessoal"
    for m in PHONE_RE.finditer(text):
        digits = re.sub(r"\D", "", m.group(0))
        if len(digits) < 10 or is_placeholder_phone(digits):
            continue
        national = digits[-11:] if len(digits) >= 11 and digits[-11:][2] == "9" else digits[-10:]
        found[digits_pattern(national, r"(?:\+?55\D{0,3})?")] = "Telefone pessoal"
    for rx, desc in ((CNPJ_RE, "CNPJ"), (CPF_RE, "CPF")):
        for m in rx.finditer(text):
            if not is_placeholder_digits(m.group(0)):
                found[digits_pattern(re.sub(r"\D", "", m.group(0)))] = desc
    for m in CEP_RE.finditer(text):
        if not is_placeholder_digits(m.group(0)):
            found[digits_pattern(re.sub(r"\D", "", m.group(0)))] = "CEP"
    for m in ADDRESS_RE.finditer(text):
        street = m.group("street").strip()
        if len(street) >= 6 and "[" not in street:
            found[r"\b" + r"\s+".join(re.escape(w) for w in street.split()) + r"\b"] = "Endereço residencial/fiscal"
    for m in re.finditer(r"^\s*-\s*\*\*Nome:\*\*\s*(.+)$", text, re.MULTILINE):
        name = m.group(1).strip().strip("*").strip()
        words = name.split()
        if len(words) >= 2 and len(name) >= 8 and "[" not in name and not any(w in name.lower() for w in ("jane", "john", "fulano", "exemplo", "seu nome")):
            found[r"\b" + r"\s+".join(re.escape(w) for w in words) + r"\b"] = "Nome pessoal"
    for m in re.finditer(r"linkedin\.com/in/([A-Za-z0-9_-]{3,})", text, re.IGNORECASE):
        slug = m.group(1)
        if not any(w in slug.lower() for w in ("your", "seu", "jane", "john", "fulano", "exemplo", "example", "perfil")):
            found[r"\b" + re.escape(slug) + r"\b"] = "Perfil do LinkedIn"
    return [(pat, desc) for pat, desc in found.items()]
