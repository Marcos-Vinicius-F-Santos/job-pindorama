import { PORTAL, httpGet, renderDetailPlain, writeError } from "../helpers.js"
import { DETAIL_ACCEPT, REF_HINT, detailUrl, parseDetail, parseRef } from "../parse.js"

export interface DetailOpts {
  id: string // id da vaga ou URL da página da vaga
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = parseRef(opts.id)
  if (!id) {
    writeError(`não reconheci uma vaga de ${PORTAL} em "${opts.id}" (${REF_HINT})`, "BAD_ID")
    return 1
  }
  try {
    const body = await httpGet(detailUrl(id), DETAIL_ACCEPT)
    if (body === null) {
      writeError("vaga não encontrada (pode ter sido encerrada)", "NOT_FOUND")
      return 1
    }
    const job = parseDetail(body, id)
    if (!job) {
      writeError(`a página da vaga não trouxe os dados esperados; ${PORTAL} pode ter mudado o formato (veja url-reference.md)`, "DETAIL_FAILED")
      return 1
    }
    process.stdout.write((opts.format === "plain" ? renderDetailPlain(job) : JSON.stringify(job, null, 2)) + "\n")
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
