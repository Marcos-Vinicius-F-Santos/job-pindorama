# /notion-sync - Enviar vagas pontuadas e candidaturas para um banco de dados do Notion

Você vai publicar uma **visão só de leitura** da busca de emprego no espaço do Notion da pessoa: uma linha de banco de dados por vaga, com uma página detalhada para cada vaga da lista final. Os arquivos do repositório continuam sendo o registro oficial — `job_scraper/seen_jobs.json` é dono das vagas coletadas e pontuadas, e `job_search_tracker.csv` é dono das candidaturas. O Notion é uma camada de apresentação descartável por cima deles; nada volta de lá.

Este comando exige o **servidor MCP do Notion** (OAuth). Ele lê o estado, insere ou atualiza páginas e para — nunca pontua, candidata nem edita arquivos do repositório. O Notion é a integração de referência que vem no projeto; o contrato de sincronização em si independe de ferramenta (veja "Adaptando para outra ferramenta" no fim — só as duas seções marcadas *(integração Notion)* são específicas da ferramenta).

## Raia: `/html-report` × `/notion-sync`

Os dois apresentam os mesmos dados do tracker; servem a momentos diferentes. O `/html-report` é a **raia de revisão profunda**: um painel offline autossuficiente com gráficos e tabela filtrável, gerado de novo na sua mesa. O `/notion-sync` é a **raia de olhada rápida**: o estado atual do funil, acessível onde o Notion rodar (computador, web, celular). Eles se somam em vez de competir — depois que o `/outcome` registrar um resultado, rode um ou os dois de novo para atualizar as visões.

Siga estes passos **na ordem**.

---

## Passo 0: Interpretar a entrada

`$ARGUMENTS` pode conter:

- Nada → sincroniza vagas pontuadas com nota ≥ 60 (Good Fit para cima) mais todas as candidaturas registradas
- `--min-score <N>` → muda o limite de nota
- `--all` → sincroniza toda vaga pontuada, qualquer que seja a nota
- `--rebuild` → coleta de novo e reescreve também o corpo das páginas (veja o Passo 5 — normalmente o corpo é escrito uma vez só)

---

## Passo 1: Checar a conexão *(integração Notion)*

O comando é **opcional em silêncio**: quando o destino não está acessível, o resultado é uma mensagem clara e uma saída limpa — nada mais no projeto percebe que este comando existe.

1. Confira se as ferramentas MCP do Notion estão disponíveis nesta sessão (nomes de ferramenta começando com `mcp__notion__` ou parecido). Determine isso **só** pela lista de ferramentas da própria sessão — nunca rodando comandos de shell como `claude mcp list`, que interromperiam a pessoa com um pedido de permissão antes da saída elegante. Se as ferramentas não estiverem disponíveis, pare e diga à pessoa como conectar:
   > O MCP do Notion não está conectado. Rode `claude mcp add --transport http notion https://mcp.notion.com/mcp`, depois abra uma **sessão nova** (servidores acrescentados no meio da sessão só entram ao reiniciar), rode `/mcp` lá para concluir o login OAuth e rode `/notion-sync` de novo.
2. Verifique a conexão com uma chamada barata (ex.: uma busca no espaço de trabalho). Erro de autenticação → diga à pessoa para autenticar de novo via `/mcp` e pare. Nunca tente de novo em loop.
3. O servidor MCP do Notion é autenticado de forma interativa, então "conectado, mas sem como autenticar agora" (OAuth vencido, contexto sem interface ou de CI onde o login não roda) recebe a mesma saída elegante que "não configurado": diga o motivo numa linha e pare. Isso inclui o estado configurado-mas-não-autenticado, em que o servidor expõe só o aperto de mão de autenticação e nenhuma ferramenta de dados — **nunca inicie o fluxo OAuth por este comando e nunca pergunte se deve autenticar agora**; a única linha aponta para o `/mcp` e o comando termina ali. Autenticar é um passo da pessoa, feito fora deste comando.

---

## Passo 2: Montar o conjunto de sincronização (só dados locais — nenhuma chamada externa ainda)

Valide a pré-condição local e barata antes de criar qualquer coisa externa. Uma execução sem nada a sincronizar precisa sair com **zero efeitos colaterais** — nenhum banco de dados criado, nenhum arquivo de estado gravado.

