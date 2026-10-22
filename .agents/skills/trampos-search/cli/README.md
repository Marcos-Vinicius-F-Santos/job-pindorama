# trampos-cli

CLI para buscar vagas na [Trampos](https://trampos.co). Sem autenticação e sem dependências de execução: só `bun`.

**Uso pessoal:** os termos da Trampos proíbem acesso automatizado; veja o aviso em [`../SKILL.md`](../SKILL.md).

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "produto" --remote --format table
bun run src/cli.ts detail 774888 --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `digai-search`, `empregos-search`.
- `src/parse.ts` - o que é específico da Trampos: URL da API e leitura da vaga.
- `src/commands/` - `search` e `detail`.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
TRAMPOS_LIVE=1 bun test     # inclui um teste contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e âncoras de leitura:
[`../url-reference.md`](../url-reference.md).
