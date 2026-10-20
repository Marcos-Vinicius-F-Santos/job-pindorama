import { afterEach, describe, expect, test } from "bun:test";
import { buildSearchUrl, parseDetail, parseRef, parseSearch } from "../src/parse";
import { runSearch } from "../src/commands/search";

// Amostras reduzidas no formato real de api.remotar.com.br/jobs.

const originalFetch = globalThis.fetch;
const originalStdout = process.stdout.write;
afterEach(() => {
  globalThis.fetch = originalFetch;
  process.stdout.write = originalStdout;
});

const job = (over: Record<string, unknown>) => ({
  id: 166921,
  title: "Product Manager",
  subtitle: "Lidere a evolução do produto de pagamentos.",
  description: "<h3>Sobre</h3><p>Squad de pagamentos.</p>",
  createdAt: "2026-10-19T10:00:00.000-03:00",
  expiresAt: null,
  expired: false,
  active: true,
  type: "remote",
  city: null,
  state: null,
  externalLink: "https://empresa.example/vaga?utm_source=remotar",
  company: { name: "Stone", about: "<p>Sobre a empresa</p>" },
  author: { id: 5, email: "pessoa@remotar.example", username: "pessoa" },
  jobSalary: { from: 0, to: 0, currency: "BRL", type: "uninformed" },
  jobTags: [{ tag: { name: "🌍 100% Remoto" } }],
  jobCategories: [{ category: { name: "Produto" } }],
  ...over,
});

const apiBody = JSON.stringify({
  meta: { total: 3, per_page: 50, current_page: 1 },
  data: [
    job({}),
    job({ id: 2, title: "Senior PM", company: { name: "CookUnity" }, jobTags: [{ tag: { name: "✈️ Vaga internacional" } }] }),
    job({ id: 3, title: "PM Pleno", city: "Campinas", state: "SP", jobSalary: { from: 9000, to: 12000, currency: "BRL", type: "range" } }),
    job({ id: 4, title: "Encerrada", expired: true }),
  ],
});

describe("busca", () => {
  test("URL da API com categoria", () => {
    const url = new URL(buildSearchUrl("product manager", 2, 15));
    expect(url.origin).toBe("https://api.remotar.com.br");
    expect(url.searchParams.get("search")).toBe("product manager");
    expect(url.searchParams.get("categoryId")).toBe("15");
    expect(url.searchParams.get("active")).toBe("true");
    expect(url.searchParams.get("page")).toBe("2");
  });

  test("resultado no formato do contrato; vagas encerradas ficam de fora", () => {
    const { rows, total } = parseSearch(apiBody)!;
    expect(total).toBe(3);
    expect(rows.map((r) => r.id)).toEqual(["166921", "2", "3"]);
    expect(rows[0]).toMatchObject({
      title: "Product Manager",
      company: "Stone",
      location: "Remoto",
      date: "2026-10-19",
      url: "https://remotar.com.br/job/166921",
      workplace_type: "remote",
      salary: null,
      international: false,
      categories: ["Produto"],
      tags: ["100% Remoto"],
      apply_url: "https://empresa.example/vaga?utm_source=remotar",
    });
    expect(rows[0].description).toBe("Lidere a evolução do produto de pagamentos.\n\nSobre\nSquad de pagamentos.");
    expect(rows[1]).toMatchObject({ international: true, location: "Remoto (internacional)" });
    expect(rows[2]).toMatchObject({ location: "Campinas, SP (Remoto)", salary: "R$ 9.000,00 a R$ 12.000,00" });
  });

  test("dados de quem cadastrou a vaga nunca vazam", () => {
    const text = JSON.stringify(parseSearch(apiBody));
    expect(text).not.toContain("pessoa@remotar.example");
    expect(text).not.toContain("username");
  });

  test("formato inesperado devolve null", () => {
    expect(parseSearch("<html>")).toBeNull();
    expect(parseSearch(JSON.stringify({ results: [] }))).toBeNull();
  });

  test("--no-international filtra do lado da CLI", async () => {
    globalThis.fetch = (async () => new Response(apiBody)) as unknown as typeof fetch;
    let out = "";
    process.stdout.write = ((c: string | Uint8Array) => ((out += c.toString()), true)) as typeof process.stdout.write;
    const code = await runSearch({
      url: "https://api.remotar.com.br/jobs?search=x", page: 1, limit: 50, jobage: 9999, format: "json",
      includeDescription: false, keep: (r) => !(r as { international?: boolean }).international,
    });
    expect(code).toBe(0);
    expect(JSON.parse(out).results.map((r: { id: string }) => r.id)).toEqual(["166921", "3"]);
  });
});

describe("detalhe", () => {
  test("referência: id ou URL do site", () => {
    expect(parseRef("166921")).toBe("166921");
    expect(parseRef("https://remotar.com.br/job/166921/stone/product-manager")).toBe("166921");
    expect(parseRef("https://remotar.com.br/job/166921")).toBe("166921");
    expect(parseRef("https://remotar.com.br.exemplo.com/job/1")).toBeNull();
    expect(parseRef("https://example.com/job/1")).toBeNull();
  });

  test("lê a vaga da API e confere o id", () => {
    expect(parseDetail(JSON.stringify(job({})), "166921")?.title).toBe("Product Manager");
    expect(parseDetail(JSON.stringify(job({})), "999")).toBeNull();
    expect(parseDetail("nada", "166921")).toBeNull();
  });
});
