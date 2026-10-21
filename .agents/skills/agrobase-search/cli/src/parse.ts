// Leitura específica do Agrobase (www.agrobase.com.br), o maior agregador de vagas
// do agronegócio, ciências agrárias e meio ambiente.
//
// - Busca: a API REST padrão do WordPress do site (/wp-json/wp/v2/posts): cada
//   vaga é um post, nas categorias Empregos (93), Estágios (245) ou Concursos (92),
//   mais a profissão (Agrônomo, Veterinário, Zootecnista...). Aceita `search`,
//   `categories` e `after` (filtro de data feito pelo servidor). O conteúdo do post
//   na API é só um resumo (estados e profissões).
// - Detalhe: a página pública da vaga (/oportunidades/AAAA/MM/<slug>/), com data de
//   liberação, local, tipo, responsabilidades e requisitos, e o link de candidatura
//   na plataforma do Agrobase.
// O plano pago dá acesso antecipado (2 a 4 dias) a parte das vagas: a CLI só vê o
// que já foi liberado ao público.
// robots.txt: /wp-json e /oportunidades liberados. Termos (/termos/): sem cláusula
// sobre acesso automatizado.

import { cleanHtml, contractDate, decodeHtmlEntities, foldAccents, inlineText, type JobResult } from "./helpers.js"

export const BASE_URL = "https://www.agrobase.com.br"
const HOST = new URL(BASE_URL).hostname
export const SEARCH_ACCEPT = "application/json"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "passe a URL da vaga (https://www.agrobase.com.br/oportunidades/AAAA/MM/<slug>/)"
export const MAX_PAGE_SIZE = 100

/** Tipo de vaga -> categoria do WordPress. */
export const TYPES: Record<string, number> = { emprego: 93, estagio: 245, concurso: 92 }
/** Profissão -> categoria do WordPress (como o site organiza as vagas). */
export const PROFESSIONS: Record<string, number> = {
  biologo: 227, agronomo: 228, ambiental: 229, alimentos: 230, florestal: 231, veterinario: 232,
  nutricionista: 233, "tecnico-agricola": 234, "tecnico-agropecuaria": 236, zootecnista: 237,
}
const CATEGORY_NAMES: Record<number, string> = {
  227: "Biólogo", 228: "Engenheiro Agrônomo", 229: "Engenheiro Ambiental", 230: "Engenheiro de Alimentos",
  231: "Engenheiro Florestal", 232: "Médico Veterinário", 233: "Nutricionista", 234: "Técnico Agrícola",
  236: "Técnico em Agropecuária", 237: "Zootecnista", 93: "Emprego", 245: "Estágio", 92: "Concurso",
}

export function buildSearchUrl(opts: { query: string; type: number; profession?: number; page: number; limit: number; after?: string }): string {
  const q = new URLSearchParams({
    per_page: String(Math.min(opts.limit, MAX_PAGE_SIZE)),
    page: String(opts.page),
    categories: [opts.type, ...(opts.profession ? [opts.profession] : [])].join(","),
    _fields: "id,date,link,title,content,categories",
  })
  if (opts.query) q.set("search", opts.query)
  if (opts.after) q.set("after", `${opts.after}T00:00:00`)
  return `${BASE_URL}/wp-json/wp/v2/posts?${q.toString()}`
}

interface WpPost {
  id: number
  date?: string
  link?: string
  title?: { rendered?: string }
  content?: { rendered?: string }
  categories?: number[]
}

export interface AgrobaseResult extends JobResult {
  professions: string[]
  kind: string | null
}

/** "Vendedor de peças – Santa Rosa/RS" -> "Santa Rosa/RS": o local vem depois do travessão. */
function placeFromTitle(title: string): string | null {
  const m = /\s[–-]\s([^–]+)$/.exec(title)
  return m ? m[1].trim() : null
}

