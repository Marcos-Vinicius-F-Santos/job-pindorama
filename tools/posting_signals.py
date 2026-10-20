#!/usr/bin/env python3
"""Fit signals the portal labels get wrong: what the posting text itself says.

Portal metadata is not evidence. The first real /scrape run after the
Brazilian adaptation showed it on three postings: a Gupy job labelled
"Remoto" whose own text said "Nossa atuação é híbrida (4x presenciais e 1x em
home office)" in another state; LinkedIn results filtered to remote with
"Híbrido" in the title; and a Gupy posting open only to the company's own
staff ("Funcionário que tenha algum tipo de movimentação..."). Each was ranked
as a good fit from its label and failed on its text.

This tool reads the text and reports, with the excerpt that triggered each one:

  * workplace - `hybrid`, `onsite`, `remote_restricted` (remote, but the
    person must live in a given place), `remote_with_visits` (remote with
    occasional office meetings), `remote` (the text says so explicitly) or
    `unstated`. A portal's own "Remoto" tag is not counted: it is the claim
    being checked. Benefit names ("auxílio home office") are not evidence;
    "N dias de home office" means the rest is in the office.
  * internal - the posting is an internal selection, for current staff only.
  * affirmative_exclusive - the posting is exclusive to an affirmative-action
    group. "Também para PcD" / "também é destinada" is the opposite (open to
    everyone) and is not reported. The eligibility gate in
    04-job-evaluation.md decides what this means for the person.
  * intermediary - the posting is relayed: an aggregator listing "on behalf of
    a partner company", or a recruiting agency's "nosso cliente".
  * seniority - levels named in the title (estágio, júnior, pleno, sênior,
    especialista, staff/principal, lead, gestão). With --accept, a title whose
    levels are all outside the accepted ones is a `mismatch`; a title with no
    level is `unstated`, never a mismatch.

It advises; it never decides. The caller maps each signal against the
profile (a hybrid posting is a deal-breaker only for someone who said so).

Usage:
  python3 tools/posting_signals.py [--in FILE] [--title TITLE] [--accept LEVELS] [--json]
  python3 tools/posting_signals.py --batch FILE [--accept LEVELS] [--json]

Single mode reads one posting (portal `detail` output, pasted text) from
--in or stdin; --title adds the title when the text does not start with it.
Batch mode reads a JSON array of portal search results (or an object with a
`results` array) and checks each item's title and description; items keep
their `id`/`url` so the caller can match them back. LEVELS is a comma list of
estagio, junior, pleno, senior, especialista, staff, lead, gestao.

Output: one verdict line per posting (`posting_signals: none` or
`posting_signals: ⚠ ...`), or the findings as JSON with --json. Exit 0 when
the input could be read; 2 on unreadable input or an unknown level.
"""

import argparse
import json
import re
import sys
from pathlib import Path

EXCERPT = 90
LEVELS = ("estagio", "junior", "pleno", "senior", "especialista", "staff", "lead", "gestao")

_NUM = r"(?:\d|um|uma|dois|duas|tr[eê]s|quatro|cinco|one|two|three|four|five)"

