# solides-cli

CLI para buscar vagas na [Sólides Vagas](https://vagas.solides.com.br). Sem autenticação e
sem dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "product manager" --remote --format table
bun run src/cli.ts detail 939473 --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `digai-search`.
- `src/parse.ts` - o que é específico da Sólides: URL de busca, leitura da API e da página.
- `src/commands/` - `search` e `detail`, que juntam os dois.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
SOLIDES_LIVE=1 bun test      # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e campos:
[`../url-reference.md`](../url-reference.md).
