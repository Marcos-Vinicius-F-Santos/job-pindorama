// Leitura específica da AGROSearch (agrosearch.com.br), consultoria de recrutamento
// do agronegócio, pelo portal de vagas "Agroforce" dela.
//
// - Busca: a API pública que o portal chama, /v1/public/vagas, que devolve todas as
//   vagas abertas de uma vez (dezenas): `dealId`, `titulo` (em geral com o local
//   depois de "|" ou "–") e `modelo` (texto livre com regime, benefícios, modelo de
//   trabalho). A CLI filtra pelo título do lado dela.
// - Detalhe: /v1/public/vagas/<dealId>, com `divisao`, `descricao`,
//   `responsabilidades[]`, `requisitos[]` e `modelo`.
// - `dealId` negativo é recrutamento interno da própria AGROSearch (consultores
//   freelancers, vendas internacionais).
// A API fica num gateway do Azure (configurado em agroforce.agrosearch.com.br/config.js).
// robots.txt: nem o portal nem a API publicam um (404). Termos de uso: não
// encontrados no site.

import { decodeHtmlEntities, foldAccents, type JobResult } from "./helpers.js"

export const API_URL = "https://apim-agroforce-prod.azure-api.net/v1/public/vagas"
export const PORTAL_URL = "https://agroforce.agrosearch.com.br/portal.html"
export const SEARCH_ACCEPT = "application/json"
export const DETAIL_ACCEPT = "application/json"
export const REF_HINT = "passe o dealId (número da vaga) ou a URL do portal (.../portal.html#/vaga/<dealId>)"
export const COMPANY = "AGROSearch (cliente)"

export function jobUrl(id: number | string): string {
  return `${PORTAL_URL}#/vaga/${id}`
}

export function detailUrl(id: string): string {
  return `${API_URL}/${id}`
}

interface AgroSearchJob {
  dealId: number
  titulo?: string | null
  modelo?: string | null
  divisao?: string | null
  descricao?: string | null
  responsabilidades?: string[] | null
  requisitos?: string[] | null
}

export interface AgroSearchResult extends JobResult {
  division: string | null
  internal: boolean
}

/**
 * O local é o trecho depois do último separador do título:
 * "Especialista Em Crédito | Curitiba - PR" -> "Curitiba - PR" ("|" e "–" têm
 * prioridade sobre o hífen); "Supervisor Técnico Comercial - Guarapuava/PR" ->
 * "Guarapuava/PR"; "RTV – Fertilizantes | MG/SP" -> "MG/SP".
 */
export function placeFromTitle(title: string): string | null {
  for (const sep of [/\s\|\s/, /\s–\s/, /\s-\s/]) {
    const parts = title.split(sep)
    if (parts.length > 1) return parts[parts.length - 1].trim() || null
  }
  return null
}

function workplace(text: string): JobResult["workplace_type"] {
  const t = foldAccents(text)
  if (/hibrid/.test(t)) return "hybrid"
  if (/remot|home ?office/.test(t)) return "remote"
  if (/presencial|100% externa/.test(t)) return "on-site"
  return null
}

function contractFrom(text: string): string | null {
  const t = foldAccents(text)
  const found = [/\bclt\b/.test(t) ? "CLT" : null, /\bpj\b/.test(t) ? "PJ" : null, /freelanc/.test(t) ? "Freelancer" : null].filter(Boolean)
  return found.join(", ") || null
}

const lines = (list: string[] | null | undefined) =>
  (list ?? []).map((l) => decodeHtmlEntities(String(l)).trim().replace(/^[-•*o]\s+/, "")).filter(Boolean)

export function toResult(j: AgroSearchJob): AgroSearchResult | null {
  const title = decodeHtmlEntities(j.titulo ?? "").replace(/\s+/g, " ").trim()
  if (typeof j.dealId !== "number" || !title) return null
  const conditions = decodeHtmlEntities(j.modelo ?? "").trim()
  const parts = [
    j.descricao?.trim() ? decodeHtmlEntities(j.descricao).trim() : null,
    lines(j.responsabilidades).length ? `## Responsabilidades\n${lines(j.responsabilidades).map((l) => `- ${l}`).join("\n")}` : null,
    lines(j.requisitos).length ? `## Requisitos\n${lines(j.requisitos).map((l) => `- ${l}`).join("\n")}` : null,
    conditions ? `## Condições\n${conditions}` : null,
  ].filter(Boolean)
  return {
    id: String(j.dealId),
    title,
    company: j.dealId < 0 ? "AGROSearch" : COMPANY,
    // Vagas internas têm o título "AGROSearch | <cargo>": o último trecho não é local.
    location: j.dealId < 0 ? null : placeFromTitle(title),
    date: null,
    url: jobUrl(j.dealId),
    deadline: null,
    contract: contractFrom(conditions),
    workplace_type: workplace(`${conditions} ${title}`),
    seniority: null,
    salary: null,
    description: parts.join("\n\n") || null,
    division: j.divisao?.trim() || null,
    internal: j.dealId < 0,
  }
}

export function parseSearch(body: string): { rows: AgroSearchResult[]; total: number | null } | null {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (!Array.isArray(data)) return null
  const rows = (data as AgroSearchJob[]).map(toResult).filter((r): r is AgroSearchResult => r !== null)
  return { rows, total: rows.length }
}

export function parseRef(input: string): string | null {
  const raw = input.trim()
  if (/^-?\d+$/.test(raw)) return raw
  const m = /agroforce\.agrosearch\.com\.br\/portal\.html#\/vaga\/(-?\d+)/i.exec(raw)
  return m ? m[1] : null
}

export function parseDetail(body: string, id: string): AgroSearchResult | null {
  let data: AgroSearchJob
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (!data || String(data.dealId) !== id) return null
  return toResult(data)
}
