# Empregos.com.br: rotas e campos

Levantado em outubro de 2026. Páginas montadas no servidor (HTML pronto).

## Busca (por cargo)

`GET https://www.empregos.com.br/vagas/<cargo>` e `.../vagas/<cargo>/<n>` (página n, a partir de 2)

- `<cargo>`: o cargo em minúsculas, sem acento, com hífens (`gerente-de-produto`).
- 20 cartões por página; depois da última, a página vem sem cartões.
- O `<title>` diz o total: "239 vagas de emprego para Product Manager em todo o Brasil".
- Qualquer texto é aceito: um cargo que não existe devolve vagas "parecidas" (49 mil para um
  cargo inventado). Por isso a CLI filtra pelo título.
- Filtros de modelo de trabalho, cidade e salário do site passam pela busca livre
  (`/buscar-vagas`), que o `robots.txt` proíbe; a CLI filtra o modelo localmente.

Cartão: `<div id="job-card" ...>`. Campos:

| Campo | Âncora |
|---|---|
| id | `href="/vaga/<id>/<slug>"` |
| título | `<h2>` |
| empresa | `alt="Logo da empresa <nome>"` (o `<h3>` vem cortado com "...") |
| local | texto depois de `icons/location-on-outline.svg` |
| modelo | depois de `icons/emoji-people.svg`: Presencial, Híbrido ou Remoto |
| vagas | depois de `icons/work-outline.svg`: "1 vaga" |
| salário | depois de `icons/payments-outline.svg`: "R$ 8.000,00" ou "À combinar" |
| data | depois de `icons/event-outline.svg`: "Publicada há 20 dias" |
| descrição | `<div class="... line-clamp-5 ...">` (o corte é só visual; o HTML traz o texto) |

## Detalhe

`GET https://www.empregos.com.br/vaga/<id>` (o slug depois do id é opcional)

- Bloco `JobPosting`: `title`, `description` (texto sem quebras de linha), `datePosted`,
  `jobLocation`, `hiringOrganization`, `baseSalary.value.value`, `jobLocationType`
  (`TELECOMMUTE` = remoto).
- A seção "Descrição da vaga" (`<h3> Descrição da vaga </h3><div ...>`) traz o mesmo texto com a
  formatação (títulos, listas); a CLI prefere essa.

## Acesso

- `robots.txt`: proíbe `/buscar-vagas` (a busca livre), `/curriculos/`, `/m/` e áreas
  administrativas. Libera `/vagas/<cargo>` e `/vaga/<id>`.
- Não há página de termos de uso; a política de privacidade não trata de acesso automatizado.
