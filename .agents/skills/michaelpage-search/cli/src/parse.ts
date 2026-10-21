// Leitura específica da Michael Page Brasil (www.michaelpage.com.br), consultoria
// de recrutamento de média e alta gestão e especialistas.
//
// - Busca: a página HTML /jobs/<termo> (ex.: /jobs/product-manager), cartões
//   `div.job-tile` com título, local, tipo de contrato (Permanente, Temporário...),
//   resumo e destaques. Pagina com ?page=<n-1> (Drupal, começa em 0). O cartão não
//   traz data nem empresa: a vaga é de um cliente, quase sempre confidencial.
// - Detalhe: a página /job-detail/<slug>/ref/<ref>, com um bloco JobPosting
//   (data, local, descrição completa: "Sobre nosso cliente", "Descrição da vaga",
//   "O candidato ideal", "O que está sendo oferecido").
// robots.txt: /jobs e /job-detail liberados. Termos: sem proibição de acesso
// automatizado.

import { cleanHtml, contractDate, decodeHtmlEntities, foldAccents, inlineText, ldLocation, readJobPosting, type JobResult } from "./helpers.js"

export const BASE_URL = "https://www.michaelpage.com.br"
const HOST = new URL(BASE_URL).hostname
export const SEARCH_ACCEPT = "text/html"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "passe a URL da vaga (https://www.michaelpage.com.br/job-detail/<slug>/ref/<ref>)"
export const COMPANY = "Michael Page (cliente)"

/** "Product Manager" -> "product-manager": o termo no caminho, como o portal monta. */
export function slugify(query: string): string {
  return foldAccents(query).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export function buildSearchUrl(query: string, page: number): string {
  return `${BASE_URL}/jobs/${slugify(query)}${page > 1 ? `?page=${page - 1}` : ""}`
}

function workplace(text: string | null): JobResult["workplace_type"] {
  const t = foldAccents(text ?? "")
  if (/hibrid|hybrid/.test(t)) return "hybrid"
  if (/remot|home office/.test(t)) return "remote"
  return null
}

export interface MichaelPageResult extends JobResult {
  ref: string | null
  highlights: string[]
}

export function parseCard(chunk: string): MichaelPageResult | null {
  const link = /<h3><a href="(\/job-detail\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h3>/.exec(chunk)
  if (!link) return null
  const id = /class="job-title[^"]*" id="(\d+)"/.exec(chunk)?.[1] ?? link[1]
  const location = inlineText(/class="job-location">([\s\S]*?)<\/div>/.exec(chunk)?.[1] ?? null)
  const summary = inlineText(/class="job_advert__job-summary-text">([\s\S]*?)<\/div>/.exec(chunk)?.[1] ?? null)
  const highlights = [...(/class="job_advert__job-desc-bullet-points">([\s\S]*?)<\/div>/.exec(chunk)?.[1] ?? "")
    .matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => inlineText(m[1]) ?? "").filter(Boolean)
  return {
    id,
    title: decodeHtmlEntities(inlineText(link[2]) ?? ""),
    company: COMPANY,
    location,
    date: null,
    url: `${BASE_URL}${link[1]}`,
    deadline: null,
    contract: inlineText(/class="job-contract-type">([\s\S]*?)<\/div>/.exec(chunk)?.[1] ?? null),
    workplace_type: workplace(`${location ?? ""} ${summary ?? ""}`),
    seniority: null,
    salary: null,
    description: [summary, ...highlights.map((h) => `- ${h}`)].filter(Boolean).join("\n") || null,
    ref: /\/ref\/([a-z0-9-]+)/i.exec(link[1])?.[1] ?? null,
    highlights,
  }
}

export function parseSearch(html: string): { rows: MichaelPageResult[]; total: number | null } | null {
  if (!/view-job-search|job_search_keyword|search-job-tile/.test(html)) return null
  const rows = html
    .split(/<li class="views-row">/)
    .slice(1)
    .map(parseCard)
    .filter((r): r is MichaelPageResult => r !== null)
  return { rows, total: null }
}

/** O caminho /job-detail/<slug>/ref/<ref> a partir da URL; null se não for da Michael Page. */
export function parseRef(input: string): string | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (host !== HOST && host !== HOST.replace(/^www\./, "")) return null
  return /^\/job-detail\/[^/]+\/ref\/[a-z0-9-]+\/?$/i.test(url.pathname) ? url.pathname.replace(/\/$/, "") : null
}

export function detailUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export function parseDetail(html: string, path: string): MichaelPageResult | null {
  const ld = readJobPosting(html)
  if (!ld) return null
  const description = cleanHtml(ld.description)
  const place = ldLocation(ld)
  return {
    id: /\/ref\/([a-z0-9-]+)/i.exec(path)?.[1] ?? path,
    title: decodeHtmlEntities(ld.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: COMPANY,
    location: place,
    date: contractDate(ld.datePosted),
    url: detailUrl(path),
    deadline: contractDate(ld.validThrough),
    contract: null,
    workplace_type: workplace(`${place ?? ""} ${description ?? ""}`.slice(0, 2000)),
    seniority: null,
    salary: null,
    description,
    ref: /\/ref\/([a-z0-9-]+)/i.exec(path)?.[1] ?? null,
    highlights: [],
  }
}