HYBRID = [
    # "híbrido" alone also names cars and methodologies: require a work-mode
    # context word before it, or a title separator ("PM (Híbrido)", "PM|Híbrida").
    r"\b(?:modelo|trabalho|atua[çc][ãa]o|regime|formato|jornada|vaga|posi[çc][ãa]o)\s*(?:de\s*trabalho\s*)?(?:[ée]\s*|ser[áa]\s*|:\s*)?h[íi]brid[oa]\b[^\n.;]{0,40}",
    r"[(|·–-]\s*h[íi]brid[oa]\b",
    r"\bhybrid\s*(?:work|role|model|position|schedule|setup)\b",
    r"[(|·–-]\s*hybrid\b",
    rf"\b{_NUM}\s*(?:x|vezes|dias?)\s*(?:por semana\s*|na semana\s*)?(?:presencia(?:l|is)|no escrit[óo]rio)",
    rf"\b{_NUM}\s*(?:days?|times)\s*(?:a|per)\s*week\s*(?:in|at)\s*(?:the\s*)?office",
    r"\b\d+\s*dias\s*de\s*home\s*office\b",
]
ONSITE = [
    r"\b100\s*%\s*presencial\b",
    r"\b(?:modelo|regime|formato)\s*(?:de\s*trabalho\s*)?:?\s*presencial\b",
    r"\b(?:atua[çc][ãa]o|trabalho|vaga)\s*(?:100\s*%\s*)?presencial\b",
    r"\bfully\s*on-?site\b",
    r"\bon-?site\s*(?:role|position|only)\b",
]
RESTRICTED = [
    # Not "residência"/"residente": in health postings those are medical residency.
    r"\b(?:residir|morar|reside)\s+(?:em|no|na|nos|nas|pr[óo]xim[oa])\b[^\n.;]{2,50}",
    r"\bmust\s+(?:be\s+based|reside|live)\s+in\b[^\n.;]{2,50}",
]
# "Must be based in Brazil" is no restriction for a search in Brazil; only a
# state, city or region below the country narrows a remote posting.
PLACE_PREFIX = re.compile(r"^.*?\b(?:em|no|na|nos|nas|in|pr[óo]xim[oa]\s*(?:a|ao|à|de|do|da)?)\s+", re.I)
COUNTRY_WIDE = re.compile(r"(?:o\s+|the\s+)?(?:brasil|brazil|latam|am[ée]rica\s+latina|latin\s+america)\b", re.I)
VISITS = [
    r"\bencontros?\s*(?:presenciais\s*)?(?:espor[áa]dicos|pontuais|eventuais|trimestrais|mensais)\b[^\n.;]{0,60}",
    r"\beventualmente\s*(?:ao|no|em)\s*escrit[óo]rio\b",
    r"\bdisponibilidade\s*para\s*(?:se\s*)?deslocar\b[^\n.;]{0,40}",
    r"\boccasional\s*(?:travel|visits?|trips?)\s*to\s*(?:the\s*|our\s*)?office\b",
]
REMOTE = [
    r"\b100\s*%\s*remot[oa]\b",
    r"\btotalmente\s*remot[oa]\b",
    r"\b(?:modelo|regime|formato)\s*(?:de\s*trabalho\s*)?:?\s*remoto\b",
    r"\blocal\s*de\s*trabalho\s*:?\s*home\s*office\b",
    r"\b(?:fully\s*remote|remote-?first)\b",
]
# Benefit names and policy words that mention a mode without setting it.
NOT_EVIDENCE = re.compile(r"aux[íi]lio\s*(?:home\s*office|trabalho\s*remoto)", re.I)

INTERNAL = [
    r"\brecrutamento\s*interno\b",
    r"\b(?:processo\s*seletivo|sele[çc][ãa]o)\s*intern[oa]\b",
    r"\bvaga\s*interna\b",
    r"\bexclusiv[ao]s?\s*para\s*(?:colaboradores|funcion[áa]rios|associados)\b",
    r"\bfuncion[áa]rios?\s*que\s*tenha[m]?\s*(?:algum\s*tipo\s*de\s*)?movimenta[çc][ãa]o\b",
    r"\b(?:colaboradores|cargos)\s*eleg[íi]veis\b",
    r"\binternal\s*(?:candidates|applicants|employees)\s*only\b",
]
AFFIRMATIVE = [
    r"\bexclusiv[ao]s?\s*(?:para|a)\s*(?:pessoas\s*com\s*defici[êe]ncia|pcds?|pessoas\s*negras|mulheres|pessoas\s*trans|pessoas\s*ind[íi]genas|pessoas\s*50\+?)\b",
    r"\bvaga\s*afirmativa\s*(?:para|exclusiva)\b[^\n.;]{0,40}",
    r"\bprograma\s*afirmativo\b",
    r"\bexclusive(?:ly)?\s*(?:for|to)\s*(?:people\s*with\s*disabilities|women|black)\b",
]
INTERMEDIARY = [
    r"\bon\s*behalf\s*of\s*(?:a|our)\s*(?:partner|client)\b",
    r"\bem\s*nome\s*de\s*(?:uma\s*)?empresa\s*(?:parceira|cliente)\b",
    # An agency's "Nosso cliente, empresa do segmento...", not a company's
    # "encantar o nosso cliente".
    r"\bnoss[oa]\s*client[ea]\s*[,:]?\s*(?:é\s*)?(?:uma?\s*)?(?:empresa|multinacional|companhia|ind[úu]stria|grupo|startup|banco|rede|consultoria)\b[^\n.;]{0,40}",
]
INTERMEDIARY_COMPANIES = {"jobgether"}

