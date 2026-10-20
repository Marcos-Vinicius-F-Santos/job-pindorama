import { describe, expect, test } from "bun:test";
import { buildSearchUrl, parseCard, parseDetail, parseRef, parseSearch, slugify } from "../src/parse";

// Amostras reduzidas no formato real das páginas da VAGAS.com.

const now = new Date("2026-10-20T12:00:00Z");

const card = (id: string, title: string, local: string, data: string) => `
<li class="vaga odd ">
  <header class="clearfix">
    <div class="informacoes-header">
      <h2 class="cargo">
        <a class="link-detalhes-vaga" data-id-vaga="${id}" title="${title}" id="v${id}" href="/vagas/v${id}/slug-da-vaga">
            ${title}
</a>      </h2>
      <span class="emprVaga">
          Central IT
      </span>
      <div class="nivelQtdVagas"><span class="nivelVaga">
            Gerência
          </span></div>
    </div>
  </header>
  <div class="detalhes"><p>Buscamos um <mark>Product</mark> Manager para liderar...</p></div>
  <footer>${local}
    <span class="data-publicacao"><i class="bx bx-time-five"></i>${data}</span>
  </footer>
</li>`;

const searchHtml = `<h1>1137 vagas de emprego para produto</h1>
<section id="pesquisaResultado"><section class="grupoDeVagas"><div id="todasVagas"><ul>
${card("2839621", "98 - Group Product Manager (Gpm)", `<div class="vaga-local"><i class="bx bx-map"></i>
            Brasília / DF
              <div class="tooltip-place" role="tooltip"><div class="tooltip-text">A empresa aceita candidaturas de Brasília</div></div></div>`, "Há 5 dias")}
${card("2837780", "Ux Engineer Pleno", `<span class="vaga-local"><i class="bx bx-map"></i>
 100% Home Office
 </span>`, "02/10/2026")}
<li class="vaga even "><header>cartão quebrado sem id</header></li>
</ul></div></section></section>`;

const detailHtml = `<html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"VAGAS.com"}</script>
<script type="application/ld+json">{"@context":"http://schema.org","@type":"JobPosting","title":"Gerente Sênior de Produto Digital / Product Manager",
"description":"Descrição: Resumo da vagaGestão","identifier":{"@type":"PropertyValue","name":"Confidencial","value":2837357},
"datePosted":"2026-09-30","validThrough":"2026-11-04","hiringOrganization":{"@type":"Organization","name":"Confidencial"},
"jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Localização não informada","addressRegion":"SP","addressCountry":"Brasil"}}}</script>
</head><body>
<div class="infoVaga"><ul>
<li><div><span>
            Faixa salarial
          </span>
          <span>
            a combinar
          </span></div></li>
<li><div><span class="info-localizacao">
              100% Home Office
            </span></div></li>
<li><div><span class="info-modelo-contratual" title="Regime CLT">
            Regime CLT
          </span></div></li>
</ul></div>
<div class="job-tab-content job-description__text texto" data-testid="JobDescription">
<br><b>Descrição</b>: <p>Resumo da vaga</p><p><br></p><p>Gestão estratégica de produtos digitais.</p><p>• Inglês avançado.</p>
      </div>
</body></html>`;

describe("busca", () => {
  test("termo no caminho, como o portal monta", () => {
    expect(slugify("Gerente de Produto")).toBe("gerente-de-produto");
    expect(slugify("Analista Sênior / BI")).toBe("analista-senior-bi");
    const url = new URL(buildSearchUrl("gerente de produto", 2, ["100% Home Office"]));
    expect(url.pathname).toBe("/vagas-de-gerente-de-produto");
    expect(url.searchParams.get("q")).toBe("gerente de produto");
    expect(url.searchParams.get("pagina")).toBe("2");
    expect(url.searchParams.getAll("m[]")).toEqual(["100% Home Office"]);
    expect(new URL(buildSearchUrl("produto", 1, [])).searchParams.has("pagina")).toBe(false);
  });

  test("cartões no formato do contrato; um cartão quebrado não derruba os outros", () => {
    const { rows, total } = parseSearch(searchHtml, now)!;
    expect(total).toBe(1137);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "2839621",
      title: "98 - Group Product Manager (Gpm)",
      company: "Central IT",
      location: "Brasília / DF",
      date: "2026-10-15",
      url: "https://www.vagas.com.br/vagas/v2839621/slug-da-vaga",
      seniority: "Gerência",
      workplace_type: null,
      description: "Buscamos um Product Manager para liderar...",
    });
    expect(rows[1]).toMatchObject({ location: "100% Home Office", workplace_type: "remote", date: "2026-10-02" });
  });

  test("página que não é de resultados devolve null", () => {
    expect(parseSearch("<html><body>erro</body></html>", now)).toBeNull();
  });

  test("cartão sem id ou título é ignorado", () => {
    expect(parseCard("<header>sem nada</header>", now)).toBeNull();
  });
});

describe("detalhe", () => {
  test("referência: id, v<id> ou URL do portal", () => {
    expect(parseRef("2837357")).toBe("2837357");
    expect(parseRef("v2837357")).toBe("2837357");
    expect(parseRef("https://www.vagas.com.br/vagas/v2837357/gerente-senior")).toBe("2837357");
    expect(parseRef("https://www.vagas.com.br.exemplo.com/vagas/v1/x")).toBeNull();
    expect(parseRef("https://example.com/vagas/v1/x")).toBeNull();
  });

  test("lê JobPosting, cabeçalho e a descrição em HTML (com quebras)", () => {
    expect(parseDetail(detailHtml, "2837357")).toMatchObject({
      title: "Gerente Sênior de Produto Digital / Product Manager",
      company: "Confidencial",
      location: "100% Home Office",
      date: "2026-09-30",
      deadline: "2026-11-04",
      contract: "CLT",
      workplace_type: "remote",
      salary: null, // "a combinar"
      url: "https://www.vagas.com.br/vagas/v2837357",
      description: "Descrição : Resumo da vaga\n\nGestão estratégica de produtos digitais.\n• Inglês avançado.",
    });
  });

  test("página sem JobPosting devolve null", () => {
    expect(parseDetail("<html></html>", "1")).toBeNull();
  });
});
