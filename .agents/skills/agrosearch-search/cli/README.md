# agrosearch-cli

CLI para buscar vagas da [AGROSearch](https://agrosearch.com.br) (agronegócio). Sem autenticação e sem dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search --no-internal --format table
bun run src/cli.ts detail 1036 --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `digai-search`, `empregos-search`.
- `src/parse.ts` - o que é específico da AGROSearch: a API pública do portal Agroforce e a leitura das vagas.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
AGROSEARCH_LIVE=1 bun test     # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
