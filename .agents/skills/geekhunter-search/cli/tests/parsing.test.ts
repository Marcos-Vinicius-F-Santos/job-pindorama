import { describe, expect, test } from "bun:test";
import { balancedJson, nextPayload, pageUrl, parseDetail, parseRef, parseSearch } from "../src/parse";

// Amostras reduzidas no formato real das páginas do GeekHunter (payload do Next.js).

/** Embrulha um texto como o Next.js faz: `self.__next_f.push([1,"<json-string>"])`. */
const push = (text: string) => `<script>self.__next_f.push([1,${JSON.stringify(text)}])</script>`;

const jobs = [
  { __typename: "PublicJob", id: "ats_1", type: "ats", atsJob: { jobSlug: "desenvolvedor-pleno-93", publishedAt: String(Date.UTC(2026, 9, 20)),
    company: { slug: "mv-saude-digital" }, atsJobDetail: { title: "DESENVOLVEDOR PLENO", description: "Sobre a MV…", experienceLevel: "mid",
      workModality: "remote", atsJobSalaries: [{ contractType: "CLT", minSalary: null, maxSalary: null }],
      atsJobSkills: [{ atsSkill: { name: "Oracle" } }], atsJobCities: [] } } },
  { __typename: "PublicJob", id: "ats_2", type: "ats", atsJob: { jobSlug: "analista-de-dados-1", publishedAt: String(Date.UTC(2026, 9, 18)),
    company: { slug: "nava-technology-for-business-1" }, atsJobDetail: { title: "Analista de Dados Sênior", experienceLevel: "senior",
      workModality: "hybrid", atsJobSalaries: [{ contractType: "PJ", minSalary: 9000, maxSalary: 12000 }], atsJobCities: [{ name: "São Paulo, SP" }] } } },
];
// O payload chega partido em vários pushes; o array de vagas atravessa a divisão.
const payload = `31:["$","main",null,{"data":${JSON.stringify(jobs)}}]`;
const searchHtml = `<title>Vagas de Tecnologia no Brasil | GeekHunter</title>${push(payload.slice(0, 120))}${push(payload.slice(120))}`;

const detailHtml = `<title>DESENVOLVEDOR PLENO em MV Saúde Digital</title>
${push('{"messages":{"jobCard":{"experienceLevel":"Nível de experiência","workModality":"Modelo"}}}')}
${push('"companyName":"MV Saúde Digital","supportModalityCLT":true,"supportModalityPJ":false,')}
${push('"job":{"title":"DESENVOLVEDOR PLENO","workModality":"remote","hideSalary":true,"experienceLevel":"mid","atsJobCities":[],"atsJobSalaries":[{"minSalary":4672,"maxSalary":4672,"contractType":"CLT"}]}')}
<main><div id="job-details" class="x"><h2>Requisitos</h2><span>Oracle</span><h2>Tarefas e Responsabilidades</h2><p><strong>Sobre a MV</strong></p><p>Vaga 100% remota.</p></div></main>`;

describe("payload do Next.js", () => {
  test("junta os pedaços e acha o JSON balanceado", () => {
    const text = nextPayload(searchHtml);
    expect(text).toContain('"data":[');
    const arr = balancedJson(text, text.indexOf('"data":') + 7);
    expect(Array.isArray(arr) && arr.length).toBe(2);
  });
});

describe("busca", () => {
  test("URL da página", () => {
    expect(pageUrl(1)).toBe("https://www.geekhunter.com/pt/vagas");
    expect(pageUrl(3)).toBe("https://www.geekhunter.com/pt/vagas?page=3");
  });

  test("vagas no formato do contrato", () => {
    const { rows } = parseSearch(searchHtml)!;
    expect(rows[0]).toMatchObject({
      id: "mv-saude-digital/desenvolvedor-pleno-93", title: "DESENVOLVEDOR PLENO", company: "Mv Saude Digital",
      location: "Remoto", date: "2026-10-20", url: "https://www.geekhunter.com/pt/mv-saude-digital/jobs/desenvolvedor-pleno-93",
      contract: "CLT", workplace_type: "remote", seniority: "Pleno", salary: null, skills: ["Oracle"],
    });
    expect(rows[1]).toMatchObject({ company: "Nava Technology For Business", location: "São Paulo, SP", workplace_type: "hybrid",
      seniority: "Sênior", contract: "PJ", salary: "R$ 9.000,00 a R$ 12.000,00" });
  });

  test("página sem o array de vagas devolve null; lista vazia do próprio portal não", () => {
    expect(parseSearch("<html></html>")).toBeNull();
    expect(parseSearch("<title>Vagas de Tecnologia no Brasil</title>")).toEqual({ rows: [], total: 0 });
  });
});

describe("detalhe", () => {
  test("referência", () => {
    expect(parseRef("https://www.geekhunter.com/pt/mv-saude-digital/jobs/desenvolvedor-pleno-93")).toBe("mv-saude-digital/desenvolvedor-pleno-93");
    expect(parseRef("https://example.com/pt/a/jobs/b")).toBeNull();
  });

  test("lê o objeto da vaga, não os rótulos da interface; respeita hideSalary", () => {
    const job = parseDetail(detailHtml, "mv-saude-digital/desenvolvedor-pleno-93")!;
    expect(job).toMatchObject({
      title: "DESENVOLVEDOR PLENO", company: "MV Saúde Digital", workplace_type: "remote", seniority: "Pleno",
      contract: "CLT", salary: null, location: "Remoto",
    });
    expect(job.description).toContain("Tarefas e Responsabilidades");
    expect(job.description).toContain("Vaga 100% remota.");
  });
});
