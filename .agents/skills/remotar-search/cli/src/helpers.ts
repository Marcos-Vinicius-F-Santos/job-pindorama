// Base comum das CLIs de portal: coleta com espera progressiva, gravação de
// erros, limpeza de HTML, leitura do bloco JobPosting (schema.org), filtro de
// data e saídas em tabela/texto. Igual nas CLIs de portal brasileiras deste
// repositório (gupy-search à parte); o que muda por portal fica em parse.ts.
//
// Zero dependências de execução: bun + fetch + regex.

export const PORTAL = "a Remotar"

// User-Agent honesto, que diz o nome da ferramenta (convenção de todas as CLIs
// de portal deste repositório): nunca se passa por um navegador. Sem URL de
// contato de propósito: toda URL literal nos fontes conta como host do portal na
// checagem de procedência do /apply (tests/test_apply_host_check.py).
const UA = "Mozilla/5.0 (compatible; remotar-cli/1.0)"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

// Teto do tempo total de espera entre tentativas de um mesmo pedido.
const RETRY_BUDGET_MS = 30_000

/** Espera pedida por `Retry-After` (segundos ou data HTTP), em ms; null se ausente. */
export function retryAfterMs(header: string | null, now = Date.now()): number | null {
  if (!header) return null
  const value = header.trim()
  if (/^\d+$/.test(value)) return Number(value) * 1000
  const date = Date.parse(value)
  if (Number.isNaN(date)) return null
  return Math.max(date - now, 0)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * GET com espera progressiva e variação aleatória em 429/5xx (até 6 novas
 * tentativas, dentro de RETRY_BUDGET_MS). Devolve `null` em 404. Falha de
 * conexão falha rápido, sem nova tentativa, para uma queda do portal não travar
 * o /scrape.
 */
export async function httpGet(url: string, accept: string): Promise<string | null> {
  const maxRetries = 6
  let delay = 500
  let waited = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "pt-BR,pt;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      })
    } catch (e) {
      throw new Error(`não foi possível acessar ${PORTAL} (${e instanceof Error ? e.message : String(e)})`)
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`${PORTAL} recusou o pedido: ${response.status} ${response.statusText}`)
      }
      const backoff = delay + Math.floor(Math.random() * 500)
      const wait = Math.max(backoff, retryAfterMs(response.headers.get("Retry-After")) ?? 0)
      if (waited + wait > RETRY_BUDGET_MS) {
        throw new Error(
          `${PORTAL} recusou o pedido: ${response.status} ${response.statusText}; ` +
            `pediu ${Math.ceil(wait / 1000)}s de espera, além do limite de ${RETRY_BUDGET_MS / 1000}s desta CLI`,
        )
      }
      await sleep(wait)
      waited += wait
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`${PORTAL} recusou o pedido: ${response.status} ${response.statusText}`)
    return await response.text()
  }
  throw new Error(`${PORTAL} recusou o pedido depois de todas as tentativas`)
}

// ---------------------------------------------------------------------------
// Formato do contrato
// ---------------------------------------------------------------------------

/**
 * Resultado no formato do contrato de portais: `id`, `title`, `company`,
 * `location`, `date` (AAAA-MM-DD) e `url`, com `null` quando faltar - nunca
 * omitidos. Os demais campos são extras permitidos.
 */
export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string | null
  deadline: string | null
  contract: string | null
  workplace_type: "remote" | "hybrid" | "on-site" | null
  seniority: string | null
  salary: string | null
  description: string | null
}

export const WORKPLACE_LABELS: Record<string, string> = { remote: "Remoto", hybrid: "Híbrido", "on-site": "Presencial" }

/** A parte AAAA-MM-DD de um carimbo ISO, ou null. */
export function contractDate(value: string | null | undefined): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? "").trim())
  return m ? m[1] : null
}

/** "20/10/2026" -> "2026-10-20"; null se não for uma data assim. */
export function brDate(value: string | null | undefined): string | null {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(value ?? "")
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

/** "Hoje", "Ontem", "Há 5 dias", "20/10/2026" -> AAAA-MM-DD (null se não reconhecer). */
export function relativeDate(text: string | null | undefined, now = new Date()): string | null {
  const t = foldAccents(text ?? "")
  const shift = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10)
  if (!t) return null
  if (/\bhoje\b|\bhora|\bminuto/.test(t)) return shift(0)
  if (/\bontem\b/.test(t)) return shift(1)
  const days = /ha\s+(\d+)\s+dias?/.exec(t)
  if (days) return shift(Number(days[1]))
  return brDate(t)
}

