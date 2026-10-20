// Fonte de dados: o Portal Gupy (portal.gupy.io), o agregador público das vagas
// que as empresas publicam no ATS da Gupy.
//
// - Busca: a rota JSON que a própria página de busca do portal chama
//   (/api/job-search/jobs). Sem login, sem chave. robots.txt do portal: tudo liberado.
// - Detalhe: a página pública da vaga (https://<empresa>.gupy.io/jobs/<id>), que
//   traz os dados completos no bloco __NEXT_DATA__ (JSON do Next.js). O robots.txt
//   das páginas de empresa libera /jobs e só bloqueia /companies e /candidates.
//
// Zero dependências de execução: bun + fetch + regex.

export const PORTAL_URL = "https://portal.gupy.io"
export const SEARCH_PATH = "/api/job-search/jobs"
// Domínio raiz das páginas de carreira (cada empresa tem um subdomínio). Usado
// para validar URLs de vaga e, de quebra, declara o domínio para a checagem de
// procedência do /apply.
export const GUPY_DOMAIN_URL = "https://gupy.io"
const GUPY_DOMAIN = new URL(GUPY_DOMAIN_URL).hostname

// User-Agent honesto, que diz o nome da ferramenta (convenção de todas as CLIs
// de portal deste repositório): nunca se passa por um navegador. Sem URL de
// contato de propósito: toda URL literal nos fontes conta como host do portal na
// checagem de procedência do /apply (tests/test_apply_host_check.py).
const UA = "Mozilla/5.0 (compatible; gupy-cli/1.0)"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

// Teto do tempo total de espera entre tentativas de um mesmo pedido.
const RETRY_BUDGET_MS = 30_000

/** Espera pedida por `Retry-After` (segundos ou data HTTP), em ms; null se ausente. */
export function retryAfterMs(header: string | null, now = Date.now()): number | null {
  if (!header) return null
  const value = header.trim()
  if (/^\d+$/.test(value)) return Number(value) * 1000
  const date = Date.parse(value)
  if (Number.isNaN(date)) return null
  return Math.max(date - now, 0)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * GET com backoff exponencial e jitter em 429/5xx (até 6 novas tentativas,
 * dentro de RETRY_BUDGET_MS). Devolve `null` em 404. Falha de conexão falha
 * rápido, sem nova tentativa, para uma queda do portal não travar o /scrape.
 */
export async function httpGet(url: string, accept: string): Promise<string | null> {
  const maxRetries = 6
  let delay = 500
  let waited = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "pt-BR,pt;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      })
    } catch (e) {
      throw new Error(`não foi possível acessar a Gupy (${e instanceof Error ? e.message : String(e)})`)
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`a Gupy recusou o pedido: ${response.status} ${response.statusText}`)
      }
      const backoff = delay + Math.floor(Math.random() * 500)
      const wait = Math.max(backoff, retryAfterMs(response.headers.get("Retry-After")) ?? 0)
      if (waited + wait > RETRY_BUDGET_MS) {
        throw new Error(
          `a Gupy recusou o pedido: ${response.status} ${response.statusText}; ` +
            `pediu ${Math.ceil(wait / 1000)}s de espera, além do limite de ${RETRY_BUDGET_MS / 1000}s desta CLI`,
        )
      }
      await sleep(wait)
      waited += wait
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`a Gupy recusou o pedido: ${response.status} ${response.statusText}`)
    return await response.text()
  }
  throw new Error("a Gupy recusou o pedido depois de todas as tentativas")
}

// ---------------------------------------------------------------------------
// Vocabulários
// ---------------------------------------------------------------------------

/** Regime de contratação: apelido aceito em --type -> código da Gupy. */
export const CONTRACT_TYPES: Record<string, string> = {
  clt: "vacancy_type_effective",
  efetivo: "vacancy_type_effective",
  pj: "vacancy_legal_entity",
  estagio: "vacancy_type_internship",
  trainee: "vacancy_type_trainee",
  aprendiz: "vacancy_type_apprentice",
  temporario: "vacancy_type_temporary",
  terceiro: "vacancy_type_outsource",
  autonomo: "vacancy_type_autonomous",
  freelancer: "vacancy_type_freelancer",
  intermitente: "vacancy_type_intermittent",
  associado: "vacancy_type_associate",
  docente: "vacancy_type_lecturer",
  voluntario: "vacancy_type_volunteer",
  "banco-de-talentos": "vacancy_type_talent_pool",
  "summer-job": "vacancy_type_summer",
}

