// Leitura específica do GeekHunter (www.geekhunter.com), plataforma de vagas e
// recrutamento de tecnologia.
//
// - Busca: a página /pt/vagas?page=<n> (25 vagas por página), que traz as vagas
//   estruturadas no payload do Next.js (`self.__next_f.push`), num array
//   `"data":[{"__typename":"PublicJob",...}]`. Os parâmetros de busca por texto
//   são ignorados pelo portal: a CLI percorre algumas páginas e filtra pelo título.
// - Detalhe: a página /pt/<empresa>/jobs/<slug>: nome da empresa (`companyName`),
//   modelo e nível no payload; a descrição no bloco `id="job-details"` do HTML.
// robots.txt: /pt/vagas e as páginas de vaga liberados. Termos de uso: sem
// proibição de acesso automatizado.

import { cleanHtml, decodeHtmlEntities, formatSalary, type JobResult } from "./helpers.js"

export const BASE_URL = "https://www.geekhunter.com"
const HOST = new URL(BASE_URL).hostname
export const PAGE_SIZE = 25
export const SEARCH_ACCEPT = "text/html"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "passe a URL da vaga (https://www.geekhunter.com/pt/<empresa>/jobs/<slug>)"

const MODALITY: Record<string, JobResult["workplace_type"]> = {
  remote: "remote", "remote-in-city": "remote", hybrid: "hybrid", "on-site": "on-site", inPerson: "on-site",
}
const LEVEL: Record<string, string> = {
  intern: "Estágio", trainee: "Trainee", junior: "Júnior", mid: "Pleno", senior: "Sênior",
  specialist: "Especialista", lead: "Líder", principal: "Principal", manager: "Gestão",
}

export function pageUrl(page: number): string {
  return `${BASE_URL}/pt/vagas${page > 1 ? `?page=${page}` : ""}`
}

/** O texto que o Next.js empurra em pedaços (`self.__next_f.push([1,"..."])`), já juntado. */
export function nextPayload(html: string): string {
  let out = ""
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    try {
      out += JSON.parse(`"${m[1]}"`)
    } catch {
      // pedaço malformado: ignora
    }
  }
  return out
}

