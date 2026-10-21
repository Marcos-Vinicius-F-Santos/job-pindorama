#!/usr/bin/env bun
// CLI independente para buscar vagas nas páginas de carreira do DigAÍ.
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { join } from "path"
import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError } from "./helpers.js"
import { parseCompaniesFile } from "./parse.js"

const COMPANIES_FILE = join(import.meta.dir, "..", "..", "companies.txt")

const HELP = `digai-cli - busca vagas nas páginas de carreira do DigAÍ (recrutamento com entrevista por IA)

USO
  bun run src/cli.ts search -q "<palavras do cargo>" [opções] [--format json|table|plain]
  bun run src/cli.ts detail <url|id> [--format json|plain]

BUSCA
  --query, -q <texto>     Cargo; todas as palavras precisam estar no título (obrigatório).
  --companies <lista>     Empresas a consultar, separadas por vírgula (o subdomínio:
                          <empresa>.digai.ai). Padrão: a lista de companies.txt, ao lado
                          do SKILL.md.
  --remote                Só vagas remotas (filtro do próprio portal).
  --jobage <dias>         Só vagas publicadas nos últimos N dias.
  --page <n>              Página, começando em 1.
  --limit, -n <n>         Vagas por página (1 a 100). Padrão 25.
  --format <fmt>          json (padrão) | table | plain.

DETALHE
  <url|id>                https://jobs.digai.ai/<id> ou só o id.

EXEMPLOS
  bun run src/cli.ts search -q "produto" --format table
  bun run src/cli.ts search -q "analista dados" --companies raizen,localiza --format table
  bun run src/cli.ts detail https://jobs.digai.ai/87124eb1-2e60-4d43-b045-3f4a3d51195e --format plain

Um pedido por empresa por busca: use com moderação e deixe no companies.txt só as que interessam.
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "companies", "remote", "jobage", "page", "limit", "format", "help", "h"]),
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
    if (rejectEmpty(flags, ["query", "companies"])) return 1
    if (flags.query === undefined) {
      writeError("informe o cargo com --query/-q", "MISSING_QUERY")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)
    if (flags.remote !== undefined && flags.remote !== true) return badArg("--remote não recebe valor")

    let companies: string[]
    if (typeof flags.companies === "string") {
      companies = parseCompaniesFile(flags.companies.split(",").join("\n"))
      if (!companies.length) return badArg("--companies precisa de identificadores (letras, números e -)")
    } else {
      try {
        companies = parseCompaniesFile(await Bun.file(COMPANIES_FILE).text())
      } catch {
        writeError("companies.txt não encontrado; passe --companies", "NO_COMPANIES")
        return 1
      }
      if (!companies.length) {
        writeError("companies.txt está vazio; acrescente identificadores ou passe --companies", "NO_COMPANIES")
        return 1
      }
    }

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
      const v = parseIntFlag("limit", flags.limit, 100)
      if (v === null) return 1
      limit = v
    }
    return runSearch({
      query: String(flags.query).trim(), companies, remote: flags.remote === true, page, limit, jobage, format: fmt as "json",
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
