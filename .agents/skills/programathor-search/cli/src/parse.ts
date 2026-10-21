// Leitura específica do Programathor (programathor.com.br), portal de vagas de
// tecnologia (desenvolvimento, dados, DevOps).
//
// - Busca: a página HTML de resultados. Não há busca por texto livre (`?search=`
//   é ignorado): a busca é por tecnologia, na página /jobs-<tecnologia>
//   (ex.: /jobs-python, /jobs-scrum), ou na lista geral /jobs, com os filtros
//   remoto=true, expertise=Júnior|Pleno|Sênior e contract_type=CLT|PJ|Estágio.
//   A lista geral pagina em /jobs/page/<n>; as páginas por tecnologia, não.
// - Cartões com a classe `opacity` (título em cinza) são vagas encerradas que o
//   portal ainda lista: ficam de fora.
// - Detalhe: a página da vaga (/jobs/<id>-<slug>) responde 500 a visitantes sem
//   login, inclusive com cabeçalhos de navegador. A CLI não tem `detail` útil:
//   devolve DETAIL_UNAVAILABLE. O cartão já traz empresa, local, nível, regime e
//   tecnologias; não traz data nem descrição.
// robots.txt: /jobs liberado. Termos de uso: sem proibição de acesso automatizado.

import { decodeHtmlEntities, foldAccents, inlineText, type JobResult } from "./helpers.js"

export const BASE_URL = "https://programathor.com.br"
const HOST = new URL(BASE_URL).hostname
export const SEARCH_ACCEPT = "text/html"
export const DETAIL_ACCEPT = "text/html"
export const REF_HINT = "a página de vaga do Programathor só abre com login; use os campos da busca"

export const LEVELS: Record<string, string> = { junior: "Júnior", pleno: "Pleno", senior: "Sênior" }
export const CONTRACTS: Record<string, string> = { clt: "CLT", pj: "PJ", estagio: "Estágio" }

/** "Python" -> "python", "CI/CD" -> "CI-CD": o trecho do caminho /jobs-<tecnologia>. */
export function tagSlug(query: string): string {
  return query.trim().replace(/[\s/]+/g, "-")
}

export function buildSearchUrl(opts: { tag?: string; remote: boolean; level?: string; contract?: string; page: number }): string {
  const path = opts.tag ? `/jobs-${encodeURIComponent(tagSlug(opts.tag))}` : opts.page > 1 ? `/jobs/page/${opts.page}` : "/jobs"
  const q = new URLSearchParams()
  if (opts.remote) q.set("remoto", "true")
  if (opts.level) q.set("expertise", opts.level)
  if (opts.contract) q.set("contract_type", opts.contract)
  const qs = q.toString()
  return `${BASE_URL}${path}${qs ? `?${qs}` : ""}`
}

const span = (chunk: string, icon: RegExp): string | null => {
  const m = new RegExp(`<i class='[^']*${icon.source}[^']*'></i>([^<]*)</span>`).exec(chunk)
  return m ? inlineText(m[1]) : null
}

export interface ProgramathorResult extends JobResult {
  company_size: string | null
  tags: string[]
}

function workplace(location: string | null): JobResult["workplace_type"] {
  const t = foldAccents(location ?? "")
  if (/remot/.test(t)) return "remote"
  if (/hibrid/.test(t)) return "hybrid"
  return null
}

/** Lê um cartão; null se faltar o essencial ou se a vaga estiver encerrada. */
export function parseCard(chunk: string): ProgramathorResult | null {
  const href = /<a href="(\/jobs\/(\d+)-[^"]*)"/.exec(chunk)
  const title = inlineText(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(chunk)?.[1] ?? null)
  if (!href || !title) return null
  const location = span(chunk, /fa-map-marker-alt/)
  return {
    id: href[2],
    title: decodeHtmlEntities(title),
    company: span(chunk, /fa-briefcase/),
    location,
    date: null,
    url: `${BASE_URL}${href[1]}`,
    deadline: null,
    contract: span(chunk, /fa-file-alt/),
    workplace_type: workplace(location),
    seniority: span(chunk, /fa-chart-bar/),
    salary: null,
    description: null,
    company_size: span(chunk, /fa-building/),
    tags: [...chunk.matchAll(/<span class='tag-list[^']*'>([^<]*)<\/span>/g)].map((m) => decodeHtmlEntities(m[1]).trim()).filter(Boolean),
  }
}

export function parseSearch(html: string): { rows: ProgramathorResult[]; total: number | null } | null {
  if (!/class="cell-list|Vagas para Programador|Vagas .* para Desenvolvedor/i.test(html)) return null
  // Só o contêiner do cartão: "cell-list-content", dentro dele, não conta.
  const chunks = html.split(/<div class="cell-list(?=[ "])/).slice(1)
  const rows: ProgramathorResult[] = []
  for (const chunk of chunks) {
    if (/^\s*opacity|^[^"]*opacity/.test(chunk.slice(0, 40))) continue // encerrada
    const row = parseCard(chunk)
    if (row) rows.push(row)
  }
  return { rows, total: null }
}

export function parseRef(input: string): string | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return /^\d+$/.test(input.trim()) ? input.trim() : null
  }
  if (url.hostname.toLowerCase() !== HOST) return null
  return /^\/jobs\/(\d+)/.exec(url.pathname)?.[1] ?? null
}

export function detailUrl(id: string): string {
  return `${BASE_URL}/jobs/${id}`
}

/** A página de vaga responde 500 a visitantes: nunca há o que ler (ver o topo do arquivo). */
export function parseDetail(_html: string, _id: string): JobResult | null {
  return null
}
