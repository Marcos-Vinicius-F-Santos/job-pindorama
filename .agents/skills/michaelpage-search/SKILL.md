---
name: michaelpage-search
version: 1.0.0
description: >
  Busca vagas na Michael Page Brasil (www.michaelpage.com.br), consultoria de recrutamento
  de média e alta gestão e especialistas, ou lê o detalhe de uma vaga da Michael Page.
  Frases de ativação: vagas de gestão, vagas de gerente, vagas executivas, vagas para
  especialistas, vagas na Michael Page, ler esta vaga da Michael Page. English: Michael Page
  Brazil job search, management jobs in Brazil.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/michaelpage-search/cli/src/cli.ts *)
---

# Busca na Michael Page

Busca vagas na **[Michael Page Brasil](https://www.michaelpage.com.br)**, consultoria que
recruta para média e alta gestão e especialistas, faixa que Gupy e Sólides cobrem pouco. Sem
login, sem chave e **sem dependências de execução**.

O `robots.txt` libera a busca e as páginas de vaga, e os termos não proíbem acesso
automatizado. Mesmo assim, **use com moderação**.

## Comandos

```bash
bun run .agents/skills/michaelpage-search/cli/src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
bun run .agents/skills/michaelpage-search/cli/src/cli.ts detail <url> [--format json|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Cargo ou palavra-chave (**obrigatório**): vira `/jobs/<termo>`. |
| `--remote` | Só vagas que dizem "remoto" ou "home office" no local ou no resumo (filtro da CLI). |
| `--page` | Página, começando em 1. |
| `--limit`, `-n` | Quantas vagas mostrar (até 25). |
| `--format` | `json` (padrão), `table` ou `plain`. |
| `--no-description` | Omite resumo e destaques. |

## Exemplos

```bash
bun run .agents/skills/michaelpage-search/cli/src/cli.ts search -q "product manager" --format table
bun run .agents/skills/michaelpage-search/cli/src/cli.ts search -q "gerente de produto" --remote --format table
bun run .agents/skills/michaelpage-search/cli/src/cli.ts detail "https://www.michaelpage.com.br/job-detail/product-manager-retail-experience/ref/jn-082026-7088330" --format plain
```

## Formatos de saída

Campos do contrato e mais `contract` (Permanente, Temporário...), `ref` (código da vaga),
`highlights` (destaques do cartão) e `description` (resumo + destaques na busca; completa no
detalhe). **`company` é sempre "Michael Page (cliente)"**: a empresa contratante é um cliente,
quase sempre confidencial; o texto "Sobre nosso cliente" do detalhe descreve o setor.

## Observações

- **A busca não traz data**; o detalhe traz (`datePosted`).
- **Cartões "recomendados"** ("outros usuários se candidataram") não são resultados da busca e
  ficam de fora.
- O `posting_signals.py` marca essas vagas como intermediário ("Nosso cliente…").
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