SENIORITY = [
    ("estagio", r"\best[áa]gi(?:o|[áa]ri[oa])\b|\bintern(?:ship)?\b"),
    ("junior", r"\bj[úu]nior\b|\bjr\b"),
    ("pleno", r"\bpleno\b|\bpl\b(?!/)|\bmid[- ]?level\b"),
    ("senior", r"\bs[êe]nior\b|\bsr\b"),
    ("especialista", r"\bespecialista\b|\bspecialist\b|\bexpert\b"),
    ("staff", r"\bstaff\b|\bprincipal\b"),
    ("lead", r"\blead\b|\bl[íi]der\b"),
    ("gestao", r"\bhead\b|\bdiretor[a]?\b|\bdirector\b|\bvp\b|\bcoordenador[a]?\b|\bsupervisor[a]?\b|\bgroup\s*product\s*manager\b"),
]
# "Analista de Produtos II", "Product Manager III": a standalone uppercase
# numeral. Case-sensitive, so "AI" or a lowercase "i" never matches.
ROMAN = [("junior", r"(?<![\w/])I(?![\w/])"), ("pleno", r"(?<![\w/])II(?![\w/])"),
         ("senior", r"(?<![\w/])(?:III|IV)(?![\w/])")]


def _excerpt(text: str, match: re.Match) -> str:
    return re.sub(r"\s+", " ", match.group(0)).strip()[:EXCERPT]


def _find(patterns, text: str, case: int = re.I):
    hits = []
    for pattern in patterns:
        for m in re.finditer(pattern, text, case):
            line_start = text.rfind("\n", 0, m.start()) + 1
            if NOT_EVIDENCE.search(text[max(line_start, m.start() - 30):m.end() + 5]):
                continue
            hits.append(_excerpt(text, m))
    seen = []
    for h in hits:
        if h.lower() not in (s.lower() for s in seen):
            seen.append(h)
    return seen


def seniority(title: str) -> list:
    if not title:
        return []
    found = [level for level, pattern in SENIORITY if re.search(pattern, title, re.I)]
    if not found:  # "Sênior I" is a step inside sênior, not júnior too
        found = [level for level, pattern in ROMAN if re.search(pattern, title)]
    return [level for level in LEVELS if level in found]


def analyse(text: str, title: str = "", company: str = "", accept=None) -> dict:
    body = f"{title}\n{text}" if title and title not in text[:300] else text
    hybrid, onsite = _find(HYBRID, body), _find(ONSITE, body)
    restricted, visits, remote = _find(RESTRICTED, body), _find(VISITS, body), _find(REMOTE, body)
    restricted = [r for r in restricted if not COUNTRY_WIDE.match(PLACE_PREFIX.sub("", r))]
    if hybrid:
        workplace, evidence = "hybrid", hybrid
    elif onsite:
        workplace, evidence = "onsite", onsite
    elif restricted:
        workplace, evidence = "remote_restricted", restricted
    elif visits:
        workplace, evidence = "remote_with_visits", visits
    elif remote:
        workplace, evidence = "remote", remote
    else:
        workplace, evidence = "unstated", []

    intermediary = _find(INTERMEDIARY, body)
    if company and company.strip().lower() in INTERMEDIARY_COMPANIES:
        intermediary.insert(0, f"empresa: {company.strip()}")

    levels = seniority(title or body.split("\n", 1)[0])
    if accept is None:
        level_verdict = "not_checked"
    elif not levels:
        level_verdict = "unstated"
    else:
        level_verdict = "ok" if set(levels) & set(accept) else "mismatch"

    return {
        "workplace": workplace,
        "workplace_evidence": evidence[:3],
        "internal": _find(INTERNAL, body)[:3],
        "affirmative_exclusive": _find(AFFIRMATIVE, body)[:3],
        "intermediary": intermediary[:3],
        "seniority": levels,
        "seniority_verdict": level_verdict,
    }


