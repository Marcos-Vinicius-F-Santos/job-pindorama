#!/usr/bin/env bun
// CLI independente para buscar vagas na VAGAS.com (www.vagas.com.br).
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, foldAccents, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError } from "./helpers.js"
import { PAGE_SIZE, WORKPLACE_FILTER, buildSearchUrl } from "./parse.js"

const HELP = `vagas-cli - busca vagas na VAGAS.com (www.vagas.com.br), portal generalista brasileiro

USO
  bun run src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
  bun run src/cli.ts detail <id|url> [--format json|plain]

BUSCA
  --query, -q <texto>     Cargo ou palavra-chave (obrigatório). O portal procura o termo
                          inteiro: "gerente de produto" acha menos que "produto".
  --remote <modos>        remoto (100% Home Office) | hibrido (Empresa e Home Office) |
                          presencial (Na empresa); lista com vírgula vale "ou".
                          --remote sozinho = remoto.
  --jobage <dias>         Só vagas publicadas nos últimos N dias (filtro feito aqui).
  --page <n>              Página, começando em 1 (${PAGE_SIZE} vagas por página no portal).
  --limit, -n <n>         Quantas vagas da página mostrar (1 a ${PAGE_SIZE}). Padrão ${PAGE_SIZE}.
  --format <fmt>          json (padrão) | table | plain.
  --no-description        Omite o trecho da descrição.

A busca não traz regime nem salário (só o detalhe traz).

DETALHE
  <id|url>                2837357, v2837357 ou https://www.vagas.com.br/vagas/v<id>/...

EXEMPLOS
  bun run src/cli.ts search -q "gerente de produto" --remote --format table
  bun run src/cli.ts search -q "analista de dados" --jobage 14 --format table
  bun run src/cli.ts search -q "produto" --remote remoto,hibrido --page 2 --format table
  bun run src/cli.ts detail v2837357 --format plain

Fonte pública, sem login. Use com moderação: poucas buscas, nada de varredura em massa.
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "remote", "jobage", "page", "limit", "format", "no-description", "help", "h"]),
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
      writeError("informe o cargo ou palavra-chave com --query/-q", "MISSING_QUERY")
      return 1
    }
    const query = String(flags.query).trim()
    if (!/[a-z0-9]/i.test(foldAccents(query))) return badArg("--query precisa de letras ou números")
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)

    const workplace: string[] = []
    if (flags.remote !== undefined) {
      const raw = flags.remote === true ? "remoto" : String(flags.remote)
      for (const item of raw.split(",").map((x) => foldAccents(x)).filter(Boolean)) {
        const value = WORKPLACE_FILTER[item]
        if (!value) return badArg(`--remote "${item}" desconhecido; use remoto, hibrido ou presencial`)
        if (!workplace.includes(value)) workplace.push(value)
      }
    }

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
    const url = buildSearchUrl(query, page, workplace)
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
