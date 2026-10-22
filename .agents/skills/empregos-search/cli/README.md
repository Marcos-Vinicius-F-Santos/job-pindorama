# empregos-cli

CLI para buscar vagas na [Empregos.com.br](https://www.empregos.com.br), pelas páginas públicas por cargo. Sem autenticação e sem dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "product manager" --remote --format table
bun run src/cli.ts detail 11909170 --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `greenhouse-search`, `digai-search`.
- `src/parse.ts` - o que é específico da Empregos.com.br: URL por cargo, leitura dos cartões e da vaga; `src/commands/search.ts` percorre as páginas e filtra pelo título.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
EMPREGOS_LIVE=1 bun test       # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
