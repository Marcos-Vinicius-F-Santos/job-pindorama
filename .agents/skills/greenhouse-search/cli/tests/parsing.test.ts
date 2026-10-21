import { afterEach, describe, expect, test } from "bun:test";
import { boardUrl, detailUrl, parseBoard, parseBoardsFile, parseDetail, parseRef, titleMatches } from "../src/parse";
import { runSearch } from "../src/commands/search";

// Amostras reduzidas no formato real da Job Board API do Greenhouse.

const originalFetch = globalThis.fetch;
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;
afterEach(() => {
  globalThis.fetch = originalFetch;
  process.stdout.write = originalStdout;
  process.stderr.write = originalStderr;
});

const job = (id: number, title: string, location: string, published: string, extra: Record<string, unknown> = {}) => ({
  id, title, company_name: "Grupo QuintoAndar", location: { name: location },
  absolute_url: `https://job-boards.greenhouse.io/quintoandar/jobs/${id}`,
  first_published: published, updated_at: published, departments: [{ name: "Produto" }], language: "pt",
  ...extra,
});

const board = JSON.stringify({
  jobs: [
    job(1, "Senior Product Manager | Pagamentos", "Remoto - Brasil", "2026-10-19T10:00:00-04:00",
      { content: "&lt;p&gt;Buscamos &lt;strong&gt;PM&lt;/strong&gt;&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Roadmap&lt;/li&gt;&lt;/ul&gt;" }),
    job(2, "Analista de Dados", "São Paulo, Brazil", "2026-10-18T10:00:00-04:00"),
    job(3, "Product Manager (Híbrido)", "São Paulo", "2026-09-01T10:00:00-04:00"),
  ],
  meta: { total: 3 },
});

describe("busca", () => {
  test("URL do board, com e sem descrição", () => {
    expect(boardUrl("quintoandar", false)).toBe("https://boards-api.greenhouse.io/v1/boards/quintoandar/jobs");
    expect(boardUrl("quintoandar", true)).toBe("https://boards-api.greenhouse.io/v1/boards/quintoandar/jobs?content=true");
  });

  test("vaga no formato do contrato; conteúdo com HTML escapado vira texto", () => {
    const [pm] = parseBoard(board, "quintoandar")!;
    expect(pm).toMatchObject({
      id: "1", title: "Senior Product Manager | Pagamentos", company: "Grupo QuintoAndar",
      location: "Remoto - Brasil", date: "2026-10-19", url: "https://job-boards.greenhouse.io/quintoandar/jobs/1",
      workplace_type: "remote", board: "quintoandar", department: "Produto", language: "pt",
      description: "Buscamos PM\n- Roadmap",
    });
  });

  test("filtro do título: todas as palavras, sem acento nem caixa", () => {
    expect(titleMatches("Senior Product Manager | Pagamentos", "product manager")).toBe(true);
    expect(titleMatches("Gerente de Produto", "gerente produto")).toBe(true);
    expect(titleMatches("Analista de Dados", "product")).toBe(false);
  });

  test("lista de boards: comentários e linhas inválidas ficam de fora", () => {
    expect(parseBoardsFile("# comentário\nstone\nquintoandar   # QA\n\nnão vale\nc6bank\n")).toEqual(["stone", "quintoandar", "c6bank"]);
  });

  test("runSearch junta os boards, filtra, ordena por data e informa board que falhou", async () => {
    const urls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      urls.push(url);
      return url.includes("/quintoandar/") ? new Response(board) : new Response("nada", { status: 404 });
    }) as unknown as typeof fetch;
    let out = "";
    let err = "";
    process.stdout.write = ((c: string | Uint8Array) => ((out += c.toString()), true)) as typeof process.stdout.write;
    process.stderr.write = ((c: string | Uint8Array) => ((err += c.toString()), true)) as typeof process.stderr.write;
    const code = await runSearch({ query: "product manager", boards: ["quintoandar", "naoexiste"], page: 1, limit: 25, jobage: 9999, format: "json", includeDescription: false });
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(parsed.results.map((r: { id: string }) => r.id)).toEqual(["1", "3"]);
    expect(parsed.meta.failed_boards).toEqual(["naoexiste"]);
    expect(err).toContain("naoexiste");
    expect(urls).toHaveLength(2);
  });

  test("nenhum board respondendo é erro", async () => {
    globalThis.fetch = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    let err = "";
    process.stderr.write = ((c: string | Uint8Array) => ((err += c.toString()), true)) as typeof process.stderr.write;
    expect(await runSearch({ query: "x", boards: ["a"], page: 1, limit: 25, jobage: 9999, format: "json", includeDescription: false })).toBe(1);
    expect(JSON.parse(err).code).toBe("SEARCH_FAILED");
  });
});

describe("detalhe", () => {
  test("referência: URL do board ou empresa/id", () => {
    expect(parseRef("https://job-boards.greenhouse.io/quintoandar/jobs/4433716009")).toBe("quintoandar/4433716009");
    expect(parseRef("https://boards.greenhouse.io/vtex/jobs/6224964004?gh_src=x")).toBe("vtex/6224964004");
    expect(parseRef("stone/123")).toBe("stone/123");
    expect(parseRef("https://greenhouse.io.exemplo.com/a/jobs/1")).toBeNull();
    expect(detailUrl("stone/123")).toBe("https://boards-api.greenhouse.io/v1/boards/stone/jobs/123");
  });

  test("lê a vaga da API", () => {
    const one = JSON.stringify(job(9, "PM", "Remote", "2026-10-01T00:00:00Z"));
    expect(parseDetail(one, "quintoandar/9")).toMatchObject({ id: "9", board: "quintoandar", workplace_type: "remote" });
    expect(parseDetail("nada", "x/1")).toBeNull();
  });
});
