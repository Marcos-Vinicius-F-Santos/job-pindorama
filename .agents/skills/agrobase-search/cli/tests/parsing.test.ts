import { describe, expect, test } from "bun:test";
import { buildSearchUrl, parseDetail, parseRef, parseSearch, releasedDate } from "../src/parse";

// Amostras reduzidas no formato real do Agrobase (API do WordPress e página da vaga).

const posts = JSON.stringify([
  { id: 582328, date: "2026-10-21T00:12:00", link: "https://www.agrobase.com.br/oportunidades/2026/10/zootecnista-trainee-pr-e-sp/",
    title: { rendered: "Zootecnista trainee &#8211; PR e SP" }, content: { rendered: "<p>Paraná, São Paulo</p>\n<p>Emprego Zootecnista</p>" },
    categories: [93, 237] },
  { id: 582323, date: "2026-10-21T00:09:00", link: "https://www.agrobase.com.br/oportunidades/2026/10/vendedor-de-pecas-santa-rosa-rs/",
    title: { rendered: "Vendedor de peças &#8211; Santa Rosa/RS" }, content: { rendered: "<p>Rio Grande do Sul</p>" },
    categories: [93, 228, 234] },
]);

const page = `<h1 class="bde-heading-850710-112 bde-heading">
Zootecnista trainee – PR e SP
</h1><a class="bde-container-link" href="#"><div class="bde-text-850710-115 bde-text">
liberado em 21 de outubro de 2026
</div></a>
<a class="breakdance-link" href="https://plataforma.agrobase.com.br/vaga/zootecnista-trainee-pr-e-sp" target="_blank"><span>candidatar-se</span></a>
<div class="section-container"><div class="bde-columns"><div class="bde-column">
<div class="bde-text-850710-128 bde-text">
<p>SP l São Paulo, PR l Paraná<br />
Trainee<br />
Zootecnista</p>
<h2>Responsabilidades</h2>
<ul>
<li>Ser treinado para atuar com consultoria em propriedades de associados.</li>
</ul>
<h2>Requisitos</h2>
<ul><li>Formação em Zootecnia.</li><li>CNH.</li></ul>
</div><div class="bde-div-850710-129 bde-div">`;

describe("busca", () => {
  test("API do WordPress com tipo, profissão e data", () => {
    const url = new URL(buildSearchUrl({ query: "trainee", type: 93, profession: 237, page: 2, limit: 500, after: "2026-10-14" }));
    expect(url.pathname).toBe("/wp-json/wp/v2/posts");
    expect(url.searchParams.get("search")).toBe("trainee");
    expect(url.searchParams.get("categories")).toBe("93,237");
    expect(url.searchParams.get("per_page")).toBe("100");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("after")).toBe("2026-10-14T00:00:00");
  });

  test("posts no formato do contrato; local vem do título", () => {
    const { rows } = parseSearch(posts)!;
    expect(rows[0]).toMatchObject({
      id: "582328", title: "Zootecnista trainee – PR e SP", location: "PR e SP", date: "2026-10-21",
      url: "https://www.agrobase.com.br/oportunidades/2026/10/zootecnista-trainee-pr-e-sp/",
      seniority: "Trainee", professions: ["Zootecnista"], kind: "Emprego",
    });
    expect(rows[1]).toMatchObject({ title: "Vendedor de peças – Santa Rosa/RS", location: "Santa Rosa/RS",
      professions: ["Engenheiro Agrônomo", "Técnico Agrícola"] });
  });

  test("formato inesperado devolve null", () => {
    expect(parseSearch("<html>")).toBeNull();
    expect(parseSearch(JSON.stringify({ code: "rest_no_route" }))).toBeNull();
  });
});

describe("detalhe", () => {
  test("data por extenso", () => {
    expect(releasedDate("liberado em 21 de outubro de 2026")).toBe("2026-10-21");
    expect(releasedDate("liberado em 3 de março de 2026")).toBe("2026-03-03");
    expect(releasedDate("sem data")).toBeNull();
  });

  test("referência: só a URL da vaga", () => {
    expect(parseRef("https://www.agrobase.com.br/oportunidades/2026/10/zootecnista-trainee-pr-e-sp/"))
      .toBe("/oportunidades/2026/10/zootecnista-trainee-pr-e-sp/");
    expect(parseRef("https://www.agrobase.com.br/oportunidades/2026/10/x")).toBe("/oportunidades/2026/10/x/");
    expect(parseRef("https://example.com/oportunidades/2026/10/x/")).toBeNull();
  });

  test("lê a página da vaga", () => {
    const job = parseDetail(page, "/oportunidades/2026/10/zootecnista-trainee-pr-e-sp/")!;
    expect(job).toMatchObject({
      id: "zootecnista-trainee-pr-e-sp", title: "Zootecnista trainee – PR e SP", date: "2026-10-21",
      location: "São Paulo, Paraná", contract: "Trainee", seniority: "Trainee", professions: ["Zootecnista"],
    });
    expect(job.description).toContain("Responsabilidades");
    expect(job.description).toContain("- CNH.");
    expect((job as { apply_url?: string }).apply_url).toBe("https://plataforma.agrobase.com.br/vaga/zootecnista-trainee-pr-e-sp");
  });
});
