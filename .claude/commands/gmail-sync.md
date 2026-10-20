# /gmail-sync - Sincronizar o status das candidaturas pelo Gmail

Você vai examinar o Gmail da pessoa em busca de sinais de status das candidaturas registradas (convites para entrevista, links de testes, propostas, recusas) e, depois de aprovado, gravar as mudanças detectadas em `job_search_tracker.csv` e `documents/applications/<company>_<role>/outcome.md` — os mesmos dois lugares em que o `/outcome` grava, no mesmo esquema.

Diferente do `/outcome` (que pergunta à pessoa o que aconteceu), o `/gmail-sync` classifica e-mails reais sozinho — mas nunca grava sozinho. Toda mudança classificada é apresentada num lote **antes** de qualquer coisa tocar o tracker ou o `outcome.md`, e só segue depois que a pessoa aprova (aprovar o lote inteiro de uma vez tudo bem; gravar primeiro e avisar depois, não). Como uma gravação errada corrompe em silêncio o histórico de candidaturas que o `/setup` usa para calibrar, toda mudança proposta precisa citar o e-mail de origem, e todo caso incerto precisa ser mostrado, não chutado. Nunca trate o trabalho deste comando como "notar algo numa caixa de entrada" — é "propor uma linha correta e com fonte para um registro permanente, e gravá-la só quando a pessoa disser sim."

Siga estes passos **na ordem**.

---

## Passo 0: Pré-requisitos

Confirme que as ferramentas MCP do Gmail (`mcp__claude_ai_Gmail__*`) estão disponíveis. Se não estiverem, diga à pessoa para conectar a integração do Gmail (claude.ai Configurações → Conectores → Gmail) e pare — não tente fazer isso por Bash, IMAP ou qualquer outro canal.

---

## Passo 1: Interpretar a entrada

`$ARGUMENTS` pode conter:

- Nada → janela padrão (veja o Passo 3)
- Um nome de empresa, ex.: `/gmail-sync acme` → limita a busca a essa candidatura registrada
- `since <YYYY-MM-DD>` → substitui a data inicial da janela só nesta execução (não muda o arquivo de estado gravado)

---

## Passo 2: Carregar o estado

1. Leia `job_search_tracker.csv`. Se não existir, diga à pessoa que ainda não há com o que sincronizar (sugira `/outcome` ou `/apply` primeiro) e pare. Não o crie aqui — o `/gmail-sync` nunca origina candidaturas novas, só atualiza as existentes.
2. Leia `gmail_sync/state.json` (crie se não existir: `{"last_sync": null, "processed_message_ids": []}`).
3. Monte o conjunto de **candidaturas abertas**: linhas do tracker cujo `status` não é **Final** (segundo o **Vocabulário de status do tracker** do `/outcome`). Para cada uma, derive a pasta de arquivo `documents/applications/<company>_<role>/` pela regra de **nomes de subpasta** de `documents/README.md` e confira se existe um `outcome.md` ali. Reuse exatamente esse caminho derivado em qualquer gravação do Passo 7a.

   **Linhas `drafted` ficam neste conjunto, e são o motivo de valer a pena buscar.** O `/apply` as grava, mas nunca envia; a pessoa envia à mão e pode não lembrar de rodar o `/outcome`. Uma resposta chegando para uma linha ainda marcada como `drafted` é exatamente esse caso, e a linha tem o nome da empresa de que a busca precisa.
4. Se `$ARGUMENTS` citou uma empresa, filtre este conjunto para a(s) linha(s) correspondente(s) (sem diferenciar maiúsculas). Sem correspondência → diga à pessoa e pare, sem chutar.

---

## Passo 3: Montar a consulta de busca

Janela de busca: o argumento `since <data>` se informado, senão `state.last_sync` se definido, senão `newer_than:30d`.

