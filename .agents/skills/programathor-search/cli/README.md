# programathor-cli

CLI para buscar vagas de tecnologia no [Programathor](https://programathor.com.br). Sem autenticação e sem dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q python --remote --format table
bun run src/cli.ts search --all --page 2 --format table
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `digai-search`, `empregos-search`.
- `src/parse.ts` - o que é específico do Programathor: URL por tecnologia e leitura dos cartões (sem detalhe: a página da vaga exige login).
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
PROGRAMATHOR_LIVE=1 bun test     # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
