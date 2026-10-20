import { afterEach, describe, expect, test } from "bun:test";
import { buildSearchUrl, parseDetail, parseRef, parseSearch } from "../src/parse";
import { runSearch } from "../src/commands/search";
import { runDetail } from "../src/commands/detail";

// Amostras reduzidas no formato real da API /api/vacancies e da página /vaga/<id>.

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

function mockFetch(status: number, body: string): () => string {
  let url = "";
  globalThis.fetch = (async (input: string | URL | Request) => {
    url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return new Response(body, { status });
  }) as unknown as typeof fetch;
  return () => url;
}

const apiBody = JSON.stringify({
  totalPages: 1,
  currentPage: 1,
  count: 2,
  data: [
    {
      id: 939473,
      title: "Technical Product Manager",
      companyName: "FINDME TECNOLOGIA LTDA",
      description: "<p>Time de Produto &amp; Engenharia.</p>",
      createdAt: "2026-10-16",
      jobType: "remoto",
      city: { name: "São Paulo" },
      state: { name: "São Paulo", code: "SP" },
      seniority: [{ name: "Sênior" }],
      recruitmentContractType: [{ name: "PJ" }],
      salary: { showRangeToApplicant: false, initialRange: 9000, finalRange: 12000 },
      date: { due: "2026-11-16", show: false },
      pcdOnly: false,
      affirmative: [],
      address: { neighborhood: "Consolação" },
    },
    {
      id: 5,
      title: "Analista de Produto",
      companyName: "Empresa confidencial",
      createdAt: "2026-10-01",
      jobType: "hibrido",
      city: { name: "Campinas" },
      state: { code: "SP" },
      salary: { showRangeToApplicant: true, initialRange: 6000, finalRange: 8000 },
      pcdOnly: true,
      affirmative: [{ name: "Mulheres" }],
    },
    {
      id: "bvXSSmAv4K",
      title: "Analista de Atendimento",
      companyName: "Pacto Soluções",
      createdAt: "2026-10-20",
      jobType: "presencial",
      city: { name: "GOIANIA" },
      state: { code: "GO" },
      publishers: { rhgestor: { externalId: "x", redirectUrl: "https://vagaspacto.rhgestor.com.br/vagas/detalhes/2rBQ" } },
    },
  ],
});

const detailHtml = `<html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"Technical Product Manager",
"description":"<p>Organizar o backlog.</p><ul><li>CI/CD</li></ul>","datePosted":"2026-10-16","validThrough":"2026-11-16",
"hiringOrganization":{"@type":"Organization","name":"FINDME TECNOLOGIA LTDA"},
"jobLocation":{"@type":"Place","address":{"addressLocality":"São Paulo","addressRegion":"SP","addressCountry":"BR"}},
"jobLocationType":"TELECOMMUTE"}</script></head><body>
<script>self.__next_f.push([1,"{\\"jobType\\":\\"remoto\\",\\"pcdOnly\\":false,\\"seniority\\":[{\\"id\\":6,\\"name\\":\\"Sênior\\",\\"level\\":null}],\\"recruitmentContractType\\":[{\\"id\\":9,\\"name\\":\\"PJ\\",\\"level\\":null}]}"])</script>
</body></html>`;

