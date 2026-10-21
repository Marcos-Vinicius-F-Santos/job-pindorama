import { describe, expect, test } from "bun:test";
import { parseJSON, runCLI } from "./helpers";

// Teste ao vivo contra o portal real. Fica desligado por padrão para o CI não
// depender da rede nem incomodar o portal; rode com PROGRAMATHOR_LIVE=1 bun test.
const live = process.env.PROGRAMATHOR_LIVE === "1";

describe.skipIf(!live)("Programathor ao vivo", () => {
  test("search devolve vagas com id, título e URL", async () => {
    const out = parseJSON<{ results: Array<{ id: string; title: string; url: string }> }>(await runCLI(["search", "-q", "python", "--limit", "3"]));
    expect(out.results.length).toBeGreaterThan(0);
    for (const job of out.results) {
      expect(job.id).toBeTruthy();
      expect(job.title).toBeTruthy();
      expect(job.url).toMatch(/^https:\/\/programathor\.com\.br\/jobs\/\d+-/);
    }
  });
});
