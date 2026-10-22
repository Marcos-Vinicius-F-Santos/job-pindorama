---
name: scrape
description: >
  Encontra vagas novas compatíveis com o seu perfil pelas CLIs de busca de portais
  instaladas (Gupy, Sólides, VAGAS.com, InfoJobs, Remotar, Greenhouse, Programathor,
  GeekHunter, Michael Page, Robert Half, Trampos, PCD Online, Agrobase, AGROSearch, DigAÍ,
  Empregos.com.br, LinkedIn, freehire e qualquer portal acrescentado com /add-portal).
  Deduplica entre execuções. Ativa com: buscar vagas, procurar vagas, vagas novas,
  tem vaga nova?, rodar a busca, varrer portais, /scrape. English: job scrape,
  find jobs, search jobs, new jobs.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(bun --version), Bash(python tools/job_key.py:*), Bash(python3 tools/job_key.py:*), Bash(python tools/scrape_run.py:*), Bash(python3 tools/scrape_run.py:*), Bash(python tools/posting_signals.py:*), Bash(python3 tools/posting_signals.py:*), WebFetch, WebSearch, Agent, AskUserQuestion
---

# Busca de vagas

---

## Como funciona

Esta skill busca vagas nos portais usando as **CLIs de busca de portais instaladas** em
`.agents/skills/` (mais o WebSearch como plano B), com as buscas do seu perfil.
Deduplica contra vagas já vistas e contra o tracker de candidaturas, e apresenta as
vagas novas com uma avaliação rápida de encaixe.

## Como acionar

A pessoa aciona esta skill dizendo coisas como:
- "Busque vagas novas"
- "Roda a busca de vagas"
- "Tem vaga nova?"
- "/scrape"

Argumentos opcionais:
- Uma área de foco, ex.: "/scrape ciência de dados" ou "/scrape geofísica"
- "broad" para rodar todas as categorias de busca, ex.: "/scrape broad"
- "health" para rodar só a checagem de saúde dos portais (Passo 4.75), sem buscar, deduplicar nem apresentar vagas — ex.: "/scrape health", ou "/scrape health gupy" para testar um portal mesmo desligado

---

## Passos de execução

### Atalho: `tools/scrape_run.py` faz a parte mecânica

Os Passos 1b, 2 (deduplicação e sinais do texto, em lote) e 4 abaixo são a especificação; o
`tools/scrape_run.py` os executa do mesmo jeito em toda rodada, sem scripts improvisados:

```bash
python3 tools/scrape_run.py search --out "$SCRATCHPAD/scrape.json"        # prioridades 1-3; --all para todas, --priority 1,2
python3 tools/scrape_run.py record --in "$SCRATCHPAD/classificadas.json"   # Passo 4, depois de você dar o encaixe
```

- `search` lê as linhas `<portal>-search: <args>` das seções "### Prioridade N" de
  `search-queries.md` (pula linhas com marcadores `[YOUR_...]`), roda cada portal ligado com
  `--jobage 14` (ou o da própria linha) e `--format json`, descarta o que já foi visto (por URL
  ou empresa+título, no `job_scraper/seen_jobs.json` e no `job_search_tracker.csv`), junta a
  mesma vaga vista em dois portais (`also_on`) e anexa a cada vaga nova os `signals` do
  `tools/posting_signals.py`, com a `Senioridade-alvo` do CLAUDE.md. O resumo impresso traz o
  que o Passo 4.75 e o Passo 5 precisam: buscas e resultados por portal, erros, portais com
  zero resultados, portais pulados (`enabled: false`) e linhas de portal não instalado.
- Você continua fazendo o que exige julgamento: o `detail` com `posting_signals` no texto
  completo das vagas promissoras (Passo 2), o encaixe (Passo 3) e a apresentação (Passo 5).
- `record` recebe a lista com `fit` (`high`/`medium`/`low`) e, se quiser, `status` em cada
  vaga, e grava no `job_scraper/seen_jobs.json` com a chave do `tools/job_key.py` e os campos do
  esquema do Passo 4. Nunca sobrescreve uma entrada existente.
