// Leitura específica da Sólides Vagas (vagas.solides.com.br), o portal das
// vagas publicadas no ATS da Sólides, muito usado por empresas pequenas e médias.
//
// - Busca: a rota JSON que a própria página de busca chama (/api/vacancies),
//   sem login. Página de no máximo 20 vagas (`take` acima disso volta vazio).
// - Detalhe: a página pública da vaga (/vaga/<id>), que traz um bloco JobPosting
//   (schema.org) e, no payload do Next.js, o modelo de trabalho, o regime, a
//   senioridade e se a vaga é exclusiva para PcD.
// robots.txt do portal: busca, /api/ e /vaga/ liberados.

import {
  cleanHtml,
  contractDate,
  decodeHtmlEntities,
  formatSalary,
  ldLocation,
  readJobPosting,
  WORKPLACE_LABELS,
  type JobResult,
} from "./helpers.js"

export const BASE_URL = "https://vagas.solides.com.br"
const HOST = new URL(BASE_URL).hostname
export const SEARCH_PATH = "/api/vacancies"
export const MAX_PAGE_SIZE = 20
export const SEARCH_ACCEPT = "application/json"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT =
  "passe o id numérico ou a URL https://vagas.solides.com.br/vaga/<id>; vagas do RH Gestor " +
  "(id com letras, URL em rhgestor.com.br) não têm página na Sólides: leia a URL delas direto"

export function detailUrl(id: string): string {
  return jobUrl(id)
}

/** Vocabulários da API (as chaves que o filtro do portal envia). */
export const WORKPLACE_KEYS: Record<string, string> = {
  remoto: "remoto", remote: "remoto", hibrido: "hibrido", hybrid: "hibrido",
  presencial: "presencial", onsite: "presencial", "on-site": "presencial",
}
export const CONTRACT_KEYS = ["clt", "pj", "estagio", "aprendiz", "temporario", "autonomo", "freelancer", "cooperado"]
export const SENIORITY_KEYS = ["estagio", "junior", "pleno", "senior", "especialista", "principal"]

const WORKPLACE_CODE: Record<string, JobResult["workplace_type"]> = { remoto: "remote", hibrido: "hybrid", presencial: "on-site" }

export interface SearchParams {
  query: string
  workplace: string[] // chaves de WORKPLACE_KEYS já resolvidas
  contract: string[]
  seniority: string[]
  page: number
  limit: number
}

/** A API aceita listas separadas por vírgula em cada filtro (é o que o portal envia). */
export function buildSearchUrl(p: SearchParams): string {
  const q = new URLSearchParams({ page: String(p.page), take: String(Math.min(p.limit, MAX_PAGE_SIZE)), title: p.query })
  if (p.contract.length) q.set("contractsType", p.contract.join(","))
  if (p.workplace.length) q.set("jobsType", p.workplace.join(","))
  if (p.seniority.length) q.set("seniorities", p.seniority.join(","))
  return `${BASE_URL}${SEARCH_PATH}?${q.toString()}`
}

interface Named {
  name?: string | null
}

export interface SolidesJob {
  id: number | string
  title?: string | null
  companyName?: string | null
  description?: string | null
  createdAt?: string | null
  jobType?: string | null
  city?: Named | null
  state?: { name?: string | null; code?: string | null } | null
  seniority?: Named[] | null
  recruitmentContractType?: Named[] | null
  salary?: { showRangeToApplicant?: boolean; initialRange?: number | null; finalRange?: number | null } | null
  date?: { due?: string | null } | null
  pcdOnly?: boolean | null
  affirmative?: Named[] | null
  publishers?: { rhgestor?: { redirectUrl?: string | null } | null } | null
}

export interface SolidesResult extends JobResult {
  pcd_only: boolean
  affirmative: string[]
  /** "solides" (página /vaga/<id>) ou "rhgestor" (vaga do RH Gestor, página externa). */
  source: "solides" | "rhgestor"
}

const names = (list: Named[] | null | undefined): string[] =>
  (list ?? []).map((x) => (x?.name ?? "").trim()).filter(Boolean)

export function jobUrl(id: string | number): string {
  return `${BASE_URL}/vaga/${id}`
}

