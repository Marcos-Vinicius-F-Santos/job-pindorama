// Leitura específica da Empregos.com.br.
//
// - A busca livre (/buscar-vagas) é proibida no robots.txt; a CLI usa as páginas
//   públicas por cargo, /vagas/<cargo> e /vagas/<cargo>/<n>, com 20 vagas cada.
// - A página por cargo aceita qualquer texto e devolve vagas parecidas quando o
//   cargo não existe; a CLI filtra pelo título.
// - Cada cartão marca os campos com ícones: location-on-outline (local),
//   emoji-people (modelo de trabalho), work-outline (vagas), payments-outline
//   (salário), event-outline (publicação). O filtro de modelo do site passa pela
//   busca proibida, então --remote filtra na CLI.
// - Detalhe: /vaga/<id> (o resto da URL é opcional), com o bloco JobPosting.

import {
  cleanHtml,
  contractDate,
  decodeHtmlEntities,
  foldAccents,
  inlineText,
  ldLocation,
  readJobPosting,
  relativeDate,
  formatSalary,
  type JobResult,
} from "./helpers.js"

export const BASE_URL = "https://www.empregos.com.br"
export const SEARCH_ACCEPT = "text/html"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "passe a URL da vaga (empregos.com.br/vaga/<id>/...) ou o id"

export interface EmpregosResult extends JobResult {
  openings: number | null
}

/** "Gerente de Produto" -> "gerente-de-produto", como o site monta a URL por cargo. */
export function roleSlug(query: string): string {
  return foldAccents(query).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export function pageUrl(slug: string, page: number): string {
  return `${BASE_URL}/vagas/${slug}${page > 1 ? `/${page}` : ""}`
}

export function workplace(label: string | null): JobResult["workplace_type"] {
  const t = foldAccents(label ?? "")
  if (/hibrid/.test(t)) return "hybrid"
  if (/remot|home office/.test(t)) return "remote"
  if (/presencial/.test(t)) return "on-site"
  return null
}

/** O texto que segue o ícone `<nome>.svg` no cartão. */
function iconText(card: string, icon: string): string | null {
  const m = new RegExp(`icons/${icon}\\.svg"[^>]*>(?:\\s|<[^>]*>)*([^<]+)`).exec(card)
  return m ? decodeHtmlEntities(m[1]).replace(/\s+/g, " ").trim() || null : null
}

function salary(text: string | null): string | null {
  if (!text || /combinar/i.test(text)) return null
  return text
}

export function parseCard(card: string, now = new Date()): EmpregosResult | null {
  const link = /href="\/vaga\/(\d+)\/[^"]*"/.exec(card)
  if (!link) return null
  const id = link[1]
  const title = inlineText(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(card)?.[1])
  // O nome no <h3> vem cortado ("ADEMICON ADMINISTRADORA DE CONS..."); o alt do logo traz inteiro.
  const company = decodeHtmlEntities(/alt="Logo da empresa ([^"]*)"/.exec(card)?.[1] ?? "").trim() ||
    inlineText(/<h3>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/.exec(card)?.[1]) || null
  const openings = Number(/(\d+)/.exec(iconText(card, "work-outline") ?? "")?.[1] ?? NaN)
  const model = iconText(card, "emoji-people")
  return {
    id,
    title: title || "(sem título)",
    company,
    location: iconText(card, "location-on-outline"),
    date: relativeDate(iconText(card, "event-outline"), now),
    url: `${BASE_URL}/vaga/${id}`,
    deadline: null,
    contract: null,
    workplace_type: workplace(model),
    seniority: null,
    salary: salary(iconText(card, "payments-outline")),
    // O cartão traz a descrição, em geral inteira (o corte é só visual, por CSS).
    description: cleanHtml(/<div[^>]*line-clamp[^>]*>([\s\S]*?)<\/div>/.exec(card)?.[1]),
    openings: Number.isFinite(openings) ? openings : null,
  }
}

export interface SearchPage {
  rows: EmpregosResult[]
  total: number | null // "239 vagas de emprego para ..." no <title>
}

/** Os cartões da página, ou null se a página não tem a estrutura esperada. */
export function parseSearch(html: string, now = new Date()): SearchPage | null {
  const parts = html.split('id="job-card"')
  const totalText = /<title>\s*([\d.]+)\s+vagas?/i.exec(html)?.[1]
  const total = totalText ? Number(totalText.replace(/\./g, "")) : null
  if (parts.length === 1) return total === null && !/<title>/i.test(html) ? null : { rows: [], total }
  const rows = parts.slice(1).map((c) => parseCard(c, now)).filter((r): r is EmpregosResult => r !== null)
  return { rows, total }
}

/** Aceita https://www.empregos.com.br/vaga/<id>[/...] ou o id. */
export function parseRef(input: string): string | null {
  const raw = input.trim()
  if (/^\d{5,}$/.test(raw)) return raw
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== "https:" || !/^(www\.)?empregos\.com\.br$/i.test(url.hostname)) return null
  return /^\/vaga\/(\d+)(?:\/|$)/.exec(url.pathname)?.[1] ?? null
}

export function detailUrl(id: string): string {
  return `${BASE_URL}/vaga/${id}`
}

/** O HTML da seção "Descrição da vaga" (o JobPosting traz o mesmo texto, mas sem quebras de linha). */
export function descriptionHtml(html: string): string | null {
  const m = /Descri[çc][ãa]o da vaga\s*<\/h3>\s*<div[^>]*>/i.exec(html)
  if (!m) return null
  const start = m.index + m[0].length
  const tag = /<(\/?)div\b[^>]*>/gi
  tag.lastIndex = start
  let depth = 1
  for (let t = tag.exec(html); t; t = tag.exec(html)) {
    depth += t[1] ? -1 : 1
    if (depth === 0) return html.slice(start, t.index)
  }
  return null
}

export function parseDetail(html: string, id: string): EmpregosResult | null {
  const ld = readJobPosting(html)
  if (!ld) return null
  const description = cleanHtml(descriptionHtml(html)) || cleanHtml(ld.description)
  const remote = /telecommute/i.test(ld.jobLocationType ?? "")
  const value = ld.baseSalary?.value
  return {
    id,
    title: decodeHtmlEntities(ld.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: ld.hiringOrganization?.name?.trim() || null,
    location: ldLocation(ld),
    date: contractDate(ld.datePosted),
    url: detailUrl(id),
    deadline: contractDate(ld.validThrough),
    contract: null,
    workplace_type: remote ? "remote" : null,
    seniority: null,
    salary: formatSalary(value?.minValue ?? value?.value, value?.maxValue),
    description,
    openings: null,
  }
}
