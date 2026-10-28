---
name: freehire-search
version: 1.0.0
description: >
  Use esta skill para buscar vagas ativas de software, tecnologia, dados e engenharia
  em vários países e mercados (e remotas) pela API pública do agregador freehire.me,
  ou para ler uma vaga específica dele. Ele junta vagas de ~50 plataformas de ATS num
  esquema só, então uma skill cobre vários mercados — mas a filtragem por facetas
  (competências, categoria, senioridade) é pensada primeiro para tecnologia, então
  limite a ativação a vagas técnicas. Frases de ativação: vagas de tecnologia, vagas
  de desenvolvedor, vagas de dados, vagas de ML, DevOps, vagas remotas de programação,
  "tem vaga de <função técnica> em <lugar>?", ler esta vaga do freehire. English:
  find a tech job, software job search, developer jobs, remote developer jobs.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/freehire-search/cli/src/cli.ts *)
---

# Busca no freehire

Busca vagas ativas no agregador **[freehire.me](https://freehire.me)** — um quadro de vagas
de TI de código aberto que normaliza vagas de ~50 plataformas de ATS de muitos países num
esquema só. Sem autenticação, sem chave de API e **sem dependências de execução** — roda só
com o `bun`. O mercado é escolhido por consulta, pelas opções de faceta (`--region`,
`--country`), então a mesma skill funciona em qualquer mercado. Para o Brasil, use
`--country BR` ou `--region latam`.

> Este é um exemplo do padrão de skill de portal que funciona em qualquer país, como o
> `linkedin-search`. Diferente dos portais raspados em HTML, ele consulta a API JSON pública
> do freehire, então os resultados vêm estruturados (competências, senioridade, facetas de
> região) em vez de lidos da marcação.

## ⚠️ Escopo: focado em tecnologia

O acervo do freehire já inclui algumas vagas que não são de tecnologia (ele coleta páginas
de carreira inteiras de empresas), **mas a filtragem por facetas — dicionários de
competências, categorias e senioridade — é pensada primeiro para tecnologia**, então esta
skill limita a ativação a vagas de software, dados, engenharia e tecnologia, onde a filtragem
é forte. Para vagas gerais no Brasil, use o `gupy-search`.

## ℹ️ Dependência de um serviço hospedado (melhor esforço, sem SLA)

Esta skill depende de um serviço hospedado por terceiros, o freehire.me. A leitura é
**pública e sem autenticação** — o mesmo padrão sem cadastro do `linkedin-search`.

**O freehire.me é um projeto pessoal, mas mantido ativamente; funciona na base do melhor
esforço (sem SLA formal).** Se a API estiver fora do ar, a CLI falha com elegância — saída
diferente de zero com mensagem de erro clara —, então uma queda degrada esta fonte em vez de
quebrar o fluxo ao redor.

**Auto-hospedagem / URL base trocável.** O backend do freehire é um repositório separado, com
licença MIT — [`strelov1/freehire`](https://github.com/strelov1/freehire) (Go + PostgreSQL +
Meilisearch) — que sobe com um comando via Docker Compose (`make up` → API em `:8080`, mesmos
caminhos `/api/v1/...`). A skill respeita uma variável de URL base, `FREEHIRE_API_URL` (padrão
`https://freehire.me`), então apontar para uma instância local é uma mudança de uma linha:

```bash
FREEHIRE_API_URL=http://localhost:8080 bun run .agents/skills/freehire-search/cli/src/cli.ts search -q "go"
```

Ressalva: subir a *API* é leve, mas manter um espelho *completo e sempre atualizado*
(milhões de vagas de ~50 plataformas) pesa muito — quem auto-hospedar vai coletar um
subconjunto das fontes ou apontar a variável de volta para a API hospedada.

## Quando usar

- Buscar vagas de tecnologia por palavra-chave, numa região/país ou remotas — cada resultado
  já vem com a **descrição completa**, sem precisar de consulta extra por resultado
- Filtrar por senioridade, categoria, competências ou data (publicadas nos últimos N dias)
- Ler uma vaga do freehire pelo slug (inclusive uma encerrada)

## Comandos

### Buscar vagas

```bash
bun run .agents/skills/freehire-search/cli/src/cli.ts search [-q "<palavras-chave>"] [opções de faceta]
```

Opções principais:
- `--query <texto>` / `-q <texto>` — busca por palavra-chave (cargo, competência, função). Texto completo; opcional.
  Aceita `OR` e `title:` (veja "Operadores de consulta" abaixo).
- `--jobage <dias>` — publicadas nos últimos N dias (vira `posted_within_days`).
- `--page <n>` — página, começando em 1. Padrão 1.
- `--limit <n>` / `-n <n>` — resultados por página (limite da API). Padrão 25.
- `--format json|table|plain` — padrão `json`.
- `--description-format markdown|text|html` — como a descrição completa de cada resultado é
  apresentada. Padrão `markdown`, que mantém os títulos e as listas de requisitos da vaga.
  Só na saída `json`.

**Operadores de consulta.** O `-q` entende dois operadores; a CLI passa o texto sem mudança
e a API o interpreta:

- `OR` entre alternativas devolve vagas que casam com **qualquer** uma, ex.:
  `-q "golang OR rust"`. Só em maiúsculas: um `or` minúsculo é uma palavra comum de busca.
  Palavras separadas por espaço **não** são união (`-q "golang rust"` devolve menos vagas
  que só `-q golang`), então use `OR` para sinônimos e stacks alternativas, em vez de rodar
  uma busca por palavra-chave. No máximo 5 alternativas; a 6ª é rejeitada com erro. Um `OR`
  entre aspas duplas é texto literal. Útil para buscar título em português e em inglês:
  `-q "engenheiro de dados OR data engineer"`.
- Um `title:` no começo restringe aquela alternativa ao **título** da vaga, ex.:
  `-q "title:staff engineer"` pula vagas que só citam as palavras na descrição. Vale por
  alternativa, então repita em cada uma: `-q "title:staff engineer OR title:principal engineer"`.
  Só conta no começo de uma alternativa; um `title:` no meio é buscado como texto. Aspas
  funcionam dentro dele: `-q 'title:"staff engineer"'` casa a expressão.

Opções de faceta, `--jobage`, `--page` e `--limit` valem para o resultado combinado: toda
alternativa é filtrada do mesmo jeito, e uma vaga que casa com várias aparece uma vez.

**Os resultados da busca já trazem a descrição completa.** Esta skill consulta o endpoint de
busca para agentes do freehire, que troca o trecho truncado do índice pelo texto completo de
cada vaga, então uma busca de 20 vagas é 1 pedido, não 1 + 20. **Não** rode `detail` em
loop sobre os resultados para ler as descrições — use o `detail` só para ler uma vaga pelo
slug (ex.: do tracker, ou uma vaga já encerrada e por isso fora da busca). Descrições
completas são longas: mantenha o `--limit` moderado e pré-filtre por título e empresa antes
de ler os corpos — ou passe `--no-description` para uma passada barata de descoberta que
mantém todos os outros campos e tira os corpos (pegue o corpo de uma vaga escolhida com o
`detail`, ou rode a busca de novo sem a opção).

Filtros de faceta (os valores vêm dos vocabulários controlados do freehire; separe por vírgula para OU dentro de uma faceta):
- `--region <códigos>` - macrorregião: `global`, `eu`, `uk`, `north_america`, `latam`, `apac`, `mena`, `africa`, `cis`. `--region latam` cobre a América Latina, inclusive o Brasil. Para um país só, use `--country` — `us` é um código de país, não uma região, e `--region us` não casa com nada. `--region`, `--country` e `--city` formam um grupo OU, então só `--country br` já limita ao Brasil. Use `none` para casar vagas cuja região **não** pôde ser determinada (veja "Dados parciais" abaixo).
- `--country <códigos>` — ISO-3166 alfa-2, ex.: `--country BR,PT`
- `--city <nomes>` — nome(s) de cidade, ex.: `--city "São Paulo"`
- `--seniority <níveis>` — `junior`, `middle` (pleno), `senior`, `staff`, `principal`, `lead`, …
- `--category <categorias>` — `backend`, `frontend`, `fullstack`, `devops`, `ml_ai`, `qa`, …
- `--skill <nomes>` — competência(s) canônica(s), ex.: `--skill go,kubernetes`
- `--company <slug>` — slug da empresa (do `company_slug` de um resultado)
- `--remote <modo>` — `remote` | `hybrid` | `onsite` (faceta `work_mode`). `--remote` sozinho significa `remote`. Separe por vírgula para OU (`remote,hybrid`; `on-site` vira `onsite`). Um item desconhecido sai com 1 e `BAD_ARG`.
- `--visa-sponsorship` — mantém apenas vagas explicitamente marcadas pela fonte como oferecendo sponsorship de visto (`visa_sponsorship=true`). A ausência da marcação não é interpretada como oferta.
- `--facet <chave=valor>` — qualquer outro parâmetro de faceta (repetível), ex.: `--facet salary_min=100000`

> **Local é faceta, não texto livre.** Diferente do `--location` do `linkedin-search`, o
> freehire filtra a geografia pelas facetas estruturadas `--region`/`--country`/`--city`.
> Descubra os valores atuais de um mercado em
> [`/api/v1/jobs/facets`](https://freehire.me/api/v1/jobs/facets) (acrescente `?q=<cargo>`
> para limitar) — nunca invente valores de faceta.

### Detalhe completo da vaga

```bash
bun run .agents/skills/freehire-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`slug` é o `id` de um resultado do `search` (ex.: `golang-zensar-2bxu6dxm`). Também dá para
passar uma URL completa `https://freehire.me/jobs/<slug>`. Uma URL de qualquer outro host —
inclusive o link de candidatura da empresa que o campo `url` de um resultado traz — é
rejeitada com `BAD_ID` antes de qualquer pedido. Devolve a descrição completa (sem HTML), as
competências, a região/país e — quando a vaga é enriquecida — senioridade, categoria, tipo de
contratação e salário. O `salary` mantém o período quando o freehire o registra
(`INR 300000–300000/year`, `INR 12000/month`); compare salários só no mesmo período, e
lembre que o freehire não distingue CLT de PJ.

Use para uma vaga cujo slug você já tem — uma candidatura acompanhada, um link
compartilhado, ou uma vaga encerrada que a busca não lista mais. Coletar de novo um resultado
que o `search` acabou de devolver só relê uma descrição que você já tem.

## Exemplos de uso

```bash
# Backend sênior no Brasil, em tabela
bun run .agents/skills/freehire-search/cli/src/cli.ts search -q "backend" --seniority senior --country BR --limit 10 --format table

# Go ou Rust, numa busca só (OR em maiúsculas), remoto na América Latina
bun run .agents/skills/freehire-search/cli/src/cli.ts search -q "golang OR rust" --remote remote --region latam --format table

# Título em português ou em inglês
bun run .agents/skills/freehire-search/cli/src/cli.ts search -q "title:engenheiro de dados OR title:data engineer" --country BR --format table

# React remoto, de qualquer lugar
bun run .agents/skills/freehire-search/cli/src/cli.ts search -q "react" --remote remote --format table

# DevOps no Brasil publicadas nos últimos 14 dias
bun run .agents/skills/freehire-search/cli/src/cli.ts search --category devops --country BR --jobage 14 --format table

# ML/IA, totalmente remoto
bun run .agents/skills/freehire-search/cli/src/cli.ts search -q "machine learning" --category ml_ai --remote remote --format table

# Descrições em texto simples em vez de Markdown
bun run .agents/skills/freehire-search/cli/src/cli.ts search -q "platform engineer" --limit 5 --description-format text

# Detalhe completo de uma vaga
bun run .agents/skills/freehire-search/cli/src/cli.ts detail golang-zensar-2bxu6dxm --format plain
```

## Formatos de saída

| Formato | Para quê |
|---------|----------|
| `json` | Padrão — uso por programa; o único formato que traz a descrição de cada resultado |
| `table` | Olhar rápido |
| `plain` | Ler o detalhe completo de uma vaga (comando `detail`) |

A busca em JSON é `{ "meta": { "count", "page", "total" }, "results": [...] }`; cada
resultado traz pelo menos `id` (o slug do freehire), `title`, `company`, `location`, `date`,
`url` e `description` (valores ausentes são `null`). `table` e `plain` omitem a descrição —
ela afogaria uma lista feita para olhar rápido. Todos os erros vão para o **stderr** como
`{ "error": "...", "code": "..." }`, e o processo sai com código `1`.

Um diagnóstico não é erro: um valor de `--region` (ou `--facet regions=`) fora do vocabulário
documentado — `us` é código de país, não região — imprime
`{ "warning": "...", "code": "REGION_VALUE_UNKNOWN" }` no **stderr** depois dos resultados,
e o processo continua saindo com `0`, com o stdout como um documento JSON válido.

## Dados parciais

As facetas são derivadas por vaga e podem estar **incompletas** — principalmente a
geografia. Uma vaga pode ter o `work_mode` determinado (ex.: `remote`) e deixar a **região
ou o país indeterminados** quando o texto de local da origem é ambíguo (os dicionários do
freehire nunca chutam). Então:

- Região/país ausente significa "não determinado", **não** "não se aplica" — filtrar com
  `--region latam` descarta em silêncio vagas cuja região não foi determinada, mesmo que
  sejam de fato da América Latina. Amplie ou tire a faceta se precisar delas.
- Há um valor de faceta próprio para o grupo não determinado: `--region none` casa vagas
  **sem** região determinada — útil para recolher vagas remotas que nunca fixaram uma
  geografia. Vira OU com regiões reais, ex.: `--region latam,none`.
- `result.regions` / `countries` / `cities` podem ser arrays vazios pelo mesmo motivo;
  trate vazio como desconhecido, não como "nenhuma das anteriores".

## Observações

- Os dados vêm da API pública do freehire.me — sem credenciais. Só o acompanhamento por
  usuário (candidatar/salvar) precisa de chave, e esta skill de propósito não mexe nisso:
  é **só busca + detalhe**.
- O `id` nos resultados é o `public_slug` do freehire — passe como está ao `detail`.
- `date` é a data de publicação como `YYYY-MM-DD` (a parte de data do `posted_at` da API, o formato que toda CLI de portal emite); pode ser `null` em vagas sem data.
- Os valores de faceta são vocabulários controlados. Use `/api/v1/jobs/facets` para ver os
  valores atuais (com contagens) de uma consulta antes de filtrar.
- A API tenta de novo em 429/5xx com espera progressiva; uma API inacessível sai com código
  diferente de zero e mensagem clara (serviço de melhor esforço, veja a nota de dependência acima).
- O `search` chama `/api/v1/agent/jobs/search` (público, como o resto); o `--no-description`
  chama o `/api/v1/jobs/search`, mais leve, que não serve corpos completos. Uma instância
  auto-hospedada anterior a esse endpoint responde 404, e a CLI informa como erro citando o
  endpoint — nunca como lista vazia.
- As mensagens de ajuda e de erro da CLI continuam em inglês (código do projeto original).
