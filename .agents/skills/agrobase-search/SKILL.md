---
name: agrobase-search
version: 1.0.0
description: >
  Busca vagas do agronegócio, ciências agrárias e meio ambiente no Agrobase
  (www.agrobase.com.br), o maior agregador de vagas do setor, por profissão (agrônomo,
  veterinário, zootecnista, técnico agrícola, engenheiro florestal, ambiental, de alimentos,
  biólogo...), ou lê o detalhe de uma vaga do Agrobase. Frases de ativação: vagas no agro,
  vagas de agrônomo, vagas de veterinário, vagas de zootecnista, vagas de técnico agrícola,
  trainee agro, estágio agro, vagas no Agrobase. English: Brazilian agribusiness jobs,
  Agrobase job search.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/agrobase-search/cli/src/cli.ts *)
---

# Busca no Agrobase

Busca vagas no **[Agrobase](https://www.agrobase.com.br/oportunidades/)**, agregador de
vagas do agronegócio, ciências agrárias e meio ambiente. Sem login, sem chave e **sem
dependências de execução**.

- **Busca:** a API REST padrão do WordPress do site (cada vaga é um post).
- **Detalhe:** a página pública da vaga.

O `robots.txt` libera a API e as páginas de vaga, e os termos não proíbem acesso
automatizado. Mesmo assim, **use com moderação**. O plano pago do Agrobase libera parte das
vagas 2 a 4 dias antes do público: a CLI só vê o que já foi liberado.

## Comandos

```bash
bun run .agents/skills/agrobase-search/cli/src/cli.ts search [-q "<palavra>"] [filtros] [--format json|table|plain]
bun run .agents/skills/agrobase-search/cli/src/cli.ts detail <url> [--format json|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Palavra-chave (busca do WordPress: título e texto). Opcional quando há `--profession`. |
| `--profession` | `agronomo`, `veterinario`, `zootecnista`, `tecnico-agricola`, `tecnico-agropecuaria`, `florestal`, `ambiental`, `alimentos`, `biologo`, `nutricionista`. |
| `--type` | `emprego` (padrão), `estagio` ou `concurso`. |
| `--jobage` | Só vagas publicadas nos últimos N dias (**filtro feito pelo site**). |
| `--page`, `--limit`, `-n` | Página e vagas por página (até 100; padrão 25). |
| `--format` | `json` (padrão), `table` ou `plain`. |

## Exemplos

```bash
bun run .agents/skills/agrobase-search/cli/src/cli.ts search --profession agronomo --jobage 7 --format table
bun run .agents/skills/agrobase-search/cli/src/cli.ts search -q "vendedor" --profession veterinario --format table
bun run .agents/skills/agrobase-search/cli/src/cli.ts search -q "trainee" --format table
bun run .agents/skills/agrobase-search/cli/src/cli.ts detail "https://www.agrobase.com.br/oportunidades/2026/10/zootecnista-trainee-pr-e-sp/" --format plain
```

## Formatos de saída

Campos do contrato e mais `professions` e `kind` (Emprego, Estágio, Concurso). O local vem do
título ("Vendedor de peças – Santa Rosa/RS"). O detalhe traz a data de liberação, o tipo
(Trainee, CLT...), responsabilidades e requisitos, e `apply_url` (candidatura pela plataforma
do Agrobase). **A empresa não é informada** (`company` vem `null`).

## Observações

- A busca do WordPress casa palavras do título e do texto: use `--profession` para precisão.
- Muitas vagas são publicadas por cidade ("Vendedor especializado – São Paulo/SP" e
  "– João Pessoa/PB"): o `scrape_run.py` junta só as de mesmo título.
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
