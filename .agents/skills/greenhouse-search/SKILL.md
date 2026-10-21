---
name: greenhouse-search
version: 1.0.0
description: >
  Busca vagas nos boards públicos do Greenhouse, o sistema de recrutamento (ATS) de
  muitas empresas de tecnologia com operação no Brasil (Stone, C6 Bank, XP, QuintoAndar,
  Wellhub, Ebanx, VTEX, Jusbrasil, RD Station e as que você acrescentar), ou lê o detalhe
  de uma vaga do Greenhouse. Frases de ativação: buscar vagas na Stone, vagas no
  QuintoAndar, vagas em empresas de tecnologia, vagas no Greenhouse, ler esta vaga do
  Greenhouse. English: Greenhouse job board search, look up this greenhouse.io posting.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/greenhouse-search/cli/src/cli.ts *)
---

# Busca no Greenhouse

Busca vagas na **Job Board API** do Greenhouse (`boards-api.greenhouse.io`), a API pública
e documentada que as empresas usam para exibir as próprias vagas. Sem login, sem chave e
**sem dependências de execução**: roda só com `bun`.

**Não existe busca entre empresas no Greenhouse:** cada empresa tem um "board". A CLI
consulta os boards listados em [`boards.txt`](boards.txt) (um pedido por empresa) e filtra
pelo título. **Edite o `boards.txt`** com as empresas que interessam a você: o identificador
é o trecho depois de `job-boards.greenhouse.io/` na página de vagas da empresa.

## Comandos

```bash
bun run .agents/skills/greenhouse-search/cli/src/cli.ts search -q "<palavras do título>" [opções] [--format json|table|plain]
bun run .agents/skills/greenhouse-search/cli/src/cli.ts detail <url|empresa/id> [--format json|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Palavras que precisam estar **todas** no título (**obrigatório**; sem acento nem caixa). |
| `--boards` | Empresas a consultar, separadas por vírgula. Padrão: `boards.txt`. |
| `--remote` | Só vagas com local remoto. |
| `--with-description` | Traz a descrição completa (respostas bem maiores). |
| `--jobage` | Só vagas publicadas nos últimos N dias. |
| `--page`, `--limit`, `-n` | Paginação feita pela CLI (padrão 25 por página). |
| `--format` | `json` (padrão), `table` ou `plain`. |

## Exemplos

```bash
bun run .agents/skills/greenhouse-search/cli/src/cli.ts search -q "product manager" --format table
bun run .agents/skills/greenhouse-search/cli/src/cli.ts search -q "dados" --boards stone,quintoandar --jobage 14 --format table
bun run .agents/skills/greenhouse-search/cli/src/cli.ts detail quintoandar/4433716009 --format plain
```

## Formatos de saída

JSON: `{ "meta": { "count", "page", "total", "boards", "failed_boards" }, "results": [...] }`,
com os campos do contrato de portais (`id`, `title`, `company`, `location`, `date`, `url`) e
mais `board`, `department`, `language`, `workplace_type` (deduzido do local) e `description`
(com `--with-description` ou no `detail`). Erros no **stderr** como `{ "error", "code" }`, saída `1`.

## Observações

- **`url` é a página que a empresa escolheu**: em geral `job-boards.greenhouse.io/...`, às vezes
  o site de carreiras da própria empresa.
- **Board que falha não derruba a busca**: vira aviso no stderr e em `meta.failed_boards`
  (empresa que trocou de ATS ou identificador errado no `boards.txt`).
- **O local é texto livre da empresa** ("Remoto - Brasil", "São Paulo", "Mexico City"): vagas de
  outros países aparecem; o `/scrape` e o `posting_signals.py` filtram depois.
- Regime, senioridade e salário não são campos da API; quando existem, estão na descrição.
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
