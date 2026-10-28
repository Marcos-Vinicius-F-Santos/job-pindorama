---
framework_version: 1.1.0
---

# Campos de formulário de candidatura

O `/apply` produz dois documentos: um currículo e uma carta de apresentação. Muitas candidaturas precisam de um **terceiro** — campos de texto livre digitados direto no portal de candidatura. Programas de trainee, ATS de grandes empresas e formulários de startups pedem com frequência coisas que nenhum dos dois documentos cobre, com limite de caracteres ou de palavras, numa caixa sem formatação.

Este arquivo rege esse terceiro artefato. Não é um documento a compilar; é texto que a pessoa cola.

## Quando se aplica

Acione sempre que uma vaga ou portal pedir qualquer um destes:

- Um parágrafo de apresentação ("fale sobre você", "conte sua trajetória")
- Experiências ou projetos em campos estruturados (nome, função, início e fim, descrição)
- Um resumo curto com limite rígido de caracteres ("por que você, em uma frase")
- Perguntas de motivação ("por que esta empresa", "por que este programa")
- Perguntas de competência com limite ("conte uma situação em que...", 200 palavras)
- **Pretensão salarial** (campo numérico, muitas vezes obrigatório)
- **Perguntas eliminatórias** de sim/não ou múltipla escolha

## A regra que governa tudo aqui

**Toda afirmação num campo de formulário precisa já ser defensável pelas mesmas fontes que sustentam o currículo e a carta** — a união de `01-candidate-profile.md`, do modelo de referência (`cv/reference_template.tex`) e da seção Candidate Profile do `CLAUDE.md`; uma afirmação está fundamentada se QUALQUER um dos três a sustentar. Quem entrevista lê o formulário junto com o currículo. Campo de formulário não é lugar de introduzir afirmações novas, inflar escopo ou encher espaço — é lugar de *escolher* entre o que já é verdade e organizar para a pergunta feita.

Todas as regras de exatidão de `05-cv-templates.md` e `03-writing-style.md` valem sem mudança.

## Formulários de ATS brasileiros (Gupy e similares)

Na Gupy, Solides, InHire, Kenoby e parecidos, a candidatura costuma ter estas partes:

- **Perfil estruturado.** Além do PDF, o ATS pede experiências, formação e idiomas em campos próprios. Recrutadores muitas vezes filtram por esses campos, não pelo PDF. Preencha seguindo "Experiências e projetos em campos estruturados" abaixo, com as **mesmas datas e cargos do currículo**.
- **Perguntas eliminatórias** ("Você possui CNH categoria B?", "Tem disponibilidade para trabalhar presencialmente em Campinas?", "Possui inglês avançado?"). Uma resposta "errada" pode eliminar a candidatura automaticamente, sem leitura humana. **Responda sempre a verdade**: mentir aqui é descoberto na primeira entrevista. Se a resposta honesta é "depende" e o campo só aceita sim/não, avise a pessoa para decidir.
- **Campos de diversidade e autodeclaração** (raça/cor pelas categorias do IBGE, identidade de gênero, orientação sexual, pessoa com deficiência). São **opcionais e pessoais**: nunca preencha por suposição; pergunte à pessoa ou deixe em branco. Em vagas afirmativas, a autodeclaração é o que dá acesso à vaga.
- **Testes** (perfil comportamental, lógica, inglês). Não se preparam por texto; veja `07-interview-prep.md`.
- **Consentimento LGPD** para tratamento de dados e para o banco de talentos. Leia: aceitar o banco de talentos é opcional e significa receber convites para outras vagas.

## Tipo de campo: pretensão salarial

Muitas vezes um número obrigatório, sem espaço para explicação.

- **Pesquise antes** (seção de referência salarial de `04-job-evaluation.md`) e use o **valor mensal bruto** no regime da vaga (CLT, salvo se a vaga disser PJ).
- Escolha um valor **perto do meio para cima** da faixa de mercado para o nível da vaga: alto demais pode eliminar num filtro automático; baixo demais ancora a negociação para baixo.
- Se houver campo de texto ao lado, informe faixa e regime: "R$ 8.000 a R$ 9.500 (CLT), a depender do pacote de benefícios."
- Registre o valor informado no `job_search_tracker.csv` (coluna de notas), para manter a coerência na entrevista com o RH.
- **Nunca** invente um salário atual. Se o campo perguntar o salário atual, a pessoa decide se informa; não preencha por ela.

## Tipo de campo: parágrafo de apresentação

Em geral 100 a 200 palavras (ou 500 a 1.000 caracteres na Gupy), um parágrafo, sem formatação.

**Estrutura que funciona:**
1. Momento atual — o que a pessoa está fazendo ou concluindo agora
2. A evidência mais forte, com número e escala
3. Uma linha de trajetória: como chegou aqui, se uma mudança de área ou especialização for de fato interessante
4. O que quer a seguir, ligado ao trabalho real desta empresa