1. Chame `list_labels` e procure um marcador da pessoa cujo nome sugira e-mail de busca de emprego (ex.: contém "vaga", "emprego", "candidatura", "carreira", "job", "career", sem diferenciar maiúsculas). Anote o `id` se achar.
2. Normalize o nome da empresa de cada candidatura aberta para comparar depois (minúsculas; tire `ltda`, `ltda.`, `s.a.`, `s/a`, `sa`, `me`, `epp`, `eireli`, `grupo`, `holding`, `inc`, `inc.`, `llc`, `ltd`, `corp`, `corporation`, `group`; tire a pontuação; junte os espaços repetidos).
3. Monte uma consulta do Gmail combinando (com grupos `OR` via `{}`):
   - `label:<id>` se um marcador de busca de emprego foi encontrado
   - Um grupo OR com os nomes das empresas das candidaturas abertas entre aspas, ex.: `{"Acme Tecnologia" "BigCo"}`
   - Um grupo OR de domínios de remetente de plataformas de ATS comuns: `{from:gupy.io from:solides.com.br from:greenhouse.io from:lever.co from:myworkday.com from:ashbyhq.com from:smartrecruiters.com from:icims.com from:bamboohr.com}`
   - O limite da janela, ex.: `newer_than:30d` ou `after:2026/06/15`
   - `-in:sent -in:drafts` (os sinais de status vêm do que as empresas mandam para você, não do que você mandou; os operadores negativos mantêm no escopo o e-mail **arquivado** e o filtrado por marcador — restringir à Caixa de entrada descartaria os dois em silêncio, inclusive justamente os e-mails com o marcador de busca de emprego do item 1, já que o filtro comum que aplica esse marcador também arquiva a mensagem)

Exemplo: `newer_than:30d -in:sent -in:drafts ({"Acme Tecnologia" "BigCo"} OR {from:gupy.io from:solides.com.br from:greenhouse.io from:lever.co})`

4. Chame `search_threads` com `view: THREAD_VIEW_MINIMAL`, `pageSize: 50`, paginando com `pageToken` até esgotar ou até os resultados saírem claramente da janela relevante.

---

## Passo 4: Filtrar as mensagens novas

Para cada conversa devolvida, compare os IDs das mensagens com `state.processed_message_ids`. Pule a conversa inteira se todas as mensagens já foram processadas. Para conversas com mensagens não processadas, chame `get_thread` com `messageFormat: FULL_CONTENT` para obter os corpos completos — **a classificação do Passo 5 nunca pode se basear só no trecho ou no assunto**, porque os trechos cortam justamente a frase que distingue "gostaríamos de agendar uma conversa" de "obrigado por se candidatar".

---

## Passo 5: Classificar cada mensagem não processada

Para cada mensagem nova, primeiro tente associá-la a uma candidatura aberta: compare o domínio do remetente, o nome de exibição, o assunto e o corpo normalizados com os nomes de empresa normalizados do Passo 3. E-mails da Gupy vêm de domínios `gupy.io` com o nome da empresa no assunto ou no corpo. Sem uma associação confiável (empresa realmente ausente, ou ambígua entre duas empresas registradas) → não proponha gravação; registre como "não associado" no resumo do Passo 6 e passe à próxima mensagem.

Para uma mensagem associada, classifique pelo conteúdo (exija a frase de sinal no assunto ou nas primeiras linhas — um nome de empresa que aparece só no fundo de uma conversa encaminhada ou no rodapé de uma newsletter não é sinal):

