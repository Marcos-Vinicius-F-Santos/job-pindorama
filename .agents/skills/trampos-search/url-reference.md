# Trampos: rotas e campos

Levantado em outubro de 2026 a partir do app Ember do site (`frodo-*.js`, rota
`opportunities` com `queryParams:["tr","lc","ct","tp"]`).

## Busca

`GET https://trampos.co/api/v2/opportunities?tr=<termo>[&lc=<local>][&ct=<categoria>][&tp=<tipo>][&page=<n>]`

- `lc=home office` traz as vagas remotas.
- `ct` (categoria) e `tp` (tipo) aceitam um slug; os disponíveis vêm na própria resposta
  (`categories[].slug`, `types[].slug`).
- 12 vagas por página.

Resposta: `{ "opportunities": [...], "types", "categories", "pagination": { "total",
"total_pages", "per_page" } }`. Campos lidos: `id`, `name`, `type_name`, `category_name`,
`state`, `city` (nulo em vaga home office), `hybrid`, `salary` ("NÃO DIVULGADA" quando não há),
`published_at`, `company.name`, `custom_company_name`.

## Detalhe

`GET https://trampos.co/api/v2/opportunities/<id>` → `{ "opportunity": {...} }`, com
`regime`, `home_office`, `hybrid`, `description`, `prerequisite`, `desirable`, `perks`,
`other_info`, `address`, `opportunity_questions`.

Página pública: `https://trampos.co/oportunidades/<id>-<slug>`.

## Acesso

- `robots.txt`: `/api/v2/opportunities` liberado.
- **Termos** (`/legal/termos-uso-condicoes-legais`): "Não são permitidas ao Candidato as seguintes
  ações: Utilizar mecanismos, software ou scripts em relação à utilização do site" e cópias por
  "Robot/Crawler". Por isso o aviso de uso pessoal no SKILL.md.