**Regras:**
- **Abra com a evidência mais forte, não com a cronologia.** Uma trajetória contada em ordem esconde o melhor material quando o trabalho mais forte é recente.
- **Escreva uma versão por tipo de vaga, não uma para todas.** A mesma trajetória apresentada para uma vaga de backend e para uma de dados são parágrafos diferentes. Produza os dois, rotule e diga qual vai onde.
- **Ligue à empresa na última frase.** Apresentações genéricas são o padrão e são lidas como tal.
- **Conte as palavras (ou caracteres) e informe a contagem.** Portais cortam sem avisar. Entregue também uma versão enxuta e diga qual frase cortar primeiro.

## Tipo de campo: experiências e projetos em campos estruturados

Normalmente **nome do projeto ou cargo, função, data de início, data de fim, descrição.**

**Nome do projeto.** Dê ao projeto um nome descritivo, não o nome da empresa — "Plataforma de previsão de estoque" é um projeto; "Acme Ltda." é uma empresa. Quando um cliente for mais conhecido que a empregadora, cite o cliente só se a relação for verdadeira (alocação no cliente, entrega para ele).

**Função.** A função da pessoa *naquele projeto*, que pode ser mais estreita que o cargo. Não promova.

**Datas.** As datas em que trabalhou **naquele projeto**, que não são automaticamente as do emprego. Se o cargo durou dois anos e o projeto citado ocupou a parte final, dizer isso é mais exato e evita a leitura de pouca entrega descrita em `05-cv-templates.md` ("Compare o tempo no cargo com o que aparece de trabalho"). Só estreite as datas quando a pessoa souber dizer quando o projeto de fato começou — nunca invente um limite para melhorar a proporção.

**Descrição.** 100 a 150 palavras: o que o sistema fazia e quem usava, depois o problema técnico mais difícil e como foi resolvido, depois o resultado com número. Entregue também uma **versão curta de ~60 palavras**; portais variam e a pessoa não deveria ter de improvisar um corte.

**A disciplina de escopo é mais rígida aqui que no currículo.** Um tópico de currículo pode ser enxuto a ponto de ficar ambíguo sobre quem fez o quê. Uma entrada de projeto com o nome e a função da pessoa é lida como responsabilidade pelo todo. Onde ela contribuiu em vez de liderar, diga isso dentro da descrição.

## Tipo de campo: limites rígidos de caracteres

Estes premiam **uma situação específica em vez de um adjetivo**. A maioria das pessoas manda adjetivos — "proativa", "aprendo rápido", "trabalho bem em equipe" —, então uma situação concreta se destaca por contraste.

**Método:**
1. Escolha a coisa verdadeira mais marcante: em geral um número, uma combinação incomum de formações, ou um tipo de problema que se encaixa no trabalho da própria empresa.
2. Escreva de 4 a 6 versões, cada uma por um ângulo.
3. **Conte os caracteres por programa. Não estime.** Texto acima do limite é cortado no meio da palavra.
4. Apresente todas as versões com as contagens, recomende uma e diga por quê.

Prefira a versão que **liga o problema da pessoa ao problema da empresa**, quando essa ligação for verdadeira. É isso que "se destacar" realmente pede.

## Formato de saída

Salve num arquivo `.txt` simples de onde a pessoa possa copiar, junto do restante do material daquela empresa. Um arquivo por empresa, com todos os campos que ela pediu.

Inclua:
- Um cabeçalho com a empresa e as vagas cobertas
- Cada campo, rotulado, com a contagem de palavras ou caracteres
- Versões curtas onde os limites possam ser mais apertados que o esperado
- A pretensão salarial informada e a justificativa (faixa, fonte, regime)
- **Blocos `NOTE TO SELF`** (nota para si) com lembretes de escopo e respostas preparadas para perguntas que o conteúdo pode provocar — claramente marcados como *não é para colar no formulário*
- Uma referência rápida de datas, para os campos de data ficarem coerentes sem recalcular

## Verificação antes de entregar

- [ ] Toda afirmação factual vem da união de `01-candidate-profile.md`, do modelo de referência (`cv/reference_template.tex`) e da seção Candidate Profile do `CLAUDE.md`
- [ ] Nenhuma afirmação contradiz o currículo ou a carta enviados para a mesma vaga
- [ ] Escopo correto onde o trabalho foi de contribuição
- [ ] Contagens de palavras e caracteres medidas, não estimadas
- [ ] Formações em andamento descritas como em andamento
- [ ] Respostas eliminatórias verdadeiras; campos de autodeclaração deixados para a pessoa
- [ ] Pretensão salarial com regime explícito e coerente com o que foi dito antes
- [ ] Blocos `NOTE TO SELF` claramente marcados como internos
