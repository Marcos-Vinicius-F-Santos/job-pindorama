# linkedin-cli

CLI para buscar vagas nos anúncios públicos do LinkedIn, para **qualquer país ou região**
(e remotas), em qualquer setor.

**Fonte de dados**: rotas `jobs-guest` do LinkedIn (`seeMoreJobPostings/search` e `jobPosting/<id>`).
**Autenticação**: nenhuma.
**Dependências**: nenhuma (só `bun` + `fetch`). O `bun install` é opcional e só traz as definições de tipos.

> **Só para uso pessoal.** Usa as páginas públicas de vagas do LinkedIn; acesso automatizado
> vai contra os Termos de Serviço do LinkedIn. Mantenha o volume baixo, não use para fins
> comerciais nem para coleta em massa, e use por sua conta e risco.

## Instalação

```bash
cd .agents/skills/linkedin-search/cli
bun install   # opcional — só instala os tipos do TypeScript
```

A CLI roda sem instalar nada, porque não tem dependências de execução.

## Comandos

| Comando | Descrição |
|---------|-----------|
| `search` | Busca vagas (`--location` obrigatório) |
| `detail` | Obtém o detalhe completo de uma vaga |

O `search` aceita `--format json|table|plain` (padrão `json`); o `detail` aceita `--format json|plain`.
Todos os erros vão para o **stderr** como `{ "error": "...", "code": "..." }`, com código de saída `1`.
As mensagens de ajuda e de erro da CLI estão em inglês (código do projeto original).

## Exemplos rápidos

```bash
# Backend em Belo Horizonte, últimos 7 dias
bun run src/cli.ts search -q "desenvolvedor backend" -l "Belo Horizonte, Minas Gerais, Brasil" --jobage 7 --format table

# Design em São Paulo
bun run src/cli.ts search -q "product designer" -l "São Paulo, Brasil" --format table

# Totalmente remoto
bun run src/cli.ts search -q "redator técnico" -l "Brasil" --remote remote --format table

# Detalhe completo de uma vaga
bun run src/cli.ts detail 4426311357 --format plain
```

Veja o `../SKILL.md` para a referência completa das opções e o aviso sobre os Termos de Serviço.

## Opções de busca

| Opção | Apelido | Descrição |
|-------|---------|-----------|
| `--location` | `-l` | **Obrigatória.** Nome do lugar, ex.: `"São Paulo, Brasil"`, `"Recife, Pernambuco, Brasil"`, `"Remote"`. |
| `--query` | `-q` | Palavras-chave (cargo / competência / função). Recomendada. |
| `--jobage` | | Publicadas nos últimos N dias: `1`, `7`, `14`, `30`. |
| `--remote` | | `remote` \| `hybrid` \| `onsite`. |
| `--page` | | Página, começando em 1 (10 resultados por página). |
| `--limit` | `-n` | Limita os resultados emitidos. |
| `--format` | | `json` \| `table` \| `plain`. |
