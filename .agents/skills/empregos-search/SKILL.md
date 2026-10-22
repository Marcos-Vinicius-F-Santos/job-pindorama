---
name: empregos-search
version: 1.0.0
description: >
  Busca vagas na Empregos.com.br, portal generalista brasileiro (de vagas operacionais a
  gestão e tecnologia), pelas páginas públicas por cargo, ou lê o detalhe de uma vaga da
  Empregos.com.br. Frases de ativação: buscar vagas na Empregos.com.br, vagas no
  empregos.com.br, ler esta vaga da Empregos. English: Empregos.com.br job search, look
  up this empregos.com.br posting.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/empregos-search/cli/src/cli.ts *)
---

# Busca na Empregos.com.br

Busca vagas na **Empregos.com.br** (`www.empregos.com.br`) pelas páginas públicas por cargo
(`/vagas/<cargo>`). Sem login, sem chave e **sem dependências de execução**: roda só com `bun`.

**A busca é por cargo, não por texto livre.** A busca livre do site (`/buscar-vagas`) é proibida
no `robots.txt`, e a CLI não a usa. O cargo vira o caminho da página ("gerente de produto" →
`/vagas/gerente-de-produto`). O site devolve vagas "parecidas" para qualquer texto, então a CLI
confere se todas as palavras estão no título.

## Comandos

```bash
bun run .agents/skills/empregos-search/cli/src/cli.ts search -q "<cargo>" [opções] [--format json|table|plain]
bun run .agents/skills/empregos-search/cli/src/cli.ts detail <url|id> [--format json|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Cargo (**obrigatório**); todas as palavras precisam estar no título. |
| `--remote` / `--hybrid` | Só vagas com esse modelo no cartão (filtro feito pela CLI). |
| `--pages` | Páginas lidas, 20 vagas cada (1 a 10; padrão 3). Com `--remote`, leia mais páginas. |
| `--with-description` | Traz o texto da vaga que aparece no cartão (em geral, a descrição inteira). |
| `--jobage` | Só vagas publicadas nos últimos N dias. |
| `--limit`, `-n` | Máximo de vagas na resposta (padrão 25). |
| `--format` | `json` (padrão), `table` ou `plain`. |

## Exemplos

```bash
bun run .agents/skills/empregos-search/cli/src/cli.ts search -q "product manager" --remote --pages 5 --format table
bun run .agents/skills/empregos-search/cli/src/cli.ts search -q "analista de dados" --jobage 14 --format table
bun run .agents/skills/empregos-search/cli/src/cli.ts detail https://www.empregos.com.br/vaga/11909170/product-manager-senior-em-sao-paulo-sp --format plain
```

## Formatos de saída

JSON: `{ "meta": { "count", "page", "total", "scanned", "site_total" }, "results": [...] }`,
com os campos do contrato de portais (`id`, `title`, `company`, `location`, `date`, `url`) e mais
`workplace_type` (do cartão), `salary` (quando informado), `openings` (número de vagas) e
`description` (com `--with-description` ou no `detail`). `scanned` é quantos cartões foram lidos;
`site_total`, quantas vagas o site diz ter para aquele cargo. Erros no **stderr** como
`{ "error", "code" }`, saída `1`.

## Observações

- **A data é aproximada**: o cartão diz "Publicada há N dias"; a CLI converte em data.
- **O detalhe diz "remoto" só quando o anúncio marca trabalho remoto**; nos outros casos o modelo
  fica `null` no `detail` (o cartão da busca traz Presencial, Híbrido ou Remoto).
- **Vale o texto, não o rótulo:** o `/scrape` e o `posting_signals.py` conferem modelo de
  trabalho e seleção interna na descrição.
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
