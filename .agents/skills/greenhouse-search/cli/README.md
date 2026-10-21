# greenhouse-cli

CLI para buscar vagas nos boards públicos do [Greenhouse](https://job-boards.greenhouse.io). Sem autenticação e sem dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "product manager" --format table
bun run src/cli.ts detail quintoandar/4433716009 --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`.
- `src/parse.ts` - o que é específico do Greenhouse: URL da API, leitura dos boards e da vaga; `src/commands/search.ts` percorre os boards de `../boards.txt`.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
GREENHOUSE_LIVE=1 bun test     # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
