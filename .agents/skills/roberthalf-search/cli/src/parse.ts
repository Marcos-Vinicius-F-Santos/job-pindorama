// Leitura específica da Robert Half Brasil (www.roberthalf.com/br/pt), consultoria
// de recrutamento de especialistas e gestão.
//
// - Busca: a página /br/pt/vagas?pagenumber=<n>, 25 cartões `<rhcl-job-card>` por
//   página, da vaga mais nova para a mais antiga. A busca por texto do site passa
//   por uma API interna (com token); a página HTML ignora os parâmetros de busca.
//   Por isso a CLI percorre algumas páginas e filtra pelo título.
// - Cada cartão traz local, modelo (`worksite`: remote/hybrid/onsite), tipo
//   (Efetivo, Projetos, Temporário), salário (quando informado), data e a
//   descrição completa (HTML escapado no subslot "copy").
// - Detalhe: a página /br/pt/vaga/<cidade>/<slug>/<id> traz o mesmo cartão.
// robots.txt: /br/pt/vagas e /br/pt/vaga liberados. Os termos de uso PROÍBEM
// acesso automatizado ("robôs ou sistemas de varredura" sem consentimento por
// escrito): veja o aviso de uso pessoal no SKILL.md.

import { cleanHtml, contractDate, decodeHtmlEntities, formatSalary, inlineText, type JobResult } from "./helpers.js"

export const BASE_URL = "https://www.roberthalf.com"
const HOST = new URL(BASE_URL).hostname
export const PAGE_SIZE = 25
export const SEARCH_ACCEPT = "text/html"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "passe a URL da vaga (https://www.roberthalf.com/br/pt/vaga/<cidade>/<slug>/<id>)"
export const COMPANY = "Robert Half (cliente)"

export function pageUrl(page: number): string {
  return `${BASE_URL}/br/pt/vagas${page > 1 ? `?pagenumber=${page}` : ""}`
}

const MODE: Record<string, JobResult["workplace_type"]> = { remote: "remote", hybrid: "hybrid", onsite: "on-site" }

const sub = (chunk: string, name: string): string | null => {
  const m = new RegExp(`<(?:li|span) data-subslot="${name}">([\\s\\S]*?)</(?:li|span)>`).exec(chunk)
  return m ? m[1] : null
}

/** Lê um `<rhcl-job-card>` (o pedaço depois da abertura da tag). */
export function parseCard(chunk: string): JobResult | null {
  const id = /^ job-id="([^"]+)"/.exec(chunk)?.[1]
  const link = /<a href="([^"]+)" slot="headline"[^>]*>([\s\S]*?)<\/a>/.exec(chunk)
  if (!id || !link) return null
  const min = Number(inlineText(sub(chunk, "salary-min")) ?? 0)
  const max = Number(inlineText(sub(chunk, "salary-max")) ?? 0)
  const period = inlineText(sub(chunk, "salary-period"))
  const salary = formatSalary(min, max)
  const location = (inlineText(sub(chunk, "location")) ?? "").replace(/[,\s]+$/, "") || null
  const copy = sub(chunk, "copy")
  return {
    id,
    title: inlineText(link[2]) ?? "(sem título)",
    company: COMPANY,
    location,
    date: contractDate(inlineText(sub(chunk, "date"))),
    url: decodeHtmlEntities(link[1]),
    deadline: null,
    contract: inlineText(sub(chunk, "type")),
    workplace_type: MODE[(inlineText(sub(chunk, "worksite")) ?? "").toLowerCase()] ?? null,
    seniority: null,
    salary: salary ? `${salary}${period && /year/i.test(period) ? " por ano" : period && /month/i.test(period) ? " por mês" : ""}` : null,
    // O "copy" vem com o HTML escapado (&lt;p&gt;): decodifica antes de limpar.
    description: copy ? cleanHtml(decodeHtmlEntities(copy)) : null,
  }
}

export function parseCards(html: string): JobResult[] {
  return html
    .split("<rhcl-job-card")
    .slice(1)
    .map(parseCard)
    .filter((r): r is JobResult => r !== null)
}

export function parseSearch(html: string): { rows: JobResult[]; total: number | null } | null {
  if (!/id="joblistings"|<rhcl-job-card/.test(html)) return null
  return { rows: parseCards(html), total: null }
}

/** O caminho /br/pt/vaga/<cidade>/<slug>/<id>; null se não for da Robert Half Brasil. */
export function parseRef(input: string): string | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (url.hostname.toLowerCase() !== HOST) return null
  return /^\/br\/pt\/vaga\/[^/]+\/[^/]+\/[a-z0-9-]+\/?$/i.test(url.pathname) ? url.pathname.replace(/\/$/, "") : null
}

export function detailUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export function parseDetail(html: string, path: string): JobResult | null {
  const id = path.split("/").pop()
  return parseCards(html).find((r) => r.id === id) ?? null
}
