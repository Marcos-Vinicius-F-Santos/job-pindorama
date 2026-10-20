---
name: linkedin-search
version: 1.0.0
description: >
  Use esta skill sempre que a pessoa quiser buscar vagas em qualquer local ou
  mercado, encontrar anúncios de emprego ou ler uma vaga específica do LinkedIn —
  em qualquer país, cidade ou remoto. Serve para vagas abertas e contratações em
  qualquer setor ou função (software, dados, design, marketing, finanças, jurídico,
  operações etc.). O local é sempre informado explicitamente. Frases de ativação:
  buscar vaga, procurar emprego, vagas abertas, vagas no LinkedIn, vagas remotas,
  "tem vaga de X em <lugar>?", ler esta vaga do LinkedIn. English: find a job,
  job search, job openings, vacancies, remote jobs.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/linkedin-search/cli/src/cli.ts *)
---

# Busca no LinkedIn

Busca vagas ativas no quadro público de vagas do LinkedIn para **qualquer país ou região**
(e remoto). Sem autenticação, sem chave de API e **sem dependências de execução** — roda
só com o `bun`. O local é sempre passado explicitamente, então a mesma skill funciona em
qualquer mercado.

> Este é um exemplo do padrão de skill de portal que funciona em qualquer país. As rotas
> `jobs-guest` do LinkedIn são globais e a leitura do HTML não depende do país; só o
> `--location` muda por mercado.

## ⚠️ Só para uso pessoal

Esta skill usa as páginas públicas de vagas do LinkedIn; acesso automatizado vai contra os
Termos de Serviço do LinkedIn, então **mantenha o volume baixo e não use para fins comerciais
nem para coleta de dados em massa.** O uso é por sua conta e risco.

## Quando usar

- Buscar vagas num local (qualquer país ou cidade) ou remotas
- Filtrar por data (publicadas hoje / nos últimos 7 / 14 / 30 dias) ou por modelo de trabalho (remoto/híbrido/presencial)
- Obter a descrição completa de uma vaga específica

## Comandos

### Buscar vagas

```bash
bun run .agents/skills/linkedin-search/cli/src/cli.ts search --location "<lugar>" [opções]
```

Opções principais:
- `--location <texto>` / `-l <texto>` — **obrigatória.** Um nome de lugar do LinkedIn, ex.: `"São Paulo, Brasil"`, `"Recife, Pernambuco, Brasil"`, `"Brazil"` ou `"Remote"`. **Para o país inteiro, escreva `"Brazil"`, em inglês:** `"Brasil"` sozinho não é reconhecido, o LinkedIn ignora o filtro em silêncio e devolve vagas de outros países (sobretudo dos EUA). Com cidade, `"Brasil"` funciona, porque o lugar é resolvido pela cidade.
- `--query <texto>` / `-q <texto>` — busca por palavra-chave (cargo, competência, função). Recomendada.
- `--jobage <dias>` — publicadas nos últimos N dias: `1`, `7`, `14`, `30`. Omita para todas.
- `--jobage-minutes <n>` — publicadas nos últimos N minutos (precisão menor que um dia, ex.: `30`). Conflita com `--jobage` — passe só uma.
- `--remote <modo>` — `remote`, `hybrid` ou `onsite` (filtro de modelo de trabalho).
- `--page <n>` — número da página (começando em 1, 10 resultados por página).
- `--limit <n>` / `-n <n>` — limita o total de resultados emitidos (do lado da CLI).
- `--format json|table|plain` — padrão `json`.

### Detalhe completo da vaga

```bash
bun run .agents/skills/linkedin-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` é o ID da vaga nos resultados do `search` (ex.: `4426311357`). Também dá para passar
uma URL completa `jobs/view/...` do LinkedIn ou uma URN `urn:li:jobPosting:...`. Devolve a
descrição completa, a senioridade, o tipo de contratação, a função e os setores.

## Exemplos de uso

```bash
# Engenharia de dados em São Paulo, últimos 30 dias
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "engenheiro de dados" -l "São Paulo, Brasil" --jobage 30 --format table

# Product manager no Brasil, remoto
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "product manager" -l "Brazil" --remote remote --format table

# Qualquer função, totalmente remota
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "analista jurídico" -l "Remote" --format table

# Engenharia, remoto, publicadas nos últimos 30 minutos
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "engenheiro" -l "Brazil" --jobage-minutes 30 --format table

# Detalhe completo de uma vaga
bun run .agents/skills/linkedin-search/cli/src/cli.ts detail 4426311357 --format plain
```

## Formatos de saída

| Formato | Para quê |
|---------|----------|
| `json` | Padrão — uso por programa, passar IDs ao `detail` |
| `table` | Olhar rápido |
| `plain` | Ler o detalhe completo de uma vaga (comando `detail`) |

Todos os erros vão para o **stderr** como `{ "error": "...", "code": "..." }`, e o processo sai com código `1`.

## Observações

- Os dados vêm das rotas públicas `jobs-guest` do LinkedIn — sem credenciais.
- O tamanho da página é fixo em 10 resultados.
- O LinkedIn pode limitar as requisições; a CLI tenta de novo em 429/5xx com espera progressiva. Mantenha o volume baixo (veja o aviso de Termos de Serviço acima).
- IDs de vaga são numéricos (ex.: `4426311357`) — passe-os como estão ao `detail`.
- Vagas brasileiras do LinkedIn muitas vezes são publicadas pela Gupy ou por outro ATS: quando o detalhe trouxer o link de candidatura de um ATS, prefira a página da empresa (veja `09-web-research.md`).
- As mensagens de ajuda e de erro da CLI continuam em inglês (código do projeto original).
