#!/usr/bin/env bun
// CLI independente para buscar vagas na Michael Page Brasil (www.michaelpage.com.br).
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, foldAccents, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError, type JobResult } from "./helpers.js"
import { buildSearchUrl } from "./parse.js"

const PAGE_SIZE = 25

const HELP = `michaelpage-cli - busca vagas na Michael Page Brasil (www.michaelpage.com.br), consultoria
de recrutamento de média e alta gestão e especialistas

USO
  bun run src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
  bun run src/cli.ts detail <url> [--format json|plain]

BUSCA
  --query, -q <texto>     Cargo ou palavra-chave (obrigatório): vira /jobs/<termo>.
  --remote                Só vagas que dizem "remoto" ou "home office" no local ou no resumo
                          (filtro feito aqui; o portal não tem esse filtro).
  --page <n>              Página, começando em 1.
  --limit, -n <n>         Quantas vagas mostrar (1 a ${PAGE_SIZE}).
  --format <fmt>          json (padrão) | table | plain.
  --no-description        Omite resumo e destaques.

A busca traz título, local, tipo de contrato (Permanente, Temporário...), resumo e
destaques; não traz data nem empresa (a vaga é de um cliente, em geral confidencial).
O detalhe traz a data e a descrição completa.

DETALHE
  <url>                   https://www.michaelpage.com.br/job-detail/<slug>/ref/<ref>

EXEMPLOS
  bun run src/cli.ts search -q "product manager" --format table
  bun run src/cli.ts search -q "gerente de produto" --remote --format table
  bun run src/cli.ts detail "https://www.michaelpage.com.br/job-detail/product-manager-retail-experience/ref/jn-082026-7088330" --format plain

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
    if (flags.remote !== undefined && flags.remote !== true) return badArg("--remote não recebe valor")
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
    const keep = flags.remote ? (r: JobResult) => r.workplace_type === "remote" : undefined
    return runSearch({
      url: buildSearchUrl(query, page), page, limit, jobage, format: fmt as "json",
      includeDescription: flags["no-description"] === undefined, keep,
    })
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
