# InfoJobs Brasil: páginas e âncoras de leitura

Referência para manter a `infojobs-search` quando o portal mudar a marcação. Levantado em
outubro de 2026.

## Busca

`GET https://www.infojobs.com.br/empregos.aspx?palabra=<termo>[&idw=<modelo>][&Page=<n>]`

| Parâmetro | Valores |
|-----------|---------|
| `palabra` | texto (o nome do parâmetro é em espanhol) |
| `idw` | `1` presencial, `2` home office, `3` híbrido (um valor só) |
| `Page` | 2, 3, ... (com **P maiúsculo**; `page` minúsculo é ignorado). 20 vagas por página |

Formas equivalentes que a própria página usa nos links: `/vagas-de-emprego-<termo>.aspx`
e `/vagas-de-emprego-<termo>-trabalho-home-office.aspx` (a CLI usa `empregos.aspx`, onde
`Page` funciona).

Cartões: cada vaga começa em `<div id="vacancy<id>" data-id="<id>" class="... js_vacancyLoad ..." data-href="/vaga-de-...__<id>.aspx">`.
**Corte a página em `<div id="vacancy`**: cortar em `js_vacancyLoad` (que vem depois do
`data-id`) dá a cada pedaço o id do cartão seguinte.

| Campo | Marcação |
|-------|----------|
| data | `<div hidden class="js_date" data-value="AAAA/MM/DD HH:MM:SS">` |
| título | `<h2 class="... js_vacancyTitle">` |
| empresa | `<div class="text-body">`: texto antes do selo `<span onclick=... data-bs-toggle="tooltip">` (o selo guarda HTML num atributo). O nome pode vir partido em `<span class="text-nowrap">` |
| local | `<div class="mb-8">` antes de `<span hidden class="js_divUserVagaDistance">` |
| atributos | `<div class="d-inline-flex flex-wrap mb-8 ...">` com um `<div>` por item (cada um com um `<svg>` de ícone): salário (`R$ ...` ou `A combinar`), experiência, escolaridade, modelo (`Home office`, `Híbrido`, `Presencial`) |
| trecho | `<div class="text-medium">` depois dos atributos |

## Detalhe

`GET https://www.infojobs.com.br/vaga-de-<slug>__<id>.aspx` (o número sozinho não abre).

- `<script type="application/ld+json">` com `@type: JobPosting`: `title`, `description`
  (HTML com `<br>`, **completa**), `datePosted`, `validThrough`, `hiringOrganization.name`,
  `jobLocation.address`, `baseSalary.value.minValue/maxValue`.
- A descrição começa com linhas fixas: "Senioridade: ...", "Lugar de trabalho: ...",
  "Regime de contratação de tipo Efetivo – CLT", "Jornada ...".
- Blocos com `icon-user-home` na página são de "vagas parecidas", não da vaga.

## Acesso

- `robots.txt`: busca e páginas de vaga liberadas; `<meta name="ROBOTS" content="INDEX,FOLLOW">`.
- **Termos** (`/legal/aviso-legal-para-candidatos__15727.aspx`): "Não utilizar mecanismos,
  software ou scripts em relação à utilização do Website ... cópias mediante tecnologias de
  buscador tipo Robot/Crawler ... estão expressamente proibidas". Por isso o aviso de uso
  pessoal no SKILL.md.
- Responde ao User-Agent honesto da CLI.
