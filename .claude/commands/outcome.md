# /outcome - Registrar o resultado de uma candidatura

Você vai registrar o que aconteceu com uma candidatura: atualizações de andamento (convites para entrevista, etapas concluídas, propostas) e resoluções finais (contratação, recusa, falta de retorno). Os dados vão para dois lugares que o projeto já lê, mas que nada grava de forma sistemática:

- `job_search_tracker.csv` - a coluna de status que o `/scrape` e o `/rank` usam para deduplicar e excluir
- `documents/applications/<company>_<role>/` - o arquivo por candidatura (vaga, rascunhos enviados, `outcome.md`) que o Caminho A do `/setup` garimpa para calibrar o `04-job-evaluation.md` e revelar candidatos a STAR

O `/outcome` grava os dados; o `/setup` os interpreta. Este comando nunca edita o método de avaliação nem os arquivos de perfil.

O comando também cuida do trecho *anterior* a haver um resultado: o **ramo de follow-up** (Passo 2b) mostra candidaturas abertas que ficaram em silêncio, redige uma mensagem curta de acompanhamento na voz da pessoa e a registra — assim a cobrança e a resolução a que ela leva vivem num fluxo só.

Siga estes passos **na ordem**.

---

## Passo 0: Interpretar a entrada

`$ARGUMENTS` pode conter:

- Nada → liste as candidaturas abertas e pergunte qual atualizar
- Um nome de empresa (com o cargo, opcionalmente), ex.: `/outcome acme` ou `/outcome acme engenheiro de ml` → vá para essa candidatura
- `followup` → entre no ramo de follow-up (Passo 2b) com todas as candidaturas abertas em silêncio, usando o limite padrão de **10 dias**
- `followup <N>`, ex.: `/outcome followup 14` → ramo de follow-up com limite de N dias
- `followup <empresa>`, ex.: `/outcome followup acme` → redige agora um follow-up para essa candidatura, qualquer que seja o limite
- `stale` ou `sweep` → entre no ramo de limpeza de candidaturas paradas (Passo 2c) com as candidaturas abertas em silêncio há **60 dias ou mais**
- `stale <N>` ou `sweep <N>`, ex.: `/outcome stale 90` → ramo de limpeza com limite de N dias

---

## Passo 1: Carregar o estado e identificar a candidatura

1. Leia `job_search_tracker.csv`. Se não existir, crie com o cabeçalho padrão:
   ```
   date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source,deadline
   ```
   **Se o arquivo existir e o cabeçalho não terminar em `,deadline`, acrescente `,deadline` só à linha de cabeçalho** — nenhuma linha de dados é alterada. As linhas antigas passam então a ser lidas como prazo vazio. Esta é a única edição num tracker existente que este comando pode fazer fora de uma linha correspondente, e o "nunca reestruture o CSV" do Passo 4 vale para essa linha, não para esta linha de cabeçalho.
2. **Com argumento:** procure linhas sem diferenciar maiúsculas pela empresa (e pelo cargo, se informado). Uma correspondência → siga. Várias → liste e pergunte. Nenhuma → a candidatura foi feita fora do fluxo; peça à pessoa empresa, cargo, data da candidatura, canal e URL da vaga, e acrescente uma linha ao tracker.
3. **Sem argumento:** liste todas as linhas cujo status não é final (veja o **Vocabulário de status do tracker** abaixo) numa tabela numerada (empresa, cargo, data da candidatura, status atual, prazo, dias em silêncio, follow-ups enviados) e pergunte qual atualizar. As duas colunas derivadas saem direto dos dados existentes: **dias em silêncio** contam a partir da `date` da linha ou da entrada com data mais recente em `notes`, o que for mais recente; **follow-ups enviados** contam os marcadores `followed up YYYY-MM-DD` em `notes`. Se alguma linha aberta estiver há 10+ dias em silêncio com menos de dois follow-ups enviados, acrescente uma linha abaixo da tabela: "Algumas destas ficaram em silêncio — quer um rascunho de follow-up? (Passo 2b)". Se alguma linha aberta estiver há 60+ dias em silêncio, ofereça também: "Você tem candidaturas paradas há 60+ dias — rode `/outcome stale` para resolvê-las em lote (Passo 2c)." Se toda linha estiver resolvida, diga isso e pare.

   **Linhas `drafted` são listadas, mas nunca contam como em silêncio** — nada foi enviado, então ninguém está atrasado para responder. Liste-as sob um título próprio ("Rascunhadas, ainda não enviadas"), deixe **dias em silêncio** e **follow-ups enviados** em branco, e mantenha-as fora da oferta de follow-up acima.

   **Urgência de prazo é o único relógio que vale para uma linha rascunhada.** Mostre a coluna `deadline` quando a linha tiver um prazo e deixe em branco caso contrário. Marque um prazo nos próximos 7 dias com 🔥 e um já vencido com ⚠, com o mesmo limite de 7 dias que o Passo 3 do `/rank` usa, para os dois comandos nunca discordarem. Um prazo vencido numa linha `drafted` é exatamente a falha que esta coluna existe para pegar — documentos escritos, nunca enviados e agora impossíveis de enviar —, então cite-a numa linha abaixo da tabela, em vez de deixar a pessoa comparar datas. Isso não muda nada na oferta de follow-up: uma linha rascunhada nunca é cobrada, porque ninguém está atrasado para responder a algo que nunca foi enviado.