- O arquivo do `search` é conteúdo de terceiros: fica fora do repositório (scratchpad ou pasta
  temporária); a ferramenta recusa um `--out` dentro dele.

### Passo 0: Carregar o estado

1. Leia `job_scraper/seen_jobs.json` (crie se não existir — comece com `{"seen": {}}`)
2. Leia `job_search_tracker.csv` para extrair as empresas+cargos a que a pessoa já se candidatou
3. Leia `search-queries.md` (nesta pasta) para a estratégia de busca

### Passo 1: Buscar

Leia `search-queries.md` (nesta pasta) para a estratégia de busca. Por padrão, rode as 3 categorias de maior prioridade. Se a pessoa disse "broad", rode todas. Se indicou uma área de foco (ex.: "ciência de dados"), priorize as buscas dessa categoria.

**Use as CLIs instaladas como mecanismo principal de busca.** Recorra ao `WebSearch` só para portais sem skill de CLI, ou se o `bun` não estiver disponível no sistema.

#### 1a. Conferir se o bun está disponível

```bash
bun --version
```

Se falhar (bun não instalado), pule para **1c (WebSearch como plano B)** para todos os portais e registre o plano B na saída do Passo 5.

#### 1b. Rodar as CLIs (principal — em paralelo sempre que possível)

Descubra todas as skills de CLI de portal instaladas lendo cada `SKILL.md` em `.agents/skills/*/SKILL.md`. Cada arquivo documenta as opções exatas e exemplos de uso da CLI daquele portal. **Use a interface documentada de cada portal — não chute opções.** Assim, qualquer portal novo acrescentado pelo `/add-portal` entra automaticamente, sem mudar este arquivo.

**Respeite a chave `enabled`.** Um portal está ligado a menos que o frontmatter do `SKILL.md` dele defina `enabled: false` (sem a chave, está ligado — o padrão). Pule cada portal desligado e registre-o para o resumo do Passo 5. Assim, um fork pode manter um portal instalado e deixá-lo de fora de uma rodada sem apagar a pasta.

Para cada skill de portal **ligada**:

1. Leia o `SKILL.md` dela para achar a chamada `bun run …` correta e as opções suportadas.
2. Traduza os termos de busca de `search-queries.md` para o formato de opções daquele portal (ex.: `--query`, `--location`, `--state`, `--type`, códigos de filtro — o que o SKILL.md do portal especificar). Na Gupy, use `--state` com a UF e, se o perfil disser, `--type clt` ou `--type pj` e `--remote`.
3. Limite aos últimos 14 dias com o **filtro** de data que o portal suporta (`--jobage`, `--since <YYYY-MM-DD>` etc. — conforme documentado em cada portal). Um portal **sem filtro de data** também é limitado: a saída de busca de todo portal traz o campo `date`, então filtre do lado do cliente — descarte, depois que a chamada voltar, os resultados com `date` de mais de 14 dias, e nunca invente uma opção que o SKILL.md do portal não documenta (as CLIs rejeitam opções desconhecidas). Uma opção de ordenação por data é só ordenação, e ordenação não é filtro — combiná-la com `--limit` é uma aproximação aceitável num portal que não oferece nada melhor, mas aplique o filtro de data do lado do cliente por cima mesmo assim.
4. Limite a ~20 resultados por chamada com a opção de limite do portal.
5. Use `--format json` para saída legível por máquina.

Rode as chamadas de CLI em paralelo sempre que possível, com a ferramenta Agent. Junte todos os arrays `results` num único conjunto para o Passo 2, mantendo cada resultado marcado com a skill de portal de origem (para as consultas `detail` do Passo 2).

Se uma CLI sair com código diferente de zero, registre a mensagem de erro e siga — não aborte a busca inteira.

#### 1c. WebSearch como plano B

Use o `WebSearch` para:
- Portais listados em `search-queries.md` que **não** têm pasta correspondente em `.agents/skills/` (no Brasil: Catho, Indeed Brasil, Trampos e outros)
- Qualquer portal cuja CLI falhe na execução
- Quando o bun não estiver disponível (o Passo 1a falhou)

Use as buscas com `site:` de `search-queries.md` diretamente como consultas do WebSearch para esses portais.

