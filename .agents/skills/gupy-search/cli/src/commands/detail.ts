import { httpGet, parseDetailPage, parseJobUrl, toDetail, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // URL da vaga: https://<empresa>.gupy.io/jobs/<id> ou /job/<base64>
  format: "json" | "plain"
}

function renderPlain(job: JobDetailResult): string {
  const lines: string[] = [job.title, `${job.company ?? "—"} · ${job.location ?? "—"}`]
  const field = (label: string, value: string | null) => {
    if (value) lines.push(`${label}: ${value}`)
  }
  field("Publicada em", job.date)
  field("Inscrições até", job.deadline)
  field("Regime", job.contract)
  field("Endereço", job.address)
  if (job.pcd) lines.push("Vaga afirmativa para pessoas com deficiência (PcD)")
  if (job.steps.length) lines.push(`Etapas: ${job.steps.join(" → ")}`)

  const section = (title: string, text: string | null) => {
    if (text) lines.push("", `## ${title}`, text)
  }
  section("Descrição", job.description)
  section("Responsabilidades", job.responsibilities)
  section("Requisitos", job.requirements)
  section("Informações adicionais", job.additional_info)
  lines.push("", `URL: ${job.url}`)
  return lines.join("\n")
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const ref = parseJobUrl(opts.id)
  if (!ref) {
    const hint = /^\d+$/.test(opts.id.trim())
      ? " - só o número não basta: a página da vaga fica no subdomínio da empresa, então passe a URL completa (o campo `url` da busca)"
      : ""
    writeError(`não reconheci uma URL de vaga da Gupy em "${opts.id}"${hint}`, "BAD_ID")
    return 1
  }
  try {
    const html = await httpGet(`https://${ref.subdomain}.gupy.io/jobs/${ref.id}`, "text/html")
    if (html === null) {
      writeError("vaga não encontrada (pode ter sido encerrada)", "NOT_FOUND")
      return 1
    }
    const raw = parseDetailPage(html)
    if (!raw) {
      writeError("a página da vaga não trouxe os dados (__NEXT_DATA__); a Gupy pode ter mudado o formato", "DETAIL_FAILED")
      return 1
    }
    const job = toDetail(raw, ref.subdomain)
    process.stdout.write((opts.format === "plain" ? renderPlain(job) : JSON.stringify(job, null, 2)) + "\n")
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
