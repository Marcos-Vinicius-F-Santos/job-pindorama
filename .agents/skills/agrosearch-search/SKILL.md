---
name: agrosearch-search
version: 1.0.0
description: >
  Busca as vagas abertas da AGROSearch, consultoria de recrutamento do agronegócio (cargos
  comerciais, técnicos e de gestão em fertilizantes, defensivos, máquinas, pecuária,
  crédito agro...), ou lê o detalhe de uma vaga da AGROSearch. Frases de ativação: vagas
  no agro, vagas da AGROSearch, vagas de RTV, vagas comerciais no agronegócio, vagas de
  gestão no agro. English: AGROSearch agribusiness jobs.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/agrosearch-search/cli/src/cli.ts *)
---

# Busca na AGROSearch

Busca as vagas da **[AGROSearch](https://agrosearch.com.br)** pela API pública do portal de
vagas dela (Agroforce). Sem login, sem chave e **sem dependências de execução**.

Nem o portal nem a API publicam `robots.txt`, e não encontrei termos de uso no site. Mesmo
assim, **use com moderação**.

## Comandos

```bash
bun run .agents/skills/agrosearch-search/cli/src/cli.ts search [-q "<palavras do título>"] [filtros] [--format json|table|plain]
bun run .agents/skills/agrosearch-search/cli/src/cli.ts detail <dealId|url> [--format json|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Palavras que precisam estar **todas** no título. Sem `-q`, todas as vagas (são dezenas; a API devolve todas de uma vez). |
| `--remote` | Só vagas que dizem remoto/home office. |
| `--no-internal` | Tira o recrutamento interno da própria AGROSearch. |
| `--limit`, `-n` | Quantas vagas mostrar (até 100; padrão 50). |
| `--format` | `json` (padrão), `table` ou `plain`. |

## Exemplos

```bash
bun run .agents/skills/agrosearch-search/cli/src/cli.ts search --no-internal --format table
bun run .agents/skills/agrosearch-search/cli/src/cli.ts search -q "vendas" --format table
bun run .agents/skills/agrosearch-search/cli/src/cli.ts detail 1036 --format plain
```

## Formatos de saída

Campos do contrato e mais `internal` (recrutamento da própria AGROSearch) e `division`
(no detalhe). O local vem do título ("Especialista Em Crédito | Curitiba - PR"); regime e
modelo de trabalho saem do texto de condições. **Não há data** de publicação. `company` é
"AGROSearch (cliente)": a empresa contratante é um cliente da consultoria.

## Observações

- A `url` aponta para o portal (`...portal.html#/vaga/<dealId>`), onde fica a candidatura.
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