4. Derive o nome da pasta de arquivo: `documents/applications/<company>_<role>/`, pela regra de **nomes de subpasta** de `documents/README.md`. Confira se a pasta e um `outcome.md` já existem — se existirem, você está atualizando, não criando.

---

## Vocabulário de status do tracker

Grafias canônicas para a coluna `status` do CSV do tracker (sublinhado, nunca espaço):

`drafted` | `applied` | `interview` | `offer` | `hired` | `rejected` | `no_response` | `offer_declined` | `withdrawn`

- **Final** (candidatura encerrada): `hired`, `rejected`, `no_response`, `offer_declined`, `withdrawn`
- **Abertas**: todo o resto, `drafted` incluído — uma linha está ativa até o status ser um dos valores **Final**.
- **`drafted`** é aberta, mas diferente — nada foi enviado, então nunca há follow-up a fazer.
- Quem lê também precisa aceitar as grafias antigas com espaço `no response` e `offer declined`, para trackers existentes continuarem funcionando sem migração. Nunca as grave — são os mesmos valores de `no_response` e `offer_declined`, não status separados, igualmente **Final**, e toda regra que cita um vale para o outro.

Ao conversar, traduza à vontade: `applied` = candidatura enviada, `interview` = em entrevistas, `offer` = proposta recebida, `hired` = contratada(o), `rejected` = recusada, `no_response` = sem retorno, `offer_declined` = proposta recusada pela pessoa, `withdrawn` = desistência. Ao gravar, use sempre o código.

> Diferente do enum `Status:` do arquivo em `documents/README.md`
> (`in_progress` | `hired` | `offer_declined` | `rejected` | `no_response` | `interview_only`),
> que descreve o arquivo `outcome.md` por candidatura, não esta coluna. Os dois enums
> nunca são gravados no mesmo campo.

---

## Passo 2: Saber o que aconteceu

Pergunte à pessoa o que aconteceu e classifique:

**Atualizações de andamento** (candidatura ainda aberta):
- Convite para entrevista / etapa marcada ou concluída (triagem com RH, testes online, entrevista técnica, case, dinâmica de grupo, entrevista final)
- Proposta recebida (ainda não aceita nem recusada)

**Resoluções** (candidatura encerrada) — correspondem ao enum `Status:` do arquivo em `documents/README.md`, que o `/setup` lê (diferente da coluna do CSV do tracker; veja o **Vocabulário de status do tracker** acima):
- `hired` - aceitou uma proposta
- `offer_declined` - recebeu uma proposta e recusou
- `rejected` - recusa explícita em qualquer etapa (inclui o e-mail automático de "seguimos com outros perfis" da Gupy)
- `no_response` - sem retorno; se a pessoa estiver em dúvida sobre encerrar, diga há quanto tempo foi o último contato e deixe-a decidir — não imponha um prazo
- `interview_only` - chegou às entrevistas, mas o processo parou ou foi abandonado sem recusa explícita

Colete também, sem interrogar — uma ou duas perguntas abertas bastam:
- As datas das etapas alcançadas
- Qualquer devolutiva recebida, ao pé da letra se a pessoa lembrar
- O que faria diferente, e qualquer sinal do que a empresa valorizou (isso alimenta a calibração do `/setup` e a busca de candidatos a STAR, então concreto vale mais que bem escrito)

