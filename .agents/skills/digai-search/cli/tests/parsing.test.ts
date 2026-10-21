import { afterEach, describe, expect, test } from "bun:test";
import { companyUrl, detailUrl, extractObject, parseCompaniesFile, parseCompanyPage, parseDetail, parseRef, readFlight, titleMatches } from "../src/parse";
import { runSearch } from "../src/commands/search";

// Páginas reduzidas no formato real do DigAÍ: o payload do Next.js vem em
// pedaços de self.__next_f.push([1,"<string JSON>"]).

const originalFetch = globalThis.fetch;
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;
afterEach(() => {
  globalThis.fetch = originalFetch;
  process.stdout.write = originalStdout;
  process.stderr.write = originalStderr;
});

/** Monta uma página com o payload partido em dois pushes (o corte cai no meio do JSON). */
function page(payload: string, extraHead = ""): string {
  const cut = Math.floor(payload.length / 2);
  const push = (s: string) => `<script>self.__next_f.push([1,${JSON.stringify(s)}])</script>`;
  return `<html><head>${extraHead}</head><body>${push(payload.slice(0, cut))}${push(payload.slice(cut))}</body></html>`;
}

const ID1 = "c5bde78f-86e1-45f6-82b6-78d827a503be";
const ID2 = "36c5f28c-5e53-4095-a65d-172bfcc2671d";

const job = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  triagemId: id, title, webShortLink: null, language: "pt_BR", level: "MID_LEVEL", expiresAt: null,
  zipCode: "13000-000", city: "Campinas", state: "SP", country: "Brazil", workModel: "HYBRID",
  isDisabilitiesAffirmative: false, isTalentPool: false, salaryMin: null, salaryMax: null,
  companyName: "Hospital Care", groupSlug: "hospitalcare", groupDisplayName: "Hospital Care", isConfidential: false,
  publishedAt: "2026-10-21T12:00:00.000Z", updatedAt: "2026-10-21T13:00:00.000Z", ...extra,
});

const companyPayload = (items: unknown[], total: number) =>
  `1a:["$","div",null,{"texts":{"title":"Vagas {count}"}}]\n` +
  `2b:{"company":{"slug":"hospitalcare","about":"Texto com { chaves } e \\"aspas\\""},"initialJobs":${JSON.stringify({ items, total, page: 1 })},"x":1}`;

const companyHtml = page(companyPayload([
  job(ID1, "12666344 - Analista Orçamentário / Hospital Care"),
  job(ID2, "Product Manager Sênior", { workModel: "REMOTE", level: "SENIOR_AND_SPECIALIST", isDisabilitiesAffirmative: true, salaryMin: 12000, salaryMax: 15000, city: "Buenos Aires", state: null, country: "Argentina", publishedAt: "2026-10-01T00:00:00.000Z" }),
  { title: "sem id" },
], 30));

describe("payload do Next.js", () => {
  test("junta os pushes e acha o objeto pela chave, com chaves e aspas dentro de strings", () => {
    const flight = readFlight(companyHtml);
    expect(flight).toContain('"initialJobs":{');
    expect(extractObject(flight, "company")).toEqual({ slug: "hospitalcare", about: 'Texto com { chaves } e "aspas"' });
    expect((extractObject(flight, "initialJobs") as { total: number }).total).toBe(30);
    expect(extractObject(flight, "naoexiste")).toBeNull();
  });
});

