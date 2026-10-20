---
name: infojobs-search
version: 1.0.0
description: >
  Busca vagas abertas na InfoJobs Brasil (www.infojobs.com.br), portal generalista, ou
  lê o detalhe de uma vaga da InfoJobs. Filtra por modelo de trabalho (home office,
  híbrido, presencial) e traz salário quando a empresa informa. Frases de ativação:
  buscar vagas, procurar emprego, vagas na InfoJobs, vagas home office, vagas com
  salário, ler esta vaga da InfoJobs. English: search Brazilian jobs, InfoJobs Brazil
  job search, look up this infojobs.com.br posting.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/infojobs-search/cli/src/cli.ts *)
---

# Busca na InfoJobs

Busca vagas na **[InfoJobs Brasil](https://www.infojobs.com.br)**, portal generalista com
vagas de todo o país e salário informado em boa parte delas. Sem login, sem chave de API
e **sem dependências de execução**: roda só com `bun`.

- **Busca:** a página pública de resultados (`/empregos.aspx`).
- **Detalhe:** a página pública da vaga (`/vaga-de-...__<id>.aspx`).

## ⚠️ Só para uso pessoal

Os **termos de uso da InfoJobs proíbem acesso automatizado** ("Não utilizar mecanismos,
software ou scripts em relação à utilização do Website" e cópias por "Robot/Crawler"),
embora o `robots.txt` libere as páginas usadas. Esta skill existe para a busca pessoal de
quem a roda: **mantenha o volume baixo** (poucas buscas por rodada), **não use para fins
comerciais nem para coleta em massa** e não redistribua o conteúdo. O uso é por sua conta
e risco. Para desligar sem apagar, ponha `enabled: false` no frontmatter.

## Comandos

### `search`

```bash
bun run .agents/skills/infojobs-search/cli/src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Cargo ou palavra-chave (**obrigatório**). |
| `--remote` | `remoto` (home office), `hibrido` ou `presencial`. **Um valor só**: o filtro da página aceita um modo por vez. `--remote` sozinho = remoto. |
| `--jobage` | Só vagas publicadas nos últimos N dias (filtro feito pela CLI). |
| `--page` | Página, começando em 1 (20 vagas por página). |
| `--limit`, `-n` | Quantas vagas da página mostrar, de 1 a 20. |
| `--format` | `json` (padrão), `table` ou `plain`. |
| `--no-description` | Omite o trecho da descrição. |

### `detail`

```bash
bun run .agents/skills/infojobs-search/cli/src/cli.ts detail <url> [--format json|plain]
```

Precisa da **URL completa** da vaga (o campo `url` da busca): a página não abre só com o número.

## Exemplos

```bash
# Product Manager em home office
bun run .agents/skills/infojobs-search/cli/src/cli.ts search -q "product manager" --remote --format table

# Analista de dados publicado nas últimas duas semanas
bun run .agents/skills/infojobs-search/cli/src/cli.ts search -q "analista de dados" --jobage 14 --format table

# Ler uma vaga inteira
bun run .agents/skills/infojobs-search/cli/src/cli.ts detail "https://www.infojobs.com.br/vaga-de-product-manager-em-minas-gerais__12133581.aspx" --format plain
```

## Formatos de saída

A busca em JSON sai como `{ "meta": { "count", "page", "total" }, "results": [...] }`.
Cada resultado traz os campos do contrato de portais (`id`, `title`, `company`,
`location`, `date`, `url`, com `null` quando faltar) e mais:

| Campo | Conteúdo |
|-------|----------|
| `workplace_type` | `remote` (home office), `hybrid` ou `on-site`, do cartão da busca |
| `salary` | Faixa salarial, quando a empresa informa ("A combinar" vira `null`) |
| `contract` | Regime (ex.: `Efetivo – CLT`) — só no `detail` |
| `seniority` | Senioridade (ex.: `Especialista`) — só no `detail` |
| `deadline` | Prazo — só no `detail` |
| `description` | Trecho na busca; texto completo no `detail` |

Erros vão para o **stderr** como `{ "error": "...", "code": "..." }`, com código de saída `1`.

## Observações

- **`total` não é informado** na busca (`meta.total` repete a contagem da página).
- **"Todo Brasil"** no local é como a InfoJobs marca vagas sem cidade fixa.
- Muitas vagas são publicadas por **consultorias de RH** em nome do cliente: o
  `posting_signals.py` sinaliza como intermediário.
- O modelo de trabalho vem do cartão da busca; a página de detalhe não o informa de forma
  confiável (os blocos com ícone de home office são de "vagas parecidas").
- Detalhes técnicos das páginas e âncoras de leitura: [`url-reference.md`](url-reference.md).
