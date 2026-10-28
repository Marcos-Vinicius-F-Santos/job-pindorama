# Referência da API do freehire.me

Os endpoints, parâmetros e formatos de resposta de que esta skill depende. É o arquivo a
atualizar se a API do freehire mudar. A URL base padrão é `https://freehire.me` e pode ser
trocada pela variável de ambiente `FREEHIRE_API_URL`.

## Autenticação

Nenhuma para leitura. `GET /api/v1/jobs/*` e `/companies/*` são públicos; só as mudanças de
acompanhamento por usuário (`apply`/`save`/`me`) exigem uma chave de API bearer, e esta skill
não as usa.

Verificado contra a API real:

| Endpoint | Status |
|----------|--------|
| `GET /api/v1/agent/jobs/search` | 200 |
| `GET /api/v1/jobs/search` | 200 (a variante da web; usada pelo `--no-description`) |
| `GET /api/v1/jobs/facets` | 200 |
| `GET /api/v1/jobs/{slug}` | 200 |
| `GET /api/v1/auth/me` | 401 (exige autenticação — não usado aqui) |

## Envelope

Toda resposta é `{ "data": ..., "meta": {...}, "error": "..." }`. Listas põem o array em
`data` e a paginação em `meta` (`{ total, limit, offset }`); um item único põe o objeto em
`data`. Erros são `{ "error": "<mensagem>" }` com status 4xx/5xx (ex.: 404 → `{ "error": "not found" }`).

## `GET /api/v1/agent/jobs/search`

O endpoint que o comando `search` da skill usa. Busca por texto completo + facetas nas vagas
abertas, devolvendo `data: [vaga, …]` com `meta.total` = a contagem estimada.

Roda a **mesma consulta** do `/api/v1/jobs/search` da web — mesmo `q`, mesmas facetas, mesma
ordenação, mesmo limite de paginação (`offset + limit ≤ 10000`) — e difere num ponto: troca o
trecho truncado de `description` do índice de busca pela descrição **completa** da vaga, lida
do banco de dados. É isso que faz uma busca de N vagas ser um pedido só, em vez de N + 1.

Ele sempre faz isso — não há parâmetro para desligar —, então o modo `--no-description` da
skill chama o `/api/v1/jobs/search`. Um parâmetro extra controla a apresentação:

| Parâmetro | Opção da CLI | Observações |
|-----------|--------------|-------------|
| `description_format` | `--description-format` | `markdown` (o padrão da skill), `text` ou `html`. **Um valor não reconhecido não é erro** — a API cai para `html`, então a CLI valida a opção sozinha. |

A descrição completa é obtida na base do melhor esforço por resultado: um resultado cuja linha
sumiu do banco (o índice atrasado em relação a uma vaga recém-removida) mantém o trecho em vez
de ser descartado, então `description` é texto completo na prática, mas nunca garantido.

Um `404` neste caminho significa que a instância é anterior ao endpoint (um freehire
auto-hospedado atrás do `FREEHIRE_API_URL`), não uma vaga ausente; a CLI informa como erro,
citando o caminho, e não como lista vazia.

## `GET /api/v1/jobs/search`

A variante da web da mesma busca — mesma superfície de consulta, mas `description` é sempre o
trecho truncado do índice. A skill a chama no `--no-description`, quando ler todos os corpos
completos do banco seria trabalho jogado fora.

Parâmetros de consulta usados pela skill:

| Parâmetro | Opção da CLI | Observações |
|-----------|--------------|-------------|
| `q` | `--query` / `-q` | Consulta por texto completo. `OR` em maiúsculas separa até 5 alternativas (mais que isso é um 400); um `title:` no começo restringe uma alternativa ao título. |
| `limit` | `--limit` / `-n` | Tamanho da página. Padrão 25 na CLI. |
| `offset` | (derivado) | `offset = (página - 1) * limit`. |
| `posted_within_days` | `--jobage` | Restringe a vagas dos últimos N dias. |
| `regions` | `--region` | Repetível; OU dentro da faceta. Valores: `global`, `eu`, `uk`, `north_america`, `latam`, `apac`, `mena`, `africa`, `cis`. `us` é um país (`countries`), não uma região. |
| `countries` | `--country` | Repetível; ISO-3166 alfa-2 (em minúsculas). Para o Brasil: `br`. |
| `cities` | `--city` | Repetível; nome de exibição da cidade. |
| `seniority` | `--seniority` | Repetível; `junior`, `middle`, `senior`, `staff`, … |
| `category` | `--category` | Repetível; `backend`, `frontend`, `fullstack`, `devops`, `ml_ai`, … |
| `skills` | `--skill` | Repetível; nomes canônicos de competências. |
| `company_slug` | `--company` | Uma empresa. |
| `work_mode` | `--remote` | `remote` \| `hybrid` \| `onsite`. |
| sponsorship de visto | `--visa-sponsorship` | Atalho para `visa_sponsorship=true`; mantém somente vagas explicitamente marcadas como oferecendo visto. |
| qualquer parâmetro de faceta | `--facet chave=valor` | Válvula de escape para o resto (ex.: `salary_min`, `employment_type`, `english_level`). |