/** Código da Gupy -> rótulo legível (o mesmo texto que o portal mostra). */
export const CONTRACT_LABELS: Record<string, string> = {
  vacancy_type_effective: "CLT (efetivo)",
  vacancy_legal_entity: "PJ (pessoa jurídica)",
  vacancy_type_internship: "Estágio",
  vacancy_type_trainee: "Trainee",
  vacancy_type_apprentice: "Jovem aprendiz",
  vacancy_type_temporary: "Temporário",
  vacancy_type_outsource: "Terceirizado",
  vacancy_type_autonomous: "Autônomo",
  vacancy_type_freelancer: "Freelancer",
  vacancy_type_intermittent: "Intermitente",
  vacancy_type_associate: "Associado",
  vacancy_type_lecturer: "Docente",
  vacancy_type_volunteer: "Voluntário",
  vacancy_type_talent_pool: "Banco de talentos",
  vacancy_type_summer: "Summer job",
  vacancy_type_parter: "Sócio",
}

/** Modelo de trabalho: valor aceito em --remote -> valor da Gupy. */
export const WORKPLACE_TYPES: Record<string, string> = {
  remote: "remote",
  remoto: "remote",
  hybrid: "hybrid",
  hibrido: "hybrid",
  onsite: "on-site",
  "on-site": "on-site",
  presencial: "on-site",
}

const WORKPLACE_LABELS: Record<string, string> = { remote: "Remoto", hybrid: "Híbrido", "on-site": "Presencial" }

/** UF -> nome do estado como a Gupy grava (o filtro `state` usa o nome completo). */
export const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
}

const NAME_TO_UF: Record<string, string> = Object.fromEntries(
  Object.entries(UF_NAMES).map(([uf, name]) => [foldAccents(name), uf]),
)

/** Minúsculas e sem acento, para comparar o que a pessoa digita. */
export function foldAccents(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

/** Aceita "SP", "sp", "São Paulo" ou "sao paulo"; devolve o nome oficial ou null. */
export function resolveState(input: string): string | null {
  const raw = input.trim()
  const uf = raw.toUpperCase()
  if (UF_NAMES[uf]) return UF_NAMES[uf]
  const byName = NAME_TO_UF[foldAccents(raw)]
  return byName ? UF_NAMES[byName] : null
}

/** "São Paulo" -> "SP" (null se não for um estado conhecido). */
export function stateToUf(state: string | null | undefined): string | null {
  if (!state) return null
  return NAME_TO_UF[foldAccents(state)] ?? null
}

// ---------------------------------------------------------------------------
// Formatos de dados
// ---------------------------------------------------------------------------

/** Uma vaga como a busca do portal devolve (só os campos que esta CLI lê). */
export interface GupySearchJob {
  id: number
  name: string
  description?: string | null
  careerPageName?: string | null
  type?: string | null
  publishedDate?: string | null
  applicationDeadline?: string | null
  workplaceType?: string | null
  city?: string | null
  state?: string | null
  jobUrl?: string | null
  disabilities?: boolean | null
}

export interface GupySearchResponse {
  data: GupySearchJob[]
  pagination?: { total?: number; limit?: number; offset?: number }
}

/**
 * Resultado no formato do contrato de portais: `id`, `title`, `company`,
 * `location`, `date` (AAAA-MM-DD) e `url`, com `null` quando faltar - nunca
 * omitidos. Os demais campos são extras permitidos.
 */
export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string | null
  deadline: string | null
  contract: string | null
  contract_code: string | null
  workplace_type: string | null
  city: string | null
  state: string | null
  pcd: boolean
  description: string | null
}

/** A parte AAAA-MM-DD de um carimbo ISO, ou null. */
export function contractDate(value: string | null | undefined): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? "")
  return m ? m[1] : null
}

/** "Cidade, UF", "Remoto" ou o que houver; null quando nada for conhecido. */
export function formatLocation(
  city: string | null | undefined,
  state: string | null | undefined,
  workplaceType: string | null | undefined,
): string | null {
  const uf = stateToUf(state) ?? (state || null)
  const place = [city || null, uf].filter(Boolean).join(", ")
  const mode = workplaceType ? WORKPLACE_LABELS[workplaceType] : undefined
  if (place && mode && mode !== "Presencial") return `${place} (${mode})`
  if (place) return place
  return mode ?? null
}

/**
 * URL canônica da vaga: https://<empresa>.gupy.io/jobs/<id>. A busca devolve
 * `jobUrl` no formato /job/<base64>?jobBoardSource=gupy_portal; o subdomínio
 * vem de lá. A forma canônica é estável e é a mesma que a página declara como
 * <link rel=canonical>, então a deduplicação do /scrape não se confunde.
 */
export function canonicalJobUrl(jobUrl: string | null | undefined, id: number | string): string | null {
  const sub = companySubdomain(jobUrl)
  return sub ? `https://${sub}.${GUPY_DOMAIN}/jobs/${id}` : null
}

/** Subdomínio da empresa numa URL *.gupy.io, ou null se não for uma página de carreira. */
export function companySubdomain(url: string | null | undefined): string | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
  const host = parsed.hostname.toLowerCase()
  const suffix = `.${GUPY_DOMAIN}`
  if (!host.endsWith(suffix)) return null
  const sub = host.slice(0, -suffix.length)
  // Um único rótulo; subdomínios de infraestrutura não são páginas de vaga.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(sub)) return null
  if (["portal", "login", "api", "www", "attachments", "suporte-candidatos", "pravoce"].includes(sub)) return null
  return sub
}

