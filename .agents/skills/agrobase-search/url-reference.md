# Agrobase: rotas e páginas

Levantado em outubro de 2026 (WordPress com o construtor Breakdance).

## Busca

`GET https://www.agrobase.com.br/wp-json/wp/v2/posts?categories=<tipo>[,<profissão>]&search=<termo>&after=<AAAA-MM-DDT00:00:00>&per_page=<n>&page=<n>&_fields=id,date,link,title,content,categories`

Categorias (`/wp-json/wp/v2/categories`): tipo — 93 Empregos, 245 Estágios, 92 Concursos;
profissão — 227 Biólogo, 228 Engenheiro Agrônomo, 229 Engenheiro Ambiental, 230 Engenheiro de
Alimentos, 231 Engenheiro Florestal, 232 Médico Veterinário, 233 Nutricionista, 234 Técnico
Agrícola, 236 Técnico em Agropecuária, 237 Zootecnista. Várias categorias numa lista valem "ou"
no WordPress; a CLI usa o tipo e, opcionalmente, uma profissão.

Por post: `id`, `date`, `link` (`/oportunidades/AAAA/MM/<slug>/`), `title.rendered` (com
entidades como `&#8211;`), `categories`, `content.rendered` (só um resumo: estados e
"Emprego <profissão>").

## Detalhe

`GET https://www.agrobase.com.br/oportunidades/AAAA/MM/<slug>/`

- `<h1>`: título; "liberado em <dia> de <mês> de <ano>".
- Corpo: o primeiro `<div class="bde-text-... bde-text">` que abre com `<p>` (local, tipo,
  profissão separados por `<br />`) seguido das seções (`<h2>Responsabilidades`,
  `<h2>Requisitos`...), até `</div><div class="bde-div`.
- Candidatura: link para `https://plataforma.agrobase.com.br/vaga/<slug>`.
- Sem bloco JobPosting.

## Acesso

- `robots.txt`: `/wp-json` e `/oportunidades` liberados. Termos (`/termos/`): sem cláusula sobre
  acesso automatizado.
- Plano premium: acesso antecipado de 2 a 4 dias a parte das vagas.