1. Leia `job_scraper/seen_jobs.json` e `job_search_tracker.csv` (qualquer um pode não existir).
2. Selecione as entradas de `job_scraper/seen_jobs.json` com status `ranked` cuja `rank_score` atinge o limite do Passo 0. O `--all` tira o limite.
3. Toda linha do tracker entra no conjunto de sincronização (uma vaga a que a pessoa se candidatou sempre sincroniza, pontuada ou não), associadas às entradas de `job_scraper/seen_jobs.json` sem diferenciar maiúsculas por empresa + título sempre que possível (a coluna `role` do tracker contra o campo `title` da entrada — as entradas têm `title`, não `role`). Linhas do tracker sem entrada em `job_scraper/seen_jobs.json` também sincronizam — monte a Chave delas como `<company>_<role>` em minúsculas com sublinhados.
4. Entradas de `job_scraper/seen_jobs.json` com status `expired` entram no conjunto de sincronização, qualquer que seja a nota, como candidatas só a atualização. Uma entrada escolhida só por estar `expired` e sem linha correspondente no tracker (uma "entrada só-encerrada") pode atualizar uma página existente, mas nunca cria página nem escreve corpo. Se existir uma linha correspondente no tracker, ela continua sendo um item comum da sincronização e vale a precedência de status do tracker.
5. **Precedência de status:** o tracker vence. Uma vaga `ranked` em `job_scraper/seen_jobs.json` mas `interview` no tracker sincroniza como `interview`. Vagas só em `job_scraper/seen_jobs.json` mantêm o status gravado. **Precedência de prazo: o tracker também vence** — o `deadline` do tracker (gravado pelo `/apply` a partir da vaga em que a candidatura foi de fato montada) prevalece sobre o valor de `job_scraper/seen_jobs.json`; vagas só em `job_scraper/seen_jobs.json` mantêm o prazo gravado pelo `/scrape`. Omita a propriedade quando nenhum dos dois informar, e **nunca concilie os dois escolhendo a data mais cedo ou mais tarde** — os dois foram lidos da vaga em momentos diferentes, e o `min()` de aparência segura troca por uma data contra a qual a pessoa nunca se candidatou.
6. **Se o conjunto de sincronização estiver vazio** (nenhuma entrada pontuada atinge o limite e não há linhas no tracker), diga "Nada para sincronizar — rode `/scrape` e `/rank` primeiro" (ou, quando houver vagas mas todas abaixo do limite, diga isso e sugira `--min-score`/`--all`) e **pare**.
7. Informe as contagens antes de tocar o destino: quantas linhas serão criadas ou conferidas, e o limite em vigor.

---

## Passo 3: Carregar o estado da sincronização e localizar o banco de dados *(integração Notion)*

1. Leia `job_scraper/notion_sync.json`. Estrutura:
   ```json
   { "database_id": "...", "database_url": "...", "last_sync": "YYYY-MM-DD" }
   ```
2. Se existir, verifique se o id do banco de dados ainda existe no Notion. Se o banco foi apagado, trate como primeira execução.
3. **Primeira execução:** procure no espaço de trabalho um banco de dados chamado "Funil da busca de emprego". Se não existir e o conjunto de sincronização tiver só entradas só-encerradas (entradas de `job_scraper/seen_jobs.json` com status `expired` e sem linha correspondente no tracker), pare sem perguntar onde criar um banco de dados e sem criar o banco de dados nem gravar `job_scraper/notion_sync.json`: não há páginas existentes para atualizar. Caso contrário, se o banco não existir, pergunte à pessoa onde criá-lo (página de nível superior ou uma página existente que ela citar) e crie com exatamente estas propriedades:

   | Propriedade | Tipo | Valores / observações |
   |-------------|------|-----------------------|
   | Nome | title | `<Cargo> — <Empresa>` |
   | Empresa | rich text | |
   | Nota | number | 0-100, de `rank_score` |
   | Veredito | select | Strong Fit / Good Fit / Moderate Fit / Weak Fit / Poor Fit |
   | Status | select | `ranked` / `drafted` / `applied` / `interview` / `offer` / `hired` / `rejected` / `no_response` / `offer_declined` / `withdrawn` / `expired` — grafias canônicas do tracker segundo o **Vocabulário de status do tracker** do `/outcome`; as opções do Notion crescem à medida que os valores aparecem |
   | Encaixe | select | high / medium / low (avaliação rápida do `/scrape`) |
   | Prazo | date | coluna `deadline` do tracker, recorrendo ao `deadline` de `job_scraper/seen_jobs.json` quando a linha não tiver; omita quando nenhum dos dois informar |
   | Vista em | date | |
   | Pontuada em | date | `rank_date` de `job_scraper/seen_jobs.json`; omita quando não pontuada |
   | Candidatura em | date | coluna `date` do tracker; omita quando não estiver no tracker, e omita quando o status for `drafted` |
   | Canal | select | coluna `channel` do tracker (ex.: portal / email / indicação); as opções crescem à medida que os valores aparecem |
   | Arquivo do CV | rich text | coluna `cv_file` do tracker — só o nome do arquivo, nunca o conteúdo do documento |
   | Carta | rich text | coluna `cover_letter_file` do tracker — só o nome do arquivo, nunca o conteúdo do documento |
   | URL | url | URL da vaga |
   | Chave | rich text | a chave da vaga em `job_scraper/seen_jobs.json` — âncora de deduplicação, nunca editada à mão |

   As propriedades vindas do tracker (Candidatura em, Canal, Arquivo do CV, Carta) ficam vazias para vagas sem linha no tracker. Arquivo do CV e Carta são preenchidos quando o `/apply` registra o rascunho; Candidatura em fica vazia até o `/outcome` registrar o envio. Só nomes de arquivo sincronizam; o conteúdo dos documentos fica local.

