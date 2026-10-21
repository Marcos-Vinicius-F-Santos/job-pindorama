#!/usr/bin/env bun
// CLI independente para buscar vagas da AGROSearch (consultoria de recrutamento do agronegócio).
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, foldAccents, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError, type JobResult } from "./helpers.js"
import { API_URL, type AgroSearchResult } from "./parse.js"

const HELP = `agrosearch-cli - busca vagas da AGROSearch, consultoria de recrutamento do agronegócio
(portal Agroforce: agroforce.agrosearch.com.br)

USO
  bun run src/cli.ts search [-q "<palavras do título>"] [filtros] [--format json|table|plain]
  bun run src/cli.ts detail <dealId|url> [--format json|plain]

BUSCA
  --query, -q <texto>     Palavras que precisam estar todas no título. Sem -q, todas as vagas
                          (o portal tem dezenas; a API devolve todas de uma vez).
  --remote                Só vagas que dizem remoto/home office.
  --no-internal           Tira o recrutamento interno da própria AGROSearch.
  --limit, -n <n>         Quantas vagas mostrar (1 a 100). Padrão 50.
  --format <fmt>          json (padrão) | table | plain.

A busca traz título (com o local), regime e condições; não traz data. O detalhe traz
descrição, responsabilidades e requisitos.

EXEMPLOS
  bun run src/cli.ts search --format table
  bun run src/cli.ts search -q "vendas" --no-internal --format table
  bun run src/cli.ts detail 1036 --format plain

Fonte pública, sem login. Use com moderação.
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "remote", "no-internal", "jobage", "page", "limit", "format", "no-description", "help", "h"]),
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
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)
    for (const f of ["remote", "no-internal"]) if (flags[f] !== undefined && flags[f] !== true) return badArg(`--${f} não recebe valor`)
    let limit = 50
    let jobage = 9999
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit, 100)
      if (v === null) return 1
      limit = v
    }
    if (flags.jobage !== undefined) {
      const v = parseIntFlag("jobage", flags.jobage)
      if (v === null) return 1
      jobage = v // aceito pelo contrato; o portal não informa data, então nada é descartado
    }
    if (flags.page !== undefined && parseIntFlag("page", flags.page) === null) return 1
    const words = typeof flags.query === "string" ? foldAccents(flags.query).split(/\s+/).filter(Boolean) : []
    const keep = (r: JobResult) =>
      words.every((w) => foldAccents(r.title).includes(w)) &&
      (!flags.remote || r.workplace_type === "remote") &&
      (!flags["no-internal"] || !(r as AgroSearchResult).internal)
    return runSearch({ url: API_URL, page: 1, limit, jobage, format: fmt as "json", includeDescription: flags["no-description"] === undefined, keep })
  }

  if (cmd === "detail") {
    const id = flags._[1]
    if (!id) {
      writeError("detail precisa do dealId ou da URL da vaga", "NO_ID")
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