Marque cada resultado do plano B como vindo do WebSearch, mantendo a marca do portal quando o plano B substitui um portal instalado cuja CLI falhou. O Passo 4 grava isso como o `source` da entrada, e o Passo 5 informa quais portais rodaram no plano B nesta execução.

### Passo 2: Coletar e interpretar

Para cada resultado promissor do Passo 1:

**De resultados de CLI:** A saída da busca já traz title, company, location, date e URL.
Para vagas que merecem um olhar mais atento, obtenha o detalhe completo com o comando
`detail` daquele portal (veja o SKILL.md dele — não chute opções) para extrair os
**principais requisitos**, o **prazo de inscrição**, o **regime** (CLT, PJ, estágio) e um
trecho curto da descrição. Na Gupy, a própria busca já traz `contract` (o regime) e `deadline`.

**Detecção de vaga encerrada na origem:** o `linkedin-search detail` também devolve `isActive`.
`false` significa que a própria página da vaga mostra o aviso do LinkedIn "Não aceita mais
candidaturas" — a vaga morreu entre ser indexada e ser coletada (URLs vencidas do LinkedIn
redirecionam para *vagas parecidas ainda ativas*, então um resultado de busca pode ser um
fantasma). Marque essa vaga, nunca a descarte em silêncio: grave a entrada dela em
`job_scraper/seen_jobs.json` no Passo 4 com `"status": "expired"` e deixe-a fora da
apresentação do Passo 5 — uma entrada ausente parece igual a uma vaga nunca vista, e o status
gravado é o que torna um relato de fantasma autoexplicativo depois. `isActive: true` é só a
ausência daquele aviso, não prova de que a vaga está aberta; prazos e URLs mortas continuam
sendo trabalho do `/rank`. Na Gupy, uma vaga encerrada faz o `detail` devolver `NOT_FOUND`.

**De resultados do WebSearch:** use `WebFetch` na URL da vaga e extraia os mesmos campos à mão.
Se devolver HTTP 403, tente de novo com cabeçalhos de navegador via `python3 tools/fetch_page.py`
conforme `.claude/skills/job-application-assistant/09-web-research.md` antes de desistir — a
maioria dos sites de bancos e empresas rejeita o user agent do WebFetch enquanto serve
navegadores normalmente.

**Grave uma URL que de fato leve à vaga.** Uma URL de página de listagem com um `#fragmento`
no fim (`.../jobs/ciso/#ikerian`) não é uma vaga: carrega sem erro e devolve títulos sem relação,
o que faz toda execução posterior do `/rank` e do `/apply` falhar naquela entrada. Quando o
WebSearch só achar uma página de listagem, procure a vaga no site de carreiras da própria
empresa e grave essa URL, ou descarte a candidata em vez de salvar um link com fragmento.

Para cada candidata:
- Pule se a URL corresponder a qualquer entrada existente em `job_scraper/seen_jobs.json`, qualquer
  que seja a chave dela. Isso preserva a continuidade da deduplicação para vagas gravadas com
  a regra de chave anterior ao helper, enquanto as entradas novas usam a chave canônica do Passo 4.
- Senão, pule se a combinação empresa+título já existir em `job_scraper/seen_jobs.json`
- Pule se a empresa+cargo já aparecer em `job_search_tracker.csv`

#### Sinais do texto da vaga (obrigatório antes do Passo 3)

**O rótulo do portal não é prova.** Na Gupy, uma vaga marcada "Remoto" pode dizer no próprio
texto "atuação híbrida (4x presenciais)" em outra cidade; no LinkedIn, o filtro `--remote` deixa
passar vagas com "Híbrido" no título; uma vaga pode ser seleção interna, só para quem já é da
empresa. O `tools/posting_signals.py` lê o texto e aponta esses casos, citando o trecho:

1. **Em lote, sobre os resultados da busca** (título, trecho de descrição e o campo de senioridade do portal), com a
   faixa de senioridade da pessoa (linha `Senioridade-alvo` do CLAUDE.md, em códigos
   `estagio,junior,pleno,senior,especialista,staff,lead,gestao`; omita `--accept` se a linha
   não existir):
   ```bash
   python3 tools/posting_signals.py --batch "$SCRATCHPAD/resultados.json" --accept pleno,senior --json
   ```
   O arquivo é o array `results` juntado no Passo 1b, gravado no scratchpad da sessão.