export function toResult(p: WpPost): AgrobaseResult | null {
  const title = inlineText(decodeHtmlEntities(p.title?.rendered ?? ""))
  if (!p.id || !title || !p.link) return null
  const cats = p.categories ?? []
  // O resumo do post é "<estados>" e "Emprego <profissão>": o primeiro parágrafo é o local.
  const firstParagraph = inlineText(/<p>([\s\S]*?)<\/p>/.exec(p.content?.rendered ?? "")?.[1] ?? null)
  return {
    id: String(p.id),
    title,
    company: null,
    location: placeFromTitle(title) ?? firstParagraph,
    date: contractDate(p.date),
    url: p.link,
    deadline: null,
    contract: null,
    workplace_type: /remot|home ?office/i.test(foldAccents(title)) ? "remote" : null,
    seniority: /trainee/i.test(title) ? "Trainee" : /est[áa]gi/i.test(title) ? "Estágio" : null,
    salary: null,
    description: null,
    professions: cats.filter((c) => c in CATEGORY_NAMES && ![93, 245, 92].includes(c)).map((c) => CATEGORY_NAMES[c]),
    kind: CATEGORY_NAMES[cats.find((c) => [93, 245, 92].includes(c)) ?? 0] ?? null,
  }
}

export function parseSearch(body: string): { rows: AgrobaseResult[]; total: number | null } | null {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (!Array.isArray(data)) return null
  return { rows: (data as WpPost[]).map(toResult).filter((r): r is AgrobaseResult => r !== null), total: null }
}

/** O caminho /oportunidades/AAAA/MM/<slug>/ a partir da URL. */
export function parseRef(input: string): string | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (host !== HOST && host !== HOST.replace(/^www\./, "")) return null
  const m = /^\/oportunidades\/\d{4}\/\d{2}\/[a-z0-9-]+\/?$/i.exec(url.pathname)
  return m ? url.pathname.replace(/\/?$/, "/") : null
}

export function detailUrl(path: string): string {
  return `${BASE_URL}${path}`
}

const MONTHS: Record<string, string> = {
  janeiro: "01", fevereiro: "02", marco: "03", abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
}

/** "liberado em 21 de outubro de 2026" -> "2026-10-21". */
export function releasedDate(text: string | null): string | null {
  const m = /(\d{1,2}) de ([a-zç]+) de (\d{4})/i.exec(foldAccents(text ?? ""))
  if (!m || !MONTHS[m[2]]) return null
  return `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, "0")}`
}

export function parseDetail(html: string, path: string): AgrobaseResult | null {
  const title = inlineText(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? null)
  if (!title) return null
  const released = /liberado em ([^<]+)</.exec(html)?.[1] ?? null
  // O corpo da vaga: o primeiro bloco de texto que abre com <p> (local, tipo,
  // profissão) seguido das seções (Responsabilidades, Requisitos...).
  const body = /<div class="bde-text-[\w-]+ bde-text">\s*(<p>[\s\S]*?)<\/div><div class="bde-div/.exec(html)?.[1] ?? null
  const header = body ? (/<p>([\s\S]*?)<\/p>/.exec(body)?.[1] ?? "") : ""
  const headerLines = header.split(/<br\s*\/?>/i).map((l) => inlineText(l) ?? "").filter(Boolean)
  const apply = /href="(https:\/\/plataforma\.agrobase\.com\.br\/[^"]+)"/.exec(html)?.[1] ?? null
  const location = headerLines[0]?.replace(/\b[A-Z]{2} l /g, "") ?? placeFromTitle(title)
  return {
    id: path.replace(/\/$/, "").split("/").pop() ?? path,
    title,
    company: null,
    location: location || null,
    date: releasedDate(released),
    url: detailUrl(path),
    deadline: null,
    contract: headerLines.length > 2 ? headerLines[1] : null,
    workplace_type: /remot|home ?office/i.test(foldAccents(`${title} ${location ?? ""}`)) ? "remote" : null,
    seniority: /trainee/i.test(header + title) ? "Trainee" : /est[áa]gi/i.test(header + title) ? "Estágio" : null,
    salary: null,
    description: body ? cleanHtml(body.replace(/^<p>[\s\S]*?<\/p>/, "")) : null,
    professions: headerLines.slice(2),
    kind: null,
    ...(apply ? { apply_url: apply } : {}),
  } as AgrobaseResult
}
