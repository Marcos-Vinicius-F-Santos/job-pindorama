# Buscas para a busca de vagas

<!-- SETUP: personalize estas buscas com as suas competências, os cargos desejados e o local -->

## CLIs de portal instaladas (principais para o `/scrape`)

O `/scrape` descobre cada skill de portal em `.agents/skills/*/SKILL.md` e roda a CLI dela primeiro. O projeto já vem com o `gupy-search` (Portal Gupy, o maior ATS do Brasil), com `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search` (outros portais brasileiros e de tecnologia; InfoJobs, Remotar, Trampos, Robert Half e PCD Online só para uso pessoal, veja o SKILL.md de cada um) e com as CLIs que funcionam em qualquer país, `linkedin-search` e `freehire-search`; qualquer skill que você acrescentar com o `/add-portal` entra do mesmo jeito. Você **não** precisa de uma linha `site:` abaixo para essas CLIs rodarem.

As buscas com `site:` deste arquivo são o **plano B pelo WebSearch** — para portais sem CLI, páginas de carreira de empresas, ou quando uma CLI falha.

**Idiomas das buscas:** escreva cada categoria em todos os idiomas da tabela de Idiomas do CLAUDE.md. No Brasil, vale escrever os cargos em português **e** no título em inglês que o mercado usa (muitas vagas de tecnologia anunciam "Data Engineer", "Product Manager", "Software Engineer" mesmo em português). Uma vaga que exige, como condição do trabalho, um idioma que você *não* declarou é excluída antes da pontuação; uma vaga que pede um nível *mais alto* que o declarado num idioma em que você trabalha é sinalizada para você decidir, não excluída — veja o filtro de idioma (Language Gate) do `04-job-evaluation.md`, a fonte única desta regra. Traduza as palavras-chave de cada categoria com naturalidade, sem tradução literal palavra por palavra (ex.: "Frontend Developer" -> "Desenvolvedor Frontend").

## Sites de busca

Principais (CLIs instaladas):
- **Gupy** (`gupy-search`) — portal.gupy.io; filtre por `--state` (UF), `--location` (cidade), `--remote` e `--type` (clt, pj, estagio...)
- **linkedin.com/jobs** (`linkedin-search`) — vagas do LinkedIn (filtro: [YOUR_COUNTRY] / [YOUR_CITY])
- **freehire.me** (`freehire-search`) — agregador focado em tecnologia; use `--country BR` ou `--region latam`
- **Sólides Vagas** (`solides-search`) — empresas pequenas e médias; filtre por `--remote`, `--type` e `--seniority`
- **VAGAS.com** (`vagas-search`) — generalista; `--remote` = 100% home office
- **InfoJobs** (`infojobs-search`) — generalista, com salário no cartão; uso pessoal, volume baixo
- **Remotar** (`remotar-search`) — só vagas remotas; use `--category` (ex.: `produto`) e `--no-international`; uso pessoal, volume baixo
- **Greenhouse** (`greenhouse-search`) — empresas de tecnologia; a lista de empresas fica em `.agents/skills/greenhouse-search/boards.txt`
- **Programathor** (`programathor-search`) e **GeekHunter** (`geekhunter-search`) — tecnologia; o Programathor busca por tecnologia (`-q python`)
- **Michael Page** (`michaelpage-search`) — gestão e especialistas
- **Robert Half** (`roberthalf-search`), **Trampos** (`trampos-search`), **PCD Online** (`pcd-search`, só vagas exclusivas PcD) — uso pessoal, volume baixo
- **Agrobase** (`agrobase-search`) — agronegócio; busque por profissão (`--profession agronomo`, `veterinario`, `zootecnista`...)
- **AGROSearch** (`agrosearch-search`) — vagas da consultoria do agronegócio (poucas dezenas; sem `-q` lista todas)
- **DigAÍ** (`digai-search`) — empresas que recrutam com entrevista por IA (Raízen, Localiza, Afya, Hapvida, Stefanini...); a lista de empresas fica em `.agents/skills/digai-search/companies.txt`, e cada empresa devolve até 12 vagas por busca

Plano B pelo WebSearch (portais brasileiros sem CLI; crie uma com `/add-portal` se usar muito):
- **catho.com.br** — Catho, generalista
- **br.indeed.com** — Indeed Brasil, agregador
- **[YOUR_INDUSTRY_JOB_BOARD]** — um portal de nicho da sua área (opcional)

Secundário (páginas de carreira de empresas pelo Google):
- Buscas diretas no Google com filtros `site:` para empresas-alvo conhecidas (muitas usam páginas `<empresa>.gupy.io` ou `<empresa>.vagas.solides.com.br`)

## Categorias de busca

