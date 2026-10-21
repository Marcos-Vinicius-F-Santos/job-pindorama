---
name: digai-search
version: 1.0.0
description: >
  Busca vagas nas páginas de carreira do DigAÍ, plataforma de recrutamento com entrevista
  por IA usada por empresas brasileiras (Raízen, Localiza, Afya, Hapvida, Stefanini, iFood,
  Grupo Boticário, XP, Wellhub, Stone e outras), ou lê o detalhe de uma vaga do DigAÍ.
  Frases de ativação: buscar vagas no DigAÍ, vagas com entrevista por IA, ler esta vaga do
  DigAÍ, jobs.digai.ai. English: DigAI job search, look up this jobs.digai.ai posting.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/digai-search/cli/src/cli.ts *)
---

# Busca no DigAÍ

Busca vagas no **DigAÍ** (`jobs.digai.ai`), onde a triagem é uma entrevista conduzida por IA.
Sem login, sem chave e **sem dependências de execução**: roda só com `bun`.

**A busca é por empresa.** A busca geral do site é montada no navegador por uma API não
documentada, que a CLI não usa. A CLI consulta a página de carreira de cada empresa
(`<empresa>.digai.ai`), que o `robots.txt` libera, com o cargo no filtro do próprio portal.
As empresas ficam em [`companies.txt`](companies.txt): **deixe só as que interessam a você**,
porque cada empresa é um pedido por busca (a lista completa, 70 empresas, leva uns 30 s).

## Comandos

```bash
bun run .agents/skills/digai-search/cli/src/cli.ts search -q "<palavras do cargo>" [opções] [--format json|table|plain]
bun run .agents/skills/digai-search/cli/src/cli.ts detail <url|id> [--format json|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Cargo; todas as palavras precisam estar no título (**obrigatório**; sem acento nem caixa). |
| `--companies` | Empresas a consultar (subdomínios), separadas por vírgula. Padrão: `companies.txt`. |
| `--remote` | Só vagas remotas (filtro do próprio portal). |
| `--jobage` | Só vagas publicadas nos últimos N dias. |
| `--page`, `--limit`, `-n` | Paginação feita pela CLI (padrão 25 por página). |
| `--format` | `json` (padrão), `table` ou `plain`. |

## Exemplos

```bash
bun run .agents/skills/digai-search/cli/src/cli.ts search -q "produto" --format table
bun run .agents/skills/digai-search/cli/src/cli.ts search -q "analista dados" --companies raizen,localiza --format table
bun run .agents/skills/digai-search/cli/src/cli.ts detail https://jobs.digai.ai/87124eb1-2e60-4d43-b045-3f4a3d51195e --format plain
```

## Formatos de saída

JSON: `{ "meta": { "count", "page", "total", "companies", "failed_companies", "truncated" }, "results": [...] }`,
com os campos do contrato de portais (`id`, `title`, `company`, `location`, `date`, `url`) e mais:

- `workplace_type` e `seniority`: campos do próprio portal (não deduzidos do texto);
- `salary`, quando a empresa informa;
- `company_slug`, o subdomínio da empresa;
- `pcd_affirmative`: vaga marcada pela empresa como afirmativa para PcD;
- `talent_pool`: banco de talentos, não uma vaga aberta;
- `internal`: seleção interna (só no `detail`; `null` na busca);
- `description`: só no `detail`.

Erros no **stderr** como `{ "error", "code" }`, saída `1`.

## Observações

- **Cada empresa devolve no máximo 12 vagas por busca** (a primeira página, que é o que vem
  pronto do servidor). Quando a empresa tem mais vagas com aquele cargo, ela aparece em
  `meta.truncated` e num aviso no stderr: refine o `--query`.
- **Empresa que falha não derruba a busca**: vira aviso no stderr e em `meta.failed_companies`
  (subdomínio errado ou empresa que saiu do DigAÍ).
- **O filtro de cargo do portal é largo**; a CLI confere de novo se todas as palavras estão no
  título.
- **Vale o texto, não o rótulo:** o `/scrape` e o `posting_signals.py` conferem modelo de
  trabalho e seleção interna na descrição.
- Detalhes técnicos: [`url-reference.md`](url-reference.md).
