# Remotar: rotas e campos

Referência para manter a `remotar-search` quando o portal mudar. Levantado em outubro de
2026 a partir do JavaScript do site (Next.js), onde a busca chama
`get("/jobs?" + search + page + tagId + categoryId + ...)` sobre a base `https://api.remotar.com.br`.

## Busca

`GET https://api.remotar.com.br/jobs?search=<termo>&active=true&page=<n>[&categoryId=<id>]`

| Parâmetro | Observação |
|-----------|------------|
| `search` | Casa palavras do título e da descrição (aspas não fazem busca por frase) |
| `page` | 50 vagas por página, fixo |
| `active` | `true` |
| `categoryId` | Ver tabela abaixo |
| `tagId` | Etiquetas (13 = "Vaga internacional", 4 = "100% Remoto"); inclui, não exclui. Não usado pela CLI |
| `jobSalary`, `isPromoted`, `hiddenCompanies` | Não usados |

Categorias (`GET /categories`): 18 Administrativo/Financeiro/Operações, 2 Atendimento &
Suporte, 20 Comunicação, 3 Conteúdo/SEO, 4 Data Science/Analytics, 5 Design, 7 DevOps,
22 Educação, 19 Jurídico, 10 Marketing, 11 Motion Design, 21 Mídia, 12 Outros, 15 Produto,
13 Programação, 14 Programação Mobile, 8 QA, 16 Recursos Humanos, 9 SysAdmin, 6 UX/UI,
17 Vendas & Negócios.

Resposta: `{ "meta": { "total", "per_page", "current_page", "last_page", ... }, "data": [vaga...] }`.

Campos lidos de cada vaga: `id`, `title`, `subtitle`, `description` (HTML), `createdAt`
(ISO), `expiresAt`, `expired`, `active`, `city`, `state`, `externalLink`, `company.name`,
`companyDisplayName`, `jobSalary` (`from`, `to`, `currency`, `type` — `uninformed` quando
não há), `jobTags[].tag.name`, `jobCategories[].category.name`.

**Não repassados:** `author` (nome, e-mail e dados de quem cadastrou), `company.about`,
`companyLinks`, imagens.

## Detalhe

`GET https://api.remotar.com.br/jobs/<id>` devolve a mesma vaga, sozinha.

Página pública da vaga: `https://remotar.com.br/job/<id>` (também
`/job/<id>/<empresa>/<titulo>`).

## Acesso

- `robots.txt`: nem `remotar.com.br` nem `api.remotar.com.br` publicam um (404).
- **Termos de uso** (`/termos-de-uso`): proíbem "utilizar mecanismos, software ou scripts
  em relação à utilização do site" e cópias por "tecnologias de buscador tipo Robot/Crawler".
  Por isso o aviso de uso pessoal no SKILL.md.
- Responde ao User-Agent honesto da CLI.