2. **Sobre o texto completo** de toda vaga que chegaria ao Passo 5 com encaixe alto ou médio:
   o trecho da busca é curto e o modelo de trabalho costuma estar no fim da vaga
   ("Informações adicionais"). Passe a saída do `detail` por pipe:
   ```bash
   bun run .agents/skills/<portal>/cli/src/cli.ts detail '<URL>' --format plain | python3 tools/posting_signals.py --title "<título>"
   ```
   Para resultados do WebSearch, passe o texto obtido pelo `WebFetch` por um heredoc entre aspas.

O que cada sinal faz no Passo 3 está lá. A ferramenta aconselha; quem decide é o perfil.

### Passo 2.5: Detecção de vaga em massa (dentro desta execução)

Um padrão de distribuição que vale sinalizar à pessoa como cautela, não como acusação contra a empresa — descreve como o anúncio está sendo distribuído, não um veredito sobre a legitimidade da empresa. Sozinho, não prova que há algo errado (empresas contratam de fato o mesmo cargo em várias cidades); sinalize para a pessoa pesar ao decidir se investe tempo, sem rebaixar o encaixe nem excluir o resultado em silêncio por causa disso.

Se dois ou mais resultados do conjunto desta execução (da mesma empresa, ou com o mesmo código de requisição visível na URL ou no título) tiverem praticamente a mesma descrição e diferirem só em cidade, local ou título, não os apresente como linhas separadas. Junte numa linha só e registre a dispersão, ex.: "publicada igual em 6 cidades (SP, RJ, BH, POA, REC, CWB)". No Brasil, isso é comum em vagas de varejo, call center e bancos de talentos; vagas "Banco de talentos" (`vacancy_type_talent_pool` na Gupy) não são vagas abertas de fato — sinalize.

### Passo 3: Avaliação rápida de encaixe

Para cada vaga nova, faça uma checagem rápida (NÃO a avaliação completa de `04-job-evaluation.md` — só um sinal):

- **Alto**: a vaga envolve diretamente as suas competências centrais
- **Médio**: a vaga é vizinha da sua experiência
- **Baixo**: a vaga exige competências importantes que você não tem

**Sinais do texto da vaga** (do `posting_signals.py`, Passo 2), comparados com o perfil:
- **Modelo de trabalho** (`workplace`): `hybrid`, `onsite` ou `remote_restricted` numa região
  onde a pessoa não mora, para quem só aceita remoto ou está fora do raio de deslocamento, é
  deal-breaker de local: marque **Baixo** e cite o trecho. `remote_with_visits` não rebaixa:
  cite o trecho nos destaques para a pessoa pesar a frequência. Vale o texto, não o rótulo do portal.
- **Portais discordam** (`workplace_conflict`): a mesma vaga aparece como remota num portal e
  híbrida ou presencial em outro. Não apresente como remota: leia o texto (`detail` de um dos
  portais) e decida por ele; se o texto não disser, mostre a discordância nos destaques.
- **Seleção interna** (`internal`): marque **Baixo** e cite o trecho — quem não é da empresa não
  pode se candidatar.
- **Vaga exclusiva** (`affirmative_exclusive`): aplique o filtro de elegibilidade do
  `04-job-evaluation.md`; sem informação no perfil, mantenha o encaixe e sinalize nos destaques
  para a pessoa decidir.
- **Intermediário** (`intermediary`): não rebaixa por si; diga quem anuncia (agregador ou
  consultoria) e, num agregador, procure a vaga no site da própria empresa (passo 4 da escalada
  de `09-web-research.md`) antes de apresentar.
- **Senioridade** (`seniority_verdict: mismatch`): no máximo **Médio**, citando o nível do título
  ou, quando o título não diz, o do campo de senioridade do portal (`seniority_source: portal`).
  `unstated` não rebaixa.

**Regime:** se o perfil (deal-breakers no CLAUDE.md) diz que a pessoa não aceita PJ (ou outro regime) e a vaga traz esse regime, marque **Baixo** e cite o regime nos destaques.

