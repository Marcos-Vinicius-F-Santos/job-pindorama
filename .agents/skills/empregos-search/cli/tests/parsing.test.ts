import { afterEach, describe, expect, test } from "bun:test";
import { descriptionHtml, detailUrl, pageUrl, parseDetail, parseRef, parseSearch, roleSlug, workplace } from "../src/parse";
import { runSearch } from "../src/commands/search";

// Amostras reduzidas no formato real da Empregos.com.br (outubro de 2026).

const originalFetch = globalThis.fetch;
const originalStdout = process.stdout.write;
afterEach(() => {
  globalThis.fetch = originalFetch;
  process.stdout.write = originalStdout;
});

const NOW = new Date("2026-10-22T12:00:00Z");

const icon = (name: string, text: string, tag = "span") =>
  `<div class="flex gap-1"><img src="https://static.empregos.com.br/icons/${name}.svg" class="h-[14px]" alt="Ícone"><${tag}>${text}</${tag}></div>`;

function card(id: string, title: string, company: string, model: string, extra: { salary?: string; when?: string; text?: string } = {}) {
  const short = company.length > 30 ? company.slice(0, 30) + "..." : company;
  return `<div id="job-card" class="cmp-job-card-area-expand" aria-label="Abrir detalhes da vaga ${title}">` +
    `<a href="https://empregos.com.br/empresa/x/e-1"><img src="defaultcompany.png" alt="Logo da empresa ${company}"></a>` +
    `<h2 class="max-w-96"><span class="text-base">${title}</span></h2><h3><a href="https://empregos.com.br/empresa/x/e-1">${short}</a></h3>` +
    `<div style="display:none;" id="share-modal-mobile"><a href="mailto:?body=%2Fvaga%2F${id}">Email</a><span>Copiar link</span></div>` +
    icon("location-on-outline", "São Paulo, SP", "h3") + icon("emoji-people", model) + icon("work-outline", " 1 vaga") +
    icon("payments-outline", extra.salary ?? "À combinar") + icon("event-outline", extra.when ?? "Publicada há 2 dias", "h3") +
    `<div class="mt-2"><div class="cursor-pointer"><div class="text-cinza90 line-clamp-5 md:line-clamp-3">${extra.text ?? "<p>Descrição</p>"}</div></div></div>` +
    `<a href="/vaga/${id}/${title.toLowerCase().replace(/\W+/g, "-")}-em-sao-paulo-sp" role="button">Mais detalhes</a></div>`;
}

const page1 = `<html><head><title>239 vagas de emprego para Product Manager em todo o Brasil</title></head><body>` +
  card("11937474", "Product Manager Sr (technical)", "MAISTODOS", "Remoto", { when: "Publicada há 1 dia", text: "<p>Atuação 100% remota.</p><ul><li>Roadmap</li></ul>" }) +
  card("11874765", "Product Manager", "ADEMICON ADMINISTRADORA DE CONSÓRCIOS S/A", "Presencial", { when: "Publicada há 21 dias" }) +
  card("11879975", "Product Manager", "Innolevels", "Híbrido", { salary: "R$ 8.000,00" }) +
  card("11811438", "Analista Comercial", "Outra", "Remoto") +
  `</body></html>`;