Parâmetros repetidos (`?seniority=senior&seniority=staff`) viram OU dentro da faceta; facetas
diferentes viram E (a geografia vira OU num grupo de local). A paginação profunda é limitada
no servidor (`offset + limit ≤ 10000`).

### Objeto de vaga (os campos que a skill lê)

```jsonc
{
  "public_slug": "golang-zensar-2bxu6dxm", // -> result.id, e o <slug> do detail
  "source": "oracle",
  "external_id": "…",
  "url": "https://…",                       // a URL real da vaga (host do ATS)
  "title": "GOLANG",
  "company": "Zensar",
  "company_slug": "zensar",
  "location": "India",                       // local em texto livre, do ATS
  "description": "- …",                      // busca do agente: texto completo no formato
                                             // pedido; nos demais casos HTML, limpo na CLI
  "skills": ["go", "kubernetes", …],         // faceta de dicionário (nível superior)
  "work_mode": "remote",                     // pode faltar
  "regions": ["apac"],                       // faceta de dicionário/híbrida
  "countries": ["in"],
  "cities": [],
  "collections": [],
  "posted_at": "2026-07-06T00:00:00Z",       // -> result.date (pode ser nulo)
  "created_at": "2026-07-06T15:25:…Z",
  "enrichment": {                             // aninhado, tipado; {} quando não enriquecido
    "seniority": "senior",
    "category": "backend",
    "employment_type": "full_time",
    "salary_min": 90000, "salary_max": 120000, "salary_currency": "EUR"
  }
}
```

O id numérico interno nunca é exposto de propósito; `public_slug` é o identificador estável.

## `GET /api/v1/jobs/{slug}`

Uma vaga pelo `public_slug`. Devolve o mesmo objeto de vaga em `data`. Uma vaga encerrada
continua sendo servida aqui (com `closed_at` não nulo); um slug ausente é 404
`{ "error": "not found" }`. O comando `detail` da skill transforma um 404 num erro `NOT_FOUND`
no stderr.

## `GET /api/v1/jobs/facets`

As distribuições dos valores de faceta do mercado sob um filtro opcional — os valores atuais
de cada faceta, com contagens. `data.facets` é `{ <faceta>: { <valor>: <contagem> } }`. Esta
skill não o chama por programa, mas é a fonte de vocabulário que o SKILL.md indica
(`?q=<cargo>` limita as contagens). Exemplo: `GET /api/v1/jobs/facets?q=react`.

## Observações de leitura

- A resposta é JSON, então não há leitura de cartões HTML (ao contrário dos portais
  raspados). O único tratamento de marcação que sobra na CLI é o do `detail`: o
  `/jobs/{slug}` serve HTML, que o `cleanHtml` (`cli/src/helpers.ts`) transforma em texto
  legível. As descrições da busca chegam já apresentadas pela API e passam sem mudança —
  limpá-las de novo desfaria a estrutura em Markdown.
- A coleta envia `User-Agent: MadsLorentzen/ai-job-search/1.0 (+https://github.com/MadsLorentzen/ai-job-search; freehire-search)`
  e `Accept: application/json`, e usa espera progressiva com variação aleatória em 429/5xx
  (no máximo 6 novas tentativas). Um erro de conexão (API inacessível) falha rápido, com
  mensagem clara — sem nova tentativa, porque não é carga passageira do servidor —, que é o
  contrato de degradação elegante: uma queda degrada esta fonte depressa, em vez de travar
  quem chamou.