**Prioridade do idioma:** antes de atribuir o nível de encaixe, confira a vaga contra o filtro de idioma (Language Gate) do `04-job-evaluation.md` (um idioma exigido que você não declarou de forma nenhuma na tabela de Idiomas do CLAUDE.md). Um idioma exigido totalmente não declarado prevalece sobre o encaixe de competências: marque **Baixo**, por melhor que seja o encaixe técnico, e cite-o nos tópicos de destaque para não ficar escondido sob um encaixe que parece bom. Um idioma **declarado** com exigência que parece acima do seu nível declarado *não* prevalece — avalie o encaixe normalmente, mas acrescente um tópico de alerta nos destaques daquela vaga (Passo 5), citando a exigência da vaga ao lado do seu nível declarado, para a diferença ficar visível sem rebaixamento automático.

### Passo 4: Deduplicar e gravar

1. Derive a chave de cada entrada com o helper, nunca transformando em slug na hora:

```bash
python3 tools/job_key.py --company "<company>" --title "<title>" --url "<url>"
```

Ele imprime uma linha: a chave canônica daquela vaga. A chave precisa ser uma função pura da vaga, porque duas execuções que geram slugs diferentes gravam a mesma vaga duas vezes e derrotam a deduplicação que este passo existe para garantir. O helper também limita o tamanho de títulos longos e desambigua o corte com um hash do slug completo, então um título cortado é estável entre execuções e dois títulos longos diferentes nunca colidem. `python3 tools/job_key.py --audit` informa as entradas de um arquivo de estado existente que são anteriores a esta regra; só informa, e nunca reescreve chaves, porque uma chave reescrita quebra a correspondência empresa+cargo do próprio tracker.

2. Acrescente TODAS as vagas coletadas (novas e puladas) em `job_scraper/seen_jobs.json` com a estrutura:
```json
{
  "seen": {
    "<key from tools/job_key.py>": {
      "title": "...",
      "company": "...",
      "url": "...",
      "first_seen": "YYYY-MM-DD",
      "posted_date": "YYYY-MM-DD" | null,
      "deadline": "YYYY-MM-DD" | null,
      "fit": "high/medium/low",
      "status": "new/skipped/ranked/expired/unreachable",
      "portal": "<skill de portal de origem, ex.: gupy-search>",
      "source": "cli/websearch"
    }
  }
}
```

O campo `portal` registra qual skill de CLI produziu a vaga (os resultados já vêm marcados por portal no Passo 1b — grave essa marca aqui). Entradas gravadas antes de este campo existir não o têm; a checagem de saúde (Passo 4.75) atribui essas entradas comparando o domínio da URL com a URL base de cada portal, então não preencha retroativamente.

O campo `source` registra qual mecanismo produziu a entrada: `cli` para a saída das CLIs de portal do Passo 1b, `websearch` para o plano B do Passo 1c. É isso que mantém um relato de vaga fantasma diagnosticável depois que o resumo da execução sumiu: uma entrada gravada cuja URL depois não leva a nada (ou leva a outra vaga) se lê de forma muito diferente se veio da saída ao vivo de uma CLI ou de um índice de busca que pode estar semanas desatualizado — e uma vaga apresentada sem entrada nenhuma aqui aponta para invenção, que a Regra 1 proíbe. Entradas gravadas antes de este campo existir não o têm; nunca preencha retroativamente — o mecanismo não foi registrado.

O `/rank` estende este esquema por acréscimo: entradas avaliadas também levam `rank_score` (nota geral de 0 a 100), `rank_verdict` (faixa de encaixe, ex.: "strong fit"), `rank_date` (data ISO da avaliação), os campos de veto `location_verdict` e `language_gate` (ambos PASS/FAIL/FLAG) com `language_note` (a exigência citada que explica um não-PASS) e `strengths`/`gaps` (1 a 3 tópicos literais cada, copiados dos achados do agente de pontuação). O campo `status` vira `"ranked"`. Não descarte nenhum desses campos ao regravar entradas. Entradas avaliadas antes de `strengths`/`gaps` existirem simplesmente não os têm; quem lê tolera a ausência e nunca preenche chutando. Entradas avaliadas antes da renomeação do veredito podem trazer uma string antiga PASS/FAIL/FLAG em `location` — leia isso como o veredito quando `location_verdict` estiver ausente; em entradas novas, `location` é sempre um lugar, nunca um veredito.

