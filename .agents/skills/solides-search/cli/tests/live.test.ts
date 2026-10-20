import { describe, expect, test } from "bun:test";
import { parseJSON, runCLI } from "./helpers";

// Teste ao vivo contra o portal real. Fica desligado por padrão para o CI não
// depender da rede nem incomodar o portal; rode com SOLIDES_LIVE=1 bun test.
const live = process.env.SOLIDES_LIVE === "1";

describe.skipIf(!live)("Sólides ao vivo", () => {
  test("search devolve vagas com id, título e URL; detail lê a primeira", async () => {
    const r = await runCLI(["search", "-q", "analista", "--limit", "3"]);
    const out = parseJSON<{ results: Array<{ id: string; title: string; url: string }> }>(r);
    expect(out.results.length).toBeGreaterThan(0);
    for (const job of out.results) {
      expect(job.id).toBeTruthy();
      expect(job.title).toBeTruthy();
      // Vagas do RH Gestor apontam para a página externa delas.
      expect(job.url).toMatch(/^https:\/\/(vagas\.solides\.com\.br\/vaga\/\d+|[a-z0-9-]+\.rhgestor\.com\.br\/)/);
    }
    const own = out.results.find((j) => /vagas\.solides\.com\.br/.test(j.url));
    if (!own) return;
    const d = parseJSON<{ title: string }>(await runCLI(["detail", own.url]));
    expect(d.title).toBeTruthy();
  });
});