| Sinal | Frases de exemplo | `status` no tracker | Ação no `outcome.md` |
|---|---|---|---|
| Confirmação de candidatura | "recebemos sua candidatura", "sua candidatura foi realizada com sucesso", "we've received your application" | `drafted` -> `applied`; nos demais casos *(sem mudança)* | Numa linha `drafted`, este é o único e-mail que prova que a pessoa enviou à mão, e chega no mesmo dia ou no seguinte — proponha a mudança com a `date` igual à data do e-mail. Em qualquer outro status, é ruído. |
| Teste / avaliação online | "teste online", "avaliação", "etapa de testes", "teste de perfil", "desafio técnico", "online assessment", "coding challenge", links da Gupy, HackerRank ou Codility | `interview` | Marque a caixa de etapa mais próxima (ou acrescente uma linha em Observações se nenhuma caixa servir — testes nem sempre são uma etapa listada) |
| Convite / entrevista agendada | "agendar uma conversa", "entrevista com o RH", "entrevista técnica", "próxima etapa", "vídeo-entrevista", "dinâmica de grupo", "case", "entrevista final", "schedule a call", "next round" | `interview` | Marque a caixa de etapa correspondente com a data do e-mail |
| Proposta | "temos o prazer de fazer uma proposta", "proposta de trabalho", "carta-proposta", "pleased to offer", "offer letter" | `offer` | Marque a caixa "Proposta recebida". **Nunca proponha `hired` nem `offer_declined` a partir de um e-mail** — aceitar ou recusar é decisão da pessoa, não algo a deduzir. Destaque no resumo do Passo 6 como algo que precisa da decisão da pessoa, separado da tabela simples de aprovar/pular. |
| Recusa | "seguiremos com outros candidatos", "optamos por seguir com outros perfis", "não foi selecionada(o)", "seu perfil não foi aprovado nesta etapa", "agradecemos sua participação... infelizmente", "moving forward with other candidates", "not selected" | `rejected` | Defina `Status: rejected` e `Data de resolução:` com a data do e-mail |

**Regra de conflito:** se o sinal classificado contradiz o caráter final atual da candidatura (ex.: um e-mail de "próxima etapa" chega para uma empresa cuja linha mostra uma gravação recente próxima de `rejected`, ou uma recusa chega depois de uma proposta já proposta nesta execução) — não proponha sobrescrever. Registre como conflito no Passo 6, para resolução manual pelo `/outcome`.

---

## Passo 6: Apresentar as atualizações propostas

**Nada foi gravado ainda.** Apresente toda mudança classificada no Passo 5 num único lote, para a pessoa ver o quadro completo antes de qualquer coisa tocar o tracker ou o `outcome.md`:

```
## Sincronização do Gmail - Atualizações propostas - AAAA-MM-DD

Examinei N conversas (M mensagens novas) desde <data inicial>.

### Mudanças propostas (responda "aprovar todas", ou diga quais pular, ex.: "pular 2")
| # | Empresa | Cargo | Sinal | Status atual -> proposto | E-mail de origem (data) |
|---|---|---|---|---|---|
| 1 | ... | ... | Convite para entrevista | applied -> interview | "Assunto" (2026-07-10) |
| 2 | ... | ... | Proposta | interview -> offer | "Assunto" (2026-07-12) |
| 3 | ... | ... | Confirmação de candidatura | drafted -> applied, data -> 2026-07-02 | "Assunto" (2026-07-02) |

Uma linha saindo de `drafted` mostra a mudança de data na célula de status, como a linha 3: essa linha nunca foi registrada como enviada, então o Passo 7a vai trocar a data do rascunho. Diga que a data foi tirada do e-mail e pergunte se a pessoa sabe a data real de envio — aprovar a mudança de status não deve aprovar em silêncio uma data que ela pode corrigir.

### Precisa de revisão manual (sinal conflitante - não proposto, use o /outcome)
- **<Empresa>** - <o que conflitou e por que não foi proposto>

### E-mails não associados (nenhuma mudança proposta)
- "<assunto>" de <remetente> - parecia sobre vaga, mas não deu para ligar com confiança a uma candidatura registrada.

### Candidaturas paradas (30+ dias, sem atividade)
- **<Empresa>** - última atividade AAAA-MM-DD, ainda `<status>`.
```

Se a tabela de mudanças propostas ficar vazia, diga isso brevemente e pule direto para o Passo 8 (Atualizar o estado) — não há nada a aprovar. Propostas continuam entrando na tabela de mudanças (o tracker vai para `offer`); só `hired`/`offer_declined` nunca são propostos.

---

## Passo 7: Esperar a aprovação

