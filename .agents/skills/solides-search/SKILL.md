---
name: solides-search
version: 1.0.0
description: >
  Busca vagas abertas na Sólides Vagas (vagas.solides.com.br), o portal das vagas
  publicadas no ATS da Sólides, muito usado por empresas pequenas e médias no Brasil,
  ou lê o detalhe de uma vaga da Sólides. Filtra por modelo de trabalho (remoto,
  híbrido, presencial), regime (CLT, PJ, estágio...) e senioridade. Frases de ativação:
  buscar vagas, procurar emprego, vagas na Sólides, vagas remotas, vagas CLT, vagas PJ,
  vagas pleno, vagas sênior, ler esta vaga da Sólides. English: search Brazilian jobs,
  Solides job search, look up this vagas.solides.com.br posting.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/solides-search/cli/src/cli.ts *)
---

# Busca na Sólides

Busca vagas na **[Sólides Vagas](https://vagas.solides.com.br)**, o portal público das
vagas que as empresas publicam no ATS da Sólides. Traz muitas vagas de empresas pequenas
e médias que não aparecem na Gupy. Sem login, sem chave de API e **sem dependências de
execução**: roda só com `bun`.

- **Busca:** a rota JSON que a própria página de busca do portal usa.
- **Detalhe:** a página pública da vaga (`https://vagas.solides.com.br/vaga/<id>`).

O `robots.txt` libera a busca, a API e as páginas de vaga, e os termos de uso não proíbem
acesso automatizado (só vetam sobrecarregar o servidor). Mesmo assim, **use com
moderação**: poucas buscas por rodada, nada de varredura em massa.

## Comandos

### `search`

```bash
bun run .agents/skills/solides-search/cli/src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Cargo ou palavra-chave (**obrigatório**). A Sólides busca no título da vaga. |
| `--remote` | `remoto`, `hibrido` ou `presencial`; lista com vírgula vale "ou" (`remoto,hibrido`). `--remote` sozinho = remoto. |
| `--type` | Regime: `clt`, `pj`, `estagio`, `aprendiz`, `temporario`, `autonomo`, `freelancer`, `cooperado`; lista com vírgula. |
| `--seniority` | `estagio`, `junior`, `pleno`, `senior`, `especialista`, `principal`; lista com vírgula. |
| `--jobage` | Só vagas publicadas nos últimos N dias (filtro feito pela CLI). |
| `--page` | Página, começando em 1. |
| `--limit`, `-n` | Vagas por página, de 1 a 20 (o máximo do portal). Padrão 20. |
| `--format` | `json` (padrão), `table` ou `plain`. |
| `--no-description` | Omite a descrição (saída mais enxuta para triagem). |

### `detail`

```bash
bun run .agents/skills/solides-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

Aceita o `id` numérico da busca ou a URL `https://vagas.solides.com.br/vaga/<id>`.

## Exemplos

```bash
# Product Manager remoto, pleno ou sênior
bun run .agents/skills/solides-search/cli/src/cli.ts search -q "product manager" --remote --seniority pleno,senior --format table

# Analista financeiro CLT publicado nas últimas duas semanas
bun run .agents/skills/solides-search/cli/src/cli.ts search -q "analista financeiro" --type clt --jobage 14 --format table

# Desenvolvedor remoto ou híbrido, PJ
bun run .agents/skills/solides-search/cli/src/cli.ts search -q "desenvolvedor" --remote remoto,hibrido --type pj --format table

# Ler uma vaga inteira
bun run .agents/skills/solides-search/cli/src/cli.ts detail 939473 --format plain
```

## Formatos de saída

A busca em JSON sai como `{ "meta": { "count", "page", "total" }, "results": [...] }`.
Cada resultado traz os campos do contrato de portais (`id`, `title`, `company`,
`location`, `date`, `url`, com `null` quando faltar) e mais:

| Campo | Conteúdo |
|-------|----------|
| `deadline` | Prazo de inscrição, `AAAA-MM-DD` |
| `contract` | Regime como o portal escreve: `CLT`, `PJ`, `Estágio`... (vários separados por vírgula) |
| `workplace_type` | `remote`, `hybrid` ou `on-site` |
| `seniority` | Senioridade: `Pleno`, `Sênior`, `Especialista`... |
| `salary` | Faixa salarial, só quando a empresa permite mostrar ao candidato |
| `pcd_only` | `true` quando a vaga é **exclusiva** para pessoas com deficiência |
| `affirmative` | Grupos de vaga afirmativa marcados pela empresa (ex.: `Mulheres`) |
| `source` | `solides` (página `/vaga/<id>`) ou `rhgestor` (vaga do RH Gestor, ver Observações) |
| `description` | Descrição completa |

Erros vão para o **stderr** como `{ "error": "...", "code": "..." }`, com código de saída `1`.

## Observações

- **Modelo, regime e senioridade vêm prontos**, o que alimenta o filtro de local, a
  comparação CLT × PJ e o filtro de senioridade da avaliação de vagas.
- **Vagas do RH Gestor.** Parte das vagas vem do RH Gestor, outro produto da Sólides: o
  `id` tem letras (`bvXSSmAv4K`) e não existe página `/vaga/<id>` para elas. A `url` delas
  aponta para a página do RH Gestor (`*.rhgestor.com.br`), que se lê pelo `WebFetch`; o
  `detail` desta CLI recusa esses ids com `BAD_ID`.
- **`pcd_only` e `affirmative` são o que a empresa marcou.** Passe pelo filtro de
  elegibilidade do `04-job-evaluation.md` antes de descartar.
- **Sem filtro de data no portal** e a busca não vem ordenada por data: `--jobage` filtra
  do lado da CLI, então uma página pode vir com menos itens que o `--limit`.
- **`take` acima de 20 devolve página vazia** no portal; a CLI limita a 20.
- Tentativas automáticas com espera crescente em 429/5xx; falha de conexão encerra
  rápido, com mensagem clara, para não travar o `/scrape`.
- Detalhes técnicos das rotas e campos: [`url-reference.md`](url-reference.md).
