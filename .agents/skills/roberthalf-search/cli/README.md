# roberthalf-cli

CLI para buscar vagas na [Robert Half Brasil](https://www.roberthalf.com/br/pt/vagas). Sem autenticação e sem dependências de execução: só `bun`.

**Uso pessoal:** os termos da Robert Half proíbem acesso automatizado sem consentimento por escrito; veja o aviso em [`../SKILL.md`](../SKILL.md).

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "analista" --remote --format table
bun run src/cli.ts detail "https://www.roberthalf.com/br/pt/vaga/<cidade>/<slug>/<id>" --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `digai-search`, `empregos-search`.
- `src/parse.ts` - o que é específico da Robert Half: leitura dos cartões `rhcl-job-card`; `src/commands/search.ts` percorre as páginas e filtra pelo título.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
ROBERTHALF_LIVE=1 bun test     # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
