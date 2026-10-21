# agrobase-cli

CLI para buscar vagas do agronegócio no [Agrobase](https://www.agrobase.com.br/oportunidades/). Sem autenticação e sem dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search --profession agronomo --jobage 7 --format table
bun run src/cli.ts detail "https://www.agrobase.com.br/oportunidades/AAAA/MM/<slug>/" --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrosearch-search`, `digai-search`.
- `src/parse.ts` - o que é específico do Agrobase: URL da API do WordPress, categorias e leitura da página da vaga.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
AGROBASE_LIVE=1 bun test     # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
