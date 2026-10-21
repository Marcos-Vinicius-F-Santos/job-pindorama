import { describe, expect, test } from "bun:test";
import { detailUrl, pageUrl, parseDetail, parseRef, parseSearch } from "../src/parse";

// Amostras reduzidas no formato real das páginas do PCD Online (www.pcd.com.br).

const card = (id: string, slug: string, title: string, company: string, places: string[], contract: string, salary: string) => `
<div class="card shadow mb-3 card-vaga"> <div class="card-body">
 <a class="mb-1" href="https://www.pcd.com.br/empresa/x/vagas-para-pcd/1"> <u><span class="h5"> ${company}</span></u> </a>
 <p class="mb-1"> <span class="h4"> <a href="/emprego-pcd/${slug}/${id}">${title}</a> </span> </p>
 <p class="strinDescricao">Sobre a vaga Estamos em busca de um(a) profissional...</p>
 ${places.map((p) => `<div class="w-50"> <span><i class="fas fa-map-marker-alt text-pcd-orange fa-fw"></i> ${p}</span> </div>`).join("")}
 <div class="w-50"> <span><i class="fas fa-briefcase text-pcd-orange fa-fw"></i> ${contract}</span> </div>
 <div class="w-50"> <span><i class="fas fa-coins text-pcd-orange fa-fw"></i> ${salary}</span> </div>
 <span class="exclusivo-pcd-grid description-pcd h5 exclusivo-pcd">Exclusivo PCD</span>
</div></div>`;

const page = `<h1 class="display-4 text-dark" id="total_vagas">5.587 Vagas para PCD encontradas</h1>
${card("69830", "cientista-de-dados-sr-pcd-em-todo-brasil-sp", "Cientista de Dados Sr PCD", "BRQ Digital Solutions", ["Todo Brasil", "Remoto"], "Contrato CLT", "A combinar")}
${card("72332", "analista-administrativo-sr-pcd", "Vaga PCD ANALISTA ADMINISTRATIVO SR PCD", "NotreDame Intermédica", ["Belo horizonte"], "Contrato CLT", "R$ 4.000,00")}`;

const detail = `<script type="application/ld+json">{"@context":"http://schema.org","@type":"JobPosting","title":"Cientista De Dados SR PCD",
"description":"\\n\\nSobre a vaga \\n\\nEstamos em busca de um(a) profissional de Dados.","datePosted":"2026-08-06","validThrough":"2026-11-03",
"hiringOrganization":{"@type":"Organization","name":"BRQ Digital Solutions"},"jobLocationType":"TELECOMMUTE"}</script>`;

describe("busca", () => {
  test("páginas da lista", () => {
    expect(pageUrl(1)).toBe("https://www.pcd.com.br/vagas-para-pcd");
    expect(pageUrl(4)).toBe("https://www.pcd.com.br/vagas-para-pcd?page=4");
  });

  test("cartões no formato do contrato", () => {
    const { rows, total } = parseSearch(page)!;
    expect(total).toBe(5587);
    expect(rows[0]).toMatchObject({
      id: "69830", title: "Cientista de Dados Sr PCD", company: "BRQ Digital Solutions", location: "Todo Brasil · Remoto",
      url: "https://www.pcd.com.br/emprego-pcd/cientista-de-dados-sr-pcd-em-todo-brasil-sp/69830",
      contract: "CLT", workplace_type: "remote", salary: null, pcd_only: true,
    });
    expect(rows[1]).toMatchObject({ location: "Belo horizonte", workplace_type: null, salary: "R$ 4.000,00" });
  });

  test("página que não é de vagas devolve null", () => {
    expect(parseSearch("<html></html>")).toBeNull();
  });
});

describe("detalhe", () => {
  test("referência: URL ou id", () => {
    expect(parseRef("https://www.pcd.com.br/emprego-pcd/cientista-de-dados/69830")).toBe("cientista-de-dados/69830");
    expect(parseRef("69830")).toBe("vaga/69830");
    expect(detailUrl("vaga/69830")).toBe("https://www.pcd.com.br/emprego-pcd/vaga/69830");
    expect(parseRef("https://example.com/emprego-pcd/a/1")).toBeNull();
  });

  test("lê o JobPosting", () => {
    expect(parseDetail(detail, "cientista-de-dados/69830")).toMatchObject({
      id: "69830", title: "Cientista De Dados SR PCD", company: "BRQ Digital Solutions", date: "2026-08-06",
      deadline: "2026-11-03", workplace_type: "remote", location: "Remoto", pcd_only: true,
    });
  });
});
