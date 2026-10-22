import { httpGet, renderSearch, titleMatches, withinJobAge, writeError, type JobResult } from "../helpers.js"
import { SEARCH_ACCEPT, pageUrl, parseSearch, roleSlug, type EmpregosResult } from "../parse.js"

export interface SearchOpts {
  query: string
  pages: number
  limit: number
  jobage: number // 9999 = sem filtro
  format: "json" | "table" | "plain"
  includeDescription: boolean
  keep?: (row: JobResult) => boolean
}

/**
 * Lê `pages` páginas da lista por cargo (20 vagas cada, em sequência) e filtra
 * pelo título: a página por cargo traz vagas "parecidas" quando o cargo não
 * existe no site. Para quando uma página vem vazia.
 */
export async function runSearch(opts: SearchOpts): Promise<number> {
  const slug = roleSlug(opts.query)
  const rows: EmpregosResult[] = []
  let scanned = 0
  let siteTotal: number | null = null
  try {
    for (let p = 1; p <= opts.pages; p++) {
      const body = await httpGet(pageUrl(slug, p), SEARCH_ACCEPT)
      if (body === null) break
      const page = parseSearch(body)
      if (!page) {
        writeError("a página de vagas da Empregos.com.br não trouxe os dados esperados (veja url-reference.md)", "SEARCH_FAILED")
        return 1
      }
      if (p === 1) siteTotal = page.total
      if (!page.rows.length) break
      scanned += page.rows.length
      rows.push(...page.rows.filter((r) => titleMatches(r.title, opts.query)))
    }
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }

  let out = withinJobAge(rows, opts.jobage)
  if (opts.keep) out = out.filter(opts.keep)
  out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  out = out.slice(0, opts.limit)
  if (!opts.includeDescription) out = out.map((r) => ({ ...r, description: null }))
  const text = renderSearch(out, opts.format, 1, out.length)
  if (opts.format === "json") {
    const parsed = JSON.parse(text)
    parsed.meta.scanned = scanned
    parsed.meta.site_total = siteTotal
    process.stdout.write(JSON.stringify(parsed, null, 2) + "\n")
  } else {
    process.stdout.write(text + "\n")
  }
  return 0
}
