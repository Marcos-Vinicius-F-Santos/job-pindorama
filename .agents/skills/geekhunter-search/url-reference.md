# GeekHunter: páginas e dados

Levantado em outubro de 2026 (Next.js com app router).

## Busca

`GET https://www.geekhunter.com/pt/vagas[?page=<n>]`, 25 vagas por página, ~31 páginas.
`?search=`, `?q=`, `?query=` e `?keyword=` são ignorados.

As vagas vêm no payload do Next.js: o texto empurrado em pedaços por
`self.__next_f.push([1,"<string JSON>"])`. Juntando os pedaços, há um array
`"data":[{"__typename":"PublicJob",...}]` (pode atravessar a divisão entre pedaços). Por vaga:

| Campo | Caminho |
|-------|---------|
| slug da vaga | `atsJob.jobSlug` |
| data | `atsJob.publishedAt` (milissegundos, em texto) |
| empresa | `atsJob.company.slug` (só o identificador) |
| título, resumo | `atsJob.atsJobDetail.title`, `.description` |
| nível | `.experienceLevel` (`junior`, `mid`, `senior`, `specialist`...) |
| modelo | `.workModality` (`remote`, `remote-in-city`, `hybrid`, `on-site`) |
| regime, salário | `.atsJobSalaries[].contractType`, `.minSalary`, `.maxSalary` |
| tecnologias, cidades | `.atsJobSkills[].atsSkill.name`, `.atsJobCities` |

URL da vaga: `https://www.geekhunter.com/pt/<company.slug>/jobs/<jobSlug>`.

## Detalhe

`GET https://www.geekhunter.com/pt/<empresa>/jobs/<slug>`

- `<title>`: "<título> em <empresa>".
- Payload: `"companyName"`, `"supportModalityCLT"`, `"supportModalityPJ"` e um objeto
  `"job":{...}` com `workModality`, `experienceLevel`, `hideSalary`, `atsJobSalaries`.
  **Os rótulos da interface também têm chaves `experienceLevel`/`workModality`** (textos de
  tradução): leia só o objeto que começa em `"job":{` antes de `"atsJobCities"`.
- Descrição: o HTML a partir de `id="job-details"` até `</main>` ("Requisitos", "Tarefas e
  Responsabilidades"...). Não há bloco JobPosting.

## Acesso

- `robots.txt`: `/pt/vagas` e as páginas de vaga liberados. Termos (`/pt/termos-de-uso`): sem
  cláusula sobre acesso automatizado.