describe("busca", () => {
  test("URL da página da empresa com o cargo e, se pedido, o filtro de remoto", () => {
    expect(companyUrl("raizen", "analista de dados", false)).toBe("https://raizen.digai.ai/pt-BR?title=analista+de+dados");
    expect(companyUrl("raizen", "produto", true)).toBe("https://raizen.digai.ai/pt-BR?title=produto&workModel=REMOTE");
  });

  test("vagas no formato do contrato, com modelo, senioridade, PcD e salário", () => {
    const p = parseCompanyPage(companyHtml)!;
    expect(p.total).toBe(30);
    expect(p.jobs).toHaveLength(2);
    expect(p.jobs[0]).toMatchObject({
      id: ID1, title: "12666344 - Analista Orçamentário / Hospital Care", company: "Hospital Care",
      location: "Campinas, SP", date: "2026-10-21", url: `https://jobs.digai.ai/${ID1}`,
      workplace_type: "hybrid", seniority: "Pleno", company_slug: "hospitalcare",
      pcd_affirmative: false, talent_pool: false, internal: null,
    });
    expect(p.jobs[1]).toMatchObject({ workplace_type: "remote", seniority: "Sênior / Especialista", pcd_affirmative: true, location: "Buenos Aires, Argentina" });
    expect(p.jobs[1].salary).toContain("12");
  });

  test("empresa confidencial não expõe o nome", () => {
    const p = parseCompanyPage(page(companyPayload([job(ID1, "PM", { isConfidential: true })], 1)))!;
    expect(p.jobs[0].company).toBe("Empresa confidencial");
  });

  test("página sem a lista (login, formato novo) é null", () => {
    expect(parseCompanyPage("<html><title>Acesso</title></html>")).toBeNull();
  });

  test("filtro do título: todas as palavras, sem acento nem caixa", () => {
    expect(titleMatches("Analista Contábil Pl (Piracicaba)", "analista contabil")).toBe(true);
    expect(titleMatches("Gerente de Produto", "gerente produto")).toBe(true);
    expect(titleMatches("Analista de Dados", "produto")).toBe(false);
  });

  test("lista de empresas: comentários e linhas inválidas ficam de fora", () => {
    expect(parseCompaniesFile("# comentário\nraizen\nlocaliza   # Localiza\n\nnão vale\nxp-investimentos\n")).toEqual(["raizen", "localiza", "xp-investimentos"]);
  });

  test("runSearch junta as empresas, filtra o título, ordena por data e informa falhas e cortes", async () => {
    const urls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      urls.push(url);
      return url.startsWith("https://hospitalcare.") ? new Response(companyHtml) : new Response("<html>login</html>");
    }) as unknown as typeof fetch;
    let out = "";
    let err = "";
    process.stdout.write = ((c: string | Uint8Array) => ((out += c.toString()), true)) as typeof process.stdout.write;
    process.stderr.write = ((c: string | Uint8Array) => ((err += c.toString()), true)) as typeof process.stderr.write;
    const code = await runSearch({ query: "manager", companies: ["hospitalcare", "sabesp"], remote: true, page: 1, limit: 25, jobage: 9999, format: "json" });
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(parsed.results.map((r: { id: string }) => r.id)).toEqual([ID2]);
    expect(parsed.meta.failed_companies).toEqual(["sabesp"]);
    expect(parsed.meta.truncated).toEqual([{ company: "hospitalcare", total: 30, shown: 2 }]);
    expect(err).toContain("sabesp");
    expect(urls.sort()).toEqual([
      "https://hospitalcare.digai.ai/pt-BR?title=manager&workModel=REMOTE",
      "https://sabesp.digai.ai/pt-BR?title=manager&workModel=REMOTE",
    ]);
  });

  test("nenhuma empresa respondendo é erro", async () => {
    globalThis.fetch = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    let err = "";
    process.stderr.write = ((c: string | Uint8Array) => ((err += c.toString()), true)) as typeof process.stderr.write;
    expect(await runSearch({ query: "x", companies: ["a"], remote: false, page: 1, limit: 25, jobage: 9999, format: "json" })).toBe(1);
    expect(JSON.parse(err).code).toBe("SEARCH_FAILED");
  });
});

describe("detalhe", () => {
  test("referência: URL do DigAÍ ou id", () => {
    expect(parseRef(`https://jobs.digai.ai/${ID1}`)).toBe(ID1);
    expect(parseRef(`https://jobs.digai.ai/pt-BR/jobs/${ID1}?utm=x`)).toBe(ID1);
    expect(parseRef(`https://raizen.digai.ai/pt-BR/${ID1.toUpperCase()}`)).toBe(ID1);
    expect(parseRef(ID1)).toBe(ID1);
    expect(parseRef(`https://digai.ai.exemplo.com/${ID1}`)).toBeNull();
    expect(parseRef(`http://jobs.digai.ai/${ID1}`)).toBeNull();
    expect(parseRef("https://jobs.digai.ai/sobre")).toBeNull();
    expect(detailUrl(ID1)).toBe(`https://jobs.digai.ai/${ID1}`);
  });

  const ld = (extra: Record<string, unknown> = {}) =>
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org", "@type": "JobPosting", title: "Analista Orçamentário",
      description: "<p>Atuação <strong>híbrida</strong> em Campinas.</p><ul><li>Orçamentos</li></ul>",
      datePosted: "2026-10-21T12:00:00.000Z", hiringOrganization: { name: "Hospital Care" },
      jobLocation: { address: { addressLocality: "Campinas", addressRegion: "SP" } }, ...extra,
    })}</script>`;

  test("junta o objeto da vaga (modelo, seleção interna) e a descrição do JobPosting; a UF vem do JobPosting", () => {
    const { state: _state, ...noState } = job(ID1, "Analista Orçamentário", { isInternalRecruitment: true });
    const html = page(`17:["$","$L33",null,{"id":"${ID1}","initialJob":${JSON.stringify({ ...noState, jobPostDescription: "$34" })}}]`, ld());
    expect(parseDetail(html, ID1)).toMatchObject({
      id: ID1, location: "Campinas, SP", workplace_type: "hybrid", seniority: "Pleno", internal: true,
      description: "Atuação híbrida em Campinas.\n- Orçamentos",
    });
  });

  test("sem o objeto da vaga, usa só o JobPosting", () => {
    expect(parseDetail(`<html><head>${ld()}</head></html>`, ID1)).toMatchObject({
      id: ID1, title: "Analista Orçamentário", company: "Hospital Care", date: "2026-10-21", workplace_type: null,
    });
    expect(parseDetail("<html>nada</html>", ID1)).toBeNull();
  });
});
