#!/usr/bin/env bun
// CLI independente para buscar vagas de tecnologia no Programathor (programathor.com.br).
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { badArg, foldAccents, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError } from "./helpers.js"
import { CONTRACTS, LEVELS, buildSearchUrl } from "./parse.js"

const PAGE_SIZE = 32

const HELP = `programathor-cli - busca vagas de tecnologia no Programathor (programathor.com.br)

USO
  bun run src/cli.ts search -q "<tecnologia>" [filtros] [--format json|table|plain]
  bun run src/cli.ts search --all [filtros]

BUSCA
  --query, -q <tecnologia>  O portal busca por tecnologia, não por texto livre: python,
                            react, scrum, aws, "CI/CD"... (vira a página /jobs-<tecnologia>).
  --all                     A lista geral de vagas, sem tecnologia (aceita --page).
  --remote                  Só vagas remotas.
  --level <nível>           junior | pleno | senior.
  --type <regime>           clt | pj | estagio.
  --page <n>                Página da lista geral (--all). As páginas por tecnologia não paginam.
  --limit, -n <n>           Quantas vagas mostrar (1 a ${PAGE_SIZE}).
  --format <fmt>            json (padrão) | table | plain.

A busca traz título, empresa, local, nível, regime e tecnologias. Não traz data nem
descrição, e não há "detail": a página da vaga só abre com login no portal.

EXEMPLOS
  bun run src/cli.ts search -q python --remote --level senior --format table
  bun run src/cli.ts search -q scrum --type clt --format table
  bun run src/cli.ts search --all --remote --page 2 --format table

Fonte pública, sem login. Use com moderação: poucas buscas, nada de varredura em massa.
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "all", "remote", "level", "type", "jobage", "page", "limit", "format", "no-description", "help", "h"]),
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
    if (rejectEmpty(flags, ["query", "level", "type"])) return 1
    if (flags.query === undefined && flags.all === undefined) {
      writeError("informe a tecnologia com --query/-q, ou use --all para a lista geral", "MISSING_QUERY")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)
    if (flags.remote !== undefined && flags.remote !== true) return badArg("--remote não recebe valor")

    let level: string | undefined
    if (typeof flags.level === "string") {
      level = LEVELS[foldAccents(flags.level)]
      if (!level) return badArg(`--level "${flags.level}" desconhecido; use junior, pleno ou senior`)
    }
    let contract: string | undefined
    if (typeof flags.type === "string") {
      contract = CONTRACTS[foldAccents(flags.type)]
      if (!contract) return badArg(`--type "${flags.type}" desconhecido; use clt, pj ou estagio`)
    }

    // --jobage é aceito pelo contrato, mas o portal não informa data: nada é descartado.
    let jobage = 9999
    let page = 1
    let limit = PAGE_SIZE
    if (flags.jobage !== undefined) {
      const v = parseIntFlag("jobage", flags.jobage)
      if (v === null) return 1
      jobage = v
    }
    if (flags.page !== undefined) {
      const v = parseIntFlag("page", flags.page)
      if (v === null) return 1
      if (v > 1 && flags.query !== undefined) return badArg("--page só vale para a lista geral (--all): as páginas por tecnologia não paginam")
      page = v
    }
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit, PAGE_SIZE)
      if (v === null) return 1
      limit = v
    }
    const tag = typeof flags.query === "string" ? flags.query.trim() : undefined
    const url = buildSearchUrl({ tag, remote: flags.remote === true, level, contract, page })
    return runSearch({ url, page, limit, jobage, format: fmt as "json", includeDescription: true })
  }

  if (cmd === "detail") {
    writeError(
      "o Programathor não abre a página da vaga sem login (responde 500, mesmo com cabeçalhos de navegador); use os campos da busca ou procure a vaga no site da empresa",
      "DETAIL_UNAVAILABLE",
    )
    return 1
  }

  writeError(`comando desconhecido "${cmd}" (use search)`, "BAD_CMD")
  return 1
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    writeError(e instanceof Error ? e.message : String(e), "INTERNAL_ERROR")
    process.exit(1)
  })
