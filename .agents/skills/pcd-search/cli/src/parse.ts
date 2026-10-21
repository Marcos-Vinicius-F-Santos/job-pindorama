// Leitura específica do PCD Online (www.pcd.com.br), portal só de vagas para
// pessoas com deficiência.
//
// - Busca: a página /vagas-para-pcd?page=<n>, 30 cartões `card-vaga` por página
//   (empresa, título, resumo, local, modelo, regime, salário). Os filtros do site
//   (palavra-chave, home office, estado) são aplicados por JavaScript: no
//   endereço, são ignorados. A CLI percorre algumas páginas e filtra pelo título.
// - Detalhe: a página /emprego-pcd/<slug>/<id>, com um bloco JobPosting (data,
//   prazo, empresa, remoto, descrição completa).
// robots.txt: /vagas-para-pcd e /emprego-pcd liberados. Os termos de uso PROÍBEM
// acesso automatizado ("robôs, sistemas de varredura... spiders ou scrapers"):
// veja o aviso de uso pessoal no SKILL.md.

import { cleanHtml, contractDate, decodeHtmlEntities, foldAccents, formatSalary, inlineText, ldLocation, readJobPosting, type JobResult } from "./helpers.js"

export const BASE_URL = "https://www.pcd.com.br"
const HOST = new URL(BASE_URL).hostname
export const SEARCH_ACCEPT = "text/html"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "passe a URL da vaga (https://www.pcd.com.br/emprego-pcd/<slug>/<id>) ou o id"

export function pageUrl(page: number): string {
  return `${BASE_URL}/vagas-para-pcd${page > 1 ? `?page=${page}` : ""}`
}

function workplace(text: string): JobResult["workplace_type"] {
  const t = foldAccents(text)
  if (/hibrid/.test(t)) return "hybrid"
  if (/remot|home ?office/.test(t)) return "remote"
  if (/presencial/.test(t)) return "on-site"
  return null
}

const iconSpans = (chunk: string, icon: string): string[] =>
  [...chunk.matchAll(new RegExp(`<i class="fas ${icon}[^"]*"></i>([^<]*)</span>`, "g"))]
    .map((m) => inlineText(m[1]) ?? "")
    .filter(Boolean)

export interface PcdResult extends JobResult {
  pcd_only: boolean
}

export function parseCard(chunk: string): PcdResult | null {
  const link = /<a href="\/emprego-pcd\/([^"]+)\/(\d+)">([^<]+)<\/a>/.exec(chunk)
  if (!link) return null
  const places = iconSpans(chunk, "fa-map-marker-alt")
  const mode = places.map(workplace).find((w) => w !== null) ?? null
  const place = places.find((p) => workplace(p) === null) ?? null
  const salary = iconSpans(chunk, "fa-coins")[0] ?? null
  return {
    id: link[2],
    title: decodeHtmlEntities(link[3]).replace(/\s+/g, " ").trim(),
    company: inlineText(/<span class="h5">([^<]*)<\/span>/.exec(chunk)?.[1] ?? null),
    location: [place, mode === "remote" ? "Remoto" : mode === "hybrid" ? "Híbrido" : null].filter(Boolean).join(" · ") || null,
    date: null,
    url: `${BASE_URL}/emprego-pcd/${link[1]}/${link[2]}`,
    deadline: null,
    contract: (iconSpans(chunk, "fa-briefcase")[0] ?? "").replace(/^Contrato\s+/i, "") || null,
    workplace_type: mode,
    seniority: null,
    salary: salary && !/a combinar/i.test(salary) ? salary : null,
    description: inlineText(/<p class="strinDescricao">([\s\S]*?)<\/p>/.exec(chunk)?.[1] ?? null),
    pcd_only: /exclusivo-pcd/.test(chunk),
  }
}

export function parseSearch(html: string): { rows: PcdResult[]; total: number | null } | null {
  if (!/id="total_vagas"|card-vaga/.test(html)) return null
  const rows = html
    .split("card shadow mb-3 card-vaga")
    .slice(1)
    .map(parseCard)
    .filter((r): r is PcdResult => r !== null)
  const total = /id="total_vagas">([\d.]+)/.exec(html)?.[1]
  return { rows, total: total ? Number(total.replace(/\./g, "")) : null }
}

/** "<slug>/<id>" a partir da URL; o id sozinho também serve (o slug é cosmético). */
export function parseRef(input: string): string | null {
  const raw = input.trim()
  if (/^\d+$/.test(raw)) return `vaga/${raw}`
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.hostname.toLowerCase() !== HOST && url.hostname.toLowerCase() !== HOST.replace(/^www\./, "")) return null
  const m = /^\/emprego-pcd\/([^/]+)\/(\d+)\/?$/.exec(url.pathname)
  return m ? `${m[1]}/${m[2]}` : null
}

export function detailUrl(ref: string): string {
  return `${BASE_URL}/emprego-pcd/${ref}`
}

export function parseDetail(html: string, ref: string): PcdResult | null {
  const ld = readJobPosting(html)
  if (!ld) return null
  const description = cleanHtml(ld.description)
  const remote = ld.jobLocationType === "TELECOMMUTE"
  return {
    id: ref.split("/").pop() ?? ref,
    title: decodeHtmlEntities(ld.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: ld.hiringOrganization?.name?.trim() || null,
    location: ldLocation(ld) ?? (remote ? "Remoto" : null),
    date: contractDate(ld.datePosted),
    url: detailUrl(ref),
    deadline: contractDate(ld.validThrough),
    contract: null,
    workplace_type: remote ? "remote" : workplace(description?.slice(0, 1500) ?? ""),
    seniority: null,
    salary: formatSalary(ld.baseSalary?.value?.minValue, ld.baseSalary?.value?.maxValue),
    description,
    pcd_only: true,
  }
}
