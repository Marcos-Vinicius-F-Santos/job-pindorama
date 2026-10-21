# /reset - Apagar os dados do perfil

Você vai devolver partes do projeto a um estado em branco, para a pessoa recomeçar do zero com o `/setup`.

**Este comando é destrutivo.** Nada é apagado até a pessoa confirmar explicitamente. Siga estes passos exatamente na ordem.

---

## Passo 0: Ler o escopo nos argumentos

Procure em `$ARGUMENTS` uma palavra de escopo:

- `profile` — apaga os dados do perfil só dos arquivos de skill
- `documents` — apaga só os arquivos que a pessoa colocou na pasta `documents/`
- `all` — as duas coisas acima

Se `$ARGUMENTS` estiver vazio ou não tiver uma palavra de escopo reconhecida, pergunte:

> **O que você quer apagar?**
>
> - **`profile`** — Apaga os dados da pessoa dos arquivos de skill (perfil, perfil comportamental, exemplos STAR, resumos profissionais, critérios de avaliação personalizados, buscas de vagas). A estrutura do projeto, o método de pontuação e as regras de escrita são preservados. Use para rodar o `/setup` do zero.
>
> - **`documents`** — Apaga todos os arquivos que você colocou na pasta `documents/` (currículos em PDF, exportação do LinkedIn, diplomas, cartas de recomendação, resumos de projetos, vagas coladas, candidaturas anteriores). A estrutura de pastas e o `README.md` são preservados.
>
> - **`all`** — As duas coisas acima.
>
> Responda com `profile`, `documents` ou `all`.

Espere a resposta antes de continuar.

---

## Passo 1: Mostrar exatamente o que será apagado

Antes de qualquer coisa, mostre à pessoa precisamente o que vai ser apagado.

### If scope includes `profile`:

(Se o escopo inclui `profile`.) Leia o estado atual destes arquivos e diga se cada um tem conteúdo ou já está vazio:

- `.claude/skills/job-application-assistant/01-candidate-profile.md`
- `.claude/skills/job-application-assistant/02-behavioral-profile.md`
- `.claude/skills/job-application-assistant/04-job-evaluation.md` *(só as áreas de competência personalizadas, os objetivos de carreira e as restrições de momento de vida — o método de pontuação é preservado)*
- `.claude/skills/job-application-assistant/05-cv-templates.md` *(só a seção de resumos profissionais e o bloco de contato dentro do modelo LaTeX — a estrutura é preservada)*
- `.claude/skills/job-application-assistant/06-cover-letter-templates.md` *(só a linha de contato e a assinatura dentro do modelo LaTeX — a estrutura é preservada)*
- `.claude/skills/job-application-assistant/07-interview-prep.md` *(só as seções de exemplos STAR e de candidatos a STAR — a estrutura é preservada)*
- `.claude/skills/job-scraper/search-queries.md` *(só cargos, palavras-chave de domínio e termos de local — a estrutura das buscas é preservada)*

Esta lista precisa acompanhar o que o Passo 3 do `/setup` preenche: todo arquivo de skill em que ele grava dados da pessoa é apagado aqui.

Apresente assim:

```
## O reset do perfil vai apagar:

- 01-candidate-profile.md — [tem conteúdo / já está vazio]
  O arquivo inteiro será trocado por um modelo em branco.

- 02-behavioral-profile.md — [tem conteúdo / já está vazio]
  O arquivo inteiro será trocado por um modelo em branco.

- 04-job-evaluation.md — [tem critérios personalizados / já está em branco]
  As suas áreas de competência, objetivos de carreira, tarefas que dão e tiram energia e
  restrições de momento de vida voltam aos marcadores. O método de pontuação (dimensões,
  faixas de nota, pesos, filtro de idioma, regime CLT × PJ, checklist de pesquisa) é preservado.

- 05-cv-templates.md — [tem resumos ou dados de contato / já está em branco]
  Os modelos de resumo profissional serão apagados e o bloco de contato do modelo LaTeX volta aos marcadores. A estrutura LaTeX e as orientações de personalização são preservadas.

- 06-cover-letter-templates.md — [tem dados de contato / já está em branco]
  A linha de contato e a assinatura do modelo LaTeX voltam aos marcadores. A estrutura da carta, os padrões de abertura e as fórmulas de fechamento são preservados.

- 07-interview-prep.md — [tem exemplos STAR / já está em branco]
  Os exemplos STAR e eventuais esboços de candidatos a STAR serão apagados. O método, as perguntas difíceis e as orientações de simulação são preservados.

- job-scraper/search-queries.md — [tem buscas personalizadas / já está em branco]
  Os seus portais de nicho, cargos, palavras-chave de domínio, cidade e faixas de
  deslocamento voltam aos marcadores. A estrutura das buscas e as seções de filtro são preservadas.

The following files are NOT touched (they contain framework rules, not candidate data):
  - 03-writing-style.md
(Estes arquivos NÃO são alterados: têm regras do projeto, não dados da pessoa.)

Fora do escopo do perfil, ainda com os seus dados pessoais: CLAUDE.md e
cv/main_example.tex. Este escopo cobre só os arquivos de skill.
```