Pare aqui e espere a resposta da pessoa. Não grave nada da classificação desta execução antes de uma resposta explícita.

- "aprovar todas" / "sim" / equivalente → todas as linhas da tabela de mudanças propostas seguem para o Passo 7a.
- Uma resposta parcial, ex.: "aprovar 1, pular 2" ou "só a da entrevista" → só as linhas indicadas seguem.
- "não" / recusa / nenhuma mudança → nenhuma linha segue; vá direto para o Passo 8 (Atualizar o estado).

Aprovar o lote inteiro numa resposta é a experiência esperada — a exigência é que a resposta venha primeiro, não que a pessoa aprove linha por linha.

### Passo 7a: Gravar as atualizações aprovadas

Para cada linha que a pessoa aprovou:

1. **Tracker (`job_search_tracker.csv`):** atualize a coluna `status` da linha correspondente conforme a tabela do Passo 5 e acrescente em `notes`: `<data> gmail-sync: <sinal> ("<assunto do e-mail>")`, **apagando antes do assunto toda vírgula, aspas duplas e quebra de linha**. Nenhum gravador aqui emite um campo do tracker entre aspas e nenhum leitor tira aspas, então uma vírgula sem escape divide a linha do mesmo jeito para uma divisão ingênua e para o `csv.DictReader` que o leitor do projeto de fato usa (`tools/rank_state.py`): `cv_file`, `cover_letter_file` e `source` andam uma coluna para a esquerda. Uma quebra de linha é pior — encerra a linha e começa outra. As aspas duplas são tiradas como seguro barato para o dia em que algo passar a pôr campos entre aspas; nos leitores de hoje, são inofensivas. O assunto aqui é uma trilha legível para pessoas, não um dado que algo lê de volta — o item 2 abaixo o guarda ao pé da letra no `outcome.md`, que é Markdown e não tem essa restrição. Isso importa mais do que parece: o `/gmail-sync` é o único gravador do tracker que copia texto *de terceiros*, e o único que roda sem supervisão, então ninguém está olhando a linha que ele edita.

   Nunca reestruture o CSV, reordene linhas ou mexa em linhas sem relação — a mesma regra que o `/outcome` segue. A regravação toca só `status`, `notes` (e `date` quando a regra de rascunho abaixo se aplica): preserve todos os outros campos da linha, lidos ou não, para a coluna `deadline` gravada pelo Passo 6b do `/apply` — ou qualquer coluna acrescentada no futuro — nunca ser apagada por uma sincronização de status.

   **Se a linha correspondente ainda estava em `drafted`,** defina também a `date` como a data do e-mail. A resposta da empresa prova que a pessoa enviou à mão sem rodar o `/outcome`, então a data de rascunho que está na coluna agora está errada. A data do e-mail é um limite superior da data real de envio, justo para uma confirmação e folgado para uma recusa semanas depois, e é por isso que o Passo 6 a mostra e deixa a pessoa informar a data real.
2. **`outcome.md`:** marque a caixa de etapa relevante (com a data entre parênteses) ou atualize `Status`/`Data de resolução` conforme a tabela. Acrescente uma entrada com data em `## Observações`, nunca sobrescreva o histórico de Observações:
   ```
   AAAA-MM-DD (via /gmail-sync): <resumo em uma linha do que o e-mail disse>. Fonte: "<assunto>" de <remetente>, <data do e-mail>.
   ```
3. Se ainda não existir pasta de arquivo / `outcome.md` para uma candidatura associada, crie a pasta e um `outcome.md` mínimo seguindo exatamente o formato de `documents/README.md`, como o `/outcome` faria. É o caso normal de uma linha que ainda estava em `drafted`: o Passo 6b do `/apply` grava a linha do tracker e só o Passo 3 do `/outcome` cria o arquivo, então a pasta legitimamente ainda não existe. Também é o caso de uma linha acrescentada à mão.

