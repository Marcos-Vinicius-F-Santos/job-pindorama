---
name: gupy-search
version: 1.0.0
description: >
  Busca vagas abertas no Portal Gupy (portal.gupy.io), o maior ATS do Brasil, onde
  milhares de empresas publicam suas vagas, ou lê o detalhe de uma vaga da Gupy.
  Filtra por cidade, estado (UF), modelo de trabalho (remoto, híbrido, presencial) e
  regime de contratação (CLT, PJ, estágio, trainee e outros). Frases de ativação:
  buscar vagas, procurar emprego, vagas abertas, vagas na Gupy, vagas CLT, vagas PJ,
  vagas de estágio, vagas remotas no Brasil, "tem vaga de <cargo> em <cidade>?",
  ler esta vaga da Gupy. English: search Brazilian jobs, Gupy job search, jobs in
  Brazil, look up this gupy.io posting.
context: fork
enabled: true  # false mantém o portal instalado, mas o /scrape passa a pular ele
allowed-tools: Bash(bun run .agents/skills/gupy-search/cli/src/cli.ts *)
---

# Busca na Gupy

Busca vagas no **[Portal Gupy](https://portal.gupy.io)**, o agregador público das vagas
que as empresas publicam no ATS da Gupy. Cobre empresas de todos os portes e setores no
Brasil inteiro, não só tecnologia. Sem login, sem chave de API e **sem dependências de
execução**: roda só com `bun`.

- **Busca:** a rota JSON que a própria página de busca do portal usa.
- **Detalhe:** a página pública da vaga, no subdomínio da empresa
  (`https://<empresa>.gupy.io/jobs/<id>`).

O `robots.txt` do portal libera tudo, e o das páginas de empresa libera `/jobs`. Mesmo
assim, **use com moderação**: poucas buscas por rodada, nada de varredura em massa.

## Comandos

### `search`

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "<cargo>" [filtros] [--format json|table|plain]
```

| Opção | Descrição |
|-------|-----------|
| `--query`, `-q` | Cargo ou palavra-chave (**obrigatório**). A Gupy busca no título da vaga. |
| `--location`, `-l` | Cidade, ex. `"Recife"`, `"São Paulo"`. |
| `--state` | Estado: sigla (`SP`) ou nome (`São Paulo`, com ou sem acento). |
| `--remote` | `remoto`, `hibrido` ou `presencial` (também `remote`/`hybrid`/`onsite`). `--remote` sozinho = remoto. |
| `--type` | Regime: `clt`, `pj`, `estagio`, `trainee`, `aprendiz`, `temporario`, `terceiro`, `autonomo`, `freelancer`, `intermitente`, `associado`, `docente`, `voluntario`, `banco-de-talentos`, `summer-job`. |
| `--jobage` | Só vagas publicadas nos últimos N dias (filtro feito pela CLI, veja Observações). |
| `--page` | Página, começando em 1. |
| `--limit`, `-n` | Vagas por página, de 1 a 100. Padrão 25. |
| `--format` | `json` (padrão), `table` ou `plain`. |
| `--no-description` | Omite o resumo da descrição (saída mais enxuta para triagem). |

**Um valor por filtro.** A Gupy ignora em silêncio listas em `--type` e `--remote` e
devolve a busca sem filtro nenhum, então a CLI recusa vírgulas nesses campos. Para CLT
**e** PJ, faça duas buscas.

### `detail`

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts detail <url-da-vaga> [--format json|plain]
```

Recebe a URL da vaga, em qualquer das duas formas:

- `https://empresa.gupy.io/jobs/12749301` (canônica, a que a busca devolve em `url`)
- `https://empresa.gupy.io/job/eyJqb2JJZCI6...` (a forma que o portal usa nos links)

**Só o número não basta:** a página da vaga fica no subdomínio da empresa. Devolve
descrição, responsabilidades, requisitos, informações adicionais (onde as empresas
costumam listar benefícios), endereço, prazo de inscrição, regime e as etapas do
processo seletivo.

## Exemplos

```bash
# Analista de dados no estado de São Paulo
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "analista de dados" --state SP --format table

# Desenvolvimento remoto como PJ, publicadas na última semana
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "desenvolvedor" --remote --type pj --jobage 7 --format table

# Engenharia em Recife, só CLT
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "engenheiro" -l "Recife" --type clt --format table

# Estágios em Minas Gerais
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "estágio" --type estagio --state MG --format table

# Vagas híbridas em Porto Alegre, segunda página
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "analista financeiro" -l "Porto Alegre" --remote hibrido --page 2 --format table

# Detalhe completo de uma vaga
bun run .agents/skills/gupy-search/cli/src/cli.ts detail https://afya.gupy.io/jobs/12749301 --format plain
```

## Formatos de saída

| Formato | Para quê |
|---------|----------|
| `json` | Padrão: uso por programa (é o que o `/scrape` lê) |
| `table` | Olhar rápido |
| `plain` | Ler uma vaga inteira (`detail`) |

A busca em JSON sai como `{ "meta": { "count", "page", "total" }, "results": [...] }`.
Cada resultado traz os campos do contrato de portais (`id`, `title`, `company`,
`location`, `date`, `url`, com `null` quando faltar) e mais:

| Campo | Conteúdo |
|-------|----------|
| `deadline` | Prazo de inscrição, `AAAA-MM-DD` |
| `contract` | Regime legível: `CLT (efetivo)`, `PJ (pessoa jurídica)`, `Estágio`... |
| `contract_code` | Código bruto da Gupy (`vacancy_type_effective`, `vacancy_legal_entity`...) |
| `workplace_type` | `remote`, `hybrid` ou `on-site` |
| `city`, `state` | Cidade e estado por extenso |
| `pcd` | `true` quando a vaga é afirmativa para pessoas com deficiência |
| `description` | Resumo da descrição (a busca traz um trecho; o `detail` traz tudo) |

Erros vão para o **stderr** como `{ "error": "...", "code": "..." }`, com código de saída `1`.

## Observações

- **Regime vem pronto.** `contract` diz se a vaga é CLT, PJ, estágio etc., o que alimenta
  a comparação CLT × PJ da avaliação de vagas. Vaga sem regime informado vem `null`.
- **Sem filtro de data no portal.** A busca já vem da vaga mais nova para a mais antiga;
  `--jobage` descarta do lado da CLI o que for mais velho. Por isso uma página com
  `--jobage` pode vir com menos itens que o `--limit`.
- **`total` é aproximado.** Em termos muito amplos a Gupy às vezes informa um total
  arredondado (ex.: 100). Use para ter ideia de volume, não como contagem exata.
- **Salário quase nunca aparece.** A Gupy não tem campo de salário; quando a empresa
  informa, está no texto da descrição ou em "informações adicionais".
- **Vagas remotas vêm sem cidade.** `location` mostra `Remoto`.
- Vagas encerradas somem do portal: um `detail` em vaga fechada devolve `NOT_FOUND`.
- Tentativas automáticas com espera crescente em 429/5xx; falha de conexão encerra
  rápido, com mensagem clara, para não travar o `/scrape`.
- Detalhes técnicos das rotas e campos: [`url-reference.md`](url-reference.md).
