// Leitura específica da Trampos (trampos.co), portal de vagas de comunicação,
// marketing, design, tecnologia e negócios.
//
// - Busca: a API JSON que o próprio site (Ember) chama,
//   /api/v2/opportunities?tr=<termo>&lc=<local>&ct=<categoria>&tp=<tipo>&page=<n>,
//   12 vagas por página. `lc=home office` traz as vagas remotas.
// - Detalhe: /api/v2/opportunities/<id>, com regime, home office/híbrido,
//   descrição, requisitos, desejáveis e benefícios.
// robots.txt: /api/v2/opportunities liberado. Os termos de uso PROÍBEM acesso
// automatizado ("Utilizar mecanismos, software ou scripts"): veja o aviso de uso
// pessoal no SKILL.md.

import { contractDate, decodeHtmlEntities, foldAccents, type JobResult } from "./helpers.js"

export const BASE_URL = "https://trampos.co"
const HOST = new URL(BASE_URL).hostname
export const PAGE_SIZE = 12
export const SEARCH_ACCEPT = "application/json"
export const DETAIL_ACCEPT = "application/json"
export const REF_HINT = "passe o id ou a URL https://trampos.co/oportunidades/<id>-<slug>"

/** Categorias da Trampos (slug do filtro `ct`). */
export const CATEGORIES = [
  "social-media", "ti", "marketing", "criacao", "design", "atendimento", "jornalismo", "producao", "rtv",
  "midia", "comercial", "dados", "projetos", "rh", "administrativo", "cs",
]
export const TYPES = ["emprego", "freela", "estagio", "banco-talentos"]

export function buildSearchUrl(opts: { query: string; page: number; remote: boolean; location?: string; category?: string; type?: string }): string {
  const q = new URLSearchParams({ tr: opts.query })
  if (opts.remote) q.set("lc", "home office")
  else if (opts.location) q.set("lc", opts.location)
  if (opts.category) q.set("ct", opts.category)
  if (opts.type) q.set("tp", opts.type)
  if (opts.page > 1) q.set("page", String(opts.page))
  return `${BASE_URL}/api/v2/opportunities?${q.toString()}`
}

export function detailUrl(id: string): string {
  return `${BASE_URL}/api/v2/opportunities/${id}`
}

interface TramposOpportunity {
  id: number
  name?: string | null
  type_name?: string | null
  category_name?: string | null
  state?: string | null
  city?: string | null
  home_office?: boolean | null
  hybrid?: boolean | null
  salary?: string | null
  published_at?: string | null
  regime?: string | null
  description?: string | null
  prerequisite?: string | null
  desirable?: string | null
  perks?: string | null
  other_info?: string | null
  custom_company_name?: string | null
  company?: { name?: string | null } | null
}

export interface TramposResult extends JobResult {
  category: string | null
  kind: string | null
}

function text(value: string | null | undefined): string | null {
  const t = decodeHtmlEntities(String(value ?? "")).replace(/\r\n/g, "\n").trim()
  return t || null
}

export function toResult(o: TramposOpportunity, remoteSearch = false): TramposResult {
  const place = [o.city?.trim() || null, o.state?.trim() || null].filter(Boolean).join(", ")
  // Vaga sem cidade numa busca por "home office" é remota; o detalhe diz com `home_office`.
  const remote = o.home_office === true || (remoteSearch && !o.city)
  const mode: JobResult["workplace_type"] = remote ? "remote" : o.hybrid ? "hybrid" : place ? "on-site" : null
  const salary = text(o.salary)
  const sections: Array<[string, string | null | undefined]> = [
    ["", o.description], ["Requisitos", o.prerequisite], ["Desejável", o.desirable],
    ["Benefícios", o.perks], ["Outras informações", o.other_info],
  ]
  const description = sections
    .map(([label, value]) => (text(value) ? (label ? `## ${label}\n${text(value)}` : text(value)) : null))
    .filter(Boolean)
    .join("\n\n")
  return {
    id: String(o.id),
    title: text(o.name) ?? "(sem título)",
    company: text(o.company?.name) ?? text(o.custom_company_name) ?? "Confidencial",
    location: remote ? (place ? `${place} (Home office)` : "Home office") : place ? (o.hybrid ? `${place} (Híbrido)` : place) : null,
    date: contractDate(o.published_at),
    url: `${BASE_URL}/oportunidades/${o.id}`,
    deadline: null,
    contract: text(o.regime),
    workplace_type: mode,
    seniority: null,
    salary: salary && !/n[ãa]o divulgad|a combinar/i.test(foldAccents(salary)) ? salary : null,
    description: description || null,
    category: text(o.category_name),
    kind: text(o.type_name),
  }
}

let remoteSearchFlag = false
/** Marca a busca atual como "home office" (cli.ts chama antes de buscar). */
export function setRemoteSearch(value: boolean): void {
  remoteSearchFlag = value
}

export function parseSearch(body: string): { rows: TramposResult[]; total: number | null } | null {
  let data: { opportunities?: TramposOpportunity[]; pagination?: { total?: number } }
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (!Array.isArray(data?.opportunities)) return null
  return {
    rows: data.opportunities.map((o) => toResult(o, remoteSearchFlag)),
    total: typeof data.pagination?.total === "number" ? data.pagination.total : null,
  }
}

export function parseRef(input: string): string | null {
  const raw = input.trim()
  if (/^\d+$/.test(raw)) return raw
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.hostname.toLowerCase() !== HOST && url.hostname.toLowerCase() !== `www.${HOST}`) return null
  return /^\/oportunidades\/(\d+)/.exec(url.pathname)?.[1] ?? null
}

export function parseDetail(body: string, id: string): TramposResult | null {
  let data: { opportunity?: TramposOpportunity }
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  const o = data?.opportunity
  if (!o || String(o.id) !== id) return null
  return toResult(o)
}