describe("busca", () => {
  test("URL com filtros em lista, como o portal envia", () => {
    const url = new URL(buildSearchUrl({ query: "product manager", workplace: ["remoto"], contract: ["clt", "pj"], seniority: ["pleno"], page: 2, limit: 50 }));
    expect(url.pathname).toBe("/api/vacancies");
    expect(url.searchParams.get("title")).toBe("product manager");
    expect(url.searchParams.get("jobsType")).toBe("remoto");
    expect(url.searchParams.get("contractsType")).toBe("clt,pj");
    expect(url.searchParams.get("seniorities")).toBe("pleno");
    expect(url.searchParams.get("take")).toBe("20"); // máximo do portal
    expect(url.searchParams.get("page")).toBe("2");
  });

  test("resultado no formato do contrato", () => {
    const { rows, total } = parseSearch(apiBody)!;
    expect(total).toBe(2);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: "939473",
      title: "Technical Product Manager",
      company: "FINDME TECNOLOGIA LTDA",
      location: "São Paulo, SP (Remoto)",
      date: "2026-10-16",
      url: "https://vagas.solides.com.br/vaga/939473",
      deadline: "2026-11-16",
      contract: "PJ",
      workplace_type: "remote",
      seniority: "Sênior",
      salary: null, // a empresa escondeu a faixa (showRangeToApplicant: false)
      description: "Time de Produto & Engenharia.",
      pcd_only: false,
    });
    expect(rows[1]).toMatchObject({ workplace_type: "hybrid", salary: "R$ 6.000,00 a R$ 8.000,00", pcd_only: true, affirmative: ["Mulheres"] });
  });

  test("vaga do RH Gestor: id com letras e URL externa que a API informa", () => {
    const rh = parseSearch(apiBody)!.rows[2];
    expect(rh).toMatchObject({ id: "bvXSSmAv4K", source: "rhgestor", url: "https://vagaspacto.rhgestor.com.br/vagas/detalhes/2rBQ", workplace_type: "on-site" });
    expect(parseSearch(apiBody)!.rows[0].source).toBe("solides");
  });

  test("dados pessoais e endereço não vazam para o resultado", () => {
    const text = JSON.stringify(parseSearch(apiBody));
    expect(text).not.toContain("Consolação");
  });

  test("formato inesperado devolve null", () => {
    expect(parseSearch("<html>")).toBeNull();
    expect(parseSearch(JSON.stringify({ items: [] }))).toBeNull();
  });

  test("runSearch grava JSON no stdout", async () => {
    const url = mockFetch(200, apiBody);
    const out = capture("stdout");
    const code = await runSearch({ url: "https://vagas.solides.com.br/api/vacancies?title=x", page: 1, limit: 20, jobage: 9999, format: "json", includeDescription: true });
    expect(code).toBe(0);
    expect(url()).toContain("/api/vacancies");
    const parsed = JSON.parse(out());
    expect(parsed.results).toHaveLength(3);
    expect(parsed.meta.total).toBe(2);
  });

  test("404 na busca é rota que mudou, não lista vazia", async () => {
    mockFetch(404, "");
    const err = capture("stderr");
    const code = await runSearch({ url: "https://vagas.solides.com.br/api/vacancies?title=x", page: 1, limit: 20, jobage: 9999, format: "json", includeDescription: true });
    expect(code).toBe(1);
    expect(JSON.parse(err()).code).toBe("SEARCH_FAILED");
  });
});

describe("detalhe", () => {
  test("referência: id ou URL do portal", () => {
    expect(parseRef("939473")).toBe("939473");
    expect(parseRef("https://vagas.solides.com.br/vaga/939473")).toBe("939473");
    expect(parseRef("https://vagas.solides.com.br.exemplo.com/vaga/1")).toBeNull();
    expect(parseRef("https://example.com/vaga/1")).toBeNull();
  });

  test("lê JobPosting e o payload da página", () => {
    expect(parseDetail(detailHtml, "939473")).toMatchObject({
      title: "Technical Product Manager",
      company: "FINDME TECNOLOGIA LTDA",
      location: "São Paulo, SP (Remoto)",
      date: "2026-10-16",
      deadline: "2026-11-16",
      contract: "PJ",
      workplace_type: "remote",
      seniority: "Sênior",
      description: "Organizar o backlog.\n- CI/CD",
      pcd_only: false,
    });
  });

  test("página sem JobPosting devolve null", () => {
    expect(parseDetail("<html></html>", "1")).toBeNull();
  });

  test("404 no detalhe é vaga encerrada", async () => {
    mockFetch(404, "");
    const err = capture("stderr");
    expect(await runDetail({ id: "939473", format: "json" })).toBe(1);
    expect(JSON.parse(err()).code).toBe("NOT_FOUND");
  });
});
