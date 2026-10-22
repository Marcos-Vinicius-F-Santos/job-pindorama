# digai-cli

CLI para buscar vagas nas páginas de carreira do [DigAÍ](https://jobs.digai.ai). Sem autenticação e sem dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "produto" --format table
bun run src/cli.ts detail https://jobs.digai.ai/87124eb1-2e60-4d43-b045-3f4a3d51195e --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `greenhouse-search`, `empregos-search`.
- `src/parse.ts` - o que é específico do DigAÍ: leitura do payload do Next.js, das páginas de empresa e da vaga; `src/commands/search.ts` percorre as empresas de `../companies.txt`.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
DIGAI_LIVE=1 bun test          # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
