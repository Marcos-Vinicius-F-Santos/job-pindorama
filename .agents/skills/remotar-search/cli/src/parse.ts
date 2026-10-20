// Leitura específica da Remotar (remotar.com.br), portal brasileiro só de vagas
// remotas.
//
// - Busca: a rota JSON que a própria página de busca chama
//   (api.remotar.com.br/jobs?search=&page=&active=true), sem login. 50 vagas por
//   página, fixo; `search` casa palavras do título e da descrição, então a busca
//   é ampla - o /scrape filtra depois.
// - Detalhe: a mesma API, /jobs/<id>.
// A resposta traz dados de quem cadastrou a vaga (nome, e-mail): esta CLI nunca
// os repassa - só os campos da vaga entram no resultado.
// robots.txt: o site e a API não publicam um (404), o que é permissão. Os termos
// de uso proíbem acesso automatizado: veja o aviso de uso pessoal no SKILL.md.

import { cleanHtml, contractDate, decodeHtmlEntities, formatSalary, type JobResult } from "./helpers.js"

export const SITE_URL = "https://remotar.com.br"
export const API_URL = "https://api.remotar.com.br"
const SITE_HOST = new URL(SITE_URL).hostname
export const PAGE_SIZE = 50
export const SEARCH_ACCEPT = "application/json"
export const DETAIL_ACCEPT = "application/json"
export const REF_HINT = "passe o id numérico ou a URL https://remotar.com.br/job/<id>/..."

/**
 * Categorias do portal (nome sem acento -> id), como a API /categories devolve.
 * A busca por palavra é ampla (título e descrição); a categoria é o que a torna
 * útil - "product manager" cai de ~130 para ~40 vagas com a categoria Produto.
 */
export const CATEGORIES: Record<string, number> = {
  "administrativo": 18, "financeiro": 18, "operacoes": 18,
  "atendimento": 2, "suporte": 2,
  "comunicacao": 20,
  "conteudo": 3, "seo": 3,
  "dados": 4, "data-science": 4, "analytics": 4,
  "design": 5,
  "devops": 7,
  "educacao": 22,
  "juridico": 19,
  "marketing": 10,
  "motion-design": 11,
  "midia": 21,
  "outros": 12,
  "produto": 15,
  "programacao": 13,
  "mobile": 14,
  "qa": 8,
  "rh": 16, "recursos-humanos": 16,
  "sysadmin": 9,
  "ux": 6, "ui": 6, "ux-ui": 6,
  "vendas": 17, "negocios": 17,
}

export function buildSearchUrl(query: string, page: number, categoryId?: number): string {
  const q = new URLSearchParams({ search: query, active: "true", page: String(page) })
  if (categoryId !== undefined) q.set("categoryId", String(categoryId))
  return `${API_URL}/jobs?${q.toString()}`
}

export function detailUrl(id: string): string {
  return `${API_URL}/jobs/${id}`
}

export function jobUrl(id: string | number): string {
  return `${SITE_URL}/job/${id}`
}

interface Named {
  name?: string | null
}

export interface RemotarJob {
  id: number
  title?: string | null
  subtitle?: string | null
  description?: string | null
  createdAt?: string | null
  expiresAt?: string | null
  expired?: boolean | null
  active?: boolean | null
  type?: string | null
  city?: string | null
  state?: string | null
  externalLink?: string | null
  company?: { name?: string | null } | null
  companyDisplayName?: string | null
  jobSalary?: { from?: number | null; to?: number | null; currency?: string | null; type?: string | null } | null
  jobTags?: Array<{ tag?: Named | null }> | null
  jobCategories?: Array<{ category?: Named | null }> | null
}

export interface RemotarResult extends JobResult {
  international: boolean
  categories: string[]
  tags: string[]
  apply_url: string | null
}

/** "✈️ Vaga internacional" -> "Vaga internacional": os emojis da etiqueta não ajudam quem lê. */
function tagText(name: string): string {
  return name.replace(/[^\p{L}\p{N}%+&/().,\- ]/gu, "").replace(/\s+/g, " ").trim()
}

export function toResult(j: RemotarJob): RemotarResult {
  const tags = (j.jobTags ?? []).map((t) => tagText(t?.tag?.name ?? "")).filter(Boolean)
  const categories = (j.jobCategories ?? []).map((c) => (c?.category?.name ?? "").trim()).filter(Boolean)
  const international = tags.some((t) => /internacional/i.test(t))
  const brl = !j.jobSalary?.currency || j.jobSalary.currency === "BRL"
  const salary = j.jobSalary?.type && j.jobSalary.type !== "uninformed" && brl
    ? formatSalary(j.jobSalary.from, j.jobSalary.to)
    : null
  const place = [j.city?.trim() || null, j.state?.trim() || null].filter(Boolean).join(", ")
  const description = cleanHtml(j.description)
  return {
    id: String(j.id),
    title: decodeHtmlEntities(j.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: (j.companyDisplayName || j.company?.name || "").trim() || null,
    location: place ? `${place} (Remoto)` : international ? "Remoto (internacional)" : "Remoto",
    date: contractDate(j.createdAt),
    url: jobUrl(j.id),
    deadline: contractDate(j.expiresAt),
    contract: null,
    workplace_type: "remote",
    seniority: null,
    salary,
    description: [j.subtitle?.trim(), description].filter(Boolean).join("\n\n") || null,
    international,
    categories,
    tags,
    apply_url: j.externalLink?.trim() || null,
  }
}

export function parseSearch(body: string): { rows: RemotarResult[]; total: number | null } | null {
  let data: { data?: RemotarJob[]; meta?: { total?: number } }
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (!Array.isArray(data?.data)) return null
  const rows = data.data.filter((j) => j.active !== false && j.expired !== true).map(toResult)
  return { rows, total: typeof data.meta?.total === "number" ? data.meta.total : null }
}

/** Aceita o id numérico ou a URL https://remotar.com.br/job/<id>[/empresa/titulo]. */
export function parseRef(input: string): string | null {
  const raw = input.trim()
  if (/^\d+$/.test(raw)) return raw
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.hostname.toLowerCase() !== SITE_HOST && url.hostname.toLowerCase() !== `www.${SITE_HOST}`) return null
  const m = /^\/job\/(\d+)(?:\/|$)/.exec(url.pathname)
  return m ? m[1] : null
}

export function parseDetail(body: string, id: string): RemotarResult | null {
  let job: RemotarJob
  try {
    job = JSON.parse(body)
  } catch {
    return null
  }
  if (!job || typeof job !== "object" || String(job.id) !== id) return null
  return toResult(job)
}
