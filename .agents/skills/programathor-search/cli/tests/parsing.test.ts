import { describe, expect, test } from "bun:test";
import { buildSearchUrl, parseRef, parseSearch, tagSlug } from "../src/parse";

// Amostra reduzida no formato real da página de vagas do Programathor.

const card = (cls: string, id: string, slug: string, title: string, h3cls: string) => `
<div class="cell-list ${cls}">
  <a href="/jobs/${id}-${slug}">
    <div class="row"><div class="col-sm-9">
      <div class="cell-list-content"><h3 class="${h3cls}">${title}</h3><div class='cell-list-content-icon'><span><i class='fa fa-briefcase'></i>LOLDESIGN Soluções Digitais LTDA</span><span><i class='fas fa-map-marker-alt'></i>Remoto</span><span><i class='fa fa-building'></i>Pequena/média empresa</span><span><i class='far fa-chart-bar'></i>Sênior</span><span><i class='far fa-file-alt'></i>PJ</span></div><div><span class='tag-list background-gray'>Python</span><span class='tag-list background-gray'>LangChain</span></div></div>
    </div></div>
  </a>
</div>`;

const html = `<title>Vagas PYTHON para Desenvolvedor e Programador</title><div class="col-md-9">
${card("", "33685", "desenvolvedor-back-end-senior-ai-engineer", "Desenvolvedor Back-End Senior (AI Engineer)", "text-24 line-height-30")}
${card("opacity-50", "30001", "vaga-antiga", "\n Vaga encerrada\n", "color-gray text-24 line-height-30")}
</div>`;

describe("busca", () => {
  test("por tecnologia, com filtros; a lista geral pagina", () => {
    expect(buildSearchUrl({ tag: "python", remote: true, level: "Sênior", contract: "PJ", page: 1 }))
      .toBe("https://programathor.com.br/jobs-python?remoto=true&expertise=S%C3%AAnior&contract_type=PJ");
    expect(buildSearchUrl({ remote: false, page: 3 })).toBe("https://programathor.com.br/jobs/page/3");
    expect(tagSlug("CI/CD")).toBe("CI-CD");
  });

  test("cartão no formato do contrato; encerrada fica de fora; cell-list-content não corta o cartão", () => {
    const { rows } = parseSearch(html)!;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "33685", title: "Desenvolvedor Back-End Senior (AI Engineer)", company: "LOLDESIGN Soluções Digitais LTDA",
      location: "Remoto", url: "https://programathor.com.br/jobs/33685-desenvolvedor-back-end-senior-ai-engineer",
      contract: "PJ", seniority: "Sênior", workplace_type: "remote", date: null,
      company_size: "Pequena/média empresa", tags: ["Python", "LangChain"],
    });
  });

  test("página que não é de vagas devolve null", () => {
    expect(parseSearch("<html>erro</html>")).toBeNull();
  });

  test("referência de vaga", () => {
    expect(parseRef("https://programathor.com.br/jobs/33685-dev")).toBe("33685");
    expect(parseRef("https://example.com/jobs/1")).toBeNull();
  });
});
