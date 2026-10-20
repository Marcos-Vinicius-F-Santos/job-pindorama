#!/usr/bin/env bun
// CLI independente para buscar vagas no Portal Gupy (portal.gupy.io).
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { CONTRACT_TYPES, UF_NAMES, WORKPLACE_TYPES, foldAccents, resolveState, writeError } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

// Apelidos curtos.
const ALIAS: Record<string, string> = { q: "query", l: "location", n: "limit" }

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("-")) {
      ;(flags._ as string[]).push(a)
      continue
    }
    const name = a.replace(/^-+/, "")
    const key = ALIAS[name] ?? name
    const next = argv[i + 1]
    let value: string | boolean = true
    if (next !== undefined && !next.startsWith("-")) {
      value = next
      i++
    }
    flags[key] = value
  }
  return flags
}

const HELP = `gupy-cli - busca vagas no Portal Gupy (portal.gupy.io), o maior ATS do Brasil

USO
  bun run src/cli.ts search -q "<cargo ou palavra-chave>" [filtros] [--format json|table|plain]
  bun run src/cli.ts detail <url-da-vaga> [--format json|plain]

BUSCA
  --query, -q <texto>     Cargo ou palavra-chave (obrigatório). Busca no título da vaga.
  --location, -l <cidade> Cidade, ex. "Recife" ou "São Paulo".
  --state <UF|nome>       Estado: sigla (SP) ou nome (São Paulo).
  --remote <modo>         remoto | hibrido | presencial (também remote|hybrid|onsite).
                          --remote sozinho = remoto. Um valor só: a Gupy ignora listas.
  --type <regime>         clt | pj | estagio | trainee | aprendiz | temporario | terceiro |
                          autonomo | freelancer | intermitente | associado | docente |
                          voluntario | banco-de-talentos | summer-job. Um valor só.
  --jobage <dias>         Só vagas publicadas nos últimos N dias (filtro feito aqui:
                          a Gupy não tem esse filtro; as vagas já vêm da mais nova).
  --page <n>              Página, começando em 1. Padrão 1.
  --limit, -n <n>         Vagas por página (1 a 100). Padrão 25.
  --format <fmt>          json (padrão) | table | plain.
  --no-description        Omite o resumo da descrição (saída mais enxuta).

DETALHE
  <url-da-vaga>           URL da vaga: https://<empresa>.gupy.io/jobs/<id> ou a forma
                          /job/<código> que o portal usa. Só o número não basta: a
                          página fica no subdomínio da empresa.

EXEMPLOS
  bun run src/cli.ts search -q "analista de dados" --state SP --format table
  bun run src/cli.ts search -q "desenvolvedor" --remote --type pj --jobage 7 --format table
  bun run src/cli.ts search -q "engenheiro" -l "Recife" --type clt --format table
  bun run src/cli.ts search -q "estágio" --type estagio --state MG --format table
  bun run src/cli.ts detail https://afya.gupy.io/jobs/12749301 --format plain

Fonte pública, sem login. Use com moderação: poucas buscas, nada de varredura em massa.
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set([
    "query", "location", "state", "remote", "type", "jobage", "page", "limit", "format",
    "no-description", "help", "h",
  ]),
  detail: new Set(["format", "help", "h"]),
}

function badArg(error: string): number {
  writeError(error, "BAD_ARG")
  return 1
}

/** Inteiro >= 1 (Number, não parseInt: "0.5" não pode virar 0 em silêncio). */
function parseIntFlag(name: string, raw: string | boolean | string[], max?: number): number | null {
  const val = typeof raw === "string" ? Number(raw.trim()) : NaN
  if (!Number.isInteger(val) || val < 1 || (max !== undefined && val > max)) {
    const range = max !== undefined ? `entre 1 e ${max}` : "de pelo menos 1"
    badArg(`--${name} precisa ser um número inteiro ${range}, recebi "${raw}"`)
    return null
  }
  return val
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  // Opção desconhecida é erro, nunca ignorada: um filtro descartado muda o
  // resultado da busca sem aviso.
  const known = KNOWN_FLAGS[cmd]
  if (known) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || known.has(key)) continue
      writeError(
        `opção desconhecida --${key} para '${cmd}': opções nunca são ignoradas em silêncio, porque um filtro descartado muda o resultado; veja --help`,
        "UNKNOWN_FLAG",
      )
      return 1
    }
  }

  if (cmd === "search") {
    // Opções que exigem valor: presente e vazia ampliaria a busca sem aviso.
    for (const name of ["query", "location", "state", "type"]) {
      const value = flags[name]
      if (value !== undefined && (typeof value !== "string" || !value.trim())) {
        return badArg(`--${name} precisa de um valor`)
      }
    }
    if (flags.query === undefined) {
      writeError("informe o cargo ou palavra-chave com --query/-q", "MISSING_QUERY")
      return 1
    }

    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)

    let state: string | undefined
    if (typeof flags.state === "string") {
      const resolved = resolveState(flags.state)
      if (!resolved) {
        return badArg(`--state "${flags.state}" não é um estado brasileiro; use a sigla (${Object.keys(UF_NAMES).join(", ")}) ou o nome`)
      }
      state = resolved
    }

    let workplaceType: string | undefined
    if (flags.remote !== undefined) {
      const raw = flags.remote === true ? "remoto" : String(flags.remote)
      if (raw.includes(",")) return badArg("--remote aceita um valor só: a Gupy ignora listas e devolveria a busca sem filtro")
      workplaceType = WORKPLACE_TYPES[foldAccents(raw)]
      if (!workplaceType) return badArg(`--remote deve ser remoto|hibrido|presencial, recebi "${raw}"`)
    }

    let contractType: string | undefined
    if (typeof flags.type === "string") {
      if (flags.type.includes(",")) return badArg("--type aceita um valor só: a Gupy ignora listas e devolveria a busca sem filtro")
      contractType = CONTRACT_TYPES[foldAccents(flags.type).replace(/\s+/g, "-")]
      if (!contractType) return badArg(`--type "${flags.type}" desconhecido; use um de: ${Object.keys(CONTRACT_TYPES).join(", ")}`)
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

    const opts: SearchOpts = {
      query: String(flags.query).trim(),
      city: typeof flags.location === "string" ? flags.location.trim() : undefined,
      state,
      workplaceType,
      contractType,
      jobage,
      page,
      limit,
      format: fmt as SearchOpts["format"],
      includeDescription: flags["no-description"] === undefined,
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      writeError("detail precisa da URL da vaga", "NO_ID")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "plain"].includes(fmt)) return badArg(`--format deve ser json|plain, recebi "${fmt}"`)
    const opts: DetailOpts = { id, format: fmt as DetailOpts["format"] }
    return runDetail(opts)
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
