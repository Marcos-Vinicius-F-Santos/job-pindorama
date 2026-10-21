# Programathor: páginas e âncoras de leitura

Levantado em outubro de 2026.

## Busca

- Lista geral: `GET https://programathor.com.br/jobs` e `/jobs/page/<n>`.
- Por tecnologia: `GET https://programathor.com.br/jobs-<tecnologia>` (ex.: `/jobs-python`,
  `/jobs-scrum`, `/jobs-CI-CD`). **Não pagina** (`/jobs-python/page/2` dá 404).
- Filtros por query string (valem nas duas): `remoto=true`, `expertise=Júnior|Pleno|Sênior`,
  `contract_type=CLT|PJ|Estágio`, `company_type=Startup`, `accepts_outer_candidates=`.
- `?search=` e `?page=` são ignorados.

Cartões: `<div class="cell-list ">` (ativos) ou `<div class="cell-list opacity-...">`
(encerrados, título com `color-gray`). Corte em `<div class="cell-list` seguido de espaço ou
aspas: `cell-list-content`, dentro do cartão, não é um cartão.

| Campo | Âncora |
|-------|--------|
| id, URL | `<a href="/jobs/<id>-<slug>">` |
| título | `<h3 ...>` |
| empresa | `<i class='fa fa-briefcase'></i>` |
| local | `<i class='fas fa-map-marker-alt'></i>` |
| porte | `<i class='fa fa-building'></i>` |
| nível | `<i class='far fa-chart-bar'></i>` |
| regime | `<i class='far fa-file-alt'></i>` |
| tecnologias | `<span class='tag-list ...'>` |

## Detalhe

`/jobs/<id>-<slug>` responde **500** ("Há algo de errado com essa página") a visitantes sem
login, com o User-Agent da CLI e também com cabeçalhos de navegador (`fetch_page.py`).

## Acesso

- `robots.txt`: `/jobs` liberado. Termos (`/terms`): sem cláusula sobre acesso automatizado.