`deadline` é um campo de base, não uma extensão do `/rank`: a coleta de detalhe do Passo 2 já extrai o prazo de inscrição, então ele é gravado quando a vaga é vista pela primeira vez e atualizado pelo Passo 4 do `/rank` quando um agente de pontuação devolve um valor diferente. `null` significa que a vaga não informa prazo; uma chave ausente significa que a entrada é anterior a este campo — **nunca deduza um prazo** a partir de nenhum dos dois, e nunca preencha retroativamente chutando.

`posted_date` é a data de publicação da própria vaga, tirada do campo `date` que o contrato do Passo 2 já garante na saída de busca de toda CLI de portal. O Passo 1b usa essa data para limitar a execução aos últimos 14 dias e depois a descarta, então nada adiante consegue distinguir uma vaga publicada ontem de uma publicada há dois anos — `first_seen` é quando esta busca viu a entrada pela primeira vez, não quando a empresa publicou. Gravá-la torna a janela do Passo 1b auditável depois da execução e dá ao `/rank` um sinal de frescor para pesar, em vez de redescobrir a data e registrá-la em prosa que ninguém lê. Essa lacuna aconteceu de verdade: uma vaga do freehire-search de 13/05/2024 foi coletada e avaliada como Strong Fit na posição 1 de 133, com a própria nota de pontuação observando que o anúncio "pode estar velho há muito tempo", sem nada capaz de agir sobre isso. `null` significa que o portal não devolveu data para aquele resultado (as CLIs emitem `date: null` quando um anúncio omite); uma chave ausente significa que a entrada é anterior a este campo — **nunca deduza uma data de publicação** a partir de nenhum dos dois, e nunca preencha retroativamente chutando.

3. Apresente só as vagas que NÃO estão na lista de vistas (por URL ou
   empresa+título) nem no tracker.

### Passo 4.5: Gerar links de contato para indicação (só encaixe alto e médio)

Para cada vaga desta execução com `fit` **high** ou **medium** (pule as de encaixe baixo),
monte duas URLs de busca de pessoas no LinkedIn, para a pessoa achar alguém do recrutamento
ou do time e pedir uma indicação ou uma conversa. No Brasil, indicação interna pesa muito nos
processos. Isto é de propósito um passo que só gera links, não uma consulta automática: sem
raspagem, sem API de terceiros, sem dependências nem credenciais.

**A. Recrutamento / Talent Acquisition (o caminho da indicação)**
```
https://www.linkedin.com/search/results/people/?keywords=<url-encoded "<Company Name> recrutamento">&origin=GLOBAL_SEARCH_HEADER
```

**B. Pessoas da área ou do time (o caminho da conversa informativa)**
```
https://www.linkedin.com/search/results/people/?keywords=<url-encoded "<Company Name> <palavra do cargo>">&origin=GLOBAL_SEARCH_HEADER
```
Use uma palavra curta tirada do título da vaga para `<palavra do cargo>` — ex.: uma vaga
chamada "Gerente de Programa de IA" vira `"<Company Name> Gerente de Programa de IA"`.

Os dois links são para a pessoa abrir e navegar por conta própria — nunca colete ou raspe as
páginas de resultado da busca de pessoas do LinkedIn por programa. Nunca invente contatos nem
diga que uma pessoa específica foi encontrada; são links de busca, não resultados.

### Passo 4.75: Checagem de saúde dos portais

CLIs de portal baseadas em raspagem apodrecem em silêncio: quando um portal muda a marcação, o leitor geralmente sai com 0 e zero resultados, ou com campos nulos ou embaralhados, e o plano B do Passo 1c nunca dispara, porque só aciona em falha dura. Este passo pega isso com a evidência que a execução já tem.

**Passada grátis (sem pedidos extras).** Para cada portal ligado que rodou no Passo 1b:

- **Varredura de degradação:** examine os resultados que ele devolveu nesta execução. Sinais: `company` nulo ou vazio em todos os resultados, títulos vazios, entidades não decodificadas (`&amp;`) ou pedaços de HTML nos títulos, URLs que não apontam para o portal. Qualquer um deles significa que o leitor está meio funcionando e o `/scrape` está coletando lixo em silêncio.
- **Histórico de rendimento:** se o portal devolveu zero resultados em todas as buscas desta execução, veja se `job_scraper/seen_jobs.json` tem entradas anteriores dele (pelo campo `portal`, ou comparando domínios de URL nas entradas anteriores ao campo). Um portal que produziu vagas em execuções anteriores e agora não produz nada é suspeito — as mesmas buscas funcionavam antes.

**Escalada (limitada, só sob suspeita).** Um portal suspeito recebe **um** teste-sentinela: rode o `search` documentado com a busca de exemplo do próprio SKILL.md (essa busca comprovadamente funcionou quando a skill foi registrada), com a opção de limite do portal em 3, `--format json`. Se não devolver nada, tente **uma vez** com uma palavra comum. Só então o veredito é **quebrado**. Um 429 ou uma página de bloqueio **nunca** é evidência de quebra — registre o portal como **inconclusivo (limite de requisições)**, recue e não tente de novo.

**Vereditos.** Portais saudáveis ficam em silêncio — sem tabela, sem linha. Qualquer outra coisa aparece no resumo do Passo 5 como uma linha de saúde.

**Modo só teste (`/scrape health`).** Pule os Passos 1-4 e a passada grátis deste passo (não há execução nova para examinar); em vez disso, teste cada portal instalado diretamente — os ligados por padrão, um desligado só quando citado explicitamente (ex.: `/scrape health gupy`). Cada portal recebe o teste-sentinela acima, os critérios de degradação aplicados ao que devolver e — como a pessoa pediu explicitamente um diagnóstico — uma coleta `detail` no primeiro resultado de cada portal saudável (a descrição precisa ser texto legível e decodificado; uma falha rebaixa para degradado). Informe todos os status neste modo, inclusive os saudáveis. O volume continua limitado: uma busca, no máximo uma nova tentativa, no máximo um detalhe por portal.

### Passo 5: Apresentar os resultados

Apresente as vagas novas numa tabela ordenada por encaixe (alto primeiro). Quando o Passo 1b
pulou portais (`enabled: false`), informe-os com a linha `pulados (desligados):` abaixo,
para a escolha de deixar um de fora continuar visível, e não silenciosa; omita a linha quando
nada foi pulado. Quando os resultados de algum portal vieram do plano B do Passo 1c nesta
execução (bun indisponível, ou a CLI falhou na execução), informe com a linha
`plano B (websearch):` — resultados do plano B vêm de um índice de busca que pode estar
desatualizado, então quem lê deve saber quais linhas carregam essa ressalva;
omita a linha quando todo portal rodou a própria CLI. Quando o Passo 4.75 achou um portal degradado, quebrado
ou inconclusivo, acrescente uma linha `saúde:` por portal suspeito (portais saudáveis não ganham
linha); depois do relatório, ofereça pôr `enabled: false` naquele portal para o `/scrape` parar
de rodá-lo (e cobri-lo pelo plano B do Passo 1c) até ser consertado — só edite a chave com a
confirmação da pessoa, e nunca edite mais nada na skill.

