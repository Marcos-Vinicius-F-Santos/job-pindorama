import { describe, expect, test } from "bun:test";
import { detailUrl, jobUrl, parseDetail, parseRef, parseSearch, placeFromTitle } from "../src/parse";

// Amostras reduzidas no formato real da API pública do portal Agroforce (AGROSearch).

const list = JSON.stringify([
  { dealId: 1036, titulo: "Especialista Em Crédito | Curitiba - PR", modelo: "Localidade: Curitiba/PR\nModelo de contratação: CLT\nBenefícios:\n- Plano de saúde" },
  { dealId: 990, titulo: "Representante Técnico de Vendas (RTV) – Fertilizantes | MG/SP", modelo: "Atuação 100% externa.\n\nContratação CLT, com possibilidade de avaliação para PJ." },
  { dealId: -12, titulo: "AGROSearch | International Account Executive", modelo: "Remote role with commission-based compensation." },
]);

describe("busca", () => {
  test("local é o trecho depois do último separador", () => {
    expect(placeFromTitle("Especialista Em Crédito | Curitiba - PR")).toBe("Curitiba - PR");
    expect(placeFromTitle("Supervisor Técnico Comercial - Guarapuava/PR")).toBe("Guarapuava/PR");
    expect(placeFromTitle("RTV – Fertilizantes | MG/SP")).toBe("MG/SP");
    expect(placeFromTitle("Diretor Comercial")).toBeNull();
  });

  test("vagas no formato do contrato; regime e modelo saem do texto de condições", () => {
    const { rows, total } = parseSearch(list)!;
    expect(total).toBe(3);
    expect(rows[0]).toMatchObject({
      id: "1036", title: "Especialista Em Crédito | Curitiba - PR", company: "AGROSearch (cliente)", location: "Curitiba - PR",
      date: null, url: "https://agroforce.agrosearch.com.br/portal.html#/vaga/1036", contract: "CLT", internal: false,
    });
    expect(rows[1]).toMatchObject({ contract: "CLT, PJ", workplace_type: "on-site", location: "MG/SP" });
    expect(rows[2]).toMatchObject({ company: "AGROSearch", internal: true, location: null, workplace_type: "remote" });
  });

  test("formato inesperado devolve null", () => {
    expect(parseSearch("<html>")).toBeNull();
    expect(parseSearch(JSON.stringify({ vagas: [] }))).toBeNull();
  });
});

describe("detalhe", () => {
  test("referência: dealId ou URL do portal", () => {
    expect(parseRef("1036")).toBe("1036");
    expect(parseRef("-12")).toBe("-12");
    expect(parseRef(jobUrl(1036))).toBe("1036");
    expect(parseRef("https://example.com/#/vaga/1")).toBeNull();
    expect(detailUrl("1036")).toBe("https://apim-agroforce-prod.azure-api.net/v1/public/vagas/1036");
  });

  test("monta a descrição com responsabilidades, requisitos e condições, sem marcador duplo", () => {
    const body = JSON.stringify({ dealId: 1036, titulo: "Especialista Em Crédito | Curitiba - PR", divisao: "specialist",
      descricao: "Análise de crédito no agro.", responsabilidades: ["- Analisar balanços.", "• Avaliar garantias."],
      requisitos: ["Graduação em Economia."], modelo: "CLT" });
    const job = parseDetail(body, "1036")!;
    expect(job.description).toBe("Análise de crédito no agro.\n\n## Responsabilidades\n- Analisar balanços.\n- Avaliar garantias.\n\n## Requisitos\n- Graduação em Economia.\n\n## Condições\nCLT");
    expect(job.division).toBe("specialist");
    expect(parseDetail(body, "999")).toBeNull();
  });
});
