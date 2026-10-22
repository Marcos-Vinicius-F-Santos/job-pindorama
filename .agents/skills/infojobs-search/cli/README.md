# infojobs-cli

CLI para buscar vagas na [InfoJobs Brasil](https://www.infojobs.com.br). Sem autenticação
e sem dependências de execução: só `bun`.

**Uso pessoal:** os termos da InfoJobs proíbem acesso automatizado; veja o aviso em
[`../SKILL.md`](../SKILL.md).

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "product manager" --remote --format table
bun run src/cli.ts detail "https://www.infojobs.com.br/vaga-de-product-manager-em-minas-gerais__12133581.aspx" --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `digai-search`, `empregos-search`.
- `src/parse.ts` - o que é específico da InfoJobs: URL de busca, leitura dos cartões e da
  página da vaga.
- `src/commands/` - `search` e `detail`, que juntam os dois.

## Testes

```bash
bun run typecheck
bun test                      # simulados, sem rede (é o que o CI roda)
INFOJOBS_LIVE=1 bun test      # inclui um teste contra o portal real
```

Páginas e âncoras de leitura: [`../url-reference.md`](../url-reference.md).
