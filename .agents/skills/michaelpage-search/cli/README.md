# michaelpage-cli

CLI para buscar vagas na [Michael Page Brasil](https://www.michaelpage.com.br). Sem autenticação e sem dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "product manager" --format table
bun run src/cli.ts detail "https://www.michaelpage.com.br/job-detail/<slug>/ref/<ref>" --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `digai-search`, `empregos-search`.
- `src/parse.ts` - o que é específico da Michael Page: URL de busca, leitura dos cartões e do JobPosting da vaga.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
MICHAELPAGE_LIVE=1 bun test     # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
