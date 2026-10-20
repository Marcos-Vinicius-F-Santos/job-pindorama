import { describe, expect, test } from "bun:test";
import {
  canonicalJobUrl,
  cleanHtml,
  formatLocation,
  parseDetailPage,
  parseJobUrl,
  resolveState,
  toDetail,
  toResult,
  type GupySearchJob,
} from "../src/helpers";
import { buildQuery, withinJobAge } from "../src/commands/search";

// Base64 de {"jobId":12749301,"source":"gupy_portal"} - a forma que a busca devolve.
const ENCODED = "eyJqb2JJZCI6MTI3NDkzMDEsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=";

const searchJob: GupySearchJob = {
  id: 12749301,
  name: "  Analista de Dados &amp; BI  Sênior ",
  description: "Buscamos&nbsp;uma pessoa <b>analítica</b>.",
  careerPageName: "Afya",
  type: "vacancy_type_effective",
  publishedDate: "2026-10-19T20:39:28.532Z",
  applicationDeadline: "2027-02-28T00:00:00.000Z",
  workplaceType: "hybrid",
  city: "Belo Horizonte",
  state: "Minas Gerais",
  jobUrl: `https://afya.gupy.io/job/${ENCODED}?jobBoardSource=gupy_portal`,
  disabilities: false,
};

describe("toResult", () => {
  test("preenche os campos do contrato de portais", () => {
    const r = toResult(searchJob);
    expect(r.id).toBe("12749301");
    expect(r.title).toBe("Analista de Dados & BI Sênior");
    expect(r.company).toBe("Afya");
    expect(r.location).toBe("Belo Horizonte, MG (Híbrido)");
    expect(r.date).toBe("2026-10-19");
    expect(r.url).toBe("https://afya.gupy.io/jobs/12749301");
    expect(r.deadline).toBe("2027-02-28");
    expect(r.contract).toBe("CLT (efetivo)");
    expect(r.contract_code).toBe("vacancy_type_effective");
    expect(r.description).toBe("Buscamos uma pessoa analítica .");
  });

  test("campos ausentes viram null, nunca somem", () => {
    const r = toResult({ id: 1, name: "Vaga" });
    for (const key of ["company", "location", "date", "url", "deadline", "contract"]) {
      expect(r).toHaveProperty(key);
      expect((r as Record<string, unknown>)[key]).toBeNull();
    }
  });

  test("PJ e estágio ganham rótulo legível", () => {
    expect(toResult({ ...searchJob, type: "vacancy_legal_entity" }).contract).toBe("PJ (pessoa jurídica)");
    expect(toResult({ ...searchJob, type: "vacancy_type_internship" }).contract).toBe("Estágio");
  });
});

describe("formatLocation", () => {
  test("remoto sem cidade", () => {
    expect(formatLocation(null, null, "remote")).toBe("Remoto");
  });
  test("presencial não repete o modo", () => {
    expect(formatLocation("Recife", "Pernambuco", "on-site")).toBe("Recife, PE");
  });
  test("nada conhecido é null", () => {
    expect(formatLocation(null, null, null)).toBeNull();
  });
});

describe("resolveState", () => {
  test("aceita sigla, nome e nome sem acento", () => {
    expect(resolveState("sp")).toBe("São Paulo");
    expect(resolveState("São Paulo")).toBe("São Paulo");
    expect(resolveState("sao paulo")).toBe("São Paulo");
    expect(resolveState("Espirito Santo")).toBe("Espírito Santo");
  });
  test("recusa o que não é estado", () => {
    expect(resolveState("Lisboa")).toBeNull();
  });
});

