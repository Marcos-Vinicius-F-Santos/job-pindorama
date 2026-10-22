---
name: remotar-search
version: 1.0.0
description: >
  Busca vagas remotas na Remotar (remotar.com.br), portal brasileiro só de trabalho
  remoto, ou lê o detalhe de uma vaga da Remotar. Filtra por categoria (produto,
  programação, dados, design, marketing...) e separa as vagas de empresas estrangeiras.
  Frases de ativação: buscar vagas remotas, trabalho remoto, home office, vagas na
  Remotar, vagas 100% remotas, ler esta vaga da Remotar. English: search remote jobs in
  Brazil, Remotar job search, look up this remotar.com.br posting.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/remotar-search/cli/src/cli.ts *)
---

# Busca na Remotar

Busca vagas na **[Remotar](https://remotar.com.br)**, portal brasileiro só de vagas
remotas, de empresas nacionais e estrangeiras. Sem login, sem chave de API e **sem
dependências de execução**: roda só com `bun`.

- **Busca e detalhe:** a API JSON que o próprio site usa (`api.remotar.com.br`).

## ⚠️ Só para uso pessoal

Os **termos de uso da Remotar proíbem acesso automatizado** ("utilizar mecanismos,
software ou scripts" e cópias por "Robot/Crawler"). O site não publica `robots.txt`.
Esta skill existe para a busca pessoal de quem a roda: **mantenha o volume baixo** (poucas
buscas por rodada), **não use para fins comerciais nem para coleta em massa** e não
redistribua o conteúdo. O uso é por sua conta e risco. Para desligar sem apagar, ponha
`enabled: false` no frontmatter.

## Comandos

### `search`

```bash
bun run .agents/skills/remotar-search/cli/src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Cargo ou palavra-chave (**obrigatório**). A Remotar casa palavras do título e da descrição, então a busca é ampla. |
| `--category` | Categoria do portal, **recomendada**: `produto`, `programacao`, `mobile`, `dados`, `design`, `ux`, `qa`, `devops`, `sysadmin`, `marketing`, `vendas`, `rh`, `educacao`, `juridico`, `comunicacao`, `conteudo`, `midia`, `motion-design`, `atendimento`, `administrativo`, `outros`. |
| `--no-international` | Tira as vagas de empresas de fora do Brasil (etiqueta "Vaga internacional"). |
| `--jobage` | Só vagas publicadas nos últimos N dias (filtro feito pela CLI). |
| `--page` | Página, começando em 1 (50 vagas por página, fixo). |
| `--limit`, `-n` | Quantas vagas da página mostrar, de 1 a 50. |
| `--format` | `json` (padrão), `table` ou `plain`. |
| `--no-description` | Omite a descrição. |

### `detail`

```bash
bun run .agents/skills/remotar-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

Aceita o `id` da busca ou a URL `https://remotar.com.br/job/<id>/...`.

## Exemplos

```bash
# Product Manager remoto, só empresas brasileiras, últimas duas semanas
bun run .agents/skills/remotar-search/cli/src/cli.ts search -q "product manager" --category produto --no-international --jobage 14 --format table

# Analista de dados remoto
bun run .agents/skills/remotar-search/cli/src/cli.ts search -q "analista de dados" --category dados --format table

# Ler uma vaga inteira
bun run .agents/skills/remotar-search/cli/src/cli.ts detail 166921 --format plain
```

## Formatos de saída

A busca em JSON sai como `{ "meta": { "count", "page", "total" }, "results": [...] }`.
Cada resultado traz os campos do contrato de portais (`id`, `title`, `company`,
`location`, `date`, `url`, com `null` quando faltar) e mais:

| Campo | Conteúdo |
|-------|----------|
| `workplace_type` | Sempre `remote` |
| `international` | `true` para vagas de empresas de fora do Brasil (em geral em inglês, às vezes em dólar) |
| `categories`, `tags` | Categorias e etiquetas do portal (`Produto`, `100% Remoto`...) |
| `salary` | Faixa em reais, quando informada |
| `deadline` | Prazo, quando informado |
| `apply_url` | Link de candidatura (muitas vezes a página da vaga no ATS da empresa). A descrição da Remotar pode ser um resumo: o texto completo está ali, e o `scrape_run.py` indica em `full_posting` qual portal instalado o lê |
| `description` | Subtítulo e descrição completa |

Erros vão para o **stderr** como `{ "error": "...", "code": "..." }`, com código de saída `1`.

## Observações

- **Todas as vagas são remotas**, mas "remoto" não diz de onde: vagas internacionais
  podem pedir fuso, inglês ou contrato em dólar. Leia a descrição (o `posting_signals.py`
  aponta exigências de residência).
- **Sem regime nem senioridade** na API; vêm no texto da vaga.
- **Use `--category`**: sem ela, "product manager" traz qualquer vaga com "product" ou
  "manager" no texto (~130 vagas); com `produto`, cerca de 40, todas da área.
- A API devolve dados de quem cadastrou a vaga (nome, e-mail): a CLI **nunca** os repassa.
- Vagas expiradas ou inativas que a API ainda lista são descartadas pela CLI.
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
