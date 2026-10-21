---
name: trampos-search
version: 1.0.0
description: >
  Busca vagas na Trampos (trampos.co), portal brasileiro de vagas e freelas de comunicação,
  marketing, design, tecnologia e negócios, ou lê o detalhe de uma vaga da Trampos. Filtra
  por home office, categoria e tipo (emprego, freela, estágio). Frases de ativação: vagas
  de marketing, vagas de design, vagas de comunicação, freelas, vagas home office, vagas na
  Trampos. English: Trampos job search, Brazilian marketing and design jobs.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/trampos-search/cli/src/cli.ts *)
---

# Busca na Trampos

Busca vagas na **[Trampos](https://trampos.co)** pela API JSON que o próprio site usa. Sem
login, sem chave e **sem dependências de execução**.

## ⚠️ Só para uso pessoal

Os **termos de uso da Trampos proíbem acesso automatizado** ("Utilizar mecanismos, software
ou scripts em relação à utilização do site" e cópias por "Robot/Crawler"), embora o
`robots.txt` libere a API. Esta skill existe para a busca pessoal de quem a roda: **mantenha o
volume baixo**, **não use para fins comerciais nem para coleta em massa** e não redistribua o
conteúdo. O uso é por sua conta e risco. Para desligar sem apagar, ponha `enabled: false` no
frontmatter.

## Comandos

```bash
bun run .agents/skills/trampos-search/cli/src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
bun run .agents/skills/trampos-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Cargo ou palavra-chave (**obrigatório**). |
| `--remote` | Só vagas home office. |
| `--location`, `-l` | Cidade (ignorado com `--remote`). |
| `--category` | `social-media`, `ti`, `marketing`, `criacao`, `design`, `atendimento`, `jornalismo`, `producao`, `rtv`, `midia`, `comercial`, `dados`, `projetos`, `rh`, `administrativo`, `cs`. |
| `--type` | `emprego`, `freela`, `estagio`, `banco-talentos`. |
| `--jobage` | Só vagas publicadas nos últimos N dias (filtro da CLI). |
| `--page`, `--limit`, `-n` | Página (12 vagas por página) e quantas mostrar. |
| `--format` | `json` (padrão), `table` ou `plain`. |

## Exemplos

```bash
bun run .agents/skills/trampos-search/cli/src/cli.ts search -q "produto" --remote --type emprego --format table
bun run .agents/skills/trampos-search/cli/src/cli.ts search -q "analista de dados" --category dados --format table
bun run .agents/skills/trampos-search/cli/src/cli.ts detail 774888 --format plain
```

## Formatos de saída

Campos do contrato e mais `category`, `kind` (Emprego, Freela, Banco de Talentos),
`salary` (quando divulgado) e, no detalhe, `contract` (CLT, PJ...), `workplace_type` e
`description` com descrição, requisitos, desejáveis e benefícios.

## Observações

- Empresa sem nome público aparece como **"Confidencial"**; vagas que a própria Trampos recruta
  aparecem como "trampos".
- "Banco de Talentos" não é vaga aberta.
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
