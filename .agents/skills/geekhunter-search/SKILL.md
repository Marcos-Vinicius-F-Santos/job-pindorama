---
name: geekhunter-search
version: 1.0.0
description: >
  Busca vagas de tecnologia no GeekHunter (www.geekhunter.com), plataforma brasileira de
  recrutamento tech, ou lê o detalhe de uma vaga do GeekHunter. Traz nível, modelo de
  trabalho, regime e salário quando informados. Frases de ativação: vagas de tecnologia,
  vagas de TI, vagas de desenvolvedor, vagas no GeekHunter, ler esta vaga do GeekHunter.
  English: Brazilian tech jobs, GeekHunter job search.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/geekhunter-search/cli/src/cli.ts *)
---

# Busca no GeekHunter

Busca vagas no **[GeekHunter](https://www.geekhunter.com/pt/vagas)**, plataforma de
recrutamento de tecnologia. Sem login, sem chave e **sem dependências de execução**.

O `robots.txt` libera as páginas de vagas e os termos não proíbem acesso automatizado. Mesmo
assim, **use com moderação**: cada página lida é uma requisição.

## Comandos

```bash
bun run .agents/skills/geekhunter-search/cli/src/cli.ts search -q "<palavras do título>" [filtros] [--format json|table|plain]
bun run .agents/skills/geekhunter-search/cli/src/cli.ts detail <url> [--format json|plain]
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
| `--no-description` | Omite o resumo. |

**O portal não tem busca por texto** (os parâmetros de busca são ignorados): a CLI lê as
primeiras páginas da lista, da vaga mais nova para a mais antiga, e filtra pelo título.

## Exemplos

```bash
bun run .agents/skills/geekhunter-search/cli/src/cli.ts search -q "desenvolvedor" --remote --jobage 14 --format table
bun run .agents/skills/geekhunter-search/cli/src/cli.ts search -q "dados" --pages 8 --format table
bun run .agents/skills/geekhunter-search/cli/src/cli.ts detail "https://www.geekhunter.com/pt/mv-saude-digital/jobs/desenvolvedor-pleno-93" --format plain
```

## Formatos de saída

Campos do contrato e mais `contract` (CLT, PJ), `seniority` (Júnior, Pleno, Sênior,
Especialista...), `workplace_type`, `salary` (quando informado e não oculto), `skills` e um
resumo em `description`. JSON com `meta.scanned` (vagas lidas antes do filtro).

## Observações

- **Na busca, `company` vem do identificador da empresa** ("Mv Saude Digital"); o detalhe traz
  o nome certo ("MV Saúde Digital").
- O detalhe respeita `hideSalary`: salário oculto pela empresa não aparece.
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
