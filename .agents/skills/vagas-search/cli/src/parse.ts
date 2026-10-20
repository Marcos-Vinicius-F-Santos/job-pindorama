// Leitura específica da VAGAS.com (www.vagas.com.br), um dos maiores portais
// generalistas do Brasil.
//
// - Busca: a página HTML de resultados, /vagas-de-<termo>?q=<termo>&pagina=<n>,
//   40 vagas por página. O modelo de trabalho é um filtro da página
//   (m[]=100% Home Office | Empresa e Home Office | Na empresa).
// - Detalhe: a página pública da vaga, /vagas/v<id>, com um bloco JobPosting
//   (schema.org) e a descrição em div.job-description__text.
// robots.txt: busca e /vagas/ liberados. Os termos proíbem software que
// "interfira nas atividades e operações" do site: volume baixo.

import {
  cleanHtml,
  contractDate,
  decodeHtmlEntities,
  foldAccents,
  formatSalary,
  inlineText,
  ldLocation,
  readJobPosting,
  relativeDate,
  type JobResult,
} from "./helpers.js"

export const BASE_URL = "https://www.vagas.com.br"
const HOST = new URL(BASE_URL).hostname
export const PAGE_SIZE = 40
export const SEARCH_ACCEPT = "text/html"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "passe o id (2837357 ou v2837357) ou a URL https://www.vagas.com.br/vagas/v<id>/..."

/** Modelo de trabalho aceito em --remote -> valor do filtro `m[]` da página. */
export const WORKPLACE_FILTER: Record<string, string> = {
  remoto: "100% Home Office", remote: "100% Home Office",
  hibrido: "Empresa e Home Office", hybrid: "Empresa e Home Office",
  presencial: "Na empresa", onsite: "Na empresa", "on-site": "Na empresa",
}

/** "Product Manager" -> "product-manager": o termo no caminho, como o portal monta. */
export function slugify(query: string): string {
  return foldAccents(query).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export function buildSearchUrl(query: string, page: number, workplace: string[]): string {
  const q = new URLSearchParams({ q: query })
  if (page > 1) q.set("pagina", String(page))
  for (const w of workplace) q.append("m[]", w)
  return `${BASE_URL}/vagas-de-${slugify(query)}?${q.toString()}`
}

export function detailUrl(id: string): string {
  return `${BASE_URL}/vagas/v${id}`
}

function workplaceFrom(text: string | null): JobResult["workplace_type"] {
  const t = foldAccents(text ?? "")
  if (/100% home office/.test(t)) return "remote"
  if (/empresa e home office|hibrid/.test(t)) return "hybrid"
  return null
}

const pick = (chunk: string, re: RegExp): string | null => {
  const m = re.exec(chunk)
  return m ? m[1] : null
}

/** Lê um cartão `li.vaga` da página de resultados; null se faltar o essencial. */
export function parseCard(chunk: string, now = new Date()): JobResult | null {
  const id = pick(chunk, /data-id-vaga="(\d+)"/)
  const title = pick(chunk, /class="link-detalhes-vaga"[^>]*title="([^"]*)"/)
  if (!id || !title) return null
  const href = pick(chunk, /class="link-detalhes-vaga"[^>]*href="([^"]+)"/)
  // `div.vaga-local` com tooltip de cidades próximas, ou `span.vaga-local` simples.
  const localHtml = pick(chunk, /class="vaga-local">([\s\S]*?)(?:<div class="tooltip|<\/div>|<\/span>)/)
  const location = inlineText(localHtml)
  return {
    id,
    title: decodeHtmlEntities(title).replace(/\s+/g, " ").trim(),
    company: inlineText(pick(chunk, /<span class="emprVaga">([\s\S]*?)<\/span>/)),
    location,
    date: relativeDate(inlineText(pick(chunk, /<span class="data-publicacao">([\s\S]*?)<\/span>/)), now),
    url: href ? new URL(decodeHtmlEntities(href), BASE_URL).href : detailUrl(id),
    deadline: null,
    contract: null,
    workplace_type: workplaceFrom(location),
    seniority: inlineText(pick(chunk, /<span class="nivelVaga">([\s\S]*?)<\/span>/)),
    salary: null,
    description: inlineText(pick(chunk, /<div class="detalhes">([\s\S]*?)<\/div>/)),
  }
}

/** Cartões lidos um a um: um cartão malformado não derruba os outros. */
export function parseSearch(html: string, now = new Date()): { rows: JobResult[]; total: number | null } | null {
  if (!/id="todasVagas"|class="grupoDeVagas"|vagas de emprego/i.test(html)) return null
  const chunks = html.split(/<li class="vaga (?:odd|even)[^"]*">/).slice(1)
  const rows = chunks.map((c) => parseCard(c, now)).filter((r): r is JobResult => r !== null)
  const total = pick(html, /<h1[^>]*>\s*([\d.]+)\s+vagas?/)
  return { rows, total: total ? Number(total.replace(/\./g, "")) : rows.length }
}

/** Aceita 2837357, v2837357 ou a URL https://www.vagas.com.br/vagas/v2837357/<titulo>. */
export function parseRef(input: string): string | null {
  const raw = input.trim()
  const bare = /^v?(\d+)$/i.exec(raw)
  if (bare) return bare[1]
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (host !== HOST && host !== HOST.replace(/^www\./, "")) return null
  const m = /^\/vagas\/v(\d+)(?:\/|$)/i.exec(url.pathname)
  return m ? m[1] : null
}

export function parseDetail(html: string, id: string): JobResult | null {
  const ld = readJobPosting(html)
  if (!ld) return null
  const descriptionHtml = pick(html, /class="job-tab-content job-description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/)
  const localizacao = inlineText(pick(html, /<span class="info-localizacao">([\s\S]*?)<\/span>/))
  const contract = inlineText(pick(html, /<span class="info-modelo-contratual"[^>]*>([\s\S]*?)<\/span>/))
  const salaryText = inlineText(pick(html, /Faixa salarial\s*<\/span>\s*<span>([\s\S]*?)<\/span>/))
  const place = ldLocation(ld)
  return {
    id,
    title: decodeHtmlEntities(ld.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: ld.hiringOrganization?.name?.trim() || null,
    location: localizacao && !/n[ãa]o informad/i.test(localizacao) ? localizacao : place,
    date: contractDate(ld.datePosted),
    url: detailUrl(id),
    deadline: contractDate(ld.validThrough),
    contract: contract ? contract.replace(/^Regime\s+/i, "") : null,
    workplace_type: workplaceFrom(localizacao),
    seniority: null,
    salary: formatSalary(ld.baseSalary?.value?.minValue, ld.baseSalary?.value?.maxValue) ??
      (salaryText && !/a combinar/i.test(salaryText) ? salaryText : null),
    description: cleanHtml(descriptionHtml) ?? cleanHtml(ld.description),
  }
}
