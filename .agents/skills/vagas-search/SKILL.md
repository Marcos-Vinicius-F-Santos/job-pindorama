---
name: vagas-search
version: 1.0.0
description: >
  Busca vagas abertas na VAGAS.com (www.vagas.com.br), um dos maiores portais
  generalistas do Brasil, ou lê o detalhe de uma vaga da VAGAS.com. Filtra por modelo
  de trabalho (100% home office, híbrido, presencial). Frases de ativação: buscar vagas,
  procurar emprego, vagas na Vagas.com, vagas home office, vagas remotas, vagas em São
  Paulo, ler esta vaga da Vagas.com. English: search Brazilian jobs, Vagas.com job
  search, look up this vagas.com.br posting.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/vagas-search/cli/src/cli.ts *)
---

# Busca na VAGAS.com

Busca vagas na **[VAGAS.com](https://www.vagas.com.br)**, portal generalista com vagas de
empresas grandes e médias de todo o Brasil, muitas que não usam a Gupy. Sem login, sem
chave de API e **sem dependências de execução**: roda só com `bun`.

- **Busca:** a página pública de resultados (`/vagas-de-<termo>`).
- **Detalhe:** a página pública da vaga (`/vagas/v<id>`).

O `robots.txt` libera a busca e as páginas de vaga. Os termos de uso não proíbem
automação em si, mas vetam software que "venha a interferir nas atividades e operações"
do site: **use com moderação**, poucas buscas por rodada, nada de varredura em massa.

## Comandos

### `search`

```bash
bun run .agents/skills/vagas-search/cli/src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Cargo ou palavra-chave (**obrigatório**). O portal procura o termo inteiro: "gerente de produto" acha menos que "produto". |
| `--remote` | `remoto` (100% Home Office), `hibrido` (Empresa e Home Office) ou `presencial` (Na empresa); lista com vírgula vale "ou". `--remote` sozinho = remoto. |
| `--jobage` | Só vagas publicadas nos últimos N dias (filtro feito pela CLI). |
| `--page` | Página, começando em 1 (40 vagas por página). |
| `--limit`, `-n` | Quantas vagas da página mostrar, de 1 a 40. |
| `--format` | `json` (padrão), `table` ou `plain`. |
| `--no-description` | Omite o trecho da descrição. |

### `detail`

```bash
bun run .agents/skills/vagas-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

Aceita `2837357`, `v2837357` ou a URL `https://www.vagas.com.br/vagas/v<id>/...`.

## Exemplos

```bash
# Gerente de produto 100% home office
bun run .agents/skills/vagas-search/cli/src/cli.ts search -q "gerente de produto" --remote --format table

# Analista de dados publicado nas últimas duas semanas
bun run .agents/skills/vagas-search/cli/src/cli.ts search -q "analista de dados" --jobage 14 --format table

# Segunda página, remoto ou híbrido
bun run .agents/skills/vagas-search/cli/src/cli.ts search -q "produto" --remote remoto,hibrido --page 2 --format table

# Ler uma vaga inteira
bun run .agents/skills/vagas-search/cli/src/cli.ts detail v2837357 --format plain
```

## Formatos de saída

A busca em JSON sai como `{ "meta": { "count", "page", "total" }, "results": [...] }`.
Cada resultado traz os campos do contrato de portais (`id`, `title`, `company`,
`location`, `date`, `url`, com `null` quando faltar) e mais:

| Campo | Conteúdo |
|-------|----------|
| `seniority` | Nível como o portal mostra (`Pleno`, `Sênior`, `Gerência`...) — só na busca |
| `workplace_type` | `remote` quando o local é "100% Home Office", `hybrid` quando "Empresa e Home Office"; senão `null` |
| `contract` | Regime (`CLT`...) — só no `detail` |
| `salary` | Faixa salarial, quando informada — só no `detail` |
| `deadline` | Prazo — só no `detail` |
| `description` | Trecho na busca; texto completo no `detail` |

Erros vão para o **stderr** como `{ "error": "...", "code": "..." }`, com código de saída `1`.

## Observações

- **A busca é por termo inteiro no caminho** (`/vagas-de-gerente-de-produto`): termos
  longos acham pouco, termos curtos acham muito. Combine os dois e deixe o `/scrape` filtrar.
- **O local já diz o modelo** nas vagas remotas ("100% Home Office"). Vagas presenciais
  mostram a cidade; "A empresa aceita candidaturas de <cidade> e cidades próximas" é o
  raio que a empresa aceita.
- **Datas relativas** ("Há 5 dias", "Hoje") viram `AAAA-MM-DD` contando a partir de hoje.
- Muitas vagas vêm de empresa **"Confidencial"**.
- Detalhes técnicos das páginas e âncoras de leitura: [`url-reference.md`](url-reference.md).
