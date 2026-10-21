import { describe, expect, test } from "bun:test";
import { parseJSON, runCLI } from "./helpers";

// Teste ao vivo contra o portal real. Fica desligado por padrão para o CI não
// depender da rede nem incomodar o portal; rode com AGROSEARCH_LIVE=1 bun test.
const live = process.env.AGROSEARCH_LIVE === "1";

describe.skipIf(!live)("AGROSearch ao vivo", () => {
  test("search devolve vagas com id, título e URL; detail lê a primeira", async () => {
    const out = parseJSON<{ results: Array<{ id: string; title: string; url: string }> }>(await runCLI(["search", "--no-internal", "--limit", "3"]));
    expect(out.results.length).toBeGreaterThan(0);
    for (const job of out.results) {
      expect(job.id).toBeTruthy();
      expect(job.title).toBeTruthy();
      expect(job.url).toMatch(/^https:\/\/agroforce\.agrosearch\.com\.br\/portal\.html#\/vaga\/\d+$/);
    }
    const d = parseJSON<{ title: string }>(await runCLI(["detail", out.results[0].url]));
    expect(d.title).toBeTruthy();
  });
});