---

## Passo 2b: Ramo de follow-up (cobrar uma candidatura em silêncio)

Entre neste ramo pelo argumento `followup` (Passo 0) ou pela oferta abaixo da tabela de candidaturas abertas (Passo 1.3). A prática comum é um follow-up curto e educado de uma a duas semanas depois da candidatura, no máximo duas vezes; este ramo põe isso em prática.

**Candidatas.** Uma candidatura se qualifica quando o status não é nem final nem `drafted`, o limite já passou desde a `date` dela (ou desde o último marcador `followed up` em `notes`, se houver), e ela tem menos de **dois** follow-ups registrados. Leia as datas com cuidado — pule linhas cujas datas não fazem sentido e diga isso, em vez de chutar. Apresente as candidaturas qualificadas numa tabela (empresa, cargo, dias em silêncio, follow-ups enviados, canal, pessoa de contato) e redija só para as que a pessoa escolher.

**Limite.** O padrão de 10 dias é de propósito mais cedo que o alerta de 30 dias de abandono do `/gmail-sync` (o Passo 9 dele): aquela checagem é um alarme só de leitura de que uma linha foi totalmente esquecida; este ramo é o empurrão proativo enquanto uma resposta ainda é plausível. Os dois números servem a momentos diferentes, por isso diferem.

**Redação.** Para cada candidatura escolhida:

1. Leia a pasta de arquivo: o `job_posting.md`, o `cv_draft.tex` e o `cover_letter.tex` que o Passo 3 mantém são a fonte de **toda afirmação** que a mensagem pode fazer — é a Regra 3 (nunca inventar) ampliada para nenhuma afirmação nova: um follow-up que introduz competências ou experiências que os materiais enviados não contêm é um vetor de invenção.
2. Aplique as regras de `03-writing-style.md` (sem clichês, sem travessões, acolhedor mas direto, concordância de gênero conforme o perfil) e use o idioma da candidatura — tire o registro da carta arquivada.
3. Escreva umas **60 a 120 palavras**: dirija-se à `contact_person` do tracker se houver (senão, ao time, no idioma da candidatura, com saudação neutra); uma frase reafirmando o interesse na vaga específica; um lembrete concreto de valor tirado dos materiais enviados; uma pergunta educada sobre o prazo do processo. Sem pressão, sem enchimento do tipo "só passando para saber".
4. Adapte ao `channel`: e-mail (com assunto que reaproveita o título da candidatura), mensagem no LinkedIn (mais curta, sem assunto) ou mensagem no portal (texto simples). Na Gupy não há canal de mensagem direta: prefira o LinkedIn de quem recruta ou o e-mail, se houver.
5. Apresente o rascunho e ajuste até a pessoa ficar satisfeita.

**Registro.** Quando a pessoa confirmar que vai enviar (ou que enviou), registre na mesma rodada — um follow-up não registrado quebra a conta de dias em silêncio da próxima execução:

- Acrescente `followed up YYYY-MM-DD` à coluna `notes` da linha (vale a regra do Passo 4: acrescentar uma nota com data, nunca reestruturar o CSV).
- Salve a mensagem final como `followup_YYYY-MM-DD.md` na pasta de arquivo da candidatura. Seguro por convenção documentada: o `/setup` só lê os quatro arquivos citados do arquivo e ignora os extras (a mesma regra que cobre os arquivos de preparação do `/interview`), e `documents/applications/**` é dado pessoal ignorado pelo git.

Se a pessoa decidir não enviar, não registre nada.

**Encerramento.** Quando uma candidatura chega a dois follow-ups e continua em silêncio, não ofereça um terceiro. É o momento de continuar no Passo 2 deste mesmo comando: diga há quanto tempo foi o último contato e deixe a pessoa decidir se registra `no_response` — como sempre, sem prazo imposto. E se a pessoa mencionar uma resposta real enquanto está neste ramo (um convite para entrevista, uma recusa), saia do ramo e registre pelo fluxo normal do Passo 2.

---

## Passo 2c: Ramo de limpeza de paradas (resolver em lote candidaturas em silêncio)

