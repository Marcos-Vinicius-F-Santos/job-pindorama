import { httpGet, renderSearch, withinJobAge, writeError, type JobResult } from "../helpers.js"
import { SEARCH_ACCEPT, boardUrl, parseBoard, titleMatches, type GreenhouseResult } from "../parse.js"

export interface SearchOpts {
  query: string
  boards: string[]
  page: number
  limit: number
  jobage: number // 9999 = sem filtro
  format: "json" | "table" | "plain"
  includeDescription: boolean
  keep?: (row: JobResult) => boolean
}

/**
 * Percorre os boards em sequência (volume baixo: um pedido por empresa), junta
 * as vagas cujo título contém todas as palavras da busca e pagina do lado da
 * CLI. Um board que falha não derruba os outros: vira aviso no stderr e em
 * `meta.failed_boards`.
 */
export async function runSearch(opts: SearchOpts): Promise<number> {
  const rows: GreenhouseResult[] = []
  const failed: string[] = []
  for (const board of opts.boards) {
    try {
      const body = await httpGet(boardUrl(board, opts.includeDescription), SEARCH_ACCEPT)
      const jobs = body === null ? null : parseBoard(body, board)
      if (jobs === null) {
        failed.push(board)
        continue
      }
      rows.push(...jobs.filter((j) => titleMatches(j.title, opts.query)))
    } catch {
      failed.push(board)
    }
  }
  if (failed.length === opts.boards.length) {
    writeError(`nenhum board respondeu (${failed.join(", ")}); confira os identificadores em boards.txt`, "SEARCH_FAILED")
    return 1
  }
  if (failed.length) process.stderr.write(JSON.stringify({ warning: "boards sem resposta", boards: failed }) + "\n")

  let filtered = withinJobAge(rows, opts.jobage)
  if (opts.keep) filtered = filtered.filter(opts.keep)
  filtered.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  const total = filtered.length
  const pageRows = filtered.slice((opts.page - 1) * opts.limit, opts.page * opts.limit)
  const out = renderSearch(pageRows, opts.format, opts.page, total)
  if (opts.format === "json") {
    const parsed = JSON.parse(out)
    parsed.meta.boards = opts.boards.length
    parsed.meta.failed_boards = failed
    process.stdout.write(JSON.stringify(parsed, null, 2) + "\n")
  } else {
    process.stdout.write(out + "\n")
  }
  return 0
}
