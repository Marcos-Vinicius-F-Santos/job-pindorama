# DigAÍ: rotas e campos

Levantado em outubro de 2026. O site é um app Next.js; os dados vêm no payload do servidor
(`self.__next_f.push([1,"<string JSON>"])`), que a CLI junta e lê pela chave.

## Busca (por empresa)

`GET https://<empresa>.digai.ai/pt-BR?title=<cargo>[&workModel=REMOTE]`

- `<empresa>`: o subdomínio da página de carreira. A lista vem do `sitemap.xml` de
  `jobs.digai.ai` (entradas `https://<empresa>.digai.ai/pt-BR`).
- `title`: filtro de cargo do servidor, sem caixa; aceita várias palavras.
- `workModel`: `REMOTE`, `HYBRID` ou `ON_SITE`. Também funciona `city=<cidade>` (a CLI não usa).
  `level` e `page` são ignorados pelo servidor.
- A página traz só a primeira página da lista: **12 vagas**, com `total` (as que casam com o
  filtro). As seguintes são carregadas no navegador pela API, que a CLI não usa.

Objeto lido: `"initialJobs": { "items": [...], "total", "page" }`. Campos de cada vaga:
`triagemId` (UUID, o id), `title`, `language`, `level`, `expiresAt`, `city`, `state`, `country`,
`workModel`, `isDisabilitiesAffirmative`, `isTalentPool`, `salaryMin`, `salaryMax`,
`companyName`, `groupSlug`, `groupDisplayName`, `isConfidential`, `publishedAt`, `updatedAt`.

Valores de `level` e os rótulos do próprio site: `NO_EXPERIENCE`, `ENTRY_LEVEL` (estágio,
aprendiz, trainee), `JUNIOR`, `MID_LEVEL` (Pleno), `SENIOR_AND_SPECIALIST`,
`COORDINATOR_AND_SUPERVISOR`, `MANAGER`, `HEAD_AND_DIRECTOR`, `EXECUTIVE_DIRECTOR_AND_VP`, `C_LEVEL`.

## Detalhe

`GET https://jobs.digai.ai/<triagemId>`

- Bloco `<script type="application/ld+json">` com `JobPosting`: título, descrição em HTML,
  `datePosted`, `validThrough`, `hiringOrganization`, `jobLocation`.
- Objeto `"initialJob"` no payload: os mesmos campos da busca, mais `isInternalRecruitment`
  e `address`. Não traz `state`; a CLI completa com o `addressRegion` do JobPosting quando há.

## Acesso

- `robots.txt` de `jobs.digai.ai`: libera `/`, fecha `/api/`, login, conta, área do candidato e
  painéis. A busca e o detalhe da CLI só usam caminhos liberados.
- A busca geral (`jobs.digai.ai`) é feita no navegador por uma API não documentada; a CLI **não**
  usa essa API.
- Os Termos de Uso exibidos no site não tratam de acesso automatizado.
- `sabesp.digai.ai` é um portal interno com login, sem página de carreira: fica fora do
  `companies.txt`.
