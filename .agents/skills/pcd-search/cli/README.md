# pcd-cli

CLI para buscar vagas para pessoas com deficiência no [PCD Online](https://www.pcd.com.br/vagas-para-pcd). Sem autenticação e sem dependências de execução: só `bun`.

**Uso pessoal:** os termos do PCD Online proíbem robôs e scrapers; veja o aviso em [`../SKILL.md`](../SKILL.md).

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "analista" --remote --format table
bun run src/cli.ts detail 69830 --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`.
- `src/parse.ts` - o que é específico do PCD Online: leitura dos cartões e do JobPosting da vaga; `src/commands/search.ts` percorre as páginas e filtra pelo título.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
PCD_LIVE=1 bun test     # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