```
## Vagas novas - AAAA-MM-DD

Encontrei X vagas novas (Y de encaixe alto, Z médio, W baixo).

pulados (desligados): <portal>, <portal>

plano B (websearch): <portal>, <portal>

saúde: <portal> - degradado (company nulo nos 12 resultados); âncoras de leitura em .agents/skills/<portal>/url-reference.md
saúde: <portal> - quebrado (0 resultados para a busca de teste do SKILL.md e para uma nova tentativa mais ampla); âncoras de leitura em .agents/skills/<portal>/url-reference.md

| # | Encaixe | Vaga | Empresa | Local | Regime | Prazo | URL |
|---|---------|------|---------|-------|--------|-------|-----|
| 1 | Alto | ... | ... | ... | CLT | ... | [Link](...) |

Se o Passo 2.5 sinalizou um padrão de vaga em massa, registre na célula Vaga (ex.: "Desenvolvedor Frontend (publicada em 6 cidades)") em vez de esconder. Faça o mesmo com um alerta de nível insuficiente num idioma declarado, do filtro de idioma (ex.: "Engenheiro Backend ⚠ exige inglês fluente") — os dois são sinais que a pessoa deve ver de relance, não só nos destaques abaixo.

### Destaques de encaixe alto
Para cada vaga de encaixe alto, acrescente 2 ou 3 tópicos:
- Por que combina com o seu perfil
- Principais requisitos a conferir
- Alertas (incluindo sinais de vaga em massa do Passo 2.5 e sinais de golpe do `04-job-evaluation.md`)

### Contatos
Para cada vaga de encaixe alto ou médio do Passo 4.5, acrescente um bloco curto de contatos com os
dois links de busca do LinkedIn:
- Link de busca de recrutamento, para o caminho da indicação
- Link de busca de pessoas da área/time, para o caminho da conversa informativa
```

Depois de apresentar, pergunte:
> "Quer que eu avalie alguma em detalhe? É só me dizer o(s) número(s)."

Se a pessoa escolher um número, acione o fluxo da skill **job-application-assistant** (avaliação de encaixe primeiro, depois currículo + carta se aprovado).

Se a execução achou muitas vagas novas (umas 8 ou mais), sugira também o `/rank` — ele pontua em lote todas as vagas novas com o método completo de avaliação e devolve uma lista final ordenada, o que é melhor que olhar uma tabela longa. (O `/rank` define os status `ranked`, `expired` e `unreachable` em `job_scraper/seen_jobs.json`; trate os três como já vistos para a deduplicação.)

### Passo 6: Atualizar o tracker (opcional)

Se a pessoa decidir se candidatar a alguma vaga, a linha do tracker é gravada pelo **Passo 3b da job-application-assistant**, para onde o Passo 5 já leva — não acrescente uma segunda linha aqui. Só quando a pessoa disser que se candidatou a algo fora desse caminho, acrescente uma linha usando o cabeçalho e a regra de procurar e depois atualizar do Passo 1 do `/outcome`.

---

## Regras importantes

1. **Nunca invente vagas.** Apresente só vagas vindas da saída real de search/detail das CLIs ou de resultados do WebSearch/WebFetch.
2. **Respeite a deduplicação.** Confira sempre job_scraper/seen_jobs.json E job_search_tracker.csv antes de apresentar.
3. **Foque na área geográfica configurada.** Pule vagas que exigem mudança de cidade ou que estão claramente fora do raio de deslocamento. Vagas "remotas" com exigência de morar em outro estado contam como fora.
4. **Só vagas abertas.** Pule vagas com prazo vencido ou marcadas como encerradas.
5. **Economize nas coletas de detalhe.** Não rode `detail` nem WebFetch em todo resultado de busca — pré-filtre pelo título e pelo trecho, e só colete as promissoras.
6. **Buscas em paralelo.** Rode as buscas das CLIs de portal em paralelo; use o WebSearch só para as lacunas que as CLIs não cobrem.
7. **Sem consultas automáticas de pessoas.** Contatos de indicação (Passo 4.5) são só links de busca do LinkedIn — nunca colete ou raspe páginas de resultado de busca de pessoas do LinkedIn por programa.
8. **Checagens de saúde são limitadas e honestas.** O Passo 4.75 gasta no máximo um teste, uma nova tentativa e (no modo `health`) uma coleta de detalhe por portal — um diagnóstico, não uma varredura. Um limite de requisições nunca é evidência de quebra. Vereditos de saúde vêm só da saída observada das CLIs; um portal que não pôde ser testado é informado como inconclusivo, nunca chutado. A chave `enabled` é a única coisa que a checagem de saúde pode editar, e só com confirmação.
9. **Sinalize padrões de distribuição, nunca acuse.** O sinal de vaga em massa (Passo 2.5) descreve como um anúncio está sendo distribuído, não afirma que a empresa é golpe. Nunca chame uma empresa de fraudulenta ou não confiável — apresente a observação e deixe a pessoa decidir.
