# PCD Online: páginas e âncoras de leitura

Levantado em outubro de 2026.

## Busca

`GET https://www.pcd.com.br/vagas-para-pcd[?page=<n>]`: 30 cartões por página (~186 páginas;
total em `<h1 id="total_vagas">5.587 Vagas para PCD encontradas</h1>`). Os filtros do formulário
(`palavraChave`, `checkLocal=homeoffice|presencial|hibrido`, `checkEstado`, `checkCidade`,
`checkArea`, `checkEscolaridade`) são aplicados por JavaScript: no endereço, são ignorados.

Cartão: `<div class="card shadow mb-3 card-vaga">`:

| Campo | Âncora |
|-------|--------|
| empresa | `<span class="h5">` |
| título, id, URL | `<a href="/emprego-pcd/<slug>/<id>">` |
| resumo | `<p class="strinDescricao">` |
| local, modelo | `<i class="fas fa-map-marker-alt ...">` (dois: cidade e Remoto/Presencial/Híbrido) |
| regime | `<i class="fas fa-briefcase ...">` ("Contrato CLT") |
| salário | `<i class="fas fa-coins ...">` ("A combinar") |
| exclusiva | `exclusivo-pcd` |

## Detalhe

`GET https://www.pcd.com.br/emprego-pcd/<slug>/<id>`, com `<script type="application/ld+json">`
`@type: JobPosting`: `title`, `description`, `datePosted`, `validThrough`,
`hiringOrganization.name`, `jobLocationType` (`TELECOMMUTE` = remoto).

## Acesso

- `robots.txt`: `/vagas-para-pcd` e `/emprego-pcd` liberados.
- **Termos** (`/termos-de-uso`): "você, como usuário, concorda que não usará robôs, sistemas de
  varredura e armazenamento de dados (como 'spiders' ou 'scrapers')…". Por isso o aviso de uso
  pessoal no SKILL.md.
