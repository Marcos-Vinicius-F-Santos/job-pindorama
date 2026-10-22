#!/usr/bin/env bun
// CLI independente para buscar vagas na Empregos.com.br.
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError, type JobResult } from "./helpers.js"

const HELP = `empregos-cli - busca vagas na Empregos.com.br pelas páginas públicas por cargo

USO
  bun run src/cli.ts search -q "<cargo>" [opções] [--format json|table|plain]
  bun run src/cli.ts detail <url|id> [--format json|plain]

BUSCA
  --query, -q <texto>     Cargo (obrigatório): vira a página /vagas/<cargo>; todas as
                          palavras precisam estar no título.
  --remote                Só vagas com modelo "Remoto" no cartão.
  --hybrid                Só vagas com modelo "Híbrido".
  --pages <n>             Páginas lidas, 20 vagas cada (1 a 10). Padrão 3.
  --with-description      Traz o texto da vaga que aparece no cartão.
  --jobage <dias>         Só vagas publicadas nos últimos N dias.
  --limit, -n <n>         Máximo de vagas na resposta (1 a 200). Padrão 25.
  --format <fmt>          json (padrão) | table | plain.

DETALHE
  <url|id>                https://www.empregos.com.br/vaga/<id>/... ou só o id.

EXEMPLOS
  bun run src/cli.ts search -q "product manager" --remote --format table
  bun run src/cli.ts search -q "analista de dados" --pages 5 --jobage 14 --format table
  bun run src/cli.ts detail https://www.empregos.com.br/vaga/11909170/product-manager-senior-em-sao-paulo-sp --format plain

A busca livre do site é proibida no robots.txt; a CLI só usa as páginas por cargo. Uma
requisição por página: use com moderação.
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "remote", "hybrid", "pages", "with-description", "jobage", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2), { q: "query", n: "limit" })
  const cmd = flags._[0]
  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }
  const known = KNOWN[cmd]
  if (known && rejectUnknown(flags, cmd, known)) return 1

  if (cmd === "search") {
    if (rejectEmpty(flags, ["query"])) return 1
    if (flags.query === undefined) {
      writeError("informe o cargo com --query/-q", "MISSING_QUERY")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)
    for (const f of ["remote", "hybrid", "with-description"]) {
      if (flags[f] !== undefined && flags[f] !== true) return badArg(`--${f} não recebe valor`)
    }
    if (flags.remote && flags.hybrid) return badArg("use --remote ou --hybrid, não os dois")
    if (!/[a-z0-9]/i.test(String(flags.query))) return badArg("--query precisa de letras ou números")

    let pages = 3
    let limit = 25
    let jobage = 9999
    if (flags.pages !== undefined) {
      const v = parseIntFlag("pages", flags.pages, 10)
      if (v === null) return 1
      pages = v
    }
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit, 200)
      if (v === null) return 1
      limit = v
    }
    if (flags.jobage !== undefined) {
      const v = parseIntFlag("jobage", flags.jobage)
      if (v === null) return 1
      jobage = v
    }
    const want = flags.remote ? "remote" : flags.hybrid ? "hybrid" : null
    const keep = want ? (r: JobResult) => r.workplace_type === want : undefined
    return runSearch({
      query: String(flags.query).trim(), pages, limit, jobage, format: fmt as "json",
      includeDescription: flags["with-description"] === true, keep,
    })
  }

  if (cmd === "detail") {
    const id = flags._[1]
    if (!id) {
      writeError("detail precisa da URL da vaga ou do id", "NO_ID")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "plain"].includes(fmt)) return badArg(`--format deve ser json|plain, recebi "${fmt}"`)
    return runDetail({ id, format: fmt as "json" | "plain" })
  }

  writeError(`comando desconhecido "${cmd}" (use search ou detail)`, "BAD_CMD")
  return 1
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    writeError(e instanceof Error ? e.message : String(e), "INTERNAL_ERROR")
    process.exit(1)
  })