Linhas que a pessoa pulou ficam intocadas — nenhuma gravação no tracker, nenhuma no `outcome.md` —, mas os IDs das mensagens delas continuam sendo marcados como processados no Passo 8, para o mesmo e-mail não ser proposto de novo a cada execução.

---

## Passo 8: Atualizar o estado

Acrescente todo ID de mensagem processado nesta execução — aprovado, pulado, não associado ou filtrado como ruído — a `processed_message_ids` em `gmail_sync/state.json`, e defina `last_sync` como a data de hoje. Isso torna a nova execução idempotente — o mesmo e-mail nunca produz uma proposta, nota no tracker ou entrada em Observações duplicada.

---

## Passo 9: Checagem de candidaturas paradas

Para candidaturas abertas **sem** atividade correspondente encontrada nesta execução, confira a coluna `date` do tracker e a entrada com data mais recente em Observações no `outcome.md` delas. Se a mais recente das duas tiver 30+ dias, sinalize a candidatura como "precisa de follow-up" no resumo final abaixo. Isso só é mostrado — nunca grave nada por causa de inatividade.

**Pule as linhas `drafted` aqui** — nada foi enviado, então ninguém está atrasado para responder.

---

## Passo 10: Apresentar o resumo final

Confirme o que de fato aconteceu, diferente da proposta do Passo 6:

```
## Sincronização do Gmail - Concluída - AAAA-MM-DD

### Gravado
| Empresa | Cargo | Sinal | Status no tracker | E-mail de origem |
|---|---|---|---|---|
| ... | ... | Convite para entrevista | applied -> interview | "Assunto", 2026-07-10 |

### Pulado (não gravado)
- **<Empresa>** - <sinal> recusado pela pessoa.

### Propostas que precisam da sua decisão
- **<Empresa>** - proposta gravada em 2026-07-12 ("<assunto>"). Tracker em `offer`; rode `/outcome <empresa>` para registrar aceite ou recusa quando decidir.

### Candidaturas paradas (30+ dias, sem atividade)
- **<Empresa>** - última atividade AAAA-MM-DD, ainda `<status>`.
```

Se nada foi proposto nesta execução, uma nota breve basta, em vez de um resumo vazio.

Se esta execução levou a contagem de candidaturas com status **final** no `outcome.md` a 3 ou mais (ou resolveu uma segunda candidatura que repete um padrão), sugira a mesma passagem para a calibração pelo Caminho A do `/setup` que o `/outcome` sugere — não duplique essa lógica, só aponte para lá.

---

## Regras importantes

1. **Classifique a partir do corpo completo dos e-mails, nunca de trechos.** Uma proposta que muda status exige ter de fato coletado e lido a mensagem via `get_thread`/`get_message`.
2. **Nada é gravado antes de a pessoa aprovar o lote do Passo 6.** Aprovar tudo numa resposta é boa experiência; gravar primeiro e avisar depois, não.
3. **Nunca proponha `hired` nem `offer_declined`.** Eles exigem a decisão real da pessoa; o `/gmail-sync` para em propor `offer` e sinaliza.
4. **Um sinal conflitante com um status já final ou já gravado é uma sinalização para revisão manual, não uma sobrescrita proposta.** Na dúvida, não proponha — mostre.
5. **Só acréscimos em Observações do `outcome.md`**, como no `/outcome`. Nunca reescreva nem apague histórico existente.
6. **Idempotente pelo ID da mensagem.** Rodar de novo nunca pode repropor, nem duplicar uma nota no tracker ou uma entrada em Observações, para o mesmo e-mail.
7. **Nunca invente uma associação.** Se a empresa não puder ser identificada com confiança pelo e-mail, ela vai para "Não associados", não para um chute.
8. **Só leitura no próprio Gmail.** Este comando lê e classifica; não marca, arquiva nem apaga nada na caixa de e-mail da pessoa.
9. **Todo o estado é dado pessoal.** `gmail_sync/state.json`, `job_search_tracker.csv` e `documents/applications/**` são ignorados pelo git — nunca sugira versioná-los.
