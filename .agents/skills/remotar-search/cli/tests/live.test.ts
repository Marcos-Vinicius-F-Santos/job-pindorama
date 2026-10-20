import { describe, expect, test } from "bun:test";
import { parseJSON, runCLI } from "./helpers";

// Teste ao vivo contra o portal real. Fica desligado por padrão para o CI não
// depender da rede nem incomodar o portal; rode com REMOTAR_LIVE=1 bun test.
const live = process.env.REMOTAR_LIVE === "1";

describe.skipIf(!live)("Remotar ao vivo", () => {
  test("search devolve vagas com id, título e URL; detail lê a primeira", async () => {
    const r = await runCLI(["search", "-q", "product manager", "--category", "produto", "--limit", "3"]);
    const out = parseJSON<{ results: Array<{ id: string; title: string; url: string }> }>(r);
    expect(out.results.length).toBeGreaterThan(0);
    for (const job of out.results) {
      expect(job.id).toBeTruthy();
      expect(job.title).toBeTruthy();
      expect(job.url).toMatch(/^https:\/\/remotar\.com\.br\/job\/\d+$/);
    }
    const d = parseJSON<{ title: string }>(await runCLI(["detail", out.results[0].url]));
    expect(d.title).toBeTruthy();
  });
});