/** Minúsculas e sem acento, para comparar o que a pessoa digita. */
export function foldAccents(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

/**
 * Todas as palavras da busca aparecem no título, sem acento nem caixa, cada uma
 * no começo de uma palavra: "ia" casa com "IA" e "Analista de IA", mas não com
 * "Assistência"; "produto" casa com "Produtos".
 */
export function titleMatches(title: string, query: string): boolean {
  const t = foldAccents(title)
  return foldAccents(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t))
}

/** "R$ 15.000,00" para um número; faixa "R$ X a R$ Y"; null sem valores. */
export function formatSalary(min: number | null | undefined, max: number | null | undefined): string | null {
  const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const lo = typeof min === "number" && min > 0 ? min : null
  const hi = typeof max === "number" && max > 0 ? max : null
  if (lo && hi && lo !== hi) return `${fmt(lo)} a ${fmt(hi)}`
  if (lo || hi) return fmt((lo ?? hi) as number)
  return null
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
}

/** Texto de uma linha: sem tags, entidades decodificadas, espaços dobrados. */
/**
 * Tags trocadas por espaço deixam "backlog , colaborando" quando a pontuação
 * vinha colada ao fim do negrito (`<strong>backlog</strong>,`): tira o espaço
 * antes de pontuação e logo depois de parêntese ou colchete aberto.
 */
export function tidyPunctuation(text: string): string {
  return text.replace(/[ \t]+([,.;:!?)\]])/g, "$1").replace(/([(\[])[ \t]+/g, "$1")
}

export function inlineText(html: string | null | undefined): string | null {
  if (!html) return null
  const text = tidyPunctuation(decodeHtmlEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ")).trim()
  return text || null
}

/** HTML -> texto legível: blocos viram quebras de linha, tags somem, entidades decodificadas. */
export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+- /g, "\n- ")
    .replace(/^- \n/gm, "")
  return tidyPunctuation(text).trim() || null
}

// ---------------------------------------------------------------------------
// JobPosting (schema.org) - o bloco que páginas de vaga publicam para buscadores
// ---------------------------------------------------------------------------

export interface JobPostingLD {
  title?: string
  description?: string
  datePosted?: string
  validThrough?: string
  employmentType?: string | string[]
  jobLocationType?: string
  identifier?: { value?: string | number }
  hiringOrganization?: { name?: string }
  jobLocation?: { address?: { addressLocality?: string; addressRegion?: string } } | Array<{ address?: { addressLocality?: string; addressRegion?: string } }>
  baseSalary?: { value?: { minValue?: number; maxValue?: number; value?: number } }
}

/** O primeiro bloco <script type="application/ld+json"> de @type JobPosting, ou null. */
export function readJobPosting(html: string): JobPostingLD | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const m of html.matchAll(re)) {
    let data: unknown
    try {
      data = JSON.parse(m[1])
    } catch {
      // Páginas reais deixam quebras de linha cruas dentro das strings (JSON
      // inválido): troca os caracteres de controle por espaço e tenta de novo.
      try {
        data = JSON.parse(m[1].replace(/[\u0000-\u001f]/g, " "))
      } catch {
        continue
      }
    }
    const graph = (data as { "@graph"?: unknown[] } | null)?.["@graph"]
    const items = Array.isArray(data) ? data : Array.isArray(graph) ? graph : [data]
    for (const item of items) {
      if (item && typeof item === "object" && (item as { "@type"?: string })["@type"] === "JobPosting") {
        return item as JobPostingLD
      }
    }
  }
  return null
}

/** "Cidade, UF" a partir do jobLocation do JobPosting. */
export function ldLocation(ld: JobPostingLD): string | null {
  const loc = Array.isArray(ld.jobLocation) ? ld.jobLocation[0] : ld.jobLocation
  const city = loc?.address?.addressLocality?.trim()
  const uf = loc?.address?.addressRegion?.trim()
  const place = [city && !/n[ãa]o informad/i.test(city) ? city : null, uf || null].filter(Boolean).join(", ")
  return place || null
}

// ---------------------------------------------------------------------------
// Busca: data, saídas
// ---------------------------------------------------------------------------

/** Descarta o que for mais antigo que N dias; vagas sem data ficam (sem data não é velha). */
export function withinJobAge(rows: JobResult[], jobage: number, now = new Date()): JobResult[] {
  if (!(jobage > 0) || jobage >= 9999) return rows
  const cutoff = new Date(now.getTime() - jobage * 86_400_000).toISOString().slice(0, 10)
  return rows.filter((r) => r.date === null || r.date >= cutoff)
}

