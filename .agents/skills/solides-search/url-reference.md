# Sólides Vagas: rotas e campos

Referência para manter a `solides-search` quando o portal mudar. Levantado em outubro de
2026 a partir do JavaScript da própria página de busca
(`app/(portal)/vagas/[...filter]/page-*.js`, função que monta `URLSearchParams` e chama
`fetch("/api/vacancies?...")`).

## Busca

`GET https://vagas.solides.com.br/api/vacancies?page=<n>&take=<n>&title=<termo>[&filtros]`

| Parâmetro | Valores | Observação |
|-----------|---------|------------|
| `page` | 1, 2, ... | |
| `take` | até 20 | Acima de 20 a API devolve `count: 0` e lista vazia |
| `title` | texto | Busca no título |
| `jobsType` | `presencial`, `remoto`, `hibrido` | Lista com vírgula vale "ou" |
| `contractsType` | `estagio`, `aprendiz`, `clt`, `pj`, `temporario`, `autonomo`, `freelancer`, `cooperado` | Lista com vírgula |
| `seniorities` | `estagio`, `junior`, `pleno`, `senior`, `especialista`, `principal` | Lista com vírgula |
| `affirmative` | `lgbt`, `pretas`, `mulheres`, `indigenas` | Não usado pela CLI |
| `pcd` | `true` | Não usado pela CLI |
| `locations` | nomes de cidade | Formato não confirmado (`São Paulo` devolveu vazio); não usado pela CLI |

Os vocabulários estão no chunk `940-*.js` (`contractsType:[{name,key}]`, `seniorities:[...]`,
`jobsType:[...]`).

Resposta: `{ "totalPages", "currentPage", "count", "data": [vaga...] }`. Campos lidos de
cada vaga:

| Campo | Uso |
|-------|-----|
| `id` | Número (vaga da Sólides) ou texto (vaga do RH Gestor) |
| `title`, `companyName`, `description` (HTML), `createdAt` (`AAAA-MM-DD`) | |
| `jobType` | `remoto` / `hibrido` / `presencial` |
| `city.name`, `state.code` | Local |
| `recruitmentContractType[].name`, `seniority[].name` | Regime e senioridade |
| `salary.showRangeToApplicant`, `initialRange`, `finalRange` | Só mostrado quando `showRangeToApplicant` é `true` |
| `date.due` | Prazo |
| `pcdOnly`, `affirmative[].name` | Exclusividade |
| `publishers.rhgestor.redirectUrl` | Página da vaga do RH Gestor (ids em texto) |

Campos **não** repassados: `address` (endereço completo), `killerQuestions`, `phases`,
`companyLogo`, `redirectLink` (vem quebrado, ex. `https://empresa./vacancies/...`).

## Detalhe

`GET https://vagas.solides.com.br/vaga/<id>` (só ids numéricos; ids do RH Gestor dão 404).

- Bloco `<script type="application/ld+json">` com `@type: JobPosting`: `title`,
  `description` (HTML), `datePosted`, `validThrough`, `hiringOrganization.name`,
  `jobLocation.address`, `jobLocationType` (`TELECOMMUTE` = remoto).
- Payload do Next.js (`self.__next_f.push`), com aspas escapadas (`\"`): `jobType`,
  `recruitmentContractType`, `seniority`, `pcdOnly`.

## Acesso

- `robots.txt`: `/vagas/`, `/api/` e `/vaga/` liberados.
- O servidor responde sempre com Brotli, mesmo pedindo outra codificação; o `fetch` do Bun
  decodifica. Responde ao User-Agent honesto da CLI.
- Termos de uso (solides.com.br/termos-de-uso): sem proibição de acesso automatizado; vetam
  sobrecarregar o servidor (3.7 b) e obter informação "por meio não disponibilizado" (3.7 d).
  A rota usada é a mesma que a página pública chama.
