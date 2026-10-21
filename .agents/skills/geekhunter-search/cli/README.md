# geekhunter-cli

CLI para buscar vagas de tecnologia no [GeekHunter](https://www.geekhunter.com/pt/vagas). Sem autenticação e sem dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "desenvolvedor" --remote --format table
bun run src/cli.ts detail "https://www.geekhunter.com/pt/<empresa>/jobs/<slug>" --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `digai-search`.
- `src/parse.ts` - o que é específico do GeekHunter: leitura do payload do Next.js; `src/commands/search.ts` percorre as páginas e filtra pelo título.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
GEEKHUNTER_LIVE=1 bun test     # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
