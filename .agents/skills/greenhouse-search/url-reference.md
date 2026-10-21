# Greenhouse: rotas e campos

Fonte: a **Job Board API** pública do Greenhouse, documentada em
developers.greenhouse.io/job-board.html. Levantado em outubro de 2026.

## Busca (por empresa)

`GET https://boards-api.greenhouse.io/v1/boards/<board>/jobs[?content=true]`

- `<board>`: o identificador da empresa (`job-boards.greenhouse.io/<board>`).
- Sem `content=true`: lista leve. Com ele: cada vaga traz `content` (HTML **escapado**,
  `&lt;p&gt;`), bem mais pesado (o board do QuintoAndar passa de 1,8 MB).
- 404 quando o board não existe.

Resposta: `{ "jobs": [...], "meta": { "total" } }`. Campos lidos: `id`, `title`,
`company_name`, `absolute_url`, `first_published`, `updated_at`, `application_deadline`,
`location.name`, `offices[].location`, `departments[].name`, `language`, `content`.

## Detalhe

`GET https://boards-api.greenhouse.io/v1/boards/<board>/jobs/<id>` (sempre com `content`).

## Boards brasileiros verificados (outubro de 2026)

`stone` (367 vagas), `c6bank` (161), `xpinc` (139), `quintoandar` (110), `gympass` (Wellhub, 90),
`ebanx` (40), `vtex` (32), `jusbrasil` (17), `rdstation` (7). Testados sem sucesso (404):
nubank (board vazio), ifood, picpay, hotmart, creditas, olist, totvs, mercadolivre, contaazul.

## Acesso

- `robots.txt` do `boards-api.greenhouse.io`: liberado.
- API pública, feita para exibir vagas; sem termos que proíbam a leitura. Um pedido por board
  por busca: mantenha o `boards.txt` enxuto.
