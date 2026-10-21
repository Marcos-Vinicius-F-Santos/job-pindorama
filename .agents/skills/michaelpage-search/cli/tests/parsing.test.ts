import { describe, expect, test } from "bun:test";
import { buildSearchUrl, parseDetail, parseRef, parseSearch, slugify } from "../src/parse";

// Amostras reduzidas no formato real das páginas da Michael Page Brasil.

const tile = (id: string, path: string, title: string, loc: string) => `<li class="views-row"><div about="${path}" class="job-tile search-job-tile"><div class="job-title " id="${id}"><h3><a href="${path}" rel="bookmark" id="job-${id}" >${title}</a></h3></div><div class="job-properties"><div class="job-location"><i class="fal fa-map-marker-alt" aria-hidden="true"></i> ${loc}</div><div class="job-contract-type"><i class="far fa-clock" aria-hidden="true"></i> Permanente</div></div><div class="job-summary"><div class="job_advert__job-summary-text"><p>Buscamos um(a) Product Manager para liderar a evolução.</p></div></div><div class="bullet_points"><div class="job_advert__job-desc-bullet-points"><ul><li>Atuação estratégica em POS;</li><li>Times globais</li></ul></div></div></div></li>`;

const searchHtml = `<div class="view view-job-search"><div class="job_search_keyword" data-value="Product Manager"></div><ul>
${tile("2108896", "/job-detail/product-manager-retail-experience/ref/jn-082026-7088330", "Product Manager | Retail Experience", "São Paulo")}
${tile("2108897", "/job-detail/pm-remoto/ref/jn-082026-1", "Product Manager", "Remoto")}
</ul>
<div class="job-tile recommended-job-tile search-job-tile"><h3><a href="/job-detail/outra/ref/x?ng-src=other-users-applied">Recomendada</a></h3></div></div>`;

const detailHtml = `<script type="application/ld+json">{"@context": "http://schema.org/","@type": "JobPosting","title": "Product Manager | Retail Experience","datePosted": "2026-08-21","hiringOrganization": {"@type": "Organization","name": "Michael Page"},"description": "<p><strong>Sobre nosso cliente</strong></p><p>Multinacional de varejo
de moda.</p>","jobLocation": {"@type": "Place","address": {"@type": "PostalAddress","addressLocality": "São Paulo","addressRegion": "Brazil"}}}</script>`;

describe("busca", () => {
  test("termo no caminho; página começa em 0 no portal", () => {
    expect(slugify("Gerente de Produto")).toBe("gerente-de-produto");
    expect(buildSearchUrl("product manager", 1)).toBe("https://www.michaelpage.com.br/jobs/product-manager");
    expect(buildSearchUrl("product manager", 3)).toBe("https://www.michaelpage.com.br/jobs/product-manager?page=2");
  });

  test("cartões da busca no formato do contrato; recomendações ficam de fora", () => {
    const { rows } = parseSearch(searchHtml)!;
    expect(rows.map((r) => r.title)).toEqual(["Product Manager | Retail Experience", "Product Manager"]);
    expect(rows[0]).toMatchObject({
      id: "2108896", company: "Michael Page (cliente)", location: "São Paulo", contract: "Permanente", date: null,
      url: "https://www.michaelpage.com.br/job-detail/product-manager-retail-experience/ref/jn-082026-7088330",
      ref: "jn-082026-7088330", highlights: ["Atuação estratégica em POS;", "Times globais"],
      description: "Buscamos um(a) Product Manager para liderar a evolução.\n- Atuação estratégica em POS;\n- Times globais",
    });
    expect(rows[1].workplace_type).toBe("remote");
  });
});

describe("detalhe", () => {
  test("referência: só a URL da vaga", () => {
    expect(parseRef("https://www.michaelpage.com.br/job-detail/pm/ref/jn-082026-7088330")).toBe("/job-detail/pm/ref/jn-082026-7088330");
    expect(parseRef("https://example.com/job-detail/pm/ref/x")).toBeNull();
  });

  test("JobPosting com quebra de linha crua dentro da descrição", () => {
    expect(parseDetail(detailHtml, "/job-detail/pm/ref/jn-082026-7088330")).toMatchObject({
      id: "jn-082026-7088330", title: "Product Manager | Retail Experience", date: "2026-08-21",
      location: "São Paulo, Brazil", company: "Michael Page (cliente)",
      description: "Sobre nosso cliente\nMultinacional de varejo de moda.",
    });
  });
});
