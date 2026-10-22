import { afterEach, describe, expect, test } from "bun:test";
import {
  brDate,
  cleanHtml,
  formatSalary,
  httpGet,
  inlineText,
  readJobPosting,
  relativeDate,
  retryAfterMs,
  tidyPunctuation,
  titleMatches,
  withinJobAge,
  type JobResult,
} from "../src/helpers";

// Base comum (src/helpers.ts): igual nas CLIs de portal brasileiras.

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const row = (date: string | null): JobResult => ({
  id: "1", title: "t", company: null, location: null, date, url: null, deadline: null,
  contract: null, workplace_type: null, seniority: null, salary: null, description: null,
});

describe("datas", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  test("relativas e absolutas", () => {
    expect(relativeDate("Hoje", now)).toBe("2026-10-20");
    expect(relativeDate("Ontem", now)).toBe("2026-10-19");
    expect(relativeDate("Há 5 dias", now)).toBe("2026-10-15");
    expect(relativeDate("01/10/2026", now)).toBe("2026-10-01");
    expect(relativeDate("algum dia", now)).toBeNull();
    expect(brDate("Publicada em 30/09/2026")).toBe("2026-09-30");
  });

  test("--jobage descarta o que é velho e mantém o que não tem data", () => {
    const rows = [row("2026-10-19"), row("2026-09-01"), row(null)];
    expect(withinJobAge(rows, 14, now).map((r) => r.date)).toEqual(["2026-10-19", null]);
    expect(withinJobAge(rows, 9999, now)).toHaveLength(3);
  });
});

describe("texto e salário", () => {
  test("HTML vira texto legível", () => {
    expect(cleanHtml("<p>Olá &amp; bem-vinda</p><ul><li>um</li><li>dois</li></ul>")).toBe("Olá & bem-vinda\n- um\n- dois");
    expect(cleanHtml("")).toBeNull();
  });

  test("faixa salarial em reais", () => {
    expect(formatSalary(15000, 30000)).toBe("R$ 15.000,00 a R$ 30.000,00");
    expect(formatSalary(12000, 12000)).toBe("R$ 12.000,00");
    expect(formatSalary(0, 0)).toBeNull();
    expect(formatSalary(null, undefined)).toBeNull();
  });
});

describe("JobPosting (schema.org)", () => {
  test("acha o bloco JobPosting entre outros blocos ld+json", () => {
    const html = `<script type="application/ld+json">{"@type":"WebSite","name":"x"}</script>
      <script type="application/ld+json">{"@type":"JobPosting","title":"Product Manager","datePosted":"2026-10-16"}</script>`;
    expect(readJobPosting(html)?.title).toBe("Product Manager");
  });

  test("tolera quebra de linha crua dentro das strings e o formato @graph", () => {
    const raw = `<script type="application/ld+json">{"@type":"JobPosting","title":"PM","description":"linha 1\nlinha 2"}</script>`;
    expect(readJobPosting(raw)?.description).toBe("linha 1 linha 2");
    const graph = `<script type="application/ld+json">{"@graph":[{"@type":"Organization"},{"@type":"JobPosting","title":"PO"}]}</script>`;
    expect(readJobPosting(graph)?.title).toBe("PO");
  });

  test("JSON quebrado ou ausente devolve null", () => {
    expect(readJobPosting(`<script type="application/ld+json">{quebrado</script>`)).toBeNull();
    expect(readJobPosting("<html></html>")).toBeNull();
  });
});

describe("rede", () => {
  test("Retry-After em segundos e em data", () => {
    expect(retryAfterMs("3")).toBe(3000);
    expect(retryAfterMs(null)).toBeNull();
    expect(retryAfterMs(new Date(Date.now() + 2000).toUTCString())).toBeGreaterThan(0);
  });

  test("404 vira null, não exceção", async () => {
    globalThis.fetch = (async () => new Response("nada", { status: 404 })) as unknown as typeof fetch;
    expect(await httpGet("https://exemplo.invalid/x", "text/html")).toBeNull();
  });

  test("User-Agent honesto, com o nome da ferramenta", async () => {
    let ua = "";
    globalThis.fetch = (async (_: unknown, init?: RequestInit) => {
      ua = new Headers(init?.headers).get("User-Agent") ?? "";
      return new Response("ok");
    }) as unknown as typeof fetch;
    await httpGet("https://exemplo.invalid/x", "text/html");
    expect(ua).toMatch(/^Mozilla\/5\.0 \(compatible; [a-z]+-cli\/1\.0\)$/);
  });
});

describe("titleMatches", () => {
  test("todas as palavras, sem acento nem caixa, no começo de palavra", () => {
    expect(titleMatches("Senior Product Manager | Pagamentos", "product manager")).toBe(true);
    expect(titleMatches("Analista Contábil Pl", "analista contabil")).toBe(true);
    expect(titleMatches("Gerente de Produtos", "gerente produto")).toBe(true);
    expect(titleMatches("Analista de IA", "ia")).toBe(true);
    expect(titleMatches("IA Generativa", "ia")).toBe(true);
    expect(titleMatches("Atendente Assistência ao Cliente", "ia")).toBe(false);
    expect(titleMatches("Aux. de Operações | Brasília", "ia")).toBe(false);
    expect(titleMatches("Dev C++ / Node.js", "c++ node.js")).toBe(true);
    expect(titleMatches("Qualquer título", "")).toBe(true);
  });
});

describe("pontuação depois de tags em linha", () => {
  test("sem espaço antes de pontuação nem depois de parêntese aberto", () => {
    expect(tidyPunctuation("o backlog , colaborando ( com dados ) .")).toBe("o backlog, colaborando (com dados).");
    expect(tidyPunctuation("- Item\n- Outro")).toBe("- Item\n- Outro");
    expect(tidyPunctuation("Salário: R$ 8.000,00")).toBe("Salário: R$ 8.000,00");
  });

  test("cleanHtml e inlineText", () => {
    expect(cleanHtml("<p>Gerenciar o <strong>backlog</strong>, com <em>dados</em>.</p><ul><li>Roadmap (<b>Q1</b>)</li></ul>"))
      .toBe("Gerenciar o backlog, com dados.\n- Roadmap (Q1)");
    expect(inlineText("Atuação <strong>100% remota</strong>.")).toBe("Atuação 100% remota.");
  });
});