function location(j: SolidesJob, mode: JobResult["workplace_type"]): string | null {
  const place = [j.city?.name?.trim() || null, j.state?.code?.trim() || null].filter(Boolean).join(", ")
  const label = mode ? WORKPLACE_LABELS[mode] : null
  if (place && label && mode !== "on-site") return `${place} (${label})`
  return place || label || null
}

export function toResult(j: SolidesJob): SolidesResult {
  const mode = WORKPLACE_CODE[j.jobType ?? ""] ?? null
  const showSalary = j.salary?.showRangeToApplicant === true
  // Vagas do RH Gestor (outro produto da Sólides) chegam com id alfanumérico e não
  // têm página /vaga/<id> (404): a URL útil é a do RH Gestor que a API informa.
  const numeric = /^\d+$/.test(String(j.id))
  return {
    id: String(j.id),
    title: decodeHtmlEntities(j.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: j.companyName?.trim() || null,
    location: location(j, mode),
    date: contractDate(j.createdAt),
    url: numeric ? jobUrl(j.id) : j.publishers?.rhgestor?.redirectUrl?.trim() || null,
    deadline: contractDate(j.date?.due),
    contract: names(j.recruitmentContractType).join(", ") || null,
    workplace_type: mode,
    seniority: names(j.seniority).join(", ") || null,
    salary: showSalary ? formatSalary(j.salary?.initialRange, j.salary?.finalRange) : null,
    description: cleanHtml(j.description),
    pcd_only: j.pcdOnly === true,
    affirmative: names(j.affirmative),
    source: numeric ? "solides" : "rhgestor",
  }
}

/** null quando a resposta não tem o formato esperado (a rota pode ter mudado). */
export function parseSearch(body: string): { rows: SolidesResult[]; total: number | null } | null {
  let data: { data?: SolidesJob[]; count?: number }
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (!Array.isArray(data?.data)) return null
  return { rows: data.data.map(toResult), total: typeof data.count === "number" ? data.count : null }
}

/** Aceita o id numérico ou a URL https://[empresa.]vagas.solides.com.br/vaga/<id>. */
export function parseRef(input: string): string | null {
  const raw = input.trim()
  if (/^\d+$/.test(raw)) return raw
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  // A empresa também publica no próprio subdomínio (empresa.vagas.solides.com.br), com o mesmo id.
  const host = url.hostname.toLowerCase()
  if (host !== HOST && !host.endsWith(`.${HOST}`)) return null
  const m = /^\/vaga\/(\d+)\/?$/.exec(url.pathname)
  return m ? m[1] : null
}

/** Um campo do payload do Next.js (aspas escapadas como \"), já decodificado. */
function payloadField(html: string, name: string): string | null {
  const m = new RegExp(`\\\\"${name}\\\\":(\\[[^\\]]*\\]|\\\\"[^\\\\]*\\\\"|true|false|null)`).exec(html)
  return m ? m[1].replace(/\\"/g, '"') : null
}

export function parseDetail(html: string, id: string): SolidesResult | null {
  const ld = readJobPosting(html)
  if (!ld) return null
  const listNames = (raw: string | null): string[] => {
    try {
      return raw ? names(JSON.parse(raw) as Named[]) : []
    } catch {
      return []
    }
  }
  const jobType = (payloadField(html, "jobType") ?? "").replace(/"/g, "")
  const mode = WORKPLACE_CODE[jobType] ?? (ld.jobLocationType === "TELECOMMUTE" ? "remote" : null)
  const place = ldLocation(ld)
  const label = mode ? WORKPLACE_LABELS[mode] : null
  return {
    id,
    title: decodeHtmlEntities(ld.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: ld.hiringOrganization?.name?.trim() || null,
    location: place && label && mode !== "on-site" ? `${place} (${label})` : place || label,
    date: contractDate(ld.datePosted),
    url: jobUrl(id),
    deadline: contractDate(ld.validThrough),
    contract: listNames(payloadField(html, "recruitmentContractType")).join(", ") || null,
    workplace_type: mode,
    seniority: listNames(payloadField(html, "seniority")).join(", ") || null,
    salary: formatSalary(ld.baseSalary?.value?.minValue, ld.baseSalary?.value?.maxValue),
    description: cleanHtml(ld.description),
    pcd_only: payloadField(html, "pcdOnly") === "true",
    affirmative: [],
    source: "solides",
  }
}