Entre neste ramo pelo argumento `stale` ou `sweep` (Passo 0), ou pela sugestão abaixo da tabela de candidaturas abertas no Passo 1.3. Numa busca de emprego longa, candidaturas sem resposta se acumulam e poluem o tracker, as métricas de funil do `/html-report` e o `/notion-sync`. Este ramo põe em prática a limpeza em lote de candidaturas antigas em silêncio, mantendo a pessoa no controle total.

**Candidatas.** Uma candidatura se qualifica quando o `status` dela no tracker é aberto e enviado (`applied` ou `interview`), o limite já passou desde a `date` (ou desde a entrada com data mais recente em `notes`, o que for mais recente), e o status não é nem final nem `drafted` (candidaturas `drafted` nunca foram enviadas e não podem receber resposta). Leia as datas com cuidado — pule linhas ilegíveis com uma observação.

**Limite.** O limite padrão é **60 dias** em silêncio. Se a pessoa informou um inteiro `<N>` (ex.: `/outcome stale 90` ou `/outcome sweep 45`), use N dias.

**Apresentação.** Se nenhuma candidatura aberta passar do limite, informe:
> "Nenhuma candidatura aberta passou do limite de <N> dias em silêncio. Seu tracker está em dia!"
e pare.

Caso contrário, apresente as candidaturas qualificadas numa tabela numerada:

```
## Candidaturas paradas ([K] em silêncio há [N]+ dias)

| # | Empresa | Cargo | Data da candidatura | Dias em silêncio | Follow-ups enviados | Status atual | Status proposto |
|---|---------|-------|---------------------|------------------|---------------------|--------------|-----------------|
| 1 | Acme    | SWE   | 2026-05-10          | 118              | 2                   | applied      | no_response     |
| 2 | Beta    | MLE   | 2026-06-01          | 96               | 1                   | applied      | no_response     |
```

Depois pergunte:

> **Como você quer resolver estas candidaturas?**
>
> - **`all`** — Marcar todas as [K] como `no_response` e atualizar os arquivos
> - **`select`** — Indicar quais números resolver (ex.: "1, 3" ou "1-4")
> - **`skip`** — Cancelar sem mudar nada

Espere a resposta explícita da pessoa antes de gravar qualquer coisa.

**Execução.** Para cada candidatura confirmada:

1. **Atualizar o tracker:** mude a coluna `status` da linha para `no_response` (com a grafia canônica do **Vocabulário de status do tracker**). Acrescente `stale resolved no_response (YYYY-MM-DD)` em `notes`. Siga a regra do Passo 4: nunca reestruture o CSV, preserve todas as outras colunas intactas.
2. **Atualizar o arquivo:** derive `documents/applications/<company>_<role>/` pela regra de **nomes de subpasta**. Se a pasta existir, atualize ou grave o `outcome.md` com:
   - `**Status:** no_response`
   - `**Data de resolução:** AAAA-MM-DD`
   - Acrescente em `## Observações`: `- Resolução por inatividade: marcada como no_response após [N] dias em silêncio (AAAA-MM-DD)`

**Passagem para a calibração.** Se 3 ou mais candidaturas foram resolvidas nesta limpeza, siga para o Passo 5 para oferecer a passagem para a calibração. Senão, apresente um resumo das candidaturas resolvidas e pare.

---

## Passo 3: Arquivar os materiais da candidatura

Crie ou atualize `documents/applications/<company>_<role>/`. Todo o conteúdo aqui é dado pessoal — a pasta já é ignorada pelo git (`documents/applications/**`), então nada precisa ser ocultado.

