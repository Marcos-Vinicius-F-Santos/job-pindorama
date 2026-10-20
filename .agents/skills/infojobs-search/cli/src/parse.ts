// Leitura específica da InfoJobs Brasil (www.infojobs.com.br), portal generalista.
//
// - Busca: a página HTML de resultados, /empregos.aspx?palabra=<termo>&Page=<n>,
//   20 vagas por página. O modelo de trabalho é um filtro da página
//   (idw=1 presencial, 2 home office, 3 híbrido); cada cartão traz data exata,
//   local, salário quando informado e o modelo.
// - Detalhe: a página pública da vaga (/vaga-de-...__<id>.aspx), com um bloco
//   JobPosting (schema.org) que traz a descrição inteira e o salário.
// robots.txt: busca e páginas de vaga liberadas. Os termos de uso proíbem
// acesso automatizado: veja o aviso de uso pessoal no SKILL.md.

import {
  cleanHtml,
  contractDate,
  decodeHtmlEntities,
  foldAccents,
  formatSalary,
  inlineText,
  ldLocation,
  readJobPosting,
  type JobResult,
} from "./helpers.js"

export const BASE_URL = "https://www.infojobs.com.br"
const HOST = new URL(BASE_URL).hostname
export const PAGE_SIZE = 20
export const SEARCH_ACCEPT = "text/html"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "passe a URL da vaga (https://www.infojobs.com.br/vaga-de-...__<id>.aspx, o campo `url` da busca)"

/** Modelo de trabalho aceito em --remote -> valor do filtro `idw` da página. */
export const WORKPLACE_FILTER: Record<string, string> = {
  presencial: "1", onsite: "1", "on-site": "1",
  remoto: "2", remote: "2", "home-office": "2",
  hibrido: "3", hybrid: "3",
}

export function buildSearchUrl(query: string, page: number, workplace?: string): string {
  const q = new URLSearchParams({ palabra: query })
  if (workplace) q.set("idw", workplace)
  if (page > 1) q.set("Page", String(page))
  return `${BASE_URL}/empregos.aspx?${q.toString()}`
}

/**
 * A página da vaga só existe com o caminho completo (o id sozinho não basta),
 * então o detalhe recebe a URL e guarda o caminho como referência.
 */
export function detailUrl(ref: string): string {
  return `${BASE_URL}${ref}`
}

function workplaceFrom(text: string | null): JobResult["workplace_type"] {
  const t = foldAccents(text ?? "")
  if (t === "home office") return "remote"
  if (t === "hibrido") return "hybrid"
  if (t === "presencial") return "on-site"
  return null
}

const pick = (chunk: string, re: RegExp): string | null => {
  const m = re.exec(chunk)
  return m ? m[1] : null
}

/** "2026/10/20 08:46:00" -> "2026-10-20". */
function cardDate(value: string | null): string | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(value ?? "")
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

/** Lê um cartão de vaga da página de resultados; null se faltar o essencial. */
export function parseCard(chunk: string): JobResult | null {
  // O pedaço começa logo depois de `<div id="vacancy`: o id é o número inicial.
  // (Cortar em outro ponto do cartão pega o data-id do cartão seguinte.)
  const id = pick(chunk, /^(\d+)"/)
  const title = inlineText(pick(chunk, /js_vacancyTitle">([\s\S]*?)<\/h2>/))
  const href = pick(chunk, /data-href="([^"]+)"/)
  if (!id || !title || !href) return null
  // O nome da empresa pode vir partido ("RHF Talentos - Vale do" + <span>"Ribeira/SP"</span>)
  // e traz um selo de verificação com tooltip: tira o selo e junta o texto do bloco.
  // O selo guarda HTML dentro de um atributo, então corta o texto antes dele.
  const companyHtml = pick(chunk, /<div class="text-body">([\s\S]*?)<\/div>/)
  const company = inlineText(companyHtml ? companyHtml.split(/<span[^>]*\bonclick=/)[0] : null)
  const place = inlineText(pick(chunk, /<div class="mb-8">\s*([^<]+?)\s*<span hidden/) ?? pick(chunk, /<div class="mb-8">\s*([^<]+?)\s*<\/div>/))
  // Os atributos (salário, experiência, escolaridade, modelo) vão até o trecho da descrição.
  const attrs = [...(pick(chunk, /<div class="d-inline-flex flex-wrap mb-8[^"]*"[^>]*>([\s\S]*?)<div class="text-medium">/) ?? "")
    .matchAll(/<div>([\s\S]*?)<\/div>/g)]
    .map((m) => inlineText(m[1]))
    .filter((x): x is string => !!x)
  const salary = attrs.find((a) => /R\$|a combinar/i.test(a)) ?? null
  const mode = attrs.map(workplaceFrom).find((w) => w !== null) ?? null
  const url = new URL(decodeHtmlEntities(href), BASE_URL)
  return {
    id,
    title,
    company,
    location: place ? (mode === "remote" ? `${place} (Home office)` : mode === "hybrid" ? `${place} (Híbrido)` : place) : null,
    date: cardDate(pick(chunk, /class="js_date" data-value="([^"]+)"/)),
    url: url.href,
    deadline: null,
    contract: null,
    workplace_type: mode,
    seniority: null,
    salary: salary && !/a combinar/i.test(salary) ? salary : null,
    description: inlineText(pick(chunk, /<div class="text-medium">([\s\S]*?)<\/div>/)),
  }
}

/** Cartões lidos um a um: um cartão malformado não derruba os outros. */
export function parseSearch(html: string): { rows: JobResult[]; total: number | null } | null {
  if (!/js_vacanciesGridFragment|js_vacancyLoad|Vagas de Emprego/i.test(html)) return null
  const chunks = html.split(/<div id="vacancy(?=\d)/).slice(1)
  const seen = new Set<string>()
  const rows: JobResult[] = []
  for (const chunk of chunks) {
    const row = parseCard(chunk)
    if (row && !seen.has(row.id)) {
      seen.add(row.id)
      rows.push(row)
    }
  }
  return { rows, total: null }
}

/** Caminho da vaga (/vaga-de-...__<id>.aspx) a partir da URL; null se não for da InfoJobs. */
export function parseRef(input: string): string | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (host !== HOST && host !== HOST.replace(/^www\./, "")) return null
  return /^\/vaga-de-[^/]+__\d+\.aspx$/i.test(url.pathname) ? url.pathname : null
}

/** "Regime de contratação de tipo Efetivo – CLT" e "Senioridade: Analista" vêm no texto da descrição. */
function descriptionField(text: string | null, re: RegExp): string | null {
  const m = re.exec(text ?? "")
  return m ? m[1].trim() : null
}

export function parseDetail(html: string, ref: string): JobResult | null {
  const ld = readJobPosting(html)
  if (!ld) return null
  const description = cleanHtml(ld.description)
  const id = pick(ref, /__(\d+)\.aspx$/i) ?? ref
  return {
    id,
    title: decodeHtmlEntities(ld.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: ld.hiringOrganization?.name?.trim() || null,
    location: ldLocation(ld),
    date: contractDate(ld.datePosted),
    url: detailUrl(ref),
    deadline: contractDate(ld.validThrough),
    contract: descriptionField(description, /Regime de contrata[çc][ãa]o de tipo ([^\n]+)/i),
    workplace_type: null,
    seniority: descriptionField(description, /Senioridade:\s*([^\n]+)/i),
    salary: formatSalary(ld.baseSalary?.value?.minValue, ld.baseSalary?.value?.maxValue),
    description,
  }
}
