#!/usr/bin/env bun
// CLI independente para buscar vagas na Trampos (trampos.co).
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, foldAccents, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError } from "./helpers.js"
import { CATEGORIES, PAGE_SIZE, TYPES, buildSearchUrl, setRemoteSearch } from "./parse.js"

const HELP = `trampos-cli - busca vagas na Trampos (trampos.co): comunicação, marketing, design, tecnologia e negócios

USO PESSOAL: os termos de uso da Trampos proíbem acesso automatizado. Use para a sua
própria busca, com poucas consultas; nada de varredura, uso comercial ou em massa.

USO
  bun run src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
  bun run src/cli.ts detail <id|url> [--format json|plain]

BUSCA
  --query, -q <texto>     Cargo ou palavra-chave (obrigatório).
  --remote                Só vagas home office.
  --location, -l <cidade> Cidade (ignorado com --remote).
  --category <área>       ${CATEGORIES.join(", ")}.
  --type <tipo>           ${TYPES.join(", ")}.
  --jobage <dias>         Só vagas publicadas nos últimos N dias (filtro feito aqui).
  --page <n>              Página, começando em 1 (${PAGE_SIZE} vagas por página).
  --limit, -n <n>         Quantas vagas mostrar (1 a ${PAGE_SIZE}).
  --format <fmt>          json (padrão) | table | plain.
  --no-description        Sem efeito na busca (a descrição vem só no detalhe).

DETALHE
  <id|url>                O id da busca ou https://trampos.co/oportunidades/<id>-<slug>.

EXEMPLOS
  bun run src/cli.ts search -q "produto" --remote --type emprego --format table
  bun run src/cli.ts search -q "analista de dados" --category dados --format table
  bun run src/cli.ts detail 774888 --format plain
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "remote", "location", "category", "type", "jobage", "page", "limit", "format", "no-description", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2), { q: "query", l: "location", n: "limit" })
  const cmd = flags._[0]
  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }
  const known = KNOWN[cmd]
  if (known && rejectUnknown(flags, cmd, known)) return 1

  if (cmd === "search") {
    if (rejectEmpty(flags, ["query", "location", "category", "type"])) return 1
    if (flags.query === undefined) {
      writeError("informe o cargo ou palavra-chave com --query/-q", "MISSING_QUERY")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)
    if (flags.remote !== undefined && flags.remote !== true) return badArg("--remote não recebe valor")
    const category = typeof flags.category === "string" ? foldAccents(flags.category) : undefined
    if (category && !CATEGORIES.includes(category)) return badArg(`--category "${flags.category}" desconhecida; use: ${CATEGORIES.join(", ")}`)
    const type = typeof flags.type === "string" ? foldAccents(flags.type) : undefined
    if (type && !TYPES.includes(type)) return badArg(`--type "${flags.type}" desconhecido; use: ${TYPES.join(", ")}`)
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
      page = v
    }
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit, PAGE_SIZE)
      if (v === null) return 1
      limit = v
    }
    setRemoteSearch(flags.remote === true)
    const url = buildSearchUrl({
      query: String(flags.query).trim(), page, remote: flags.remote === true,
      location: typeof flags.location === "string" ? flags.location.trim() : undefined, category, type,
    })
    return runSearch({ url, page, limit, jobage, format: fmt as "json", includeDescription: true })
  }

  if (cmd === "detail") {
    const id = flags._[1]
    if (!id) {
      writeError("detail precisa do id ou da URL da vaga", "NO_ID")
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
