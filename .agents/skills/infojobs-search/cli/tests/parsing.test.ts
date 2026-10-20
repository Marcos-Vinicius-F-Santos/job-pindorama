import { describe, expect, test } from "bun:test";
import { buildSearchUrl, parseDetail, parseRef, parseSearch } from "../src/parse";

// Amostras reduzidas no formato real das páginas da InfoJobs.

const seal = `<span onclick="event.stopPropagation(); event.preventDefault();" class="cursor-pointer" data-bs-toggle="tooltip"
  data-bs-title="<div class='text-left'>Este selo indica que a empresa foi verificada pelo Infojobs.</div>"
  title="<div class='text-left'>Este selo indica que a empresa foi verificada</div>"><svg class="icon icon-verified"><use xlink:href="#verified" /></svg></span>`;

const card = (id: string, slug: string, company: string, place: string, attrs: string[]) => `
<div data-typesimilar="" class="card card-shadow js_rowCard">
<div id="vacancy${id}" data-modelversion="" data-id="${id}" class="pt-24 px-24 cursor-pointer js_vacancyLoad js_rowCard js_cardLink" data-href="/vaga-de-${slug}__${id}.aspx" data-testabbutton="false">
  <div class="d-flex flex-wrap gap-8"><div hidden class="js_date" data-value="2026/10/20 08:46:00"></div></div>
  <div class="d-flex gap-8 justify-content-between">
    <a class="text-decoration-none" href="/vaga-de-${slug}__${id}.aspx"><h2 class="h3 font-weight-bold text-body mb-2 js_vacancyTitle">
        Product Manager
    </h2></a>
  </div>
  <div class="d-flex align-items-baseline"><div class="text-body">${company}</div></div>
  <div class="mb-8">
    ${place}<span hidden class="js_divUserVagaDistance">, <span class="js_UserVagaDistance">0</span> Km de você.</span>
  </div>
  <div class="d-inline-flex flex-wrap mb-8 text-medium" style="gap: 2px 16px">
${attrs.map((a) => `    <div>\n    <svg class="icon icon-money icon-size-16"><use xlink:href="#money" /></svg>\n    ${a}\n    </div>`).join("\n")}
  </div>
  <div class="text-medium">
    We are hiring an experienced <mark>Product Manager</mark> to lead squads...
  </div>
</div>
</div>`;

const searchHtml = `<title>Vagas de Emprego de product manager | Infojobs</title><div class="js_vacanciesGridFragment mb-16">
${card("12133581", "product-manager-em-minas-gerais", `<a class="text-body text-decoration-none" href="/empresa-yapp__1.aspx"><span class="text-nowrap">
    Yapp
    ${seal}
</span></a>`, "Belo Horizonte - MG", ["R$ 20.000,00\n    a\n    R$ 30.000,00", "Ensino M&#xE9;dio (2&#xBA; Grau)", "H&#xED;brido"])}
${card("12044993", "solutions-engineer-remote-latam-em-", `<a class="text-body text-decoration-none" href="/empresa-rhf__2.aspx">
RHF Talentos - Vale do
<span class="text-nowrap">
 Ribeira/SP
 ${seal}
</span></a>`, "Todo Brasil", ["R$ 15.000,00", "Entre 5 e 10 anos", "Home office"])}
${card("12000001", "analista-em-sao-paulo", "Empresa confidencial", "S&#xE3;o Paulo - SP", ["A combinar", "Presencial"])}
</div>`;

const detailHtml = `<html><head><script type="application/ld+json">{"@context":"http://schema.org","@type":"JobPosting",
"employmentType":"Jornada completa","title":"Product Manager",
"description":"Área e especialização profissional: Informática<br>Senioridade: Especialista<br>Lugar de trabalho: Belo Horizonte, MG<br>Regime de contratação de tipo Efetivo – CLT<br>Jornada Período Integral<br>Liderar squads.",
"datePosted":"2026-10-20T08:46:00.0000000","hiringOrganization":{"@type":"Organization","name":"yapp do brasil"},
"jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressCountry":"BR","addressLocality":"Belo Horizonte","addressRegion":"MG"}},
"baseSalary":{"@type":"MonetaryAmount","currency":"BRL","value":{"@type":"QuantitativeValue","unitText":"MONTH","minValue":20000.0,"maxValue":30000.0}},
"validThrough":"2027-01-19T16:42:00.0000000"}</script></head><body></body></html>`;