/** Converte uma vaga da busca para o formato do contrato. */
export function toResult(j: GupySearchJob): JobResult {
  const code = j.type || null
  return {
    id: String(j.id),
    title: decodeHtmlEntities(j.name || "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: j.careerPageName?.trim() || null,
    location: formatLocation(j.city, j.state, j.workplaceType),
    date: contractDate(j.publishedDate),
    url: canonicalJobUrl(j.jobUrl, j.id),
    deadline: contractDate(j.applicationDeadline),
    contract: code ? (CONTRACT_LABELS[code] ?? code) : null,
    contract_code: code,
    workplace_type: j.workplaceType || null,
    city: j.city || null,
    state: j.state || null,
    pcd: j.disabilities === true,
    description: cleanHtml(j.description),
  }
}

// ---------------------------------------------------------------------------
// Detalhe
// ---------------------------------------------------------------------------

/** O objeto `job` do __NEXT_DATA__ da página de vaga (campos lidos aqui). */
export interface GupyDetailJob {
  id: number
  name: string
  description?: string | null
  responsibilities?: string | null
  prerequisites?: string | null
  relevantExperiences?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressStateShortName?: string | null
  addressLine?: string | null
  jobType?: string | null
  workplaceType?: string | null
  publishedAt?: string | null
  registerEndDate?: string | null
  expiresAt?: string | null
  handicapped?: boolean | null
  jobSteps?: Array<{ name?: string | null }> | null
  careerPage?: { name?: string | null } | null
}

export interface JobDetailResult extends JobResult {
  address: string | null
  responsibilities: string | null
  requirements: string | null
  additional_info: string | null
  steps: string[]
}

/** Lê o JSON do bloco <script id="__NEXT_DATA__"> e devolve `props.pageProps.job`. */
export function parseDetailPage(html: string): GupyDetailJob | null {
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)
  if (!m) return null
  let data: unknown
  try {
    data = JSON.parse(m[1])
  } catch {
    return null
  }
  const job = (data as { props?: { pageProps?: { job?: GupyDetailJob } } })?.props?.pageProps?.job
  return job && typeof job === "object" && job.id != null ? job : null
}

export function toDetail(j: GupyDetailJob, subdomain: string): JobDetailResult {
  const code = j.jobType || null
  return {
    id: String(j.id),
    title: decodeHtmlEntities(j.name || "").replace(/\s+/g, " ").trim() || "(sem título)",
    company: j.careerPage?.name?.trim() || null,
    location: formatLocation(j.addressCity, j.addressState, j.workplaceType),
    date: contractDate(j.publishedAt),
    url: `https://${subdomain}.${GUPY_DOMAIN}/jobs/${j.id}`,
    deadline: contractDate(j.registerEndDate ?? j.expiresAt),
    contract: code ? (CONTRACT_LABELS[code] ?? code) : null,
    contract_code: code,
    workplace_type: j.workplaceType || null,
    city: j.addressCity || null,
    state: j.addressState || null,
    pcd: j.handicapped === true,
    address: j.addressLine?.trim() || null,
    description: cleanHtml(j.description),
    responsibilities: cleanHtml(j.responsibilities),
    requirements: cleanHtml(j.prerequisites),
    additional_info: cleanHtml(j.relevantExperiences),
    steps: (j.jobSteps ?? []).map((s) => s?.name?.trim() || "").filter(Boolean),
  }
}

/**
 * Extrai (subdomínio, id) de uma URL de vaga da Gupy. Aceita as duas formas:
 * - https://empresa.gupy.io/jobs/12749301
 * - https://empresa.gupy.io/job/<base64 de {"jobId":12749301,...}>
 * Hosts de fora de *.gupy.io são recusados (URLs parecidas, como
 * gupy.io.exemplo.com, caem do lado da recusa porque a URL é analisada de verdade).
 */
export function parseJobUrl(input: string): { subdomain: string; id: string } | null {
  const trimmed = input.trim()
  const sub = companySubdomain(trimmed)
  if (!sub) return null
  const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  const path = parsed.pathname.replace(/\/+$/, "")
  const direct = /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/jobs\/(\d+)$/i.exec(path)
  if (direct) return { subdomain: sub, id: direct[1] }
  const encoded = /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/job\/([A-Za-z0-9_+=-]+)$/i.exec(path)
  if (encoded) {
    try {
      const json = JSON.parse(Buffer.from(encoded[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"))
      const id = json?.jobId
      if (Number.isInteger(id) && id > 0) return { subdomain: sub, id: String(id) }
    } catch {
      return null
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
}

/** HTML -> texto legível: blocos viram quebras de linha, tags somem, entidades decodificadas. */
export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+- /g, "\n- ") // itens de lista seguidos, sem linha em branco entre eles
    .replace(/^- \n/gm, "") // <li> vazio
    .trim()
  return text || null
}
