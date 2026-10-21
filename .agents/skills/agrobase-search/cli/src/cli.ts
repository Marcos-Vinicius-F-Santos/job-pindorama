#!/usr/bin/env bun
// CLI independente para buscar vagas do agronegócio no Agrobase (www.agrobase.com.br).
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, foldAccents, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError } from "./helpers.js"
import { MAX_PAGE_SIZE, PROFESSIONS, TYPES, buildSearchUrl } from "./parse.js"

const HELP = `agrobase-cli - busca vagas do agronegócio, ciências agrárias e meio ambiente no Agrobase
(www.agrobase.com.br), o maior agregador de vagas do setor

USO
  bun run src/cli.ts search [-q "<palavra>"] [filtros] [--format json|table|plain]
  bun run src/cli.ts detail <url> [--format json|plain]

BUSCA
  --query, -q <texto>     Palavra-chave (busca do WordPress: título e texto). Opcional
                          quando há --profession.
  --profession <área>     ${Object.keys(PROFESSIONS).join(", ")}.
  --type <tipo>           emprego (padrão) | estagio | concurso.
  --jobage <dias>         Só vagas publicadas nos últimos N dias (filtro feito pelo site).
  --page <n>              Página, começando em 1.
  --limit, -n <n>         Vagas por página (1 a ${MAX_PAGE_SIZE}). Padrão 25.
  --format <fmt>          json (padrão) | table | plain.

A busca traz título (com o local), data, tipo e profissões. O detalhe traz responsabilidades,
requisitos e o link de candidatura. O plano pago do Agrobase libera parte das vagas 2 a 4
dias antes; a CLI só vê o que já está público.

EXEMPLOS
  bun run src/cli.ts search --profession agronomo --jobage 7 --format table
  bun run src/cli.ts search -q "vendedor" --profession veterinario --format table
  bun run src/cli.ts search -q "trainee" --format table
  bun run src/cli.ts detail "https://www.agrobase.com.br/oportunidades/2026/10/zootecnista-trainee-pr-e-sp/" --format plain

Fonte pública, sem login. Use com moderação: poucas buscas, nada de varredura em massa.
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "profession", "type", "jobage", "page", "limit", "format", "no-description", "help", "h"]),
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
    if (rejectEmpty(flags, ["query", "profession", "type"])) return 1
    if (flags.query === undefined && flags.profession === undefined) {
      writeError("informe uma palavra-chave com --query/-q ou uma profissão com --profession", "MISSING_QUERY")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)
    let profession: number | undefined
    if (typeof flags.profession === "string") {
      profession = PROFESSIONS[foldAccents(flags.profession).replace(/\s+/g, "-")]
      if (!profession) return badArg(`--profession "${flags.profession}" desconhecida; use: ${Object.keys(PROFESSIONS).join(", ")}`)
    }
    const typeKey = typeof flags.type === "string" ? foldAccents(flags.type) : "emprego"
    const type = TYPES[typeKey]
    if (!type) return badArg(`--type "${flags.type}" desconhecido; use emprego, estagio ou concurso`)
    let jobage = 9999
    let page = 1
    let limit = 25
    if (flags.jobage !== undefined) {
      const v = parseIntFlag("jobage", flags.jobage)
      if (v === null) return 1
      jobage = v
    }
    if (flags.page !== undefined) {
      const v = parseIntFlag("page", flags.page)
      if (v === null) return 1
      page = v
    }
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit, MAX_PAGE_SIZE)
      if (v === null) return 1
      limit = v
    }
    const after = jobage < 9999 ? new Date(Date.now() - jobage * 86_400_000).toISOString().slice(0, 10) : undefined
    const url = buildSearchUrl({ query: typeof flags.query === "string" ? flags.query.trim() : "", type, profession, page, limit, after })
    return runSearch({ url, page, limit, jobage, format: fmt as "json", includeDescription: true })
  }

  if (cmd === "detail") {
    const id = flags._[1]
    if (!id) {
      writeError("detail precisa da URL da vaga", "NO_ID")
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