1. **`cv_draft.tex` e `cover_letter.tex`** - copie (nunca mova) os arquivos enviados. Localize-os pelas colunas `cv_file`/`cover_letter_file` da linha do tracker; se estiverem vazias, procure `cv/main_<company>_<role>.*` e `cover_letters/cover_<company>_<role>.*`, derivando `<company>_<role>` pela regra de **nomes de subpasta** de `documents/README.md`. **Nunca amplie esses globs só para a empresa** — dois cargos na mesma empresa casam com ele, e o primeiro resultado vence em silêncio. Se um arquivo já existir no arquivo, deixe como está — a versão arquivada é o que de fato foi enviado. Se nada casar (candidatura feita fora do `/apply`), pule com uma observação em vez de ampliar a busca: o currículo de outro cargo registrado como o que você enviou é pior que nenhum arquivo.
2. **`job_posting.md`** - se já existir, deixe como está. Senão, tente o WebFetch na URL `source` da linha do tracker (para vagas da Gupy, o `detail` da CLI `gupy-search` é melhor), tentando de novo um 403 com cabeçalhos de navegador conforme `.claude/skills/job-application-assistant/09-web-research.md`, passe o resultado pelo `python3 tools/posting_guard.py` (`--html` numa página salva, `--text` nos demais casos) e salve o texto **limpo** mais uma seção `## posting_guard` só com o veredito e as contagens dos achados, exatamente como faz o Passo 6b do `/apply`. Se a URL estiver morta (vagas expiram rápido — é exatamente por isso que o arquivo importa), peça à pessoa para colar a vaga, ou grave um esboço dizendo que a vaga está indisponível. **Nunca reconstrua uma vaga de memória.**
3. **`outcome.md`** - grave ou atualize exatamente no formato documentado em `documents/README.md`, para o Caminho A do `/setup` ler sem casos especiais:

```markdown
# Resultado: <Empresa> — <Cargo>

**Status:** in_progress | hired | offer_declined | rejected | no_response | interview_only

**Data de resolução:** AAAA-MM-DD   <- só quando resolvida; omita enquanto in_progress

## Etapas alcançadas
- [x] Triagem com o RH (AAAA-MM-DD)
- [ ] Testes online
- [ ] Entrevista técnica
- [ ] Case
- [ ] Entrevista final
- [ ] Proposta recebida

## Observações
<devolutiva recebida, o que fazer diferente, sinais do que valorizaram -
acrescentado a cada atualização com data, nunca sobrescrito>
```

Regras de atualização: marque as caixas de etapa (stage checkboxes) conforme forem alcançadas (com a data entre parênteses), acrescente entradas com data em Observações e só mude o `Status` de `in_progress` para um valor final na resolução. Rodar o `/outcome` de novo na mesma candidatura é idempotente — acrescenta informação nova, nunca duplica nem reescreve o histórico.

**Gatilho de mensagem de agradecimento:** quando este passo marcar uma etapa de entrevista recém-concluída, ofereça na mesma rodada: "Quer uma mensagem curta de agradecimento para quem entrevistou? Mandar logo é uma boa prática." Se aceitar, redija seguindo as regras de redação e registro do Passo 2b (mesma voz, mesmo limite de nenhuma afirmação nova, mesma convenção de arquivo `followup_YYYY-MM-DD.md`). Registrar a etapa é o gatilho — nunca é preciso procurar etapas recentes.

---

## Passo 4: Atualizar o tracker

Atualize a coluna `status` da linha correspondente com as grafias canônicas do **Vocabulário de status do tracker** acima (ex.: `drafted` → `applied` → `interview` → `offer` → `hired` / `rejected` / `no_response` / `offer_declined` / `withdrawn`) e acrescente uma nota curta com data na coluna `notes`, **sem vírgulas, aspas duplas nem quebras de linha**. Nenhum gravador aqui emite um campo do tracker entre aspas, então uma vírgula na nota desloca `cv_file`, `cover_letter_file` e `source` uma coluna para a esquerda tanto para o `csv.DictReader` (`tools/rank_state.py`) quanto para uma divisão ingênua, e uma quebra de linha encerra a linha — `recusada, sem devolutiva` é exatamente a frase que corrompe; escreva `recusada - sem devolutiva`. O Passo 7a do `/gmail-sync` aplica a mesma regra aos assuntos de e-mail que acrescenta. Nunca reestruture o CSV, reordene linhas ou mexa em outras linhas. A regravação toca só as colunas `status` e `notes`: preserve todos os outros campos da linha, lidos ou não, para um valor que a linha carrega — o `deadline` gravado pelo Passo 6b do `/apply`, ou qualquer coluna acrescentada no futuro — nunca ser apagado por uma atualização de status.