/** O valor JSON (objeto ou array) que começa no primeiro `{`/`[` a partir de `from`. */
export function balancedJson(text: string, from: number): unknown | null {
  const open = text.slice(from).search(/[[{]/)
  if (open < 0) return null
  const start = from + open
  let depth = 0
  let inStr = false
  for (let j = start; j < text.length; j++) {
    const c = text[j]
    if (inStr) {
      if (c === "\\") j++
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === "{" || c === "[") depth++
    else if (c === "}" || c === "]") {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, j + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

interface Salary {
  contractType?: string | null
  minSalary?: number | null
  maxSalary?: number | null
}

interface PublicJob {
  atsJob?: {
    jobSlug?: string
    publishedAt?: string
    company?: { slug?: string }
    atsJobDetail?: {
      title?: string
      description?: string
      experienceLevel?: string
      workModality?: string
      atsJobSalaries?: Salary[]
      atsJobSkills?: Array<{ atsSkill?: { name?: string } }>
      atsJobCities?: Array<{ name?: string; city?: { name?: string } }>
    }
  }
}

export interface GeekHunterResult extends JobResult {
  skills: string[]
}

/** "mv-saude-digital" -> "Mv Saude Digital": a busca só traz o identificador da empresa. */
function humanize(slug: string): string {
  return slug.replace(/-\d+$/, "").split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")
}

function msDate(ms: string | undefined): string | null {
  const n = Number(ms)
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString().slice(0, 10) : null
}

function salaryText(list: Salary[] | undefined): string | null {
  for (const s of list ?? []) {
    const v = formatSalary(s.minSalary ?? null, s.maxSalary ?? null)
    if (v) return v
  }
  return null
}

export function toResult(p: PublicJob): GeekHunterResult | null {
  const job = p.atsJob
  const d = job?.atsJobDetail
  const company = job?.company?.slug
  if (!job?.jobSlug || !company || !d?.title) return null
  const mode = MODALITY[d.workModality ?? ""] ?? null
  const contracts = [...new Set((d.atsJobSalaries ?? []).map((s) => s.contractType).filter(Boolean))]
  const city = (d.atsJobCities ?? []).map((c) => c.name ?? c.city?.name).filter(Boolean)[0] ?? null
  return {
    id: `${company}/${job.jobSlug}`,
    title: decodeHtmlEntities(d.title).replace(/\s+/g, " ").trim(),
    company: humanize(company),
    location: city ?? (mode === "remote" ? "Remoto" : null),
    date: msDate(job.publishedAt),
    url: `${BASE_URL}/pt/${company}/jobs/${job.jobSlug}`,
    deadline: null,
    contract: contracts.join(", ") || null,
    workplace_type: mode,
    seniority: LEVEL[d.experienceLevel ?? ""] ?? null,
    salary: salaryText(d.atsJobSalaries),
    description: d.description ? decodeHtmlEntities(d.description).trim() : null,
    skills: (d.atsJobSkills ?? []).map((s) => s.atsSkill?.name ?? "").filter(Boolean),
  }
}

export function parseSearch(html: string): { rows: GeekHunterResult[]; total: number | null } | null {
  const payload = nextPayload(html)
  const at = payload.indexOf('"data":[{"__typename":"PublicJob"')
  if (at < 0) return /Vagas de Tecnologia/.test(html) ? { rows: [], total: 0 } : null
  const list = balancedJson(payload, at + '"data":'.length)
  if (!Array.isArray(list)) return null
  return { rows: list.map((p) => toResult(p as PublicJob)).filter((r): r is GeekHunterResult => r !== null), total: null }
}

/** "<empresa>/<slug>" a partir da URL /pt/<empresa>/jobs/<slug>. */
export function parseRef(input: string): string | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return /^[a-z0-9-]+\/[a-z0-9-]+$/i.test(input.trim()) ? input.trim() : null
  }
  if (url.hostname.toLowerCase() !== HOST && url.hostname.toLowerCase() !== HOST.replace(/^www\./, "")) return null
  const m = /^\/(?:pt|en|es)\/([a-z0-9-]+)\/jobs\/([a-z0-9-]+)\/?$/i.exec(url.pathname)
  return m ? `${m[1]}/${m[2]}` : null
}

export function detailUrl(ref: string): string {
  const [company, slug] = ref.split("/")
  return `${BASE_URL}/pt/${company}/jobs/${slug}`
}

const field = (payload: string, name: string): string | null =>
  new RegExp(`"${name}":"((?:[^"\\\\]|\\\\.)*)"`).exec(payload)?.[1] ?? null

export function parseDetail(html: string, ref: string): GeekHunterResult | null {
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]
  if (!title) return null
  const full = nextPayload(html)
  // Os rótulos da interface também têm chaves "experienceLevel"/"workModality"
  // (com textos de tradução): lê só o objeto da vaga, que começa em "job":{
  // antes de "atsJobCities".
  const anchor = full.indexOf('"atsJobCities"')
  const jobStart = anchor > 0 ? full.lastIndexOf('"job":{', anchor) : -1
  const payload = jobStart >= 0 ? full.slice(jobStart, anchor + 4000) : full
  const decodedTitle = decodeHtmlEntities(title)
  const split = decodedTitle.lastIndexOf(" em ")
  const company = field(full, "companyName") ?? (split > 0 ? decodedTitle.slice(split + 4) : null)
  const at = html.indexOf('id="job-details"')
  if (at < 0) return null
  const end = html.indexOf("</main>", at)
  const mode = MODALITY[field(payload, "workModality") ?? ""] ?? null
  const hide = /"hideSalary":true/.test(payload)
  const salaries = balancedJson(payload, Math.max(0, payload.indexOf('"atsJobSalaries":') + '"atsJobSalaries":'.length))
  const contracts = [
    /"supportModalityCLT":true/.test(full) ? "CLT" : null,
    /"supportModalityPJ":true/.test(full) ? "PJ" : null,
  ].filter(Boolean)
  return {
    id: ref,
    title: split > 0 ? decodedTitle.slice(0, split) : decodedTitle,
    company,
    location: mode === "remote" ? "Remoto" : null,
    date: null,
    url: detailUrl(ref),
    deadline: null,
    contract: contracts.join(", ") || null,
    workplace_type: mode,
    seniority: LEVEL[field(payload, "experienceLevel") ?? ""] ?? null,
    salary: hide || !Array.isArray(salaries) ? null : salaryText(salaries as Salary[]),
    description: cleanHtml(html.slice(at, end > at ? end : at + 20000).replace(/^[^>]*>/, "")),
    skills: [],
  }
}