WORKPLACE_LABEL = {
    "hybrid": "híbrido",
    "onsite": "presencial",
    "remote_restricted": "remoto com exigência de residência",
    "remote_with_visits": "remoto com idas ao escritório",
}


def verdict(f: dict) -> str:
    parts = []
    if f["workplace"] in WORKPLACE_LABEL:
        parts.append(f'{WORKPLACE_LABEL[f["workplace"]]} ("{f["workplace_evidence"][0]}")')
    if f["internal"]:
        parts.append(f'seleção interna ("{f["internal"][0]}")')
    if f["affirmative_exclusive"]:
        parts.append(f'vaga exclusiva ("{f["affirmative_exclusive"][0]}") - ver filtro de elegibilidade')
    if f["intermediary"]:
        parts.append(f'intermediário ("{f["intermediary"][0]}")')
    if f["seniority_verdict"] == "mismatch":
        parts.append(f'senioridade fora da faixa ({", ".join(f["seniority"])})')
    if not parts:
        return "posting_signals: none"
    return "posting_signals: ⚠ " + " · ".join(parts)


def _force_utf8_output() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8")


def _read(path) -> str:
    if path is None:
        return sys.stdin.buffer.read().decode("utf-8", errors="replace")
    return Path(path).read_bytes().decode("utf-8", errors="replace")


def _accept(raw):
    if raw is None:
        return None
    levels = [x.strip().lower() for x in raw.split(",") if x.strip()]
    unknown = [x for x in levels if x not in LEVELS]
    if unknown:
        raise ValueError(f"unknown level(s): {', '.join(unknown)} (known: {', '.join(LEVELS)})")
    return levels


def main(argv=None) -> int:
    _force_utf8_output()
    parser = argparse.ArgumentParser(prog="posting_signals.py", description="Fit signals from a posting's text; see module docstring.")
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--in", dest="infile", type=Path, default=None, help="one posting (default: stdin)")
    source.add_argument("--batch", type=Path, default=None, help="JSON array of portal search results")
    parser.add_argument("--title", default="", help="the posting title, when the text does not start with it")
    parser.add_argument("--accept", default=None, help=f"accepted levels, comma-separated: {','.join(LEVELS)}")
    parser.add_argument("--json", action="store_true", help="print findings as JSON")
    args = parser.parse_args(argv)

    try:
        accept = _accept(args.accept)
        raw = _read(args.batch if args.batch is not None else args.infile)
    except (OSError, ValueError) as exc:
        print(f"posting_signals: {exc}", file=sys.stderr)
        return 2

    if args.batch is None:
        findings = analyse(raw, args.title, accept=accept)
        print(json.dumps(findings, ensure_ascii=False, indent=2) if args.json else verdict(findings))
        return 0

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"posting_signals: --batch is not JSON: {exc}", file=sys.stderr)
        return 2
    items = data.get("results", []) if isinstance(data, dict) else data
    out = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        findings = analyse(str(item.get("description") or ""), str(item.get("title") or ""),
                           str(item.get("company") or ""), accept)
        findings.update(id=item.get("id"), url=item.get("url"), title=item.get("title"), verdict=verdict(findings))
        out.append(findings)
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        for f in out:
            print(f'{f["title"]} | {f["verdict"]}')
    return 0


if __name__ == "__main__":
    sys.exit(main())