describe("busca", () => {
  test("cargo vira o caminho da página, sem acento", () => {
    expect(roleSlug("Gerente de Produto")).toBe("gerente-de-produto");
    expect(roleSlug("  Analista de Inteligência Artificial ")).toBe("analista-de-inteligencia-artificial");
    expect(roleSlug("C++ / Node.js")).toBe("c-node-js");
    expect(pageUrl("product-manager", 1)).toBe("https://www.empregos.com.br/vagas/product-manager");
    expect(pageUrl("product-manager", 3)).toBe("https://www.empregos.com.br/vagas/product-manager/3");
  });

  test("modelo de trabalho do cartão", () => {
    expect(workplace("Híbrido")).toBe("hybrid");
    expect(workplace("Remoto")).toBe("remote");
    expect(workplace("Presencial")).toBe("on-site");
    expect(workplace(null)).toBeNull();
  });

  test("cartões no formato do contrato, com a empresa inteira (o h3 vem cortado)", () => {
    const p = parseSearch(page1, NOW)!;
    expect(p.total).toBe(239);
    expect(p.rows).toHaveLength(4);
    expect(p.rows[0]).toMatchObject({
      id: "11937474", title: "Product Manager Sr (technical)", company: "MAISTODOS", location: "São Paulo, SP",
      date: "2026-10-21", url: "https://www.empregos.com.br/vaga/11937474", workplace_type: "remote",
      salary: null, openings: 1, description: "Atuação 100% remota.\n- Roadmap",
    });
    expect(p.rows[1]).toMatchObject({ company: "ADEMICON ADMINISTRADORA DE CONSÓRCIOS S/A", date: "2026-10-01", workplace_type: "on-site" });
    expect(p.rows[2]).toMatchObject({ salary: "R$ 8.000,00", workplace_type: "hybrid" });
  });

  test("página sem cartões (passou da última) e página fora do formato", () => {
    expect(parseSearch("<html><title>239 vagas de emprego para X</title></html>")).toEqual({ rows: [], total: 239 });
    expect(parseSearch("nada")).toBeNull();
  });

  test("runSearch lê as páginas até uma vazia, filtra título e modelo", async () => {
    const urls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      urls.push(url);
      return new Response(url.endsWith("/product-manager") ? page1 : "<html><title>239 vagas</title></html>");
    }) as unknown as typeof fetch;
    let out = "";
    process.stdout.write = ((c: string | Uint8Array) => ((out += c.toString()), true)) as typeof process.stdout.write;
    const code = await runSearch({
      query: "product manager", pages: 5, limit: 25, jobage: 9999, format: "json", includeDescription: false,
      keep: (r) => r.workplace_type !== "on-site",
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(parsed.results.map((r: { id: string }) => r.id)).toEqual(["11937474", "11879975"]);
    expect(parsed.results[0].description).toBeNull();
    expect(parsed.meta).toMatchObject({ scanned: 4, site_total: 239 });
    expect(urls).toEqual(["https://www.empregos.com.br/vagas/product-manager", "https://www.empregos.com.br/vagas/product-manager/2"]);
  });
});

describe("detalhe", () => {
  test("referência: URL da vaga ou id", () => {
    expect(parseRef("https://www.empregos.com.br/vaga/11909170/product-manager-senior-em-sao-paulo-sp")).toBe("11909170");
    expect(parseRef("https://empregos.com.br/vaga/11909170")).toBe("11909170");
    expect(parseRef("11909170")).toBe("11909170");
    expect(parseRef("https://www.empregos.com.br/vagas/product-manager")).toBeNull();
    expect(parseRef("https://empregos.com.br.exemplo.com/vaga/1")).toBeNull();
    expect(parseRef("http://www.empregos.com.br/vaga/11909170")).toBeNull();
    expect(detailUrl("11909170")).toBe("https://www.empregos.com.br/vaga/11909170");
  });

  const ld = JSON.stringify({
    "@context": "https://schema.org", "@type": "JobPosting", title: "Product Manager - Sênior",
    description: "Sobre a vagaEstamos em busca", datePosted: "2026-10-14T12:23:40.600",
    jobLocation: { address: { addressLocality: "São Paulo", addressRegion: "SP" } },
    hiringOrganization: { name: "AL Consultoria Tech" },
    baseSalary: { value: { value: 15000, unitText: "MONTH" } }, jobLocationType: "TELECOMMUTE",
  });
  const detail = `<html><head><script type="application/ld+json">${ld}</script></head><body>` +
    `<div><h3 class="text-base"> Descrição da vaga </h3><div class="text-cinza90 break-words"><h3>Sobre a vaga</h3><p>Estamos em busca</p>` +
    `<div class="x"><ul><li>Roadmap</li></ul></div></div><div>rodapé</div></div></body></html>`;

  test("descrição formatada da seção da página, com divs dentro", () => {
    expect(descriptionHtml(detail)).toBe('<h3>Sobre a vaga</h3><p>Estamos em busca</p><div class="x"><ul><li>Roadmap</li></ul></div>');
  });

  test("lê o JobPosting: remoto pelo TELECOMMUTE, salário e empresa", () => {
    expect(parseDetail(detail, "11909170")).toMatchObject({
      id: "11909170", title: "Product Manager - Sênior", company: "AL Consultoria Tech", location: "São Paulo, SP",
      date: "2026-10-14", workplace_type: "remote", salary: "R$ 15.000,00",
    });
    expect(parseDetail(detail, "11909170")!.description).toContain("- Roadmap");
    expect(parseDetail("<html>nada</html>", "1")).toBeNull();
  });

  test("sem a seção formatada, usa a descrição do JobPosting", () => {
    expect(parseDetail(`<script type="application/ld+json">${ld}</script>`, "1")!.description).toBe("Sobre a vagaEstamos em busca");
  });
});