4. **Banco de dados existente com propriedades faltando:** se o banco localizado for anterior a um acréscimo de esquema (uma propriedade da tabela acima não existe), acrescente as propriedades que faltam antes de inserir ou atualizar. Nunca remova nem mude o tipo de propriedades existentes.
5. Grave `job_scraper/notion_sync.json` com o id e a URL do banco de dados. Este arquivo é estado pessoal e é ignorado pelo git — nunca o versione.

---

## Passo 4: Inserir ou atualizar as linhas do banco

Para cada vaga do conjunto de sincronização:

1. Consulte o banco de dados por uma página cuja `Chave` seja igual à chave da vaga.
2. **Sem correspondência** → se a vaga for uma entrada só-encerrada, pule — não crie página nem escreva corpo. Caso contrário, crie a página com todas as propriedades da tabela do Passo 3 e depois escreva o corpo dela (Passo 5).
3. **Correspondência, entrada só-encerrada** → atualize **só o Status** para `expired`. Não atualize outras propriedades nem toque no corpo da página.
4. **Correspondência, qualquer outro status efetivo** → atualize **só as propriedades**: Status, Nota, Veredito, Prazo, Pontuada em, Candidatura em, Canal, Arquivo do CV, Carta. As propriedades são a superfície sempre atual (o corpo é escrito uma vez só), então as atualizações do tracker registradas pelo `/outcome` chegam ao destino exclusivamente por elas. Não toque no corpo da página — a pessoa pode ter acrescentado as próprias notas ali, e atropelá-las quebra a confiança na visão inteira. (O `--rebuild` é a única exceção para vagas que não estão encerradas.)
5. Nunca apague nem arquive páginas, mesmo de vagas que viraram `expired` — ponha o Status em `expired`. Linhas que a pessoa acrescentou à mão no banco (sem valor de `Chave`) são invisíveis para este comando.

**Normalize o valor de Status antes de gravar.** O tracker pode ter grafias antigas com espaço (`no response`, `offer declined`) de antes de as formas canônicas serem fixadas. Converta-as em `no_response` / `offer_declined` segundo o **Vocabulário de status do tracker** do `/outcome` antes de definir o Status ao criar ou atualizar — nunca envie uma forma com espaço ao Notion, o que criaria automaticamente uma opção de seleção separada para cada string única. Opções com espaço já existentes num banco simplesmente ficam sem uso; o Notion nunca remove opções de seleção sozinho.

Respeite o ritmo do servidor: se o MCP limitar as requisições, recue e continue; informe qualquer página que falhou em vez de tentar indefinidamente.

---

## Passo 5: Escrever a página de detalhe (só páginas novas)

O corpo da página é o que faz uma linha valer o clique. Monte-o **só a partir de dados gravados e de conteúdo de fato coletado**:

