# remotar-cli

CLI para buscar vagas remotas na [Remotar](https://remotar.com.br). Sem autenticação e sem
dependências de execução: só `bun`.

**Uso pessoal:** os termos da Remotar proíbem acesso automatizado; veja o aviso em
[`../SKILL.md`](../SKILL.md).

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "product manager" --category produto --no-international --format table
bun run src/cli.ts detail 166921 --format plain
bun run src/cli.ts --help
```

## Código

- `src/helpers.ts` - base comum às CLIs de portal brasileiras (coleta, erros, texto,
  JobPosting, saídas); igual em `solides-search`, `vagas-search` e `infojobs-search`.
- `src/parse.ts` - o que é específico da Remotar: URL da API, categorias, leitura da vaga.
- `src/commands/` - `search` e `detail`, que juntam os dois.

## Testes

```bash
bun run typecheck
bun test                     # simulados, sem rede (é o que o CI roda)
REMOTAR_LIVE=1 bun test      # inclui um teste contra o portal real
```

Rotas, parâmetros e campos: [`../url-reference.md`](../url-reference.md).