As buscas são agrupadas por prioridade. Escreva **cada categoria em todos os idiomas da sua tabela de Idiomas** (veja "Idiomas das buscas" acima). Combine cada busca com os termos de local (cidade, UF, região metropolitana) quando o site permitir.

**Organize por função, não por cargo.** O mesmo trabalho tem títulos diferentes em empresas diferentes (uma vaga de "Cientista de Dados" numa empresa pode aparecer como "Analista de Inteligência" ou "Consultor de Dados" em outra). Dê a cada categoria o nome da função que ela cobre e liste vários títulos plausíveis como variantes dentro dela, em vez de apostar uma faixa de prioridade inteira num único título exato. Lembre que vagas brasileiras costumam trazer o nível no título (júnior, pleno, sênior, "Jr", "Pl", "Sr").

### Prioridade 1: [YOUR_PRIMARY_ROLE_TYPE]

Combinam com a sua direção de carreira mais forte e mais desejada.

```
gupy-search: -q "[YOUR_PRIMARY_JOB_TITLE_1]" --state [YOUR_REGION]
gupy-search: -q "[YOUR_PRIMARY_JOB_TITLE_2]" --state [YOUR_REGION]
site:catho.com.br "[YOUR_PRIMARY_JOB_TITLE_1]" [YOUR_CITY]
site:linkedin.com/jobs "[YOUR_PRIMARY_JOB_TITLE_1]" [YOUR_COUNTRY]
```

### Prioridade 2: [YOUR_DOMAIN_EXPERTISE]

Combinam com o seu conhecimento de domínio.

```
gupy-search: -q "[YOUR_DOMAIN_KEYWORD_1]" --state [YOUR_REGION]
site:catho.com.br [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY] OR [YOUR_REGION]
site:linkedin.com/jobs [YOUR_DOMAIN_KEYWORD_2] [YOUR_CITY] [YOUR_COUNTRY]
```

### Prioridade 3: [YOUR_ADJACENT_ROLE_TYPE]

Cargos vizinhos para onde você poderia migrar.

```
gupy-search: -q "[YOUR_ADJACENT_TITLE_1]" --state [YOUR_REGION]
site:catho.com.br "[YOUR_ADJACENT_TITLE_2]" [YOUR_KEY_SKILL] [YOUR_CITY]
```

### Prioridade 4: Técnico / consultoria mais amplo

Rede maior para vagas técnicas gerais.

```
gupy-search: -q "[YOUR_KEY_SKILL]" --remote
site:linkedin.com/jobs "[YOUR_KEY_SKILL]" [YOUR_CITY]
site:br.indeed.com "consultor técnico" [YOUR_DOMAIN] [YOUR_CITY]
```

## Filtro de local

Ao avaliar os resultados, confira se o local da vaga está a uma distância razoável de casa. Defina as áreas aceitáveis:
- [YOUR_CITY] e arredores
- [ACCEPTABLE_AREA_1]
- [ACCEPTABLE_AREA_2]
- [BORDERLINE_AREA] (limite — ~X min de transporte público)
- [TOO_FAR_AREA] (longe demais)

Vagas remotas valem para qualquer lugar, **exceto** quando a vaga exige morar num estado ou cidade específicos ("remoto, residir em SP").

## Filtro de idioma

Os seus idiomas de trabalho e níveis estão na tabela de Idiomas do CLAUDE.md. Ao filtrar resultados coletados, aplique o filtro de idioma (Language Gate) do `04-job-evaluation.md`: uma vaga que exige um idioma que você não declarou de forma nenhuma é excluída; uma vaga que pede um nível mais alto que o declarado num idioma em que você trabalha não é excluída, e sim sinalizada com clareza (veja o Passo 3 "Avaliação rápida de encaixe" do `job-scraper/SKILL.md` para como o sinal aparece na saída do `/scrape`). Vagas só *escritas* num idioma em que você não trabalha, mas que não o exigem no dia a dia, tudo bem.

## Filtro de regime

Se o CLAUDE.md lista um regime como deal-breaker (ex.: "não aceita PJ"), use `--type clt` na Gupy e marque como encaixe baixo as vagas desse regime vindas de outros portais.

## Filtro de data

Inclua só vagas publicadas nos últimos 14 dias, ou com prazo de inscrição ainda não vencido. Se a data de publicação não puder ser determinada, inclua, mas sinalize como "data desconhecida".

## Adaptando as buscas

Se a pessoa indicar uma área de foco, escolha as buscas da categoria correspondente e gere também 2 ou 3 buscas sob medida para esse foco. Por exemplo:
- "/scrape [area_de_foco]" -> buscas da categoria relevante + buscas sob medida para o foco
