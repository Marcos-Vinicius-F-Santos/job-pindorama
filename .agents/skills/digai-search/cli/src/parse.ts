// Leitura específica do DigAÍ, plataforma de recrutamento com entrevista por IA.
//
// - A busca da página inicial (jobs.digai.ai) é montada no navegador por uma API
//   não documentada; a CLI não usa essa API. Usa as páginas de carreira de cada
//   empresa (<empresa>.digai.ai/pt-BR), que o robots.txt libera e que já vêm do
//   servidor com as vagas, filtradas pelo cargo com ?title= (e ?workModel=).
// - As vagas vêm no payload do Next.js (self.__next_f.push), no objeto
//   "initialJobs": { items, total, page }. O servidor manda só a 1ª página (12
//   vagas); a CLI informa quando a empresa tem mais vagas do que as que vieram.
// - Detalhe: jobs.digai.ai/<id>, com o bloco JobPosting (descrição) e o objeto
//   "initialJob" (modelo de trabalho, senioridade, PcD, seleção interna).

import { cleanHtml, contractDate, formatSalary, readJobPosting, type JobResult } from "./helpers.js"

export const JOBS_HOST = "https://jobs.digai.ai"
export const SEARCH_ACCEPT = "text/html"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "passe a URL da vaga (jobs.digai.ai/<id>) ou o id"

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export const WORK_MODELS: Record<string, JobResult["workplace_type"]> = { REMOTE: "remote", HYBRID: "hybrid", ON_SITE: "on-site" }

// Rótulos que o próprio DigAÍ mostra no filtro de senioridade.
export const LEVELS: Record<string, string> = {
  NO_EXPERIENCE: "Sem experiência",
  ENTRY_LEVEL: "Estágio / trainee",
  JUNIOR: "Júnior",
  MID_LEVEL: "Pleno",
  SENIOR_AND_SPECIALIST: "Sênior / Especialista",
  COORDINATOR_AND_SUPERVISOR: "Coordenação / Supervisão",
  MANAGER: "Gerência",
  HEAD_AND_DIRECTOR: "Head / Diretoria",
  EXECUTIVE_DIRECTOR_AND_VP: "Diretoria executiva / VP",
  C_LEVEL: "C-Level",
}

export function companyUrl(company: string, title: string, remote: boolean): string {
  const params = new URLSearchParams({ title })
  if (remote) params.set("workModel", "REMOTE")
  return `https://${company}.digai.ai/pt-BR?${params}`
}

export interface DigaiJob {
  triagemId?: string
  title?: string | null
  language?: string | null
  level?: string | null
  expiresAt?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  workModel?: string | null
  isDisabilitiesAffirmative?: boolean | null
  isTalentPool?: boolean | null
  isInternalRecruitment?: boolean | null
  salaryMin?: number | null
  salaryMax?: number | null
  companyName?: string | null
  groupSlug?: string | null
  groupDisplayName?: string | null
  isConfidential?: boolean | null
  publishedAt?: string | null
  updatedAt?: string | null
}

export interface DigaiResult extends JobResult {
  company_slug: string | null
  pcd_affirmative: boolean
  talent_pool: boolean
  internal: boolean | null // só o detalhe informa
  language: string | null
}

/** O payload do Next.js (RSC) da página: a concatenação das strings de self.__next_f.push([1,"..."]). */
export function readFlight(html: string): string {
  let flight = ""
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      flight += JSON.parse(m[1])
    } catch {
      // trecho malformado: ignora, os outros seguem
    }
  }
  return flight
}

