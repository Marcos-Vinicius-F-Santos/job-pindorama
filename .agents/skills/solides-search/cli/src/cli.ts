#!/usr/bin/env bun
// CLI independente para buscar vagas na Sólides Vagas (vagas.solides.com.br).
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, foldAccents, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError } from "./helpers.js"
import { CONTRACT_KEYS, MAX_PAGE_SIZE, SENIORITY_KEYS, WORKPLACE_KEYS, buildSearchUrl } from "./parse.js"

const HELP = `solides-cli - busca vagas na Sólides Vagas (vagas.solides.com.br), o portal das
vagas publicadas no ATS da Sólides (muito usado por empresas pequenas e médias)

USO
  bun run src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
  bun run src/cli.ts detail <id|url> [--format json|plain]

BUSCA
  --query, -q <texto>     Cargo ou palavra-chave (obrigatório). Busca no título da vaga.
  --remote <modos>        remoto | hibrido | presencial; lista com vírgula vale "ou".
                          --remote sozinho = remoto.
  --type <regimes>        ${CONTRACT_KEYS.join(" | ")}; lista com vírgula.
  --seniority <níveis>    ${SENIORITY_KEYS.join(" | ")}; lista com vírgula.
  --jobage <dias>         Só vagas publicadas nos últimos N dias (filtro feito aqui).
  --page <n>              Página, começando em 1. Padrão 1.
  --limit, -n <n>         Vagas por página (1 a ${MAX_PAGE_SIZE}, o máximo do portal). Padrão ${MAX_PAGE_SIZE}.
  --format <fmt>          json (padrão) | table | plain.
  --no-description        Omite a descrição (saída mais enxuta).

DETALHE
  <id|url>                O id da busca ou https://vagas.solides.com.br/vaga/<id>.

EXEMPLOS
  bun run src/cli.ts search -q "product manager" --remote --format table
  bun run src/cli.ts search -q "analista financeiro" --type clt --seniority pleno,senior --format table
  bun run src/cli.ts search -q "desenvolvedor" --remote remoto,hibrido --jobage 14 --format table
  bun run src/cli.ts detail 939473 --format plain

Fonte pública, sem login. Use com moderação: poucas buscas, nada de varredura em massa.
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "remote", "type", "seniority", "jobage", "page", "limit", "format", "no-description", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

/** Lista "a,b" validada contra um vocabulário; null (erro já gravado) se houver item desconhecido. */
function listFlag(name: string, raw: string, allowed: string[], map?: Record<string, string>): string[] | null {
  const out: string[] = []
  for (const item of raw.split(",").map((x) => foldAccents(x)).filter(Boolean)) {
    const key = map ? map[item] : allowed.includes(item) ? item : undefined
    if (!key) {
      badArg(`--${name} "${item}" desconhecido; use: ${allowed.join(", ")}`)
      return null
    }
    if (!out.includes(key)) out.push(key)
  }
  return out
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
    if (rejectEmpty(flags, ["query", "type", "seniority"])) return 1
    if (flags.query === undefined) {
      writeError("informe o cargo ou palavra-chave com --query/-q", "MISSING_QUERY")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)

    let workplace: string[] = []
    if (flags.remote !== undefined) {
      const raw = flags.remote === true ? "remoto" : String(flags.remote)
      const parsed = listFlag("remote", raw, ["remoto", "hibrido", "presencial"], WORKPLACE_KEYS)
      if (!parsed) return 1
      workplace = parsed
    }
    const contract = typeof flags.type === "string" ? listFlag("type", flags.type, CONTRACT_KEYS) : []
    if (!contract) return 1
    const seniority = typeof flags.seniority === "string" ? listFlag("seniority", flags.seniority, SENIORITY_KEYS) : []
    if (!seniority) return 1

    let jobage = 9999
    let page = 1
    let limit = MAX_PAGE_SIZE
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
    const url = buildSearchUrl({ query: String(flags.query).trim(), workplace, contract, seniority, page, limit })
    return runSearch({ url, page, limit, jobage, format: fmt as "json", includeDescription: flags["no-description"] === undefined })
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
