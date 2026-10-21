---
name: pcd-search
version: 1.0.0
description: >
  Busca vagas exclusivas para pessoas com deficiência no PCD Online (www.pcd.com.br), ou
  lê o detalhe de uma vaga do PCD Online. Frases de ativação: vagas para PcD, vagas para
  pessoas com deficiência, vagas exclusivas PcD, vagas afirmativas PcD, vagas no PCD Online.
  English: jobs for people with disabilities in Brazil, PCD Online job search.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/pcd-search/cli/src/cli.ts *)
---

# Busca no PCD Online

Busca vagas no **[PCD Online](https://www.pcd.com.br/vagas-para-pcd)**, portal só de vagas
para pessoas com deficiência. Sem login, sem chave e **sem dependências de execução**.

**Todas as vagas do portal são exclusivas para PcD.** Pelo filtro de elegibilidade do
`04-job-evaluation.md`, só fazem sentido para quem declarou essa condição no perfil.

## ⚠️ Só para uso pessoal

Os **termos de uso do PCD Online proíbem** "robôs, sistemas de varredura e armazenamento de
dados (como 'spiders' ou 'scrapers')", embora o `robots.txt` libere as páginas. Esta skill
existe para a busca pessoal de quem a roda: **mantenha o volume baixo**, **não use para fins
comerciais nem para coleta em massa** e não redistribua o conteúdo. O uso é por sua conta e
risco. Para desligar sem apagar, ponha `enabled: false` no frontmatter.

## Comandos

```bash
bun run .agents/skills/pcd-search/cli/src/cli.ts search -q "<palavras do título>" [filtros] [--format json|table|plain]
bun run .agents/skills/pcd-search/cli/src/cli.ts detail <url|id> [--format json|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Palavras que precisam estar **todas** no título (**obrigatório**). |
| `--pages` | Quantas páginas da lista ler (30 vagas cada; 1 a 10). Padrão 4. |
| `--page` | Página inicial. |
| `--remote` | Só vagas remotas. |
| `--jobage` | Só vagas publicadas nos últimos N dias (a busca não traz data: só vale no detalhe). |
| `--limit`, `-n` | Quantas vagas mostrar (até 100). |
| `--format` | `json` (padrão), `table` ou `plain`. |
| `--no-description` | Omite o resumo. |

**Os filtros do site são aplicados por JavaScript** e ignorados no endereço: a CLI lê as
primeiras páginas da lista e filtra pelo título.

## Exemplos

```bash
bun run .agents/skills/pcd-search/cli/src/cli.ts search -q "analista" --remote --format table
bun run .agents/skills/pcd-search/cli/src/cli.ts search -q "dados" --pages 8 --format table
bun run .agents/skills/pcd-search/cli/src/cli.ts detail "https://www.pcd.com.br/emprego-pcd/cientista-de-dados-sr-pcd-em-todo-brasil-sp/69830" --format plain
```

## Formatos de saída

Campos do contrato e mais `contract`, `salary` (quando informado), `workplace_type`,
`pcd_only` e um resumo em `description`. O detalhe traz data, prazo e a descrição completa.

## Observações

- O título costuma vir com "Vaga PCD" e "PCD" no próprio texto.
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
