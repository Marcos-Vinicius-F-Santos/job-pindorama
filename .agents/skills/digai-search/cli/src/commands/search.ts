import { httpGet, renderSearch, withinJobAge, writeError, type JobResult } from "../helpers.js"
import { SEARCH_ACCEPT, companyUrl, parseCompanyPage, titleMatches, type DigaiResult } from "../parse.js"

export interface SearchOpts {
  query: string
  companies: string[]
  remote: boolean
  page: number
  limit: number
  jobage: number // 9999 = sem filtro
  format: "json" | "table" | "plain"
  keep?: (row: JobResult) => boolean
}

// Empresas consultadas ao mesmo tempo: poucas, para não pesar no portal.
const CONCURRENCY = 3

/**
 * Consulta a página de carreira de cada empresa com o cargo no filtro do próprio
 * portal, junta as vagas e pagina do lado da CLI. Empresa que falha não derruba
 * as outras: vira aviso no stderr e em `meta.failed_companies`. Empresa com mais
 * vagas do que a página traz (12) vai para `meta.truncated`.
 */
export async function runSearch(opts: SearchOpts): Promise<number> {
  const rows: DigaiResult[] = []
  const failed: string[] = []
  const truncated: Array<{ company: string; total: number; shown: number }> = []
  const queue = [...opts.companies]

  async function worker(): Promise<void> {
    for (let company = queue.shift(); company !== undefined; company = queue.shift()) {
      try {
        const html = await httpGet(companyUrl(company, opts.query, opts.remote), SEARCH_ACCEPT)
        const page = html === null ? null : parseCompanyPage(html)
        if (page === null) {
          failed.push(company)
          continue
        }
        if (page.total > page.jobs.length) truncated.push({ company, total: page.total, shown: page.jobs.length })
        rows.push(...page.jobs.filter((j) => titleMatches(j.title, opts.query)))
      } catch {
        failed.push(company)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

  if (failed.length === opts.companies.length) {
    writeError(`nenhuma empresa respondeu (${failed.join(", ")}); confira os identificadores em companies.txt`, "SEARCH_FAILED")
    return 1
  }
  if (failed.length) process.stderr.write(JSON.stringify({ warning: "empresas sem resposta", companies: failed }) + "\n")
  if (truncated.length) {
    process.stderr.write(JSON.stringify({ warning: "empresas com mais vagas do que a página traz; refine o --query", companies: truncated }) + "\n")
  }

  let filtered = withinJobAge(rows, opts.jobage)
  if (opts.keep) filtered = filtered.filter(opts.keep)
  filtered.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  const total = filtered.length
  const pageRows = filtered.slice((opts.page - 1) * opts.limit, opts.page * opts.limit)
  const out = renderSearch(pageRows, opts.format, opts.page, total)
  if (opts.format === "json") {
    const parsed = JSON.parse(out)
    parsed.meta.companies = opts.companies.length
    parsed.meta.failed_companies = failed.sort()
    parsed.meta.truncated = truncated.sort((a, b) => a.company.localeCompare(b.company))
    process.stdout.write(JSON.stringify(parsed, null, 2) + "\n")
  } else {
    process.stdout.write(out + "\n")
  }
  return 0
}
