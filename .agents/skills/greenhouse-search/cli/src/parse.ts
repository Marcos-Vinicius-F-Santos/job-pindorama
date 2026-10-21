// Leitura específica do Greenhouse, o ATS de muitas empresas de tecnologia.
//
// - Fonte: a Job Board API pública e documentada do Greenhouse
//   (boards-api.greenhouse.io/v1/boards/<empresa>/jobs), feita para as empresas
//   exibirem as próprias vagas. Sem login, sem chave.
// - Não há busca entre empresas: cada empresa tem um "board". A CLI consulta os
//   boards de uma lista (boards.txt, editável) e filtra pelo título.
// - Detalhe: /v1/boards/<empresa>/jobs/<id>.

import { cleanHtml, contractDate, decodeHtmlEntities, foldAccents, type JobResult } from "./helpers.js"

export const API_URL = "https://boards-api.greenhouse.io/v1/boards"
export const SEARCH_ACCEPT = "application/json"
export const DETAIL_ACCEPT = "application/json"
export const REF_HINT = "passe a URL da vaga (job-boards.greenhouse.io/<empresa>/jobs/<id>) ou <empresa>/<id>"

export function boardUrl(board: string, withContent: boolean): string {
  return `${API_URL}/${encodeURIComponent(board)}/jobs${withContent ? "?content=true" : ""}`
}

export interface GreenhouseJob {
  id: number
  title?: string | null
  company_name?: string | null
  absolute_url?: string | null
  first_published?: string | null
  updated_at?: string | null
  application_deadline?: string | null
  location?: { name?: string | null } | null
  offices?: Array<{ name?: string | null; location?: string | null }> | null
  departments?: Array<{ name?: string | null }> | null
  content?: string | null
  language?: string | null
}

export interface GreenhouseResult extends JobResult {
  board: string
  department: string | null
  language: string | null
}

function workplace(text: string): JobResult["workplace_type"] {
  const t = foldAccents(text)
  if (/hibrid|hybrid/.test(t)) return "hybrid"
  if (/remot|anywhere|home office/.test(t)) return "remote"
  return null
}

export function toResult(j: GreenhouseJob, board: string): GreenhouseResult {
  const location = j.location?.name?.trim() || j.offices?.[0]?.location?.trim() || null
  // O conteúdo vem com o HTML escapado (&lt;p&gt;): decodifica antes de limpar.
  const content = j.content ? cleanHtml(decodeHtmlEntities(j.content)) : null
  return {
    id: String(j.id),
    title: decodeHtmlEntities(j.title ?? "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: j.company_name?.trim() || board,
    location,
    date: contractDate(j.first_published ?? j.updated_at),
    url: j.absolute_url?.trim() || `https://job-boards.greenhouse.io/${board}/jobs/${j.id}`,
    deadline: contractDate(j.application_deadline),
    contract: null,
    workplace_type: workplace(`${location ?? ""} ${j.title ?? ""}`),
    seniority: null,
    salary: null,
    description: content,
    board,
    department: j.departments?.[0]?.name?.trim() || null,
    language: j.language || null,
  }
}

export function parseBoard(body: string, board: string): GreenhouseResult[] | null {
  let data: { jobs?: GreenhouseJob[] }
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (!Array.isArray(data?.jobs)) return null
  return data.jobs.map((j) => toResult(j, board))
}

/** Todas as palavras da busca aparecem no título (sem acento, sem caixa). */
export function titleMatches(title: string, query: string): boolean {
  const t = foldAccents(title)
  return foldAccents(query).split(/\s+/).filter(Boolean).every((w) => t.includes(w))
}

/** Aceita job-boards.greenhouse.io/<empresa>/jobs/<id>, boards.greenhouse.io/<empresa>/jobs/<id> ou <empresa>/<id>. */
export function parseRef(input: string): string | null {
  const raw = input.trim()
  const short = /^([a-z0-9_-]+)\/(\d+)$/i.exec(raw)
  if (short) return `${short[1].toLowerCase()}/${short[2]}`
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (!/^(job-boards|boards)\.greenhouse\.io$/i.test(url.hostname)) return null
  const m = /^\/([a-z0-9_-]+)\/jobs\/(\d+)/i.exec(url.pathname)
  return m ? `${m[1].toLowerCase()}/${m[2]}` : null
}

export function detailUrl(ref: string): string {
  const [board, id] = ref.split("/")
  return `${API_URL}/${encodeURIComponent(board)}/jobs/${id}`
}

export function parseDetail(body: string, ref: string): GreenhouseResult | null {
  let job: GreenhouseJob
  try {
    job = JSON.parse(body)
  } catch {
    return null
  }
  if (!job || typeof job !== "object" || job.id == null) return null
  return toResult(job, ref.split("/")[0])
}

/** A lista de boards: um identificador por linha; `#` começa um comentário. */
export function parseBoardsFile(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/#.*/, "").trim().toLowerCase())
    .filter((l) => /^[a-z0-9_-]+$/.test(l))
}