### If scope includes `documents`:

(Se o escopo inclui `documents`.) Use o Glob para listar todos os arquivos em `documents/cv/`, `documents/linkedin/`, `documents/diplomas/`, `documents/references/`, `documents/projects/`, `documents/postings/` e `documents/applications/`.

Inclua no inventário as entradas aninhadas e ocultas da pessoa. O `.gitkeep` rastreado de cada subpasta é um marcador de estrutura: tire-o da lista de exclusão e da decisão de vazio/não vazio, e preserve-o.

Apresente assim:

```
## O reset de documentos vai apagar:

documents/cv/
  - [arquivo] ou "(vazia)"

documents/linkedin/
  - [arquivo] ou "(vazia)"

documents/diplomas/
  - [arquivo] ou "(vazia)"

documents/references/
  - [arquivo] ou "(vazia)"

documents/projects/
  - [arquivo] ou "(vazia)"

documents/postings/
  - [arquivo] ou "(vazia)"

documents/applications/
  - [subpasta/arquivo] ou "(vazia)"

documents/README.md — NÃO é apagado (arquivo de instruções)
```

Se todas as subpastas de documentos já estiverem vazias, diga "Todas as subpastas de documentos já estão vazias — nada a apagar." e pule a confirmação para este escopo.

---

## Passo 2: Exigir confirmação explícita

Mostre o pedido de confirmação:

> **Isto não pode ser desfeito.**
>
> Digite **`RESET`** (em maiúsculas) para confirmar, ou qualquer outra coisa para cancelar.

Espere a resposta.

- Se a pessoa digitar exatamente `RESET`: siga para o Passo 3.
- Se digitar qualquer outra coisa: aborte e diga "Reset cancelado. Nada foi alterado."

---

## Passo 3: Executar o reset

### Profile reset

(Reset do perfil.) Todo arquivo de skill em `.claude/skills/job-application-assistant/` começa com um bloco de frontmatter `---` que traz o marcador `framework_version`. Esse marcador é dado do projeto, não da pessoa: `tools/check_framework_version.py` reprova um arquivo sem ele, e `tools/check_upstream_updates.py` não consegue comparar o arquivo com o upstream. Nunca o remova nem reescreva — as duas trocas de arquivo inteiro abaixo o mantêm e trocam só o que vem depois.

**For `01-candidate-profile.md`** (para o `01-candidate-profile.md`), mantenha o bloco de frontmatter `---` exatamente como está e troque tudo abaixo dele por:

```markdown
# Perfil da pessoa candidata

<!-- Rode o /setup para preencher este arquivo -->

## Identidade

### Idiomas

| Idioma | Nível | Observações |
|--------|-------|-------------|

## Formação

## Experiência profissional

## Projetos independentes

## Competências técnicas

## Publicações

## Prêmios

## Referências
```

**For `02-behavioral-profile.md`** (para o `02-behavioral-profile.md`), mantenha o bloco de frontmatter `---` exatamente como está e troque tudo abaixo dele por:

```markdown
# Perfil comportamental

<!-- Rode o /setup para preencher este arquivo -->

## Visão geral

## Motivadores comportamentais centrais

## Comportamentos mais fortes

## Como você trabalha melhor

## Pontos de desenvolvimento (apresente de forma positiva nas candidaturas)

## Correspondência com a linguagem das vagas

## Estilos de gestão preferidos

## Como usar nas candidaturas
```

**For `04-job-evaluation.md`** (para o `04-job-evaluation.md`), devolva aos marcadores os valores que o Passo 3.4 do `/setup` personalizou, sem tocar em nenhuma linha ao redor:

| Linha a restaurar | Marcador |
|---|---|
| `**Áreas fortes:**` | `[YOUR_PRIMARY_SKILLS]` |
| `**Áreas medianas:**` | `[YOUR_SECONDARY_SKILLS]` |
| `**Áreas fracas:**` | `[SKILLS_YOU_LACK]` |
| `**Forte:**` (Experiência) | `[YOUR_DIRECT_EXPERIENCE_DOMAINS]` |
| `**Mediana:**` (Experiência) | `[YOUR_ADJACENT_EXPERIENCE]` |
| `**Iniciante:**` (Experiência) | `[ROLES_WITH_LIMITED_EXPERIENCE]` |
| os três tópicos de `**Objetivos de carreira:**` | `[YOUR_CAREER_GOAL_1]`, `[YOUR_CAREER_GOAL_2]`, `[YOUR_CAREER_GOAL_3]` |
| `- Tarefas que dão energia:` | `[YOUR_ENERGIZING_TASKS]` |
| `- Tarefas que drenam:` | `[YOUR_DRAINING_TASKS]` |
| `- **Segurança:**` | `[YOUR_FINANCIAL_SITUATION_CONTEXT]` |
| `- **Flexibilidade:**` | `[YOUR_SCHEDULE_CONSTRAINTS]` |
| `- **Desenvolvimento profissional:**` | `[YOUR_GROWTH_PRIORITIES]` |

Remova também qualquer seção `## Calibração com candidaturas anteriores`, que o Caminho A do `/setup` grava a partir dos resultados das candidaturas da própria pessoa.

Deixe intacto o resto do `04-job-evaluation.md`: as dimensões de pontuação e as faixas de nota, os pesos, o filtro de idioma, o filtro de elegibilidade, a seção de regime CLT × PJ, os sinais de golpe, as orientações de alerta, o checklist de pesquisa da empresa e o esquema do cache, e a seção de referência salarial. Se o Passo 3.4 do `/setup` passar a personalizar algum valor fora da tabela acima, acrescente-o aqui também.

**For `05-cv-templates.md`** (para o `05-cv-templates.md`), localize a seção que começa com a linha `**Crie 2 ou 3 modelos de resumo para os seus principais tipos de vaga:**` e vai até o fim dos blocos de modelo por tipo de vaga, incluindo os resumos marcados com *[Used for: <company>_<role>]* que o Caminho A do `/setup` extraiu de candidaturas arquivadas. Pare antes do parágrafo que começa com "Resumos marcados" — ele é orientação do projeto, não dado da pessoa. Troque só essa seção por:

```markdown
**Crie 2 ou 3 modelos de resumo para os seus principais tipos de vaga:**

<!-- SETUP: preenchidos com base na sua trajetória -->
```

Depois devolva aos marcadores o bloco de contato dentro do modelo LaTeX do arquivo: `\name{[FIRST_NAME]}{[LAST_NAME]}`, `\address{[YOUR_ADDRESS]}{}{}`, `\phone[mobile]{[YOUR_PHONE]}`, `\email{[YOUR_EMAIL]}`, o `[YOUR_LINKEDIN_URL]` e o `[YOUR_GITHUB_URL]` da linha `\extrainfo{...}`, e o `[YOUR_NAME]` do `pdftitle`. Deixe intacto todo o resto do `05-cv-templates.md`.

**For `06-cover-letter-templates.md`** (para o `06-cover-letter-templates.md`), devolva aos marcadores a linha de contato e a assinatura dentro do modelo LaTeX do arquivo: a linha `\namesection{}` vira `\namesection{}{\Huge{[YOUR_NAME]}}{  \href{mailto:[YOUR_EMAIL]}{[YOUR_EMAIL]} | [YOUR_PHONE] |  \urlstyle{same}\href{[YOUR_LINKEDIN_URL]}{LinkedIn}` e `\signature{...}` vira `\signature{[YOUR_NAME]}`. Deixe intacto todo o resto do `06-cover-letter-templates.md` — a estrutura da carta, os padrões de abertura e as fórmulas de fechamento são do projeto, não da pessoa. Se o Passo 3.6 do `/setup` passar a personalizar algo além dessas duas linhas, acrescente aqui também.

**For `07-interview-prep.md`** (para o `07-interview-prep.md`), localize e remova:
- A seção `## Exemplos STAR prontos` inteira e todos os exemplos STAR numerados dentro dela
- Qualquer seção `## Candidatos a STAR (completar à mão)` acrescentada pelo Caminho A do `/setup`

Troque por:

```markdown
## Exemplos STAR prontos

<!-- Rode o /setup para preencher os exemplos STAR com a sua experiência real -->
```

Deixe intacto todo o resto do `07-interview-prep.md` (explicação do formato STAR, etapas do processo seletivo, perguntas difíceis, perguntas para fazer a quem entrevista, dicas para vídeo e telefone, etiqueta de acompanhamento, orientações de simulação).

**For `.claude/skills/job-scraper/search-queries.md`** (para o `search-queries.md`), devolva aos marcadores os valores que o Passo 3.9 do `/setup` personalizou:

