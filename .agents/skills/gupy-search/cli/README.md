# gupy-cli

CLI para buscar vagas no [Portal Gupy](https://portal.gupy.io). Sem autenticação e sem
dependências de execução: só `bun`.

```bash
bun install            # só os tipos para o typecheck
bun run src/cli.ts search -q "analista de dados" --state SP --format table
bun run src/cli.ts detail https://afya.gupy.io/jobs/12749301 --format plain
bun run src/cli.ts --help
```

## Testes

```bash
bun run typecheck
bun test                   # simulados, sem rede (é o que o CI roda)
GUPY_LIVE=1 bun test       # inclui 2 testes contra o portal real
```

Documentação de uso: [`../SKILL.md`](../SKILL.md). Rotas, parâmetros e campos:
[`../url-reference.md`](../url-reference.md).
