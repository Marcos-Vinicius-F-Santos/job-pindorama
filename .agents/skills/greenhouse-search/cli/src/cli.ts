#!/usr/bin/env bun
// CLI independente para buscar vagas nos boards públicos do Greenhouse.
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { join } from "path"
import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError, type JobResult } from "./helpers.js"
import { parseBoardsFile } from "./parse.js"

const BOARDS_FILE = join(import.meta.dir, "..", "..", "boards.txt")

const HELP = `greenhouse-cli - busca vagas nos boards públicos do Greenhouse (ATS de empresas de tecnologia)

USO
  bun run src/cli.ts search -q "<palavras do título>" [opções] [--format json|table|plain]
  bun run src/cli.ts detail <url|empresa/id> [--format json|plain]

BUSCA
  --query, -q <texto>     Palavras que precisam estar todas no título (obrigatório).
  --boards <lista>        Empresas a consultar, separadas por vírgula (identificador do
                          board: job-boards.greenhouse.io/<identificador>). Padrão: a lista
                          de boards.txt, ao lado do SKILL.md.
  --remote                Só vagas com local remoto ("Remote", "Remoto").
  --with-description      Traz a descrição completa (respostas bem maiores).
  --jobage <dias>         Só vagas publicadas nos últimos N dias.
  --page <n>              Página, começando em 1.
  --limit, -n <n>         Vagas por página (1 a 100). Padrão 25.
  --format <fmt>          json (padrão) | table | plain.

DETALHE
  <url|empresa/id>        https://job-boards.greenhouse.io/<empresa>/jobs/<id> ou <empresa>/<id>.

EXEMPLOS
  bun run src/cli.ts search -q "product manager" --format table
  bun run src/cli.ts search -q "dados" --boards stone,quintoandar --jobage 14 --format table
  bun run src/cli.ts detail quintoandar/4433716009 --format plain

API pública e documentada do Greenhouse. Um pedido por empresa por busca: use com moderação.
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "boards", "remote", "with-description", "jobage", "page", "limit", "format", "help", "h"]),
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
    if (rejectEmpty(flags, ["query", "boards"])) return 1
    if (flags.query === undefined) {
      writeError("informe as palavras do título com --query/-q", "MISSING_QUERY")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)
    if (flags.remote !== undefined && flags.remote !== true) return badArg("--remote não recebe valor")

    let boards: string[]
    if (typeof flags.boards === "string") {
      boards = parseBoardsFile(flags.boards.split(",").join("\n"))
      if (!boards.length) return badArg("--boards precisa de identificadores (letras, números, - e _)")
    } else {
      try {
        boards = parseBoardsFile(await Bun.file(BOARDS_FILE).text())
      } catch {
        writeError("boards.txt não encontrado; passe --boards", "NO_BOARDS")
        return 1
      }
      if (!boards.length) {
        writeError("boards.txt está vazio; acrescente identificadores ou passe --boards", "NO_BOARDS")
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
    const keep = flags.remote ? (r: JobResult) => r.workplace_type === "remote" : undefined
    return runSearch({
      query: String(flags.query).trim(), boards, page, limit, jobage, format: fmt as "json",
      includeDescription: flags["with-description"] !== undefined, keep,
    })
  }

  if (cmd === "detail") {
    const id = flags._[1]
    if (!id) {
      writeError("detail precisa da URL da vaga ou de empresa/id", "NO_ID")
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
