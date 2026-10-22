import { describe, expect, test } from "bun:test";
import { parseJSON, runCLI } from "./helpers";

// Teste ao vivo contra o portal real. Fica desligado por padrão para o CI não
// depender da rede nem incomodar o portal; rode com EMPREGOS_LIVE=1 bun test.
const live = process.env.EMPREGOS_LIVE === "1";

describe.skipIf(!live)("Empregos.com.br ao vivo", () => {
  test("search devolve vagas com id, título e URL; detail lê a primeira", async () => {
    const out = parseJSON<{ results: Array<{ id: string; title: string; url: string }> }>(
      await runCLI(["search", "-q", "analista", "--pages", "1", "--limit", "3"]),
    );
    expect(out.results.length).toBeGreaterThan(0);
    for (const job of out.results) {
      expect(job.id).toMatch(/^\d+$/);
      expect(job.title).toBeTruthy();
      expect(job.url).toMatch(/^https:\/\/www\.empregos\.com\.br\/vaga\//);
    }
    const d = parseJSON<{ title: string; description: string }>(await runCLI(["detail", out.results[0].url]));
    expect(d.title).toBeTruthy();
    expect(d.description).toBeTruthy();
  });
});
