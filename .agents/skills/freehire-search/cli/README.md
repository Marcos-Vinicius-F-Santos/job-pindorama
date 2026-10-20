# freehire-cli

CLI para buscar vagas no agregador [freehire.me](https://freehire.me) em **vários mercados**
(focado em tecnologia), pela API JSON pública dele.

**Fonte de dados**: API REST do freehire.me (`/api/v1/agent/jobs/search`, `/api/v1/jobs/search` para o `--no-description`, `/api/v1/jobs/facets`, `/api/v1/jobs/{slug}`).
**Autenticação**: nenhuma — a leitura é pública (só as mudanças de acompanhamento precisam de chave, e estão fora do escopo aqui).
**Dependências**: nenhuma (só `bun` + `fetch`). O `bun install` é opcional e só traz as definições de tipos.

> **Dependência de um serviço hospedado.** Esta skill conversa com o freehire.me, um projeto
> pessoal mantido na **base do melhor esforço, sem SLA formal**. Se a API estiver inacessível,
> a CLI sai com código diferente de zero e um erro claro, em vez de travar, então uma queda
> degrada com elegância em vez de quebrar quem chamou. Aponte o `FREEHIRE_API_URL` para um
> backend [freehire](https://github.com/strelov1/freehire) auto-hospedado para trocar a fonte.

## Instalação

```bash
cd .agents/skills/freehire-search/cli
bun install   # opcional — só instala os tipos do TypeScript
```

A CLI roda sem instalar nada, porque não tem dependências de execução.

## Auto-hospedagem / URL base

A URL base padrão é `https://freehire.me` e pode ser trocada por uma variável de ambiente:

```bash
FREEHIRE_API_URL=http://localhost:8080 bun run src/cli.ts search -q "go"
```

O backend do freehire tem licença MIT e sobe com um comando via Docker Compose
(`make up` → API em `:8080`, mesmos caminhos `/api/v1/...`).

## Comandos

| Comando | Descrição |
|---------|-----------|
| `search` | Busca vagas por palavra-chave e filtros de faceta |
| `detail` | Obtém o detalhe completo de uma vaga pelo slug |

O `search` aceita `--format json|table|plain` (padrão `json`); o `detail` aceita `--format json|plain`.
Todos os erros vão para o **stderr** como `{ "error": "...", "code": "..." }`, com código de saída `1`.
Um diagnóstico é aviso, não erro: um valor de `--region` fora do vocabulário documentado imprime
`{ "warning": "...", "code": "REGION_VALUE_UNKNOWN" }` no stderr depois dos resultados e sai com
`0`, deixando o stdout como um documento JSON válido. As mensagens de ajuda e de erro da CLI
estão em inglês (código do projeto original).

O `search` usa o endpoint para agentes da API, então todo resultado JSON já traz a descrição
**completa** da vaga (Markdown por padrão; `--description-format text|html` para mudar). O
`detail` continua existindo para ler uma vaga pelo slug — inclusive uma encerrada, que a busca
não devolve.

## Exemplos rápidos

```bash
# Backend sênior no Brasil, em tabela
bun run src/cli.ts search -q "backend" --seniority senior --country BR --limit 10 --format table

# React remoto na América Latina
bun run src/cli.ts search -q "react" --remote remote --region latam --format table

# DevOps no Brasil publicadas nos últimos 14 dias
bun run src/cli.ts search --category devops --country BR --jobage 14 --format table

# Detalhe completo de uma vaga (o slug é o id de um resultado da busca)
bun run src/cli.ts detail golang-zensar-2bxu6dxm --format plain
```

Veja o `../SKILL.md` para a referência completa das opções e a nota sobre a dependência do serviço hospedado.

## Opções de busca

| Opção | Apelido | Descrição |
|-------|---------|-----------|
| `--query` | `-q` | Palavras-chave (cargo / competência / função). Texto completo; opcional. `a OR b` casa com qualquer uma (`OR` em maiúsculas, no máximo 5 alternativas); um `title:` no começo busca só no título. |
| `--jobage` | | Publicadas nos últimos N dias (`posted_within_days`). |
| `--page` | | Página, começando em 1. Padrão 1. |
| `--limit` | `-n` | Resultados por página (limite da API). Padrão 25. |
| `--region` | | Macrorregião(ões), vírgula = OU: `global`, `eu`, `uk`, `north_america`, `latam`, `apac`, `mena`, `africa`, `cis` (ex.: `latam`). Um país, como `br` ou `us`, vai em `--country`. |
| `--country` | | Código(s) ISO-3166 alfa-2. |
| `--city` | | Nome(s) de cidade. |
| `--seniority` | | Nível(is) de senioridade. |
| `--category` | | Categoria(s) de função. |
| `--skill` | | Competência(s) canônica(s). |
| `--company` | | Slug da empresa. |
| `--remote` | | `remote` \| `hybrid` \| `onsite` (`work_mode`). |
| `--facet` | | Qualquer outra faceta como `chave=valor` (repetível). |
| `--format` | | `json` \| `table` \| `plain`. |
| `--description-format` | | `markdown` (padrão) \| `text` \| `html` — como a descrição completa de cada resultado é apresentada (só na saída `json`). |

Os valores de faceta vêm dos vocabulários controlados do freehire. Descubra os valores atuais
(com contagens) de um mercado em
[`/api/v1/jobs/facets`](https://freehire.me/api/v1/jobs/facets), ou limite, ex.:
`https://freehire.me/api/v1/jobs/facets?q=react`.
