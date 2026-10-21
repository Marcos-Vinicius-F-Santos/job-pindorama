# Michael Page Brasil: páginas e âncoras de leitura

Levantado em outubro de 2026 (site em Drupal).

## Busca

`GET https://www.michaelpage.com.br/jobs/<termo>[?page=<n-1>]`

- `<termo>`: minúsculas, sem acento, palavras unidas por `-` (`gerente-de-produto`).
- Paginação do Drupal: `?page=` começa em 0.
- Também há listas por área: `/jobs/digital`, `/jobs/information-technology`, `/jobs/marketing`...

Resultados: `<li class="views-row">` com `div.job-tile.search-job-tile`. Os cartões
`recommended-job-tile` (links com `ng-src=other-users-applied`) são recomendações, não
resultados.

| Campo | Âncora |
|-------|--------|
| id | `<div class="job-title " id="<id>">` |
| título, URL | `<h3><a href="/job-detail/<slug>/ref/<ref>">` |
| local | `div.job-location` |
| contrato | `div.job-contract-type` (Permanente, Temporário...) |
| resumo | `div.job_advert__job-summary-text` |
| destaques | `div.job_advert__job-desc-bullet-points` `<li>` |

## Detalhe

`GET https://www.michaelpage.com.br/job-detail/<slug>/ref/<ref>`

- `<script type="application/ld+json">` com `@type: JobPosting`: `title`, `datePosted`,
  `description` (HTML: "Sobre nosso cliente", "Descrição", "O candidato ideal", "O que está
  sendo oferecido"), `jobLocation.address`, `hiringOrganization` (sempre Michael Page),
  `baseSalary` (vazio). **O JSON vem com quebras de linha cruas dentro das strings**: a leitura
  troca os caracteres de controle por espaço antes de interpretar.

## Acesso

- `robots.txt`: `/jobs` e `/job-detail` liberados. Termos (`/termos-e-condições`): sem cláusula
  sobre acesso automatizado.
