#!/usr/bin/env python3
"""Auditoria de privacidade pré-push do job-pindorama.

Procura dados pessoais e credenciais em tudo que pode chegar a um repositório
público ou a um fork. Nenhum dado de pessoa alguma está escrito neste arquivo:

  * padrões genéricos (chaves de API, CPF e CNPJ formatados) valem para todo mundo;
  * padrões da *sua* identidade (e-mail, telefone, CNPJ, CEP, rua) são lidos em
    tempo de execução do seu perfil local (CLAUDE.md e os arquivos do perfil, que o
    git não envia) e de um arquivo opcional `.privacy-patterns`, também fora do git.

O que é verificado:
  1. Arquivos rastreados (sem skip-worktree), como estão na pasta de trabalho.
  2. Arquivos novos que ainda não estão no git e não são ignorados (o próximo
     `git add .` os levaria).
  3. Alterações em staging: só as linhas adicionadas.
  4. Arquivos com skip-worktree (perfil): a versão em HEAD, que é a que sobe.
  5. Que as regras do .gitignore que protegem seus dados continuam valendo, e que
     nenhum arquivo proibido (.env, chaves, planilhas pessoais) está rastreado.

A saída nunca mostra o dado encontrado, só o arquivo, a linha e o tipo: um log de
CI ou um terminal compartilhado não pode virar o vazamento.

`.privacy-patterns` (opcional, ignorado pelo git): uma regex ou texto literal por
linha, `#` comenta. Use para nomes de pessoas ou empresas que não devem aparecer.

Uso:
  python tools/check_privacy.py
Saída 0 = aprovado; 1 = violações.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import privacy_utils  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EXTRA_PATTERNS_FILE = ROOT / ".privacy-patterns"

BINARY_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".ttf", ".otf", ".woff", ".woff2",
    ".pyc", ".zip", ".lock",
}

# Padrões que valem para qualquer pessoa.
GENERIC_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(p), d) for p, d in privacy_utils.SECRET_PATTERNS
] + [
    (privacy_utils.CNPJ_RE, "CNPJ formatado"),
    (privacy_utils.CPF_RE, "CPF formatado"),
]

# Caminhos que nunca podem estar no git.
FORBIDDEN_TRACKED = [
    (re.compile(r"(^|/)\.env(\.(?!example$).+)?$"), "arquivo .env com segredos"),
    (re.compile(r"\.(pem|key|p12|pfx)$", re.IGNORECASE), "chave ou certificado"),
    (re.compile(r"(^|/)(credentials|client_secret|service[-_]account)[^/]*\.json$", re.IGNORECASE), "credencial JSON"),
    (re.compile(r"(^|/)(salary_data\.json|job_search_tracker\.csv|\.privacy-patterns)$"), "dado pessoal local"),
    (re.compile(r"^documents/(cv|linkedin|diplomas|references|projects|perfil|postings|applications|interview)/(?!\.gitkeep$)"),
     "documento pessoal"),
]

# Caminhos de exemplo que o .gitignore precisa cobrir (`git check-ignore`).
MUST_BE_IGNORED = [
    ".env", ".privacy-patterns", "job_search_tracker.csv", "documents/cv/curriculo.docx",
    "documents/perfil/respostas.json", "documents/comprovante.pdf", "documents/comprovante.docx",
    "documents/applications/_painel/x_avaliacao.md", "cv/main_empresa_cargo.tex",
]


def git(*args: str, check: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8",
                          errors="replace", cwd=ROOT, check=check)


def git_file_statuses() -> tuple[set[str], set[str]]:
    """(arquivos com skip-worktree, todos os arquivos rastreados)."""
    skip, tracked = set(), set()
    try:
        for line in git("ls-files", "-v", check=True).stdout.splitlines():
            if len(line) < 3:
                continue
            tracked.add(line[2:].strip())
            if line[0] in ("S", "s"):
                skip.add(line[2:].strip())
    except Exception as exc:
        print(f"Aviso ao consultar git ls-files: {exc}", file=sys.stderr)
    return skip, tracked


def untracked_not_ignored() -> set[str]:
    try:
        return {p for p in git("ls-files", "--others", "--exclude-standard").stdout.splitlines() if p}
    except Exception:
        return set()


def build_local_patterns(skip_worktree: set[str]) -> list[tuple[re.Pattern, str]]:
    """Padrões da pessoa dona deste clone: do perfil local e do .privacy-patterns."""
    sources = [ROOT / p for p in sorted(skip_worktree)] + [ROOT / "CLAUDE.md"]
    seen, patterns = set(), []
    for src in sources:
        if src in seen or not src.is_file():
            continue
        seen.add(src)
        try:
            text = src.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for pat, desc in privacy_utils.local_identifiers(text):
            patterns.append((re.compile(pat, re.IGNORECASE), desc))
    if EXTRA_PATTERNS_FILE.is_file():
        for raw in EXTRA_PATTERNS_FILE.read_text(encoding="utf-8", errors="replace").splitlines():
            raw = raw.strip()
            if not raw or raw.startswith("#"):
                continue
            try:
                patterns.append((re.compile(raw, re.IGNORECASE), "Padrão de .privacy-patterns"))
            except re.error:
                patterns.append((re.compile(re.escape(raw), re.IGNORECASE), "Padrão de .privacy-patterns"))
    # Sem duplicatas, na mesma ordem.
    unique = {(p.pattern, d): (p, d) for p, d in patterns}
    return list(unique.values())


def check_text(text: str, patterns: list[tuple[re.Pattern, str]]) -> list[tuple[int, str]]:
    """[(linha, descrição)] sem o trecho encontrado."""
    hits = []
    for idx, line in enumerate(text.splitlines(), 1):
        for rx, desc in patterns:
            for m in rx.finditer(line):
                if desc.startswith(("CPF", "CNPJ")) and privacy_utils.is_placeholder_digits(m.group(0)):
                    continue
                hits.append((idx, desc))
                break
    return hits


def report(header: str, hits: list[tuple[int, str]]) -> int:
    print(f"\n{header}")
    for line_no, desc in hits:
        print(f"  linha {line_no}: {desc}")
    return len(hits)


def head_text(rel_path: str) -> str | None:
    proc = git("show", f"HEAD:{rel_path}")
    return proc.stdout if proc.returncode == 0 else None


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    print("Iniciando auditoria de privacidade pré-push...")
    skip_worktree, tracked = git_file_statuses()
    local = build_local_patterns(skip_worktree)
    patterns = GENERIC_PATTERNS + local
    if local:
        print(f"Padrões da sua identidade carregados do perfil local: {len(local)}.")
    else:
        print("Nenhum perfil local encontrado: só os padrões genéricos (chaves, CPF, CNPJ) foram usados.")

    total = 0

    # 4. Perfil com skip-worktree: o que sobe é HEAD, não a pasta de trabalho.
    for rel in sorted(skip_worktree):
        text = head_text(rel)
        hits = check_text(text, patterns) if text else []
        if hits:
            total += report(f"[CRÍTICO EM HEAD] versão enviada ao git contém dados pessoais: {rel}", hits)
        else:
            print(f"[OK - skip-worktree] {rel} (HEAD limpo)")

    # 1 e 2. Arquivos rastreados e arquivos novos não ignorados.
    candidates = {p for p in tracked if p not in skip_worktree} | untracked_not_ignored()
    for rel in sorted(candidates):
        for rx, why in FORBIDDEN_TRACKED:
            if rx.search(rel):
                total += 1
                print(f"\n[PROIBIDO] {rel}: {why} não pode ir para o git")
        p = ROOT / rel
        if p.suffix.lower() in BINARY_EXTENSIONS or not p.is_file():
            continue
        try:
            hits = check_text(p.read_text(encoding="utf-8", errors="replace"), patterns)
        except OSError:
            continue
        if hits:
            label = "rastreado" if rel in tracked else "novo, ainda não ignorado"
            total += report(f"[PRIVACIDADE] arquivo {label}: {rel}", hits)

    # 3. Staging: só as linhas adicionadas.
    added = "\n".join(
        l[1:] for l in git("diff", "--cached", "--no-color", "-U0").stdout.splitlines()
        if l.startswith("+") and not l.startswith("+++")
    )
    staged_hits = check_text(added, patterns)
    if staged_hits:
        total += report("[PRIVACIDADE] há linhas em staging (git add) com dados sensíveis:",
                        [(0, d) for _, d in staged_hits])

    # 5. As regras do .gitignore continuam protegendo.
    for sample in MUST_BE_IGNORED:
        if git("check-ignore", "-q", sample).returncode != 0:
            total += 1
            print(f"\n[GITIGNORE] '{sample}' deixou de ser ignorado: restaure a regra no .gitignore")

    if total:
        print(f"\nAUDITORIA REPROVADA: {total} problema(s). Corrija antes do push.")
        return 1
    print(f"\nAUDITORIA APROVADA: {len(candidates) + len(skip_worktree)} arquivos verificados. Seguro para envio.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