- **Sites de busca**: o portal de nicho de volta a `[YOUR_INDUSTRY_JOB_BOARD]`, e o filtro do LinkedIn de volta a `[YOUR_COUNTRY]` / `[YOUR_CITY]`. Os portais fixos do projeto (Gupy, Sólides, VAGAS.com, InfoJobs, Remotar, Greenhouse, Programathor, GeekHunter, Michael Page, Robert Half, Trampos, PCD Online, Agrobase, AGROSearch, DigAÍ, e Catho e Indeed Brasil no plano B) ficam.
- **Categorias de busca**: os quatro títulos de prioridade de volta a `[YOUR_PRIMARY_ROLE_TYPE]`, `[YOUR_DOMAIN_EXPERTISE]`, `[YOUR_ADJACENT_ROLE_TYPE]` e `Técnico / consultoria mais amplo`; dentro dos blocos de busca, cargos, competências e termos de domínio de volta a `[YOUR_PRIMARY_JOB_TITLE_1]`, `[YOUR_PRIMARY_JOB_TITLE_2]`, `[YOUR_ADJACENT_TITLE_1]`, `[YOUR_ADJACENT_TITLE_2]`, `[YOUR_KEY_SKILL]`, `[YOUR_DOMAIN_KEYWORD_1]`, `[YOUR_DOMAIN_KEYWORD_2]`, `[YOUR_DOMAIN]`, e os termos de local de volta a `[YOUR_CITY]`, `[YOUR_COUNTRY]`, `[YOUR_REGION]`.
- **Filtro de local**: as faixas de deslocamento de volta a `[YOUR_CITY]`, `[ACCEPTABLE_AREA_1]`, `[ACCEPTABLE_AREA_2]`, `[BORDERLINE_AREA]`, `[TOO_FAR_AREA]`.
- Remova categorias de prioridade extras ou duplicatas traduzidas que o `/setup` tenha acrescentado além das quatro faixas que vêm no projeto.

Deixe intacto o resto do arquivo: a explicação das CLIs de portal e do plano B pelo WebSearch, a nota de idiomas das buscas, a orientação "organize por função, não por cargo" e as seções de filtro de idioma, de regime, de data e de adaptação das buscas.

### Documents reset

(Reset de documentos.) Para cada subpasta de documentos não vazia, apague todas as entradas da pessoa, incluindo pastas aninhadas e arquivos ocultos. Preserve as sete subpastas de primeiro nível, os marcadores `.gitkeep` delas e o `documents/README.md`. Rode o bloco Bash abaixo só depois da confirmação acima; as configurações de glob ficam dentro do subshell. Se `documents/` ou alguma das sete raízes for um link simbólico (symbolic link), pare antes de apagar qualquer coisa e peça à pessoa para trocar essa raiz por uma pasta local de documentos.

```bash
(
  set -e
  for directory in documents documents/{cv,linkedin,diplomas,references,projects,postings,applications}; do
    if [ -L "$directory" ]; then
      printf 'Reset interrompido: %s é um link simbólico (symbolic link).\n' "$directory" >&2
      exit 1
    fi
  done
  unset GLOBIGNORE
  shopt -s dotglob nullglob
  for directory in documents/cv documents/linkedin documents/diplomas documents/references documents/projects documents/postings documents/applications; do
    for entry in "$directory"/*; do
      if [ "${entry##*/}" != ".gitkeep" ]; then
        rm -rf -- "$entry"
      fi
    done
  done
)
```

---

## Passo 4: Confirmar o que foi feito e próximos passos

Depois do reset, informe:

```
## Reset concluído

### Apagado
[Liste cada arquivo ou pasta de fato modificado ou apagado]

### Sem alteração
[Liste o que já estava vazio ou foi preservado de propósito]
```

Depois diga à pessoa o que fazer conforme o que foi apagado:

**Se o perfil foi apagado:**
> Os arquivos de skill agora estão em branco. Rode o `/setup` para preenchê-los de novo. O comando detecta sozinho os arquivos na sua pasta `documents/` e oferece ler de lá; senão, conduz uma importação de currículo ou uma entrevista.
>
> Lembre que o `CLAUDE.md` e o `cv/main_example.tex` ficam fora do escopo `profile` e ainda guardam os seus dados pessoais. Se for passar este fork adiante ou torná-lo público, apague-os à mão.

**Se os documentos foram apagados:**
> Os seus documentos foram apagados. A estrutura de pastas, os marcadores `.gitkeep` e o `documents/README.md` foram preservados. Acrescente os seus documentos de carreira e rode o `/setup` para preencher o perfil.

**Se os dois foram apagados:**
> Os dados do perfil e os seus documentos foram apagados; as pastas de documentos, os marcadores `.gitkeep` e o `documents/README.md` foram preservados. Acrescente documentos em `documents/` (ou pule e use a importação de currículo ou a entrevista) e rode o `/setup`.
