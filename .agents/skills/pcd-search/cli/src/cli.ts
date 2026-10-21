#!/usr/bin/env bun
// CLI independente para buscar vagas para pessoas com deficiência no PCD Online (www.pcd.com.br).
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError, type JobResult } from "./helpers.js"

const HELP = `pcd-cli - busca vagas para pessoas com deficiência no PCD Online (www.pcd.com.br)

USO PESSOAL: os termos de uso do PCD Online proíbem robôs e scrapers. Use para a sua
própria busca, com poucas consultas; nada de varredura, uso comercial ou em massa.
Todas as vagas do portal são exclusivas para pessoas com deficiência.

USO
  bun run src/cli.ts search -q "<palavras do título>" [filtros] [--format json|table|plain]
  bun run src/cli.ts detail <url> [--format json|plain]

BUSCA
  --query, -q <texto>     Palavras que precisam estar todas no título (obrigatório). A
                          página do portal não filtra por texto: a CLI lê a lista (da vaga
                          mais nova para a mais antiga) e filtra aqui.
  --pages <n>             Quantas páginas da lista ler (30 vagas cada; 1 a 10). Padrão 4.
  --page <n>              Página inicial, começando em 1.
  --remote                Só vagas remotas.
  --jobage <dias>         Só vagas publicadas nos últimos N dias.
  --limit, -n <n>         Quantas vagas mostrar (1 a 100). Padrão 25.
  --format <fmt>          json (padrão) | table | plain.
  --no-description        Omite a descrição.

EXEMPLOS
  bun run src/cli.ts search -q "analista" --remote --format table
  bun run src/cli.ts search -q "dados" --pages 8 --format table
  bun run src/cli.ts detail "https://www.pcd.com.br/emprego-pcd/cientista-de-dados-sr-pcd-em-todo-brasil-sp/69830" --format plain
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "pages", "page", "remote", "jobage", "limit", "format", "no-description", "help", "h"]),
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
      writeError("informe as palavras do título com --query/-q", "MISSING_QUERY")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)
    if (flags.remote !== undefined && flags.remote !== true) return badArg("--remote não recebe valor")
    const nums: Record<string, number> = { pages: 4, page: 1, limit: 25, jobage: 9999 }
    const max: Record<string, number | undefined> = { pages: 10, limit: 100 }
    for (const name of Object.keys(nums)) {
      if (flags[name] === undefined) continue
      const v = parseIntFlag(name, flags[name], max[name])
      if (v === null) return 1
      nums[name] = v
    }
    const keep = flags.remote ? (r: JobResult) => r.workplace_type === "remote" : undefined
    return runSearch({
      query: String(flags.query).trim(), firstPage: nums.page, pages: nums.pages, limit: nums.limit,
      jobage: nums.jobage, format: fmt as "json", includeDescription: flags["no-description"] === undefined, keep,
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