describe("parseJobUrl", () => {
  test("URL canônica /jobs/<id>", () => {
    expect(parseJobUrl("https://afya.gupy.io/jobs/12749301?jobBoardSource=x")).toEqual({ subdomain: "afya", id: "12749301" });
  });
  test("URL do portal /job/<base64>", () => {
    expect(parseJobUrl(`https://afya.gupy.io/job/${ENCODED}?jobBoardSource=gupy_portal`)).toEqual({
      subdomain: "afya",
      id: "12749301",
    });
  });
  test("prefixo de idioma", () => {
    expect(parseJobUrl("https://afya.gupy.io/pt/jobs/12749301")).toEqual({ subdomain: "afya", id: "12749301" });
  });
  test("recusa hosts parecidos e subdomínios de infraestrutura", () => {
    expect(parseJobUrl("https://afya.gupy.io.evil.com/jobs/1")).toBeNull();
    expect(parseJobUrl("https://gupy.io@evil.com/jobs/1")).toBeNull();
    expect(parseJobUrl("https://portal.gupy.io/jobs/1")).toBeNull();
    expect(parseJobUrl("https://a.b.gupy.io/jobs/1")).toBeNull();
  });
  test("só o número não basta", () => {
    expect(parseJobUrl("12749301")).toBeNull();
  });
});

describe("canonicalJobUrl", () => {
  test("sem jobUrl da Gupy não inventa URL", () => {
    expect(canonicalJobUrl(null, 1)).toBeNull();
    expect(canonicalJobUrl("https://example.com/job/1", 1)).toBeNull();
  });
});

describe("cleanHtml", () => {
  test("listas viram itens com hífen, sem linhas em branco entre eles", () => {
    expect(cleanHtml("<h3>Requisitos</h3><ul><li><p>Python</p></li><li><p>SQL</p></li></ul>")).toBe(
      "Requisitos\n- Python\n- SQL",
    );
  });
  test("vazio é null", () => {
    expect(cleanHtml("")).toBeNull();
    expect(cleanHtml("<p> </p>")).toBeNull();
  });
});

describe("parseDetailPage / toDetail", () => {
  const page = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      pageProps: {
        job: {
          id: 12749301,
          name: "Analista de Dados Sênior",
          description: "<p>Descrição</p>",
          responsibilities: "<ul><li>Analisar</li></ul>",
          prerequisites: "<p>SQL</p>",
          relevantExperiences: "<p>Vale-refeição</p>",
          addressCity: "Belo Horizonte",
          addressState: "Minas Gerais",
          jobType: "vacancy_type_effective",
          workplaceType: "hybrid",
          publishedAt: "2026-10-19T20:39:28.532Z",
          registerEndDate: "2027-02-28",
          handicapped: true,
          jobSteps: [{ name: "Cadastro" }, { name: "Entrevista" }],
          careerPage: { name: "Afya" },
        },
      },
    },
  })}</script></html>`;

  test("lê o job do __NEXT_DATA__", () => {
    const raw = parseDetailPage(page);
    expect(raw?.id).toBe(12749301);
    const d = toDetail(raw!, "afya");
    expect(d.url).toBe("https://afya.gupy.io/jobs/12749301");
    expect(d.company).toBe("Afya");
    expect(d.deadline).toBe("2027-02-28");
    expect(d.requirements).toBe("SQL");
    expect(d.additional_info).toBe("Vale-refeição");
    expect(d.responsibilities).toBe("- Analisar");
    expect(d.pcd).toBe(true);
    expect(d.steps).toEqual(["Cadastro", "Entrevista"]);
  });

  test("página sem __NEXT_DATA__ é null", () => {
    expect(parseDetailPage("<html></html>")).toBeNull();
  });
});

describe("buildQuery", () => {
  test("um valor por filtro e offset a partir da página", () => {
    const p = buildQuery({
      query: "analista",
      city: "Recife",
      state: "Pernambuco",
      workplaceType: "remote",
      contractType: "vacancy_legal_entity",
      jobage: 9999,
      page: 3,
      limit: 10,
      format: "json",
      includeDescription: true,
    });
    expect(p.get("jobName")).toBe("analista");
    expect(p.get("offset")).toBe("20");
    expect(p.getAll("type")).toEqual(["vacancy_legal_entity"]);
    expect(p.get("state")).toBe("Pernambuco");
  });
});

describe("withinJobAge", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  const row = (date: string | null) => ({ ...toResult(searchJob), date });

  test("descarta o que é mais velho que N dias e mantém vaga sem data", () => {
    const kept = withinJobAge([row("2026-10-18"), row("2026-09-01"), row(null)], 7, now);
    expect(kept.map((r) => r.date)).toEqual(["2026-10-18", null]);
  });
  test("9999 é sem filtro", () => {
    expect(withinJobAge([row("2000-01-01")], 9999, now)).toHaveLength(1);
  });
});
