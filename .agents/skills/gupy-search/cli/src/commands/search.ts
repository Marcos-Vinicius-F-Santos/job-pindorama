import {
  PORTAL_URL,
  SEARCH_PATH,
  httpGet,
  toResult,
  writeError,
  type GupySearchResponse,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query: string
  city?: string
  state?: string // nome completo, já resolvido a partir da UF
  workplaceType?: string // remote | hybrid | on-site
  contractType?: string // código vacancy_* da Gupy
  jobage: number // 9999 = sem filtro
  page: number
  limit: number
  format: "json" | "table" | "plain"
  includeDescription: boolean
}

// A API aceita no máximo um valor por filtro: repetir `type` ou `workplaceType`
// é ignorado em silêncio (a busca volta sem filtro nenhum). Por isso cada opção
// aqui é um valor só, e a validação de vírgulas fica em cli.ts.
export function buildQuery(opts: SearchOpts): URLSearchParams {
  const p = new URLSearchParams()
  p.set("jobName", opts.query)
  p.set("limit", String(opts.limit))
  p.set("offset", String((opts.page - 1) * opts.limit))
  if (opts.city) p.set("city", opts.city)
  if (opts.state) p.set("state", opts.state)
  if (opts.workplaceType) p.set("workplaceType", opts.workplaceType)
  if (opts.contractType) p.set("type", opts.contractType)
  return p
}

/**
 * A Gupy não tem filtro de data de publicação. A busca já vem da mais nova
 * para a mais antiga, então --jobage filtra do lado do cliente: descarta o que
 * for mais antigo que N dias. Vagas sem data são mantidas (sem data não é velha).
 */
export function withinJobAge(rows: JobResult[], jobage: number, now = new Date()): JobResult[] {
  if (!(jobage > 0) || jobage >= 9999) return rows
  const cutoff = new Date(now.getTime() - jobage * 86_400_000).toISOString().slice(0, 10)
  return rows.filter((r) => r.date === null || r.date >= cutoff)
}

function cell(text: string | null, width: number): string {
  return (text ?? "—").slice(0, width).padEnd(width)
}

/** "CLT (efetivo)" -> "CLT", "PJ (pessoa jurídica)" -> "PJ": cabe na coluna da tabela. */
function shortContract(label: string | null): string | null {
  return label ? label.replace(/\s*\(.*\)$/, "") : null
}

function renderTable(rows: JobResult[]): string {
  if (rows.length === 0) return "Nenhuma vaga encontrada."
  const idWidth = Math.max(2, ...rows.map((r) => r.id.length))
  const header = [cell("ID", idWidth), cell("VAGA", 40), cell("EMPRESA", 22), cell("LOCAL", 24), cell("REGIME", 14), cell("DATA", 10)].join("  ")
  const body = rows.map((r) =>
    [cell(r.id, idWidth), cell(r.title, 40), cell(r.company, 22), cell(r.location, 24), cell(shortContract(r.contract), 14), cell(r.date, 10)].join("  "),
  )
  return [header, "-".repeat(header.length), ...body].join("\n")
}

function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "Nenhuma vaga encontrada."
  return rows
    .map((r) =>
      [
        r.title,
        `  ${r.company ?? "—"} · ${r.location ?? "—"} · ${r.contract ?? "—"} · ${r.date ?? "—"}`,
        r.deadline ? `  inscrições até: ${r.deadline}` : "",
        `  ${r.url ?? "(sem URL)"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const body = await httpGet(`${PORTAL_URL}${SEARCH_PATH}?${buildQuery(opts).toString()}`, "application/json")
    // Um 404 aqui é a rota que mudou, não "nenhuma vaga": dizer isso como lista
    // vazia esconderia a quebra atrás de um resultado plausível.
    if (body === null) {
      writeError(`${SEARCH_PATH} não encontrado: a Gupy mudou a rota de busca (veja url-reference.md)`, "SEARCH_FAILED")
      return 1
    }
    let parsed: GupySearchResponse
    try {
      parsed = JSON.parse(body) as GupySearchResponse
    } catch {
      writeError("a Gupy devolveu uma resposta que não é JSON (a rota de busca pode ter mudado)", "SEARCH_FAILED")
      return 1
    }
    if (!Array.isArray(parsed?.data)) {
      writeError("resposta da Gupy sem a lista `data` (o formato pode ter mudado)", "SEARCH_FAILED")
      return 1
    }

    let rows = withinJobAge(parsed.data.map(toResult), opts.jobage)
    if (!opts.includeDescription) rows = rows.map((r) => ({ ...r, description: null }))

    if (opts.format === "table") {
      process.stdout.write(renderTable(rows) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(rows) + "\n")
    } else {
      const total = parsed.pagination?.total ?? rows.length
      process.stdout.write(
        JSON.stringify({ meta: { count: rows.length, page: opts.page, total }, results: rows }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