describe("busca", () => {
  test("URL com filtro de modelo e página", () => {
    const url = new URL(buildSearchUrl("product manager", 3, "2"));
    expect(url.pathname).toBe("/empregos.aspx");
    expect(url.searchParams.get("palabra")).toBe("product manager");
    expect(url.searchParams.get("idw")).toBe("2");
    expect(url.searchParams.get("Page")).toBe("3");
    expect(new URL(buildSearchUrl("x", 1)).searchParams.has("Page")).toBe(false);
  });

  test("cartões no formato do contrato", () => {
    const { rows } = parseSearch(searchHtml)!;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: "12133581",
      title: "Product Manager",
      company: "Yapp",
      location: "Belo Horizonte - MG (Híbrido)",
      date: "2026-10-20",
      url: "https://www.infojobs.com.br/vaga-de-product-manager-em-minas-gerais__12133581.aspx",
      workplace_type: "hybrid",
      salary: "R$ 20.000,00 a R$ 30.000,00",
      description: "We are hiring an experienced Product Manager to lead squads...",
    });
    expect(rows[1]).toMatchObject({ company: "RHF Talentos - Vale do Ribeira/SP", location: "Todo Brasil (Home office)", workplace_type: "remote", salary: "R$ 15.000,00" });
    expect(rows[2]).toMatchObject({ company: "Empresa confidencial", location: "São Paulo - SP", workplace_type: "on-site", salary: null });
  });

  test("o id de cada cartão é o dele, não o do cartão seguinte", () => {
    // Regressão: cortar a página em `js_vacancyLoad` (depois do data-id) dava a
    // cada cartão o id do próximo, com a URL certa - id e URL desencontrados.
    for (const r of parseSearch(searchHtml)!.rows) expect(r.url).toEndWith(`__${r.id}.aspx`);
  });

  test("o selo de empresa verificada não entra no nome", () => {
    const text = JSON.stringify(parseSearch(searchHtml));
    expect(text).not.toContain("selo indica");
  });

  test("página que não é de resultados devolve null", () => {
    expect(parseSearch("<html><body>erro</body></html>")).toBeNull();
  });
});

describe("detalhe", () => {
  test("referência: só a URL completa da vaga", () => {
    expect(parseRef("https://www.infojobs.com.br/vaga-de-product-manager-em-minas-gerais__12133581.aspx"))
      .toBe("/vaga-de-product-manager-em-minas-gerais__12133581.aspx");
    expect(parseRef("12133581")).toBeNull();
    expect(parseRef("https://www.infojobs.com.br.exemplo.com/vaga-de-x__1.aspx")).toBeNull();
    expect(parseRef("https://example.com/vaga-de-x__1.aspx")).toBeNull();
  });

  test("lê JobPosting: salário, regime e senioridade do texto", () => {
    expect(parseDetail(detailHtml, "/vaga-de-product-manager-em-minas-gerais__12133581.aspx")).toMatchObject({
      id: "12133581",
      title: "Product Manager",
      company: "yapp do brasil",
      location: "Belo Horizonte, MG",
      date: "2026-10-20",
      deadline: "2027-01-19",
      contract: "Efetivo – CLT",
      seniority: "Especialista",
      salary: "R$ 20.000,00 a R$ 30.000,00",
      url: "https://www.infojobs.com.br/vaga-de-product-manager-em-minas-gerais__12133581.aspx",
    });
  });

  test("página sem JobPosting devolve null", () => {
    expect(parseDetail("<html></html>", "/vaga-de-x__1.aspx")).toBeNull();
  });
});
