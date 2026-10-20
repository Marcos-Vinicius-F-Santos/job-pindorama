import { afterEach, describe, expect, test } from "bun:test";
import { runSearch, type SearchOpts } from "../src/commands/search";
import { runDetail } from "../src/commands/detail";
import { httpGet } from "../src/helpers";

const originalFetch = globalThis.fetch;
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.stdout.write = originalStdout;
  process.stderr.write = originalStderr;
});

function capture(stream: "stdout" | "stderr"): () => string {
  let buf = "";
  process[stream].write = ((chunk: string | Uint8Array) => {
    buf += chunk.toString();
    return true;
  }) as typeof process.stdout.write;
  return () => buf;
}

/** fetch simulado; guarda a URL e os cabeçalhos do último pedido. */
function mockFetch(status: number, body: string): { url: () => string; init: () => RequestInit | undefined } {
  let url = "";
  let init: RequestInit | undefined;
  globalThis.fetch = (async (input: string | URL | Request, i?: RequestInit) => {
    url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    init = i;
    return new Response(body, { status });
  }) as typeof fetch;
  return { url: () => url, init: () => init };
}

const baseOpts: SearchOpts = {
  query: "analista de dados",
  jobage: 9999,
  page: 1,
  limit: 5,
  format: "json",
  includeDescription: true,
};

const apiBody = JSON.stringify({
  data: [
    {
      id: 1,
      name: "Analista de Dados",
      careerPageName: "Empresa X",
      type: "vacancy_legal_entity",
      publishedDate: "2026-10-19T10:00:00Z",
      workplaceType: "remote",
      jobUrl: "https://empresax.gupy.io/job/abc",
      description: "Texto",
    },
  ],
  pagination: { total: 42, limit: 5, offset: 0 },
});

describe("runSearch", () => {
  test("chama a rota do portal com os filtros e emite o contrato", async () => {
    const mock = mockFetch(200, apiBody);
    const out = capture("stdout");
    const code = await runSearch({ ...baseOpts, state: "São Paulo", contractType: "vacancy_legal_entity" });
    expect(code).toBe(0);
    const requested = new URL(mock.url());
    expect(requested.origin + requested.pathname).toBe("https://portal.gupy.io/api/job-search/jobs");
    expect(requested.searchParams.get("state")).toBe("São Paulo");
    expect(requested.searchParams.get("type")).toBe("vacancy_legal_entity");
    const parsed = JSON.parse(out());
    expect(parsed.meta).toEqual({ count: 1, page: 1, total: 42 });
    expect(parsed.results[0]).toMatchObject({
      id: "1",
      title: "Analista de Dados",
      company: "Empresa X",
      location: "Remoto",
      date: "2026-10-19",
      url: "https://empresax.gupy.io/jobs/1",
      contract: "PJ (pessoa jurídica)",
    });
  });

  test("User-Agent honesto, com o nome da ferramenta", async () => {
    const mock = mockFetch(200, apiBody);
    capture("stdout");
    await runSearch(baseOpts);
    const headers = mock.init()?.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain("gupy-cli");
    expect(mock.init()?.signal).toBeInstanceOf(AbortSignal);
  });

  test("--no-description zera a descrição", async () => {
    mockFetch(200, apiBody);
    const out = capture("stdout");
    await runSearch({ ...baseOpts, includeDescription: false });
    expect(JSON.parse(out()).results[0].description).toBeNull();
  });

  test("404 na rota de busca é erro, não lista vazia", async () => {
    mockFetch(404, "not found");
    const out = capture("stdout");
    const err = capture("stderr");
    const code = await runSearch(baseOpts);
    expect(code).toBe(1);
    expect(out()).toBe("");
    expect(JSON.parse(err()).code).toBe("SEARCH_FAILED");
  });

  test("resposta que não é JSON é erro", async () => {
    mockFetch(200, "<html>mudou</html>");
    capture("stdout");
    const err = capture("stderr");
    expect(await runSearch(baseOpts)).toBe(1);
    expect(JSON.parse(err()).code).toBe("SEARCH_FAILED");
  });
});

describe("runDetail", () => {
  test("busca a página canônica no subdomínio da empresa", async () => {
    const page = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: { pageProps: { job: { id: 7, name: "Vaga", careerPage: { name: "Empresa X" } } } },
    })}</script>`;
    const mock = mockFetch(200, page);
    const out = capture("stdout");
    const code = await runDetail({ id: "https://empresax.gupy.io/jobs/7?x=1", format: "json" });
    expect(code).toBe(0);
    expect(mock.url()).toBe("https://empresax.gupy.io/jobs/7");
    expect(JSON.parse(out()).company).toBe("Empresa X");
  });

  test("vaga encerrada (404) é NOT_FOUND", async () => {
    mockFetch(404, "");
    capture("stdout");
    const err = capture("stderr");
    expect(await runDetail({ id: "https://empresax.gupy.io/jobs/7", format: "json" })).toBe(1);
    expect(JSON.parse(err()).code).toBe("NOT_FOUND");
  });

  test("só o número é BAD_ID, sem pedido à rede", async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("");
    }) as unknown as typeof fetch;
    const err = capture("stderr");
    expect(await runDetail({ id: "12749301", format: "json" })).toBe(1);
    expect(called).toBe(false);
    expect(JSON.parse(err()).error).toContain("URL completa");
  });
});

describe("httpGet", () => {
  test("tenta de novo em 503 e devolve o corpo quando o portal volta", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return calls === 1 ? new Response("", { status: 503 }) : new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;
    expect(await httpGet("https://portal.gupy.io/x", "text/plain")).toBe("ok");
    expect(calls).toBe(2);
  });

  test("respeita o teto de espera de Retry-After", async () => {
    globalThis.fetch = (async () =>
      new Response("", { status: 429, headers: { "Retry-After": "120" } })) as unknown as typeof fetch;
    await expect(httpGet("https://portal.gupy.io/x", "text/plain")).rejects.toThrow("limite de 30s");
  });
});
