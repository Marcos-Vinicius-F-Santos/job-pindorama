---
name: roberthalf-search
version: 1.0.0
description: >
  Busca vagas na Robert Half Brasil (www.roberthalf.com/br/pt), consultoria de recrutamento
  de especialistas e gestão (finanças, tecnologia, administrativo, jurídico), ou lê o
  detalhe de uma vaga da Robert Half. Traz modelo de trabalho, tipo (efetivo, projetos) e
  salário quando informado. Frases de ativação: vagas na Robert Half, vagas de finanças,
  vagas de analista, vagas por projeto. English: Robert Half Brazil job search.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/roberthalf-search/cli/src/cli.ts *)
---

# Busca na Robert Half

Busca vagas na **[Robert Half Brasil](https://www.roberthalf.com/br/pt/vagas)** pelas
páginas públicas de vagas. Sem login, sem chave e **sem dependências de execução**.

## ⚠️ Só para uso pessoal

Os **termos de uso da Robert Half proíbem** "usar quaisquer dispositivos, processos ou
mecanismos para monitorar, recuperar, pesquisar ou acessar dados do Site… sem o consentimento
prévio e por escrito… através, por exemplo, de robôs ou sistemas de varredura", embora o
`robots.txt` libere as páginas. Esta skill existe para a busca pessoal de quem a roda:
**mantenha o volume baixo**, **não use para fins comerciais nem para coleta em massa** e não
redistribua o conteúdo. O uso é por sua conta e risco. Para desligar sem apagar, ponha
`enabled: false` no frontmatter.

## Comandos

```bash
bun run .agents/skills/roberthalf-search/cli/src/cli.ts search -q "<palavras do título>" [filtros] [--format json|table|plain]
bun run .agents/skills/roberthalf-search/cli/src/cli.ts detail <url> [--format json|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Palavras que precisam estar **todas** no título (**obrigatório**). |
| `--pages` | Quantas páginas da lista ler (25 vagas cada; 1 a 10). Padrão 4. |
| `--page` | Página inicial. |
| `--remote` | Só vagas remotas. |
| `--jobage` | Só vagas publicadas nos últimos N dias. |
| `--limit`, `-n` | Quantas vagas mostrar (até 100). |
| `--format` | `json` (padrão), `table` ou `plain`. |
| `--no-description` | Omite a descrição. |

**A página de vagas não filtra por texto** (a busca do site passa por uma API interna): a CLI
lê as primeiras páginas da lista, da vaga mais nova para a mais antiga, e filtra pelo título.

## Exemplos

```bash
bun run .agents/skills/roberthalf-search/cli/src/cli.ts search -q "analista" --remote --jobage 14 --format table
bun run .agents/skills/roberthalf-search/cli/src/cli.ts search -q "gerente" --pages 8 --format table
bun run .agents/skills/roberthalf-search/cli/src/cli.ts detail "https://www.roberthalf.com/br/pt/vaga/guarulhos/analista-de-transportes-pleno/63610-0013529450-brpt" --format plain
```

## Formatos de saída

Campos do contrato e mais `contract` (Permanente, Projetos, Temporário), `workplace_type`,
`salary` (com o período, quando informado) e `description` completa (já vem no cartão).
**`company` é sempre "Robert Half (cliente)"**: a empresa contratante é um cliente.

## Observações

- O modelo de trabalho é o campo `worksite` do portal; confira no texto (o `posting_signals.py`
  aponta contradições).
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
