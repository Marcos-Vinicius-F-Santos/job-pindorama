# VAGAS.com: páginas e âncoras de leitura

Referência para manter a `vagas-search` quando o portal mudar a marcação. Levantado em
outubro de 2026.

## Busca

`GET https://www.vagas.com.br/vagas-de-<termo>?q=<termo>[&pagina=<n>][&m[]=<modelo>]`

- `<termo>`: o texto em minúsculas, sem acento, palavras unidas por `-`
  (`gerente-de-produto`). O portal procura o termo inteiro.
- `pagina`: 40 vagas por página; o botão "mais vagas" usa `data-url="/vagas-de-<termo>?pagina=2&q=<termo>"`.
- Filtros (facetas da página, links `href` do bloco `data-facet-group`):
  - `m[]` (Local de Trabalho): `100% Home Office`, `Empresa e Home Office`, `Na empresa`
  - `mo[]` (Tipo de Contratação): `Regime CLT`, `Temporário`... (não usado pela CLI)
  - também Nível, Estado, Cidade, Áreas, Benefícios, "Vaga exclusiva para PCD"
- Total: `<h1>1137 vagas de emprego para produto</h1>`.

Cartões: `<li class="vaga odd|even ...">`, um por vaga. Âncoras:

| Campo | Marcação |
|-------|----------|
| id, título, URL | `<a class="link-detalhes-vaga" data-id-vaga="<id>" title="<título>" href="/vagas/v<id>/<slug>">` |
| empresa | `<span class="emprVaga">` |
| nível | `<span class="nivelVaga">` |
| trecho | `<div class="detalhes"><p>` |
| local | `div.vaga-local` (com `div.tooltip-place` de cidades próximas) **ou** `span.vaga-local` |
| data | `<span class="data-publicacao">`: `Hoje`, `Ontem`, `Há N dias` ou `DD/MM/AAAA` |

## Detalhe

`GET https://www.vagas.com.br/vagas/v<id>` (o slug depois do id é opcional).

- `<script type="application/ld+json">` com `@type: JobPosting` (há outro bloco antes, de
  `@type: WebSite`): `title`, `datePosted`, `validThrough`, `hiringOrganization.name`,
  `jobLocation.address` (`addressLocality` pode ser "Localização não informada"). A
  `description` desse bloco vem sem quebras de linha; a CLI prefere a do HTML.
- Descrição: `<div class="job-tab-content job-description__text texto">` até o primeiro `</div>`.
- Cabeçalho (`div.infoVaga`): "Faixa salarial" + `<span>` com o valor ou "a combinar";
  `span.info-localizacao` (ex.: "100% Home Office"); `span.info-modelo-contratual`
  (ex.: "Regime CLT").
- Publicação: `li.job-breadcrumb__item--published` ("Publicada em DD/MM/AAAA").

## Acesso

- `robots.txt`: busca e `/vagas/` liberados.
- Termos (`/candidatos/termos-de-uso`): proíbem "dispositivo, software ou outro recurso
  que venha a interferir nas atividades e operações da Vagas.com"; não há proibição
  expressa de leitura automatizada. Volume baixo.
- Responde ao User-Agent honesto da CLI.
