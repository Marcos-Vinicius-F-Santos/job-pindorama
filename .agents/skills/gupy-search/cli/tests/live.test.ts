import { describe, expect, test } from "bun:test";
import { parseJSON, runCLI } from "./helpers";

// Teste ao vivo contra o portal real. Fica desligado por padrão para o CI não
// depender da rede nem incomodar a Gupy; rode com GUPY_LIVE=1 bun test.
const live = process.env.GUPY_LIVE === "1";

describe.skipIf(!live)("Gupy ao vivo", () => {
  test("search devolve vagas com id, título e URL", async () => {
    const r = await runCLI(["search", "-q", "analista", "--limit", "3"]);
    const out = parseJSON<{ results: Array<{ id: string; title: string; url: string | null }> }>(r);
    expect(out.results.length).toBeGreaterThan(0);
    for (const job of out.results) {
      expect(job.id).toBeTruthy();
      expect(job.title).toBeTruthy();
      expect(job.url).toMatch(/^https:\/\/[a-z0-9-]+\.gupy\.io\/jobs\/\d+$/);
    }
  });

  test("detail lê a primeira vaga da busca", async () => {
    const s = parseJSON<{ results: Array<{ url: string }> }>(await runCLI(["search", "-q", "analista", "--limit", "1"]));
    const d = parseJSON<{ title: string; description: string | null }>(await runCLI(["detail", s.results[0].url]));
    expect(d.title).toBeTruthy();
  });
});
