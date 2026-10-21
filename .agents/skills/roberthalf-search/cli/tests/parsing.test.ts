import { describe, expect, test } from "bun:test";
import { pageUrl, parseDetail, parseRef, parseSearch } from "../src/parse";

// Amostras reduzidas no formato real dos cartões <rhcl-job-card> da Robert Half Brasil.

const card = (id: string, title: string, loc: string, site: string, type: string, min: string, max: string, date: string, variant = "card") => `
<rhcl-job-card job-id="${id}" variant="${variant}"> <a href="https://www.roberthalf.com/br/pt/vaga/guarulhos/analista/${id}" slot="headline" target="_blank"> ${title} </a>
<ul slot="job-info"> <li data-subslot="location">${loc}</li> <li data-subslot="worksite">${site}</li> <li data-subslot="type">${type}</li>
<li data-subslot="salary"> <span data-subslot="salary-min">${min}</span> - <span data-subslot="salary-max">${max}</span> <span data-subslot="salary-currency">BRL</span> / <span data-subslot="salary-period">Monthly</span> </li>
<li data-subslot="copy">&lt;p&gt;&lt;strong&gt;A Empresa&lt;/strong&gt;&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Locação de veículos.&lt;/li&gt;&lt;/ul&gt;</li>
<li data-subslot="date">${date}</li> </ul> </rhcl-job-card>`;

const page = `<div id="joblistings"><div>
${card("63610-0013529450-brpt", "Analista de Transportes Pleno", "Guarulhos, ", "remote", "Projetos", "0", "0", "2026-10-21T12:17:14Z")}
${card("63620-0013526772-brpt", "Analista de Dados Pleno", "Rio de Janeiro", "hybrid", "Permanente", "8000", "10000", "2026-10-20T09:00:00Z")}
</div></div>`;

describe("busca", () => {
  test("páginas da lista", () => {
    expect(pageUrl(1)).toBe("https://www.roberthalf.com/br/pt/vagas");
    expect(pageUrl(2)).toBe("https://www.roberthalf.com/br/pt/vagas?pagenumber=2");
  });

  test("cartões no formato do contrato; descrição escapada vira texto", () => {
    const { rows } = parseSearch(page)!;
    expect(rows[0]).toMatchObject({
      id: "63610-0013529450-brpt", title: "Analista de Transportes Pleno", company: "Robert Half (cliente)",
      location: "Guarulhos", date: "2026-10-21", contract: "Projetos", workplace_type: "remote", salary: null,
      url: "https://www.roberthalf.com/br/pt/vaga/guarulhos/analista/63610-0013529450-brpt",
      description: "A Empresa\n- Locação de veículos.",
    });
    expect(rows[1]).toMatchObject({ workplace_type: "hybrid", salary: "R$ 8.000,00 a R$ 10.000,00 por mês" });
  });

  test("página sem lista devolve null", () => {
    expect(parseSearch("<html></html>")).toBeNull();
  });
});

describe("detalhe", () => {
  test("referência: só a URL da vaga", () => {
    expect(parseRef("https://www.roberthalf.com/br/pt/vaga/guarulhos/analista/63610-0013529450-brpt"))
      .toBe("/br/pt/vaga/guarulhos/analista/63610-0013529450-brpt");
    expect(parseRef("https://www.roberthalf.com/us/en/job/x/y/1")).toBeNull();
    expect(parseRef("https://example.com/br/pt/vaga/a/b/c")).toBeNull();
  });

  test("o detalhe é o cartão da própria vaga (variante listing)", () => {
    const html = card("63610-0013529450-brpt", "Analista de Transportes Pleno", "Guarulhos", "remote", "Projetos", "0", "0", "2026-10-21T12:17:14Z", "listing")
      + card("999", "Outra vaga", "SP", "onsite", "Projetos", "0", "0", "2026-10-01T00:00:00Z");
    expect(parseDetail(html, "/br/pt/vaga/guarulhos/analista/63610-0013529450-brpt")?.title).toBe("Analista de Transportes Pleno");
    expect(parseDetail(html, "/br/pt/vaga/x/y/nao-existe")).toBeNull();
  });
});
