---
name: programathor-search
version: 1.0.0
description: >
  Busca vagas de tecnologia no Programathor (programathor.com.br), portal brasileiro de
  vagas para desenvolvimento, dados e DevOps, por tecnologia (python, react, scrum, aws...),
  com filtros de remoto, nível e regime. Frases de ativação: vagas de programador, vagas
  de desenvolvedor, vagas python, vagas react remotas, vagas no Programathor. English:
  Brazilian developer jobs, Programathor job search.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/programathor-search/cli/src/cli.ts *)
---

# Busca no Programathor

Busca vagas no **[Programathor](https://programathor.com.br)**, portal de vagas de
tecnologia. Sem login, sem chave e **sem dependências de execução**.

O `robots.txt` libera a busca e os termos de uso não proíbem acesso automatizado. Mesmo
assim, **use com moderação**.

## Comandos

```bash
bun run .agents/skills/programathor-search/cli/src/cli.ts search -q "<tecnologia>" [filtros] [--format json|table|plain]
bun run .agents/skills/programathor-search/cli/src/cli.ts search --all [filtros]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | **Tecnologia** (python, react, scrum, aws, "CI/CD"...): vira a página `/jobs-<tecnologia>`. O portal não tem busca por texto livre. |
| `--all` | A lista geral de vagas (aceita `--page`). |
| `--remote` | Só vagas remotas. |
| `--level` | `junior`, `pleno` ou `senior`. |
| `--type` | `clt`, `pj` ou `estagio`. |
| `--page` | Página da lista geral (`--all`); as páginas por tecnologia não paginam. |
| `--limit`, `-n` | Quantas vagas mostrar (até 32). |
| `--format` | `json` (padrão), `table` ou `plain`. |

**Não há `detail`:** a página de cada vaga só abre com login no portal (responde 500 a
visitantes, inclusive com cabeçalhos de navegador). O comando responde `DETAIL_UNAVAILABLE`.

## Exemplos

```bash
bun run .agents/skills/programathor-search/cli/src/cli.ts search -q python --remote --level senior --format table
bun run .agents/skills/programathor-search/cli/src/cli.ts search -q scrum --type clt --format table
bun run .agents/skills/programathor-search/cli/src/cli.ts search --all --remote --page 2 --format table
```

## Formatos de saída

Campos do contrato (`id`, `title`, `company`, `location`, `date`, `url`) e mais `contract`,
`seniority`, `workplace_type`, `company_size` e `tags` (tecnologias). **`date` e `description`
vêm sempre `null`**: o cartão não traz data nem descrição.

## Observações

- **Vagas encerradas ficam de fora**: o portal ainda as lista (cartão em cinza, classe `opacity`).
- Sem data, `--jobage` não descarta nada.
- Para avaliar uma vaga, procure-a no site da empresa (passo 4 da escalada de `09-web-research.md`).
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
