#!/usr/bin/env bun
// CLI independente para buscar vagas na Remotar (remotar.com.br), só vagas remotas.
// Sem framework de CLI e sem dependências de execução: roda só com `bun`.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { badArg, foldAccents, parseFlags, parseIntFlag, rejectEmpty, rejectUnknown, writeError, type JobResult } from "./helpers.js"
import { CATEGORIES, PAGE_SIZE, buildSearchUrl, type RemotarResult } from "./parse.js"

const HELP = `remotar-cli - busca vagas na Remotar (remotar.com.br), portal brasileiro só de vagas remotas

USO PESSOAL: os termos de uso da Remotar proíbem acesso automatizado. Use para a sua
própria busca, com poucas consultas; nada de varredura, uso comercial ou em massa.

USO
  bun run src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
  bun run src/cli.ts detail <id|url> [--format json|plain]

BUSCA
  --query, -q <texto>     Cargo ou palavra-chave (obrigatório). A Remotar casa palavras do
                          título e da descrição: a busca é ampla.
  --category <área>       Categoria do portal (recomendado: deixa a busca precisa). Uma de:
                          produto, programacao, mobile, dados, design, ux, qa, devops,
                          sysadmin, marketing, vendas, rh, educacao, juridico, comunicacao,
                          conteudo, midia, motion-design, atendimento, administrativo, outros.
  --no-international      Tira as vagas de empresas de fora do Brasil ("Vaga internacional").
  --jobage <dias>         Só vagas publicadas nos últimos N dias (filtro feito aqui).
  --page <n>              Página, começando em 1 (${PAGE_SIZE} vagas por página no portal).
  --limit, -n <n>         Quantas vagas da página mostrar (1 a ${PAGE_SIZE}). Padrão ${PAGE_SIZE}.
  --format <fmt>          json (padrão) | table | plain.
  --no-description        Omite a descrição (saída mais enxuta).

Todas as vagas são remotas. O campo "international" marca as de empresas de fora do
Brasil (etiqueta "Vaga internacional" do portal), em geral em inglês ou dólar.

DETALHE
  <id|url>                O id da busca ou https://remotar.com.br/job/<id>/...

EXEMPLOS
  bun run src/cli.ts search -q "product manager" --category produto --jobage 14 --format table
  bun run src/cli.ts search -q "designer" --category design --no-international --format table
  bun run src/cli.ts search -q "analista de dados" --format table
  bun run src/cli.ts detail 167173 --format plain
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "category", "no-international", "jobage", "page", "limit", "format", "no-description", "help", "h"]),
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
    if (rejectEmpty(flags, ["query", "category"])) return 1
    if (flags.query === undefined) {
      writeError("informe o cargo ou palavra-chave com --query/-q", "MISSING_QUERY")
      return 1
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format deve ser json|table|plain, recebi "${fmt}"`)
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
    let categoryId: number | undefined
    if (typeof flags.category === "string") {
      categoryId = CATEGORIES[foldAccents(flags.category).replace(/\s+/g, "-")]
      if (categoryId === undefined) return badArg(`--category "${flags.category}" desconhecida; veja a lista em --help`)
    }
    const keep = flags["no-international"] !== undefined ? (r: JobResult) => !(r as RemotarResult).international : undefined
    const url = buildSearchUrl(String(flags.query).trim(), page, categoryId)
    return runSearch({ url, page, limit, jobage, format: fmt as "json", includeDescription: flags["no-description"] === undefined, keep })
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
