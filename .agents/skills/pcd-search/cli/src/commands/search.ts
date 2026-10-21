import { httpGet, renderSearch, withinJobAge, writeError, type JobResult } from "../helpers.js"
import { SEARCH_ACCEPT, pageUrl, parseSearch } from "../parse.js"
import { foldAccents } from "../helpers.js"

export interface SearchOpts {
  query: string | null // palavras que precisam estar todas no título; null = todas as vagas
  firstPage: number
  pages: number
  limit: number
  jobage: number
  format: "json" | "table" | "plain"
  includeDescription: boolean
  keep?: (row: JobResult) => boolean
}

function titleMatches(title: string, query: string): boolean {
  const t = foldAccents(title)
  return foldAccents(query).split(/\s+/).filter(Boolean).every((w) => t.includes(w))
}

/**
 * O portal ignora busca por texto: percorre `pages` páginas da lista (25 vagas
 * cada, uma requisição por página, em sequência) e filtra pelo título.
 */
export async function runSearch(opts: SearchOpts): Promise<number> {
  const rows: JobResult[] = []
  let read = 0
  try {
    for (let p = opts.firstPage; p < opts.firstPage + opts.pages; p++) {
      const body = await httpGet(pageUrl(p), SEARCH_ACCEPT)
      if (body === null) break
      const parsed = parseSearch(body)
      if (!parsed) {
        writeError("a página de vagas do PCD Online não trouxe os dados esperados (veja url-reference.md)", "SEARCH_FAILED")
        return 1
      }
      if (!parsed.rows.length) break
      read += parsed.rows.length
      rows.push(...parsed.rows.filter((r) => !opts.query || titleMatches(r.title, opts.query)))
    }
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
  let out = withinJobAge(rows, opts.jobage)
  if (opts.keep) out = out.filter(opts.keep)
  out = out.slice(0, opts.limit)
  if (!opts.includeDescription) out = out.map((r) => ({ ...r, description: null }))
  const text = renderSearch(out, opts.format, opts.firstPage, out.length)
  if (opts.format === "json") {
    const parsed = JSON.parse(text)
    parsed.meta.scanned = read
    process.stdout.write(JSON.stringify(parsed, null, 2) + "\n")
  } else {
    process.stdout.write(text + "\n")
  }
  return 0
}