function cell(text: string | null, width: number): string {
  return (text ?? "—").slice(0, width).padEnd(width)
}

export function renderTable(rows: JobResult[]): string {
  if (rows.length === 0) return "Nenhuma vaga encontrada."
  const idWidth = Math.max(2, ...rows.map((r) => r.id.length))
  const header = [cell("ID", idWidth), cell("VAGA", 40), cell("EMPRESA", 22), cell("LOCAL", 24), cell("REGIME", 12), cell("DATA", 10)].join("  ")
  const body = rows.map((r) =>
    [cell(r.id, idWidth), cell(r.title, 40), cell(r.company, 22), cell(r.location, 24), cell(r.contract, 12), cell(r.date, 10)].join("  "),
  )
  return [header, "-".repeat(header.length), ...body].join("\n")
}

export function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "Nenhuma vaga encontrada."
  return rows
    .map((r) =>
      [
        r.title,
        `  ${r.company ?? "—"} · ${r.location ?? "—"} · ${r.contract ?? "—"} · ${r.date ?? "—"}`,
        r.salary ? `  salário: ${r.salary}` : "",
        r.deadline ? `  inscrições até: ${r.deadline}` : "",
        `  ${r.url ?? "(sem URL)"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n")
}

export function renderSearch(rows: JobResult[], format: string, page: number, total: number | null): string {
  if (format === "table") return renderTable(rows)
  if (format === "plain") return renderPlain(rows)
  return JSON.stringify({ meta: { count: rows.length, page, total: total ?? rows.length }, results: rows }, null, 2)
}

/** Detalhe em texto: cabeçalho com os campos conhecidos, depois a descrição. */
export function renderDetailPlain(job: JobResult): string {
  const lines: string[] = [job.title, `${job.company ?? "—"} · ${job.location ?? "—"}`]
  const field = (label: string, value: string | null) => {
    if (value) lines.push(`${label}: ${value}`)
  }
  field("Publicada em", job.date)
  field("Inscrições até", job.deadline)
  field("Regime", job.contract)
  field("Modelo de trabalho", job.workplace_type ? WORKPLACE_LABELS[job.workplace_type] : null)
  field("Senioridade", job.seniority)
  field("Salário", job.salary)
  if (job.description) lines.push("", "## Descrição", job.description)
  lines.push("", `URL: ${job.url}`)
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Opções de linha de comando
// ---------------------------------------------------------------------------

export interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

export function parseFlags(argv: string[], alias: Record<string, string>): Flags {
  const flags: Flags = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("-")) {
      ;(flags._ as string[]).push(a)
      continue
    }
    const name = a.replace(/^-+/, "")
    const key = alias[name] ?? name
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

export function badArg(error: string): number {
  writeError(error, "BAD_ARG")
  return 1
}

/** Inteiro >= 1 (Number, não parseInt: "0.5" não pode virar 0 em silêncio). */
export function parseIntFlag(name: string, raw: string | boolean | string[], max?: number): number | null {
  const val = typeof raw === "string" ? Number(raw.trim()) : NaN
  if (!Number.isInteger(val) || val < 1 || (max !== undefined && val > max)) {
    const range = max !== undefined ? `entre 1 e ${max}` : "de pelo menos 1"
    badArg(`--${name} precisa ser um número inteiro ${range}, recebi "${raw}"`)
    return null
  }
  return val
}

/** Opção desconhecida é erro, nunca ignorada: um filtro descartado muda o resultado sem aviso. */
export function rejectUnknown(flags: Flags, cmd: string, known: Set<string>): boolean {
  for (const key of Object.keys(flags)) {
    if (key === "_" || known.has(key)) continue
    writeError(
      `opção desconhecida --${key} para '${cmd}': opções nunca são ignoradas em silêncio, porque um filtro descartado muda o resultado; veja --help`,
      "UNKNOWN_FLAG",
    )
    return true
  }
  return false
}

/** Opções que exigem valor: presente e vazia ampliaria a busca sem aviso. */
export function rejectEmpty(flags: Flags, names: string[]): boolean {
  for (const name of names) {
    const value = flags[name]
    if (value !== undefined && (typeof value !== "string" || !value.trim())) {
      badArg(`--${name} precisa de um valor`)
      return true
    }
  }
  return false
}