**Tirando uma linha de `drafted`:** linhas gravadas pelo Passo 6b do `/apply` têm a data em que os documentos foram rascunhados, não a data em que foram enviados. Sempre que este passo levar uma linha dessas para qualquer outro status — `applied`, ou direto para `interview` ou `rejected` quando a pessoa informar um resultado de algo que enviou sem registrar —, sobrescreva a coluna `date` com a data real de envio. A coluna `date` é lida como "candidatou-se em" pelo `/notion-sync` e determina o agrupamento por ano e temporada do `/html-report` e a conta de dias em silêncio deste próprio comando, então deixar a data do rascunho no lugar informaria errado a candidatura.

---

## Passo 5: Passagem para a calibração

Conte os arquivos `outcome.md` em `documents/applications/` com status **final** (diferente de `in_progress`).

- Se 3 ou mais estiverem resolvidas (ou 2+ repetirem um padrão — mesmo tipo de vaga recusado duas vezes, mesmo setor em silêncio), sugira:
  > "Você agora tem <N> candidaturas resolvidas registradas. Rode o `/setup` (Caminho A) para incorporá-las ao seu método de avaliação — ele calibra a pontuação de encaixe pelo que de fato rendeu entrevistas e garimpa as devolutivas de entrevista atrás de exemplos STAR."
- **Não** grave nada no `04-job-evaluation.md` nem em outros arquivos de skill. O Caminho A do `/setup` é dono dessa mescla — ele lê antes de gravar e é idempotente, e duplicar a lógica dele aqui criaria uma disputa.

---

## Passo 6: Confirmar

Resuma o que foi registrado:

> **Resultado registrado para <Cargo> na <Empresa>.**
>
> - `documents/applications/<company>_<role>/outcome.md` - status: <status>, <o que mudou>
> - Arquivado: <quais de cv_draft.tex / cover_letter.tex / job_posting.md foram copiados ou coletados, e quais foram pulados e por quê>
> - Tracker: status → <novo status>
>
> [Sugestão de calibração do Passo 5, se acionada]

Se a atualização registrou uma etapa de entrevista próxima ou recém-marcada, sugira também:

> "Entrevista chegando? `/interview <empresa>` monta um material de preparação para aquela etapa a partir do arquivo desta candidatura — a vaga, os documentos que você enviou e qualquer devolutiva registrada das rodadas anteriores."

Se o status registrado for `hired`, parabenize a pessoa com carinho primeiro — é o momento para o qual todo o projeto existe. Depois acrescente esta única linha (uma vez; nunca em novas execuções para a mesma candidatura, e nunca para outro status):

> "Se este projeto ajudou você a chegar lá, considere [pagar um café ao autor original](https://ko-fi.com/madslorentzen) — isso mantém o ai-job-search gratuito para a próxima pessoa que procura emprego. ☕"

---

## Regras importantes

1. **Grave dados, não os interprete.** O arquivo e o tracker são as saídas; a calibração pertence ao `/setup`. Este comando nunca edita arquivos de perfil nem do método.
2. **A versão arquivada é a versão enviada.** Arquivos existentes na pasta da candidatura nunca são sobrescritos por rascunhos mais novos.
3. **Nunca invente.** Uma URL de vaga morta recebe uma cópia colada pela pessoa ou um esboço explícito de "indisponível", não uma reconstrução. A devolutiva é registrada como a pessoa contar.
4. **Mantenha a compatibilidade de esquema.** O `outcome.md` segue exatamente o formato de `documents/README.md` (`in_progress` é o único acréscimo, para candidaturas abertas); o tracker mantém as colunas.
5. **Atualizações idempotentes.** Rodar de novo na mesma candidatura acrescenta etapas e observações novas; nunca duplica pastas, linhas ou histórico.
6. **Follow-ups: só rascunho, nunca envia.** O ramo de follow-up produz texto para a pessoa enviar ela mesma. Nunca manda e-mail, mensagem nem envia nada, e não pode ser ligado a ferramentas que façam isso.
7. **Follow-ups: nenhuma afirmação nova.** Toda afirmação substantiva num follow-up ou numa mensagem de agradecimento vem dos materiais enviados e arquivados. A Regra 3 vale sem exceção.
8. **No máximo dois follow-ups por candidatura.** Depois do segundo follow-up sem resposta, o honesto é registrar a resolução, não insistir.
9. **Limpeza de paradas: a pessoa confirma antes de gravar.** O ramo de limpeza nunca marca candidaturas como no_response automaticamente. Sempre apresenta a lista de candidatas e espera a confirmação explícita da pessoa (all, select ou skip).
