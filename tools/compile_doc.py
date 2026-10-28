#!/usr/bin/env python3
"""Compila um currículo, carta ou dossiê de entrevista, com argumentos fixos.

Existe para o painel (tools/painel.py), em que o assistente roda sem ninguém para
aprovar comandos: em vez de liberar `lualatex:*` - que também aprovaria
`-shell-escape` e deixaria o LaTeX rodar comandos do sistema -, o painel libera
só este script. Ele:

  * aceita cv/main_*.tex (compila com lualatex), cover_letters/cover_*.tex
    ou Cover_*.tex (com xelatex), e documents/interview/prep_*.tex (com lualatex);
  * sempre desliga a execução de comandos pelo LaTeX (`--disable-write18` no
    MiKTeX, `-no-shell-escape` no TeX Live);
  * com --clean, só apaga os arquivos intermediários daquele documento
    (.aux, .log, .out, .fls, .fdb_latexmk, .synctex.gz), sem compilar.

Modelos próprios registrados pelo /add-template não passam por aqui: o comando
deles é declarado no bloco ACTIVE-TEMPLATE e continua pedindo aprovação.

Uso:
  python3 tools/compile_doc.py cv/main_<empresa>_<cargo>.tex
  python3 tools/compile_doc.py cover_letters/cover_<empresa>_<cargo>.tex --clean
  python3 tools/compile_doc.py documents/interview/prep_<empresa>_<cargo>.tex
Saída 0 = compilou (ou limpou); 1 = a compilação falhou; 2 = arquivo recusado.
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# pasta relativa à raiz -> (prefixos aceitos, motor)
TARGETS = {
    ("cv",): (("main_",), "lualatex"),
    ("cover_letters",): (("cover_", "Cover_"), "xelatex"),
    ("documents", "interview"): (("prep_",), "lualatex"),
}
INTERMEDIATE = (".aux", ".log", ".out", ".fls", ".fdb_latexmk", ".synctex.gz")


def find_engine(engine: str) -> str | None:
    """Localiza o motor TeX pelo PATH ou por uma instalação comum do MiKTeX no Windows."""
    found = shutil.which(engine)
    if found:
        return found
    if os.name != "nt":
        return None
    roots = []
    for raw_root in (os.environ.get("LOCALAPPDATA"), str(Path.home() / "AppData" / "Local")):
        if raw_root:
            roots.append(Path(raw_root))
    candidates = []
    for root in dict.fromkeys(roots):
        candidates.extend((root / "Programs" / "MiKTeX" / "miktex" / "bin" / "x64" / f"{engine}.exe",
                           root / "MiKTeX" / "miktex" / "bin" / "x64" / f"{engine}.exe"))
    return next((str(path) for path in candidates if path.is_file()), None)


def target(path: str, root: Path = ROOT) -> tuple[Path, str]:
    """O arquivo e o motor, ou ValueError se o arquivo não for um documento válido."""
    p = (root / path).resolve() if not Path(path).is_absolute() else Path(path).resolve()
    try:
        rel_parent = p.parent.relative_to(root.resolve()).parts
    except ValueError:
        rel_parent = ()
    rule = TARGETS.get(rel_parent)
    if rule is None or p.suffix != ".tex" or not p.name.startswith(rule[0]):
        raise ValueError(f"só cv/main_*.tex, cover_letters/cover_*.tex e documents/interview/prep_*.tex: {path}")
    if p.name in ("main_example.tex", "cover_example.tex"):
        raise ValueError(f"o modelo de exemplo não é um documento do /apply: {path}")
    if not p.is_file():
        raise ValueError(f"arquivo não encontrado: {path}")
    return p, rule[1]


def no_shell_flag(engine: str) -> str:
    version = subprocess.run([engine, "--version"], capture_output=True, text=True, errors="replace").stdout
    return "--disable-write18" if "MiKTeX" in version else "-no-shell-escape"


def command(engine: str, tex: Path, flag: str) -> list:
    return [engine, flag, "-interaction=nonstopmode", "-halt-on-error", tex.name]


def clean(tex: Path) -> list:
    removed = []
    for ext in INTERMEDIATE:
        f = tex.with_name(tex.stem + ext)
        if f.is_file():
            f.unlink()
            removed.append(f.name)
    return removed


def main(argv=None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="compile_doc.py", description="Compila um documento; veja o docstring.")
    parser.add_argument("file", help="cv/main_*.tex, cover_letters/cover_*.tex ou documents/interview/prep_*.tex")
    parser.add_argument("--clean", action="store_true", help="só apagar os arquivos intermediários")
    args = parser.parse_args(argv)
    try:
        tex, engine = target(args.file)
    except ValueError as exc:
        print(f"compile_doc: {exc}", file=sys.stderr)
        return 2
    if args.clean:
        print("removidos: " + (", ".join(clean(tex)) or "nada"))
        return 0
    engine_path = find_engine(engine)
    if not engine_path:
        print(f"compile_doc: {engine} não encontrado no PATH", file=sys.stderr)
        return 1
    proc = subprocess.run(command(engine_path, tex, no_shell_flag(engine_path)), cwd=tex.parent,
                          capture_output=True, text=True, errors="replace")
    pdf = tex.with_suffix(".pdf")
    if proc.returncode:
        # O fim do log é onde o LaTeX diz o que deu errado.
        print("\n".join(proc.stdout.splitlines()[-40:]), file=sys.stderr)
        print(f"compile_doc: {engine} falhou ({proc.returncode})", file=sys.stderr)
        return 1
    print(f"compilado com {engine}: {pdf.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
