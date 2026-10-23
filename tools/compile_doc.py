#!/usr/bin/env python3
"""Compila um currículo ou uma carta gerados pelo /apply, com argumentos fixos.

Existe para o painel (tools/painel.py), em que o Claude roda sem ninguém para
aprovar comandos: em vez de liberar `lualatex:*` - que também aprovaria
`-shell-escape` e deixaria o LaTeX rodar comandos do sistema -, o painel libera
só este script. Ele:

  * aceita só cv/main_*.tex (compila com lualatex) e cover_letters/cover_*.tex
    ou Cover_*.tex (com xelatex), dentro deste repositório;
  * sempre desliga a execução de comandos pelo LaTeX (`--disable-write18` no
    MiKTeX, `-no-shell-escape` no TeX Live);
  * com --clean, só apaga os arquivos intermediários daquele documento
    (.aux, .log, .out, .fls, .fdb_latexmk, .synctex.gz), sem compilar.

Modelos próprios registrados pelo /add-template não passam por aqui: o comando
deles é declarado no bloco ACTIVE-TEMPLATE e continua pedindo aprovação.

Uso:
  python3 tools/compile_doc.py cv/main_<empresa>_<cargo>.tex
  python3 tools/compile_doc.py cover_letters/cover_<empresa>_<cargo>.tex --clean
Saída 0 = compilou (ou limpou); 1 = a compilação falhou; 2 = arquivo recusado.
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# pasta -> (prefixos aceitos, motor)
TARGETS = {"cv": (("main_",), "lualatex"), "cover_letters": (("cover_", "Cover_"), "xelatex")}
INTERMEDIATE = (".aux", ".log", ".out", ".fls", ".fdb_latexmk", ".synctex.gz")


def target(path: str, root: Path = ROOT) -> tuple[Path, str]:
    """O arquivo e o motor, ou ValueError se o arquivo não for um documento do /apply."""
    p = (root / path).resolve() if not Path(path).is_absolute() else Path(path).resolve()
    rule = TARGETS.get(p.parent.name) if p.parent.parent == root.resolve() else None
    if rule is None or p.suffix != ".tex" or not p.name.startswith(rule[0]):
        raise ValueError(f"só cv/main_*.tex e cover_letters/cover_*.tex: {path}")
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
    parser = argparse.ArgumentParser(prog="compile_doc.py", description="Compila um documento do /apply; veja o docstring.")
    parser.add_argument("file", help="cv/main_*.tex ou cover_letters/cover_*.tex")
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
    if not shutil.which(engine):
        print(f"compile_doc: {engine} não encontrado no PATH", file=sys.stderr)
        return 1
    proc = subprocess.run(command(engine, tex, no_shell_flag(engine)), cwd=tex.parent,
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