1. Nunca escreva nem refaça o corpo de uma entrada só-encerrada, nem mesmo com `--rebuild`. O Passo 4 pula uma entrada só-encerrada quando não existe página correspondente.
2. **Resumo de encaixe** - uma seção curta com campos de `job_scraper/seen_jobs.json`: nota, veredito, nível de encaixe rápido, datas de primeira vista e de pontuação. Se a vaga estiver no tracker, acrescente a linha do tempo da candidatura (data da candidatura, canal, status atual, notas com data da coluna `notes`) e cite os documentos enviados de `cv_file`/`cover_letter_file` (só os nomes de arquivo — os documentos em si nunca sincronizam). **Quando o status for `drafted`, escreva "rascunhada em AAAA-MM-DD, ainda não enviada" no lugar da data da candidatura, e chame os arquivos de rascunhos, não de documentos enviados** — candidaturas ainda não enviadas não têm documentos enviados (o corpo é escrito uma vez só — Passo 4.4).
3. **A vaga** - colete a URL da vaga com o WebFetch (para a Gupy, o `detail` da CLI `gupy-search`) e escreva um resumo legível: o que é a vaga, os principais requisitos, os detalhes práticos (local, prazo, regime, salário se informado). Antes, tente de novo um 403 com cabeçalhos de navegador conforme `.claude/skills/job-application-assistant/09-web-research.md`. Se a coleta continuar falhando ou redirecionar para uma página de listagem, escreva "Vaga não está mais disponível (conferido em AAAA-MM-DD)" — **nunca reconstrua uma vaga de memória**.
4. **Links** - a URL da vaga; derive `<company>_<role>` pela regra de **nomes de subpasta** de `documents/README.md` e, se esse arquivo existir localmente, cite o caminho (em texto simples — o destino não consegue apontar para o sistema de arquivos).

Mantenha a página com menos de ~40 blocos; é um resumo, não um espelho da vaga.

---

## Passo 6: Relatório

```
## Sincronização do funil - AAAA-MM-DD

Banco de dados: <database_url>
Sincronizei <N> vagas (limite: nota ≥ <T>): <C> criadas, <U> atualizadas, <S> sem mudança, <F> com falha.

| | Vaga | Empresa | Status | Nota |
|---|------|---------|--------|------|
| ✚ | ... | ... | ranked | 78 |
| ↻ | ... | ... | interview | 71 |
```

Liste as falhas com o erro e a sugestão de rodar de novo — a inserção/atualização é idempotente, então uma nova execução só mexe no que falhou. Atualize `last_sync` no arquivo de estado da sincronização.

Lembre à pessoa uma vez (só na primeira execução): os arquivos do repositório continuam sendo a fonte da verdade — edições feitas no destino nunca voltam, e o `/outcome` continua sendo como os resultados das candidaturas são registrados.

---

## Regras importantes

1. **Mão única, sempre.** O conteúdo do destino nunca volta para `job_scraper/seen_jobs.json`, para o tracker nem para nenhum arquivo do repositório. Este comando lê o estado do repositório e grava no destino — os dois arquivos do repositório são só leitura para ele, e o arquivo de estado da sincronização, ignorado pelo git, é a **única** gravação local.
2. **Inserção/atualização idempotente pela `Chave`.** Rodar de novo não cria nada duas vezes; a correspondência é pela chave gravada, nunca por comparação aproximada de título.
3. **O corpo das páginas é escrito uma vez só.** As atualizações de propriedades mantêm as linhas atuais; o corpo pertence à pessoa depois de criado. Só o `--rebuild` pode reescrevê-lo, e avisa antes de fazer.
4. **Nunca invente.** Uma URL de vaga morta recebe uma nota explícita de "indisponível", não uma reconstrução. Toda afirmação da página vem do estado gravado ou de conteúdo coletado.
5. **Só dados de vagas.** O perfil da pessoa, as notas comportamentais e o método de avaliação nunca sincronizam — isto é uma visão do funil, não uma exportação do perfil.
6. **Documentos nunca saem da máquina.** Currículos e cartas sincronizam **só como nomes de arquivo** — nunca envie, anexe nem incorpore os documentos em si, nem versões em HTML ou texto do conteúdo deles, no destino. O repositório local e o arquivo `documents/applications/` são a única casa dos documentos de candidatura; a página da linha os cita para a pessoa saber o que abrir localmente.

---

## Adaptando para outra ferramenta (forks)

O contrato de sincronização independe de ferramenta; só as duas seções marcadas *(integração Notion)* são específicas. Um fork que mire outro destino (Airtable, Google Sheets, Linear...) mantém os Passos 0, 2, 4, 5 e 6 e todas as Regras importantes sem mudança — monta o mesmo conjunto de sincronização, insere/atualiza pela mesma `Chave`, mantém o corpo escrito uma vez só e os documentos locais — e troca só:

- **Passo 1** (checar a conexão) pelo servidor MCP ou pela checagem de acesso da ferramenta de destino, mantendo o padrão de opcional em silêncio: não configurado ou sem como autenticar terminam os dois numa mensagem e numa saída limpa
- **Passo 3** (localizar/criar o banco de dados) pelo contêiner equivalente na ferramenta de destino, usando a mesma tabela de propriedades e um arquivo de estado da sincronização com outro nome

Como as skills de portal, integrações com outras ferramentas além desta referência do Notion vivem em forks, onde quem as mantém pode testá-las contra um espaço de trabalho real.
