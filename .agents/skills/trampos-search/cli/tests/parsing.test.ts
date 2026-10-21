import { afterEach, describe, expect, test } from "bun:test";
import { buildSearchUrl, parseDetail, parseRef, parseSearch, setRemoteSearch } from "../src/parse";

// Amostras reduzidas no formato real da API da Trampos (/api/v2/opportunities).

afterEach(() => setRemoteSearch(false));

const op = (over: Record<string, unknown>) => ({
  id: 774888, name: "Gestor(a) de Live Shop", type_name: "Emprego", category_name: "Produção", state: "SP", city: "São Paulo",
  hybrid: false, salary: "NÃO DIVULGADA", published_at: "2026-10-20T08:49:25.000-03:00", custom_company_name: null, company: null,
  ...over,
});

const list = JSON.stringify({
  opportunities: [op({}), op({ id: 2, name: "Analista de Produto", city: null, state: null, salary: "R$ 8.000,00", company: { name: "Joias Beout" } })],
  pagination: { total: 57, total_pages: 5, per_page: 12 },
});

describe("busca", () => {
  test("parâmetros da API", () => {
    const url = new URL(buildSearchUrl({ query: "produto", page: 2, remote: true, category: "ti", type: "emprego" }));
    expect(url.pathname).toBe("/api/v2/opportunities");
    expect(url.searchParams.get("tr")).toBe("produto");
    expect(url.searchParams.get("lc")).toBe("home office");
    expect(url.searchParams.get("ct")).toBe("ti");
    expect(url.searchParams.get("tp")).toBe("emprego");
    expect(url.searchParams.get("page")).toBe("2");
  });

  test("vagas no formato do contrato", () => {
    const { rows, total } = parseSearch(list)!;
    expect(total).toBe(57);
    expect(rows[0]).toMatchObject({
      id: "774888", title: "Gestor(a) de Live Shop", company: "Confidencial", location: "São Paulo, SP",
      date: "2026-10-20", url: "https://trampos.co/oportunidades/774888", salary: null, workplace_type: "on-site",
      category: "Produção", kind: "Emprego",
    });
    expect(rows[1]).toMatchObject({ company: "Joias Beout", salary: "R$ 8.000,00", location: null, workplace_type: null });
  });

  test("numa busca de home office, vaga sem cidade é remota", () => {
    setRemoteSearch(true);
    expect(parseSearch(list)!.rows[1]).toMatchObject({ location: "Home office", workplace_type: "remote" });
  });

  test("formato inesperado devolve null", () => {
    expect(parseSearch("<html>")).toBeNull();
    expect(parseSearch(JSON.stringify({ jobs: [] }))).toBeNull();
  });
});

describe("detalhe", () => {
  test("referência", () => {
    expect(parseRef("774888")).toBe("774888");
    expect(parseRef("https://trampos.co/oportunidades/774888-gestor-a-de-live-shop")).toBe("774888");
    expect(parseRef("https://trampos.co.exemplo.com/oportunidades/1")).toBeNull();
  });

  test("junta descrição, requisitos, desejáveis e benefícios; regime e home office", () => {
    const body = JSON.stringify({ opportunity: op({ regime: "CLT", home_office: true, hybrid: false, description: "Comandar a live.",
      prerequisite: "Raciocínio comercial.", desirable: "Live commerce.", perks: "Premiações\r\n", other_info: "" }) });
    const job = parseDetail(body, "774888")!;
    expect(job).toMatchObject({ contract: "CLT", workplace_type: "remote", location: "São Paulo, SP (Home office)" });
    expect(job.description).toBe("Comandar a live.\n\n## Requisitos\nRaciocínio comercial.\n\n## Desejável\nLive commerce.\n\n## Benefícios\nPremiações");
    expect(parseDetail(body, "999")).toBeNull();
  });
});