/** O objeto JSON que segue `"<chave>":` no payload, ou null. Conta chaves fora de strings. */
export function extractObject(flight: string, key: string): unknown {
  const start = flight.indexOf(`"${key}":{`)
  if (start < 0) return null
  const open = start + key.length + 3
  let depth = 0
  let inString = false
  for (let i = open; i < flight.length; i++) {
    const c = flight[i]
    if (inString) {
      if (c === "\\") i++
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === "{") depth++
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(flight.slice(open, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

function place(j: DigaiJob): string | null {
  const parts = [j.city?.trim(), j.state?.trim()].filter(Boolean)
  const country = j.country?.trim()
  if (country && !/^(brazil|brasil)$/i.test(country)) parts.push(country)
  return parts.join(", ") || null
}

export function toResult(j: DigaiJob, description: string | null = null): DigaiResult {
  const id = j.triagemId ?? ""
  return {
    id,
    title: (j.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: j.isConfidential ? "Empresa confidencial" : j.companyName?.trim() || j.groupDisplayName?.trim() || null,
    location: place(j),
    date: contractDate(j.publishedAt ?? j.updatedAt),
    url: `${JOBS_HOST}/${id}`,
    deadline: contractDate(j.expiresAt),
    contract: null,
    workplace_type: WORK_MODELS[j.workModel ?? ""] ?? null,
    seniority: LEVELS[j.level ?? ""] ?? null,
    salary: formatSalary(j.salaryMin, j.salaryMax),
    description,
    company_slug: j.groupSlug ?? null,
    pcd_affirmative: j.isDisabilitiesAffirmative === true,
    talent_pool: j.isTalentPool === true,
    internal: typeof j.isInternalRecruitment === "boolean" ? j.isInternalRecruitment : null,
    language: j.language ?? null,
  }
}

export interface CompanyPage {
  jobs: DigaiResult[]
  total: number // vagas da empresa que casam com o filtro (pode passar das que vieram)
}

/** As vagas da página de carreira de uma empresa, ou null se a página não trouxe a lista. */
export function parseCompanyPage(html: string): CompanyPage | null {
  const data = extractObject(readFlight(html), "initialJobs") as { items?: DigaiJob[]; total?: number } | null
  if (!data || !Array.isArray(data.items)) return null
  const jobs = data.items.filter((j) => j?.triagemId && UUID.test(j.triagemId)).map((j) => toResult(j))
  return { jobs, total: typeof data.total === "number" ? data.total : jobs.length }
}

export { titleMatches } from "./helpers.js"

/** Aceita jobs.digai.ai/<id> (com ou sem /pt-BR/jobs/), uma URL de <empresa>.digai.ai com o id, ou o id. */
export function parseRef(input: string): string | null {
  const raw = input.trim()
  if (new RegExp(`^${UUID.source}$`, "i").test(raw)) return raw.toLowerCase()
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== "https:" || !/(^|\.)digai\.ai$/i.test(url.hostname)) return null
  return UUID.exec(url.pathname)?.[0].toLowerCase() ?? null
}

export function detailUrl(id: string): string {
  return `${JOBS_HOST}/${id}`
}

export function parseDetail(html: string, id: string): DigaiResult | null {
  const ld = readJobPosting(html)
  const job = extractObject(readFlight(html), "initialJob") as DigaiJob | null
  if (!job && !ld) return null
  const description = cleanHtml(ld?.description)
  if (job?.triagemId) {
    // O objeto da vaga no detalhe não traz a UF; o JobPosting às vezes traz.
    const ldPlace = Array.isArray(ld?.jobLocation) ? ld?.jobLocation[0] : ld?.jobLocation
    return toResult({ ...job, state: job.state ?? ldPlace?.address?.addressRegion ?? null }, description)
  }
  // Sem o objeto da vaga: só o JobPosting.
  return {
    ...toResult({ triagemId: id, title: ld?.title, companyName: ld?.hiringOrganization?.name, publishedAt: ld?.datePosted, expiresAt: ld?.validThrough }, description),
    location: null,
  }
}

/** A lista de empresas: um identificador (subdomínio) por linha; `#` começa um comentário. */
export function parseCompaniesFile(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/#.*/, "").trim().toLowerCase())
    .filter((l) => /^[a-z0-9-]+$/.test(l))
}
