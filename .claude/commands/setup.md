# /setup - Configuração do perfil

Você está conduzindo a configuração inicial do job-pindorama. O objetivo é reunir as informações profissionais da pessoa e preencher todos os arquivos de perfil, para o fluxo do `/apply` funcionar de primeira.

Há três caminhos de entrada. O Passo 0 escolhe o certo; os três se encontram no Passo 3 (geração dos arquivos) e no Passo 4 (confirmação).

**Converse em português do Brasil**, a não ser que a pessoa escreva em outro idioma.

---

## Passo 0: Boas-vindas e escolha do caminho

Se `$ARGUMENTS` contiver `--section <nome>`, vá direto para aquela seção do Caminho C, só para atualizar. Não mostre a escolha de caminho abaixo.

Caso contrário, primeiro confira para onde esta cópia publicaria — **antes de gravar qualquer coisa, não depois** (o aviso de privacidade do Passo 4 só aparece quando todos os arquivos já estão no disco, tarde demais para pesar na decisão). Rode `git remote get-url origin`; se o comando falhar (sem remoto, ou não é um checkout git), pule esta checagem em silêncio. Se houver um `origin` no GitHub, confira com `gh repo view <owner/repo> --json visibility,isFork` quando o `gh` estiver disponível. Se o origin for um **fork público** do modelo — ou se a visibilidade não puder ser determinada —, avise agora e espere:

> **Atenção antes de começar:** o seu `origin` aponta para `<owner/repo>`, que é um
> fork público no GitHub. Esta configuração grava os seus dados pessoais (nome, contatos,
> histórico profissional, pretensão salarial) em arquivos **rastreados pelo git**, e tudo
> o que você fizer commit *e push* nesse fork fica visível para qualquer pessoa. Duas
> opções seguras: manter os commits do perfil só na sua máquina, sem push, ou fazer push
> para um repositório **privado** — a seção 8 do SETUP.md tem a receita de dois minutos
> para o remoto privado. Quer continuar a configuração?

Espere a confirmação antes de mostrar a escolha de caminho. Um origin privado, nenhum origin ou um remoto que não é fork não precisam de aviso — siga em silêncio.

Depois, antes de cumprimentar, examine a pasta `documents/`. Use Glob com `documents/**/*` e conte os arquivos por subpasta (`cv/`, `linkedin/`, `diplomas/`, `references/`, `projects/`, `applications/`).

Então dê as boas-vindas numa única mensagem que apresente os três caminhos. O texto muda conforme o que foi encontrado.

**Se `documents/` tiver arquivos** em uma ou mais subpastas, comece pelo Caminho A:

> **Boas-vindas à configuração do job-pindorama!**
>
> Vou montar o seu perfil profissional para o Claude avaliar vagas, personalizar currículos, escrever cartas de apresentação e preparar você para entrevistas.
>
> Encontrei arquivos na sua pasta `documents/`: [lista por subpasta, ex.: "2 em cv/, 1 em linkedin/, 3 em references/"]. Três jeitos de começar:
>
> **Caminho A: Ler a minha pasta de documentos** (recomendado com o que você já tem) - Leio tudo em `documents/`, cruzo as informações para conferir a consistência e monto o perfil a partir dos materiais reais. Pode rodar de novo à medida que você acrescentar documentos, sem duplicar nada.
>
> **Caminho B: Importar um currículo** - Cole ou mencione (@) um currículo aqui. Eu extraio as informações e pergunto o que faltar.
>
> **Caminho C: Entrevista** - Faço perguntas organizadas, seção por seção.
>
> Qual você prefere?

**Se `documents/` estiver vazia ou não existir**, apresente o Caminho A como opção para quem tem materiais:

> **Boas-vindas à configuração do job-pindorama!**
>
> Vou montar o seu perfil profissional para o Claude avaliar vagas, personalizar currículos, escrever cartas de apresentação e preparar você para entrevistas.
>
> Três jeitos de começar:
>
> **Caminho A: Pasta de documentos** (o melhor sinal, se você tem vários materiais) - Coloque o seu currículo, a exportação do LinkedIn, diplomas, cartas de recomendação e resumos de projetos na pasta `documents/` e diga "pode ir". Leio tudo e monto o perfil a partir disso. O `documents/README.md` explica a organização das pastas.
>
> **Caminho B: Importar um currículo** - Cole ou mencione (@) um currículo aqui. Eu extraio as informações e pergunto o que faltar.
>
> **Caminho C: Entrevista** - Faço perguntas organizadas, seção por seção. Bom para quem está começando do zero.
>
> Qual você prefere?

Espere a escolha. Se a pessoa escolher A mas a pasta continuar vazia, diga o que acrescentar (indique o `documents/README.md`) e pare.

---

## Caminho A: Pasta de documentos

Lê os documentos organizados em `documents/`, cruza as informações para conferir a consistência e incorpora os dados extraídos aos sete arquivos de perfil. Lê antes de gravar e é idempotente: mudanças que já estão lá não são propostas de novo.

Siga estes passos **exatamente na ordem**.

### Passo A1: Inventário

Use Glob com `documents/**/*` para examinar a árvore inteira. Imprima:

```
## Documentos encontrados

**cv/**: [lista de arquivos, ou "(vazia)"]
**linkedin/**: [lista de arquivos, ou "(vazia)"]
**diplomas/**: [lista de arquivos, ou "(vazia)"]
**references/**: [lista de arquivos, ou "(vazia)"]
**projects/**: [lista de arquivos, ou "(vazia)"]
**applications/**: [lista de subpastas com os arquivos, ou "(vazia)"]

Vou ler e cruzar tudo antes de propor qualquer mudança.
```

Se todas as subpastas estiverem vazias, pare e diga à pessoa para preencher a pasta. Indique o `documents/README.md` para a organização.

### Passo A2: Ler os arquivos de perfil existentes

Leia estes em paralelo antes de extrair qualquer coisa. Você precisa saber o que já está lá para a mescla ser inteligente.

- `.claude/skills/job-application-assistant/01-candidate-profile.md`
- `.claude/skills/job-application-assistant/02-behavioral-profile.md`
- `.claude/skills/job-application-assistant/03-writing-style.md`
- `.claude/skills/job-application-assistant/04-job-evaluation.md`
- `.claude/skills/job-application-assistant/05-cv-templates.md`
- `.claude/skills/job-application-assistant/06-cover-letter-templates.md`
- `.claude/skills/job-application-assistant/07-interview-prep.md`

Mantenha esse conteúdo no contexto durante todo o Caminho A. Não releia.

### Passo A3: Ler os documentos

Leia cada documento encontrado no Passo A1. Processe as subpastas nesta ordem: `cv/`, `linkedin/`, `diplomas/`, `references/`, `projects/`, `applications/`.

**Documentos de `cv/`:** nome, contato (e-mail, telefone, LinkedIn, GitHub), formação (curso, instituição, datas, TCC/dissertação/tese), experiência (cargo, empresa, datas, local, regime quando aparecer, tópicos), competências, idiomas (com o nível informado), publicações, prêmios, resumo profissional. **Não copie para o perfil** CPF, RG, data de nascimento, estado civil ou foto que o currículo antigo eventualmente traga (veja as convenções do currículo brasileiro em `05-cv-templates.md`).

**Documentos de `linkedin/`:** seção Sobre (texto integral, usado para inferir o perfil comportamental), experiência, formação, competências e recomendações de competências, **seção Idiomas** (nome do idioma + nível autodeclarado, ex.: "Inglês - Proficiência profissional completa" — uma fonte estruturada de alta confiança, que alimenta o filtro de idioma em `04-job-evaluation.md`), licenças e certificados, trabalho voluntário, publicações, recomendações recebidas (texto integral). Se houver várias exportações do LinkedIn, use o arquivo modificado mais recentemente.

**Documentos de `diplomas/`:** título oficial e nível do curso (bacharelado, licenciatura, tecnólogo, especialização/MBA, mestrado, doutorado), nome oficial da instituição, data de conclusão, nota, menção ou coeficiente de rendimento, se visíveis.

**Documentos de `references/`:** nome, cargo e organização de quem recomenda; texto integral da carta (extraia citações específicas); linguagem de competências usada.

**Documentos de `projects/`:** nome do projeto, resumo/descrição, domínio do problema, stack (linguagens, frameworks, ferramentas), principais desafios técnicos e decisões de arquitetura, resultados mensuráveis e métricas (ex.: usuários, desempenho, estrelas, impacto).

**Subpastas `applications/<company>_<role>/`:**
- `job_posting.md`: cargo, empresa, competências exigidas, nível de experiência, setor, tipo de função, regime
- `cover_letter.tex`: estrutura da abertura, estrutura do corpo, estilo dos tópicos, fechamento, expressões recorrentes
- `cv_draft.tex`: resumo profissional, ordem das seções, enquadramento para esse tipo de vaga
- `outcome.md`: status (in_progress/hired/offer_declined/rejected/no_response/interview_only), etapas de entrevista, observações. Pule candidaturas `in_progress` na calibração — ainda não têm um sinal final.

Depois de ler, siga para o Passo A4 sem saída intermediária. A pessoa vê o quadro completo no Passo A6.

### Passo A4: Checagem cruzada

Antes de levar qualquer coisa aos arquivos de perfil, procure inconsistências:

- Datas que não batem entre currículo, LinkedIn e diploma
- Cargos diferentes em documentos diferentes para a mesma função
- Formação divergente (nome do curso, data de conclusão)
- Variações no nome do empregador (razão social × nome fantasia é comum no Brasil: registre os dois quando a pessoa confirmar)

Se encontrar inconsistências, apresente uma lista numerada e espere a pessoa resolver cada uma antes de continuar:

```
## Inconsistências encontradas

Preciso que você resolva estas antes de eu continuar. Para cada uma, diga qual versão está certa.

1. **Cargo divergente - [EMPRESA]:**
   O currículo diz: "[CARGO_A]"
   O LinkedIn diz: "[CARGO_B]"
   Qual está certo?

2. ...
```

Sem inconsistências, diga "Nenhuma inconsistência encontrada." e continue.

### Passo A5: Montar os conjuntos de mudanças

Para cada arquivo de perfil, compare o conteúdo extraído dos documentos com o conteúdo atual do arquivo lido no Passo A2. Monte dois grupos.

**Mudanças de acréscimo:** conteúdo inteiramente novo, que não está no arquivo de forma nenhuma. Exemplos: uma certificação que não está em `01-candidate-profile.md`, um projeto independente novo, uma competência recomendada nova, uma referência ainda não listada, uma citação comportamental nova de uma carta de recomendação, um prêmio novo.

**Mudanças conflitantes:** conteúdo que toca em algo que já está num arquivo de perfil, mas discorda. Exemplos: um período diferente para um emprego existente, um cargo diferente para a mesma função, uma data de conclusão diferente da registrada.

**Regras de inferência** (aplique ao preencher a partir de fontes inferidas):

- **`01-candidate-profile.md` (`## Projetos independentes`):** a fonte são os documentos de `projects/`. Extraia entradas estruturadas no formato `- **[PROJECT_NAME]**: [DESCRIPTION com stack e resultado mensurável]`. Fundamente toda afirmação no texto do documento.
- **`02-behavioral-profile.md`:** a fonte é a seção Sobre do LinkedIn + cartas de recomendação (e o relatório de teste de perfil comportamental, se a pessoa tiver um, como o da Gupy ou um DISC). Extraia temas, adjetivos e expressões recorrentes sobre como a pessoa trabalha. Acrescente só nas seções "Comportamentos mais fortes", "Como você trabalha melhor" ou "Estilos de gestão preferidos" (os títulos `##` do arquivo como vem no modelo). Não sobrescreva avaliações pontuadas existentes. Marque sempre os acréscimos inferidos: *[Inferido do Sobre do LinkedIn / da carta de recomendação - revise antes de confiar nisto]*
- **`03-writing-style.md`:** a fonte são os arquivos `cover_letter.tex`. Extraia padrões recorrentes. Acrescente como observações em "## Padrões observados em candidaturas anteriores". Não modifique as regras existentes. Só acrescente se 2 ou mais cartas mostrarem um padrão real.
- **`04-job-evaluation.md`:** a fonte são os pares `job_posting.md` + `outcome.md`. Se uma candidatura chegou a entrevista ou proposta: registre o tipo de função e o setor como sinal confirmado de bom encaixe. Se 2 ou mais candidaturas repetirem um padrão de silêncio ou recusa: registre. Acrescente os achados em "## Calibração com candidaturas anteriores". Não modifique o método de pontuação existente.
- **`05-cv-templates.md`:** a fonte são os arquivos `cv_draft.tex`. Extraia todo resumo profissional que ainda não está nos modelos. Marque com: *[Used for: <company>_<role>]*. **Fundamente antes de extrair:** rascunhos arquivados são saídas personalizadas, não documentos-fonte — confira cada afirmação factual de um resumo extraído (cargos, empregadores, métricas, tecnologias) contra `01-candidate-profile.md` e remova ou corrija o que o perfil não sustentar, guardando só o enquadramento. Um rascunho personalizado que se desviou nunca pode virar o modelo de onde as próximas candidaturas partem.
- **`06-cover-letter-templates.md`:** a fonte são os arquivos `cover_letter.tex`. Extraia padrões de abertura, estruturas de tópicos, fórmulas de fechamento. Acrescente só o que for estruturalmente diferente dos modelos existentes.
- **`07-interview-prep.md`:** a fonte são os tópicos do currículo, as descrições do LinkedIn e as citações das cartas de recomendação. Identifique conquistas ainda não cobertas por um exemplo STAR existente. NÃO redija exemplos STAR completos. Acrescente esboços em "## Candidatos a STAR (completar à mão)":

```markdown
### [Título da conquista]
**Fonte:** [Currículo / LinkedIn / Carta de recomendação - cargo/empresa]
**O que aconteceu:** [uma frase]
**Por que importa:** [tipos de pergunta de entrevista que isto responde]
**Esboço S/T/A/R:**
- Situação:
- Tarefa:
- Ação:
- Resultado:
```

### Passo A6: Apresentar e confirmar as mudanças

Apresente o conjunto completo de mudanças antes de gravar qualquer coisa.

**Mudanças de acréscimo** (uma lista agrupada, organizada por arquivo de destino):

```
## Acréscimos propostos

### 01-candidate-profile.md
- [ ] Nova certificação: [título], [emissor], [data] - extraída do LinkedIn
- [ ] Novo projeto independente: [PROJECT_NAME] - [descrição, stack, principal resultado]
- [ ] Nova referência: [nome, cargo, empresa]
  Citação: "[citação relevante]"

### 02-behavioral-profile.md
- [ ] Nova observação comportamental [marcada como inferência]: "[expressão]"

[e assim por diante, por arquivo]
```

Então pergunte:

> **Aplico todos os acréscimos?** Eles trazem conteúdo novo sem mexer em nada que já está nos arquivos.
> Responda **sim** para aplicar todos, ou liste os números que quer pular.

Espere a resposta. Aplique só os itens confirmados.

**Mudanças conflitantes** (uma de cada vez):

```
## Conflito 1 de [N]: Cargo - [EMPRESA]

**Atual em 01-candidate-profile.md:**
[CARGO_A] - [EMPRESA] ([INÍCIO]-[FIM])

**Proposto (da exportação do LinkedIn):**
[CARGO_B] - [EMPRESA] ([INÍCIO]-[FIM])

Opções:
  [manter] Manter o texto existente
  [trocar] Trocar pela versão do documento
  [manual] Eu mesma(o) edito depois - pular por agora
```

Espere a escolha da pessoa em cada conflito. Sem conflitos, diga "Nenhuma mudança conflitante encontrada." e pule esta parte.

### Passo A7: Gravar as mudanças confirmadas e preencher lacunas

Aplique as mudanças confirmadas com a ferramenta Edit. Só edições pontuais. Não reescreva arquivos inteiros. Diga quais mudanças foram aplicadas em cada arquivo. Se um arquivo não tiver mudanças confirmadas, diga "Nenhuma mudança em [arquivo]."

Os documentos cobrem competências, experiência, formação, referências e sinais comportamentais. Não cobrem tudo o que o `/apply` e o `/scrape` precisam. Depois das gravações, pergunte o que faltar:

- Objetivos de carreira e tipos de vaga desejados
- O que empolga a pessoa no próximo trabalho
- Deal-breakers e requisitos indispensáveis
- **Regimes aceitos:** CLT, PJ, estágio, temporário? Algum é eliminatório?
- **Senioridade-alvo:** que níveis fazem sentido buscar (sugira a partir dos documentos e confirme)
- Idiomas em que trabalha profissionalmente, com o nível (só se ainda não extraídos de `cv/` ou `linkedin/` acima) — isto alimenta o filtro de idioma em `04-job-evaluation.md`, então pergunte diretamente em vez de pular
- **Gênero gramatical para os textos** (feminino, masculino ou neutro) — pergunte sempre; nunca deduza pelo nome
- Pretensão salarial / referência (opcional): valor **bruto mensal em regime CLT** e o mínimo aceitável em PJ, se aceitar PJ
- Benefícios que pesam na decisão (plano de saúde, VR/VA, home office...) — opcional
- Restrições de deslocamento ou local (se não estiverem visíveis no currículo)
- Configuração da busca de vagas (use as perguntas da Seção 9 do Caminho C abaixo)

Depois siga para o Passo 3 para preencher os arquivos que não são de perfil (`CLAUDE.md`, `cv/main_example.tex`, `.claude/skills/job-scraper/search-queries.md`). O Passo 3 vai perceber que os sete arquivos de perfil já estão preenchidos e pular esses subpassos.

---

## Caminho B: Importar um currículo

Se a pessoa fornecer um único currículo:

1. Leia o documento com atenção.
2. Extraia todas as informações estruturadas: nome, contato, formação, experiência, competências, idiomas, publicações, prêmios. Deixe de fora CPF, RG, data de nascimento, estado civil e foto.
3. Apresente um resumo do que foi extraído.
4. Pergunte o que faltar (perfil comportamental, objetivos de carreira, deal-breakers, regimes aceitos, senioridade-alvo, gênero gramatical para os textos, idiomas e níveis se ainda não extraídos, pretensão salarial, referências).
5. Siga para o Passo 3 (geração dos arquivos).

---

## Caminho C: Entrevista

Passe por cada seção em tom de conversa. Faça as perguntas com naturalidade, não como formulário. Deixe a pessoa responder com as próprias palavras; você organiza os dados.

### Seção 1: Identidade e contato
Pergunte sobre:
- Nome completo
- Local (cidade e UF; país, se não for o Brasil)
- Telefone com DDD, e-mail, LinkedIn, GitHub
- **Gênero gramatical para os textos:** "Nos currículos e cartas em português, prefere que eu escreva no feminino ('formada'), no masculino ('formado') ou de forma neutra, evitando a flexão ('tenho formação em')?" Nunca deduza pelo nome.
- Em que idiomas trabalha profissionalmente, e mais ou menos em que nível (nativo, fluente, avançado, intermediário, básico, uma letra do CEFR como B2 — o que for natural para a pessoa, sem precisar ser preciso). Vale explicar por quê: uma vaga que exige um idioma que a pessoa não lista é excluída depois automaticamente pelo filtro de idioma, enquanto uma que pede nível mais alto num idioma listado é sinalizada para ela decidir, em vez de passar ou ser rejeitada em silêncio — então vale ser honesta(o), não otimista.
- Situação atual de trabalho (empregada(o) CLT, PJ, em transição, estudante...)
- Restrições familiares ou de deslocamento (se houver)

### Seção 2: Formação
Para cada curso:
- Nível (doutorado, mestrado, especialização/MBA, bacharelado, licenciatura, tecnólogo, técnico), área, instituição, anos
- Tema do TCC, da dissertação ou da tese (se houver)
- Disciplinas ou temas principais

Pergunte também sobre certificações (cursos online, certificações profissionais) e registro em conselho de classe (CREA, CRC, OAB etc.), se a profissão exigir.

### Seção 3: Experiência profissional
Para cada cargo (do mais recente para o mais antigo):
- Cargo, empresa, datas, local e regime (CLT, PJ, estágio)
- Principais responsabilidades (3 a 5 tópicos)
- Principais conquistas ou projetos
- Tecnologias e ferramentas usadas

Pergunte também sobre projetos independentes, freelas ou projetos paralelos.

### Seção 4: Competências técnicas
- Linguagens de programação + nível
- Frameworks e ferramentas de ML/IA
- Conhecimento de domínio
- Softwares e plataformas
- Outras competências técnicas

### Seção 5: Publicações e prêmios (opcional)
- Artigos revisados por pares, apresentações em congressos (link do Lattes, se tiver)
- Hackathons, competições, prêmios
- Pule se não se aplicar

### Seção 6: Perfil comportamental (opcional)
Se a pessoa tiver uma avaliação formal (PI, DISC, MBTI, StrengthsFinder, o teste de perfil da Gupy):
- Peça para descrever ou compartilhar os resultados

Se não, faça perguntas comportamentais:
- "Em que ambientes de trabalho você rende melhor?"
- "O que drena a sua energia no trabalho?"
- "Como você prefere trabalhar em equipe?"
- "Como você toma decisões, rápido ou com calma?"
- "Qual é o seu estilo de comunicação?"
- Sintetize as respostas num perfil comportamental

### Seção 7: Objetivos de carreira e preferências
- Cargos e setores desejados
- O que empolga a pessoa no trabalho
- Deal-breakers e requisitos indispensáveis
- **Regimes aceitos** (CLT, PJ, estágio, temporário) e se algum é eliminatório
- Pretensão salarial / referência (opcional): bruto mensal CLT, e o mínimo em PJ se aceitar
- Benefícios que pesam na decisão (opcional)
- Modelo de trabalho preferido (remoto, híbrido — quantos dias —, presencial)
- **Senioridade-alvo:** que níveis fazem sentido buscar (estágio, júnior, pleno, sênior, especialista, staff/principal, lead, gestão). Sugira a partir da experiência e confirme; grave na linha `Senioridade-alvo` do CLAUDE.md, com os códigos indicados no comentário dela
- Ambientes a evitar
- Restrições de deslocamento ou local

### Seção 8: Referências (opcional)
Para cada referência:
- Nome, cargo, empresa, e-mail, telefone
- Relação com a pessoa

### Seção 9: Configuração da busca de vagas
Esta seção gera as buscas que alimentam o `/scrape`. Use as informações das Seções 1, 4 e 7 para montar buscas direcionadas.

Pergunte sobre:
- **Cargos a buscar:** os títulos para o mesmo trabalho variam muito entre empresas — uma vaga de "Cientista de Dados" numa empresa pode se chamar "Analista de Inteligência" ou "Consultor de Dados" em outra. Pergunte primeiro pela função: "Que tipo de trabalho você quer fazer no dia a dia?" Depois traduza em termos de busca: "Então, que cargos devo procurar? Por exemplo: Cientista de Dados, Engenheiro de ML, Analista de Dados Pleno." Colete de 3 a 8 títulos específicos, em português e, se fizer sentido, em inglês (muitas vagas de tecnologia no Brasil usam o título em inglês), mantendo a função de fundo em mente — ela alimenta os nomes das categorias em `search-queries.md` e a dimensão de experiência em `04-job-evaluation.md`. Lembre que vagas brasileiras costumam trazer o nível no título (júnior, pleno, sênior).
- **Competências como termos de busca:** "Quais das suas competências têm mais chance de aparecer nas vagas?" Escolha 3 a 5 distintivas e buscáveis.
- **Empresas-alvo (opcional):** "Há empresas específicas que você quer acompanhar?"
- **Abrangência geográfica:** "Em que cidades ou estados devo procurar? Até onde você aceita se deslocar? Aceita vagas remotas de qualquer lugar do Brasil?" Use isso para definir as faixas do filtro de local (ideal, aceitável, limite, longe demais).
- **Portais de vagas:** "O projeto já vem com o `gupy-search` (Portal Gupy, onde milhares de empresas brasileiras publicam vagas) e com CLIs que funcionam em qualquer país (`linkedin-search`, `freehire-search`, este focado em tecnologia), todos ligados por padrão. O `/scrape` descobre sozinho os portais instalados em `.agents/skills/` e pula os que têm `enabled: false`. Algum não faz sentido para você?" **Depois aja conforme a resposta:** se a pessoa não quiser um portal, ponha `enabled: false` no frontmatter do `SKILL.md` dele. Se precisar de um portal brasileiro que não vem no projeto (Vagas.com, Catho, InfoJobs, Indeed Brasil, Trampos, Programathor e outros), oriente a usar o `/add-portal`, que confere o `robots.txt` e os termos de uso antes de criar a skill. Buscas por WebSearch/`site:` continuam como plano B para portais sem CLI.
- **Idioma do currículo:** "Quer os currículos em português (o padrão para vagas no Brasil) ou em inglês?" Grave a resposta como uma linha `CV language: <idioma>` na seção Identity do CLAUDE.md. As cartas sempre seguem o idioma de cada vaga automaticamente; esta configuração vale só para o currículo. Se a pessoa estiver em dúvida, mantenha português e diga que dá para mudar depois com `/setup --section search`.

**Importante:** sugira também tipos de vaga que a pessoa talvez não tenha considerado, com base no perfil de competências. Por exemplo:
- Com Python forte + conhecimento de domínio: "Já pensou em vagas como 'Consultor Técnico' ou 'Engenheiro de Soluções' na sua área?"
- Com ML + um setor específico: "Empresas de setores vizinhos também contratam essas competências. Incluo buscas em [setor vizinho]?"
- Com experiência em gestão de projetos além da técnica: "Também quer buscar vagas de 'Gerente de Projetos Técnicos' ou 'Tech Lead'?"

Esse passo de sugestão ajuda a pessoa a descobrir caminhos de carreira que talvez não tivesse considerado.

---

## Passo 3: Gerar os arquivos do perfil

Com a coleta de dados completa, gere ou termine de preencher os arquivos abaixo. **No Caminho A**, os sete arquivos de perfil já foram preenchidos no Passo A7; confira cada um antes de gravar e pule se o conteúdo não for mais texto de modelo.

### 1. Atualizar `CLAUDE.md`
Troque todos os marcadores `[PLACEHOLDER]` pelas informações reais da pessoa. Mantenha intactos a estrutura, o fluxo e o checklist de verificação. Registre os regimes aceitos e os eliminatórios em "Deal-breakers".

### 2. Preencher `01-candidate-profile.md` *(Caminhos B e C; pule se o Caminho A preencheu)*
Escreva o perfil completo, com as seções: Identidade (incluindo o gênero gramatical para os textos e Idiomas, com os níveis), Formação, Experiência profissional, Projetos independentes, Competências técnicas, Publicações, Prêmios, Referências.

### 3. Preencher `02-behavioral-profile.md` *(Caminhos B e C; pule se o Caminho A preencheu)*
Escreva o perfil comportamental com base nos resultados da avaliação ou nas respostas sintetizadas.

### 4. Atualizar `04-job-evaluation.md` *(Caminhos B e C; pule se o Caminho A preencheu)*
Troque as áreas de competência pelas reais:
- Áreas fortes: [competências principais]
- Áreas medianas: [competências secundárias]
- Áreas fracas: [competências que faltam]

Atualize os objetivos de carreira e os filtros de motivação com as preferências reais.

### 5. Atualizar `05-cv-templates.md` *(Caminhos B e C; pule se o Caminho A preencheu)*
Acrescente modelos de resumo profissional por tipo de vaga, com base na trajetória, e personalize o bloco de contato dentro do modelo LaTeX do arquivo: troque `[FIRST_NAME]`, `[LAST_NAME]`, `[YOUR_ADDRESS]` (cidade e UF), `[YOUR_PHONE]`, `[YOUR_EMAIL]`, `[YOUR_LINKEDIN_URL]` e `[YOUR_GITHUB_URL]` (e `[YOUR_NAME]` no título do PDF) pelos dados reais. Confira este bloco qualquer que seja o caminho — o Caminho A extrai resumos dos documentos, não o bloco de contato. O `/apply` monta todo currículo personalizado a partir deste modelo, então um marcador esquecido aqui chega a um documento compilado.

### 6. Atualizar `06-cover-letter-templates.md` *(todos os caminhos — o Caminho A não preenche este bloco)*
Personalize a linha de contato e a assinatura dentro do modelo LaTeX do arquivo: troque `[YOUR_NAME]`, `[YOUR_EMAIL]`, `[YOUR_PHONE]` e `[YOUR_LINKEDIN_URL]` na linha `\namesection{}`, e `[YOUR_NAME]` em `\signature{}`. O Caminho A só incorpora padrões estruturais (aberturas, tópicos, fechamentos) a este arquivo, nunca o bloco de contato. O `/apply` compila toda carta a partir deste modelo.

### 7. Atualizar `07-interview-prep.md` *(Caminhos B e C; pule se o Caminho A preencheu)*
Crie exemplos STAR a partir da experiência real (pelo menos 3 ou 4). O Caminho A deixa esboços STAR em "## Candidatos a STAR (completar à mão)" em vez de exemplos completos; se houver esboços, mencione no Passo 4 para a pessoa saber que precisa completá-los.

### 8. Atualizar `cv/main_example.tex`
Troque os dados pessoais de exemplo pelo nome e contatos reais, e acrescente a formação e as experiências mais recentes. Siga as convenções do currículo brasileiro (sem CPF, idade, estado civil ou foto) e o idioma de currículo escolhido, inclusive nos títulos de seção.

### 9. Gerar `.claude/skills/job-scraper/search-queries.md`
Troque todos os marcadores do arquivo de buscas pelas informações reais da Seção 9 (ou das perguntas equivalentes do Passo A7 no Caminho A):
- Troque `[YOUR_PRIMARY_ROLE_TYPE]`, `[YOUR_PRIMARY_JOB_TITLE]` etc. pelos cargos reais
- Troque `[YOUR_KEY_SKILL]`, `[YOUR_DOMAIN_KEYWORD_1]` etc. pelas competências e termos de domínio reais
- Troque `[YOUR_CITY]`, `[YOUR_COUNTRY]`, `[YOUR_REGION]` pelo local real (cidade, Brasil, UF)
- Preencha as faixas do filtro de local (ideal, aceitável, limite, longe demais) conforme as restrições de deslocamento
- Organize as buscas em categorias de prioridade alinhadas à direção de carreira:
  - Prioridade 1: a direção de cargo mais forte ou mais desejada
  - Prioridade 2: o conhecimento de domínio
  - Prioridade 3: cargos vizinhos para onde a pessoa poderia migrar
  - Prioridade 4: cargos mais amplos (rede maior)

---

## Passo 4: Confirmar e próximos passos

Apresente um resumo:

> **Configuração concluída!** Veja o que foi gerado:
>
> - `CLAUDE.md` - O seu perfil completo
> - `.claude/skills/job-application-assistant/01-candidate-profile.md` - Perfil estruturado
> - `.claude/skills/job-application-assistant/02-behavioral-profile.md` - Avaliação comportamental
> - `.claude/skills/job-application-assistant/04-job-evaluation.md` - Método de avaliação personalizado
> - `.claude/skills/job-application-assistant/05-cv-templates.md` - Modelos de currículo com os seus resumos e o bloco de contato
> - `.claude/skills/job-application-assistant/06-cover-letter-templates.md` - Modelos de carta com a sua linha de contato e assinatura
> - `.claude/skills/job-application-assistant/07-interview-prep.md` - Exemplos STAR da sua experiência
> - `cv/main_example.tex` - O seu modelo de currículo em LaTeX
> - `.claude/skills/job-scraper/search-queries.md` - Buscas de vagas para o `/scrape`
>
> **Aviso de privacidade:** os arquivos acima agora contêm os seus dados pessoais e são *rastreados pelo git*.
> Um fork do modelo no GitHub é sempre público (forks de repositórios públicos não podem
> ser privados), então não faça push destes commits para um fork. Mantenha-os na sua máquina
> ou faça push para um repositório privado — veja a seção 8 do SETUP.md para configurar o remoto privado.
>
> **Experimente:**
> - Rode `/scrape` para buscar vagas compatíveis agora mesmo (a Gupy já vem ligada)
> - Rode `/apply` com a URL de uma vaga para ver o fluxo completo de candidatura
> - Rode `/setup --section search` depois para atualizar as buscas conforme as suas prioridades mudarem

Se o Caminho A deixou esboços STAR em `07-interview-prep.md`, diga também:

> O Caminho A deixou [N] esboços de candidatos a STAR em `07-interview-prep.md` que precisam dos seus detalhes de situação, tarefa, ação e resultado antes de você usá-los em entrevistas.

---

## Princípios de projeto

- Três caminhos de configuração chegam aos mesmos arquivos de perfil. O Passo 0 escolhe o caminho certo conforme o que há em `documents/`. Os Passos 3 e 4 são comuns.
- O Caminho A lê antes de gravar e é idempotente. Rodá-lo de novo à medida que documentos são acrescentados não duplica nem sobrescreve o conteúdo existente; conflitos aparecem para resolução explícita.
- O Caminho A marca os acréscimos comportamentais ou de estilo inferidos, para a pessoa revisá-los com senso crítico antes de confiar neles.
- Cada seção do Caminho C é uma conversa natural, não um formulário. A pessoa pode pular as seções opcionais.
- As respostas são sintetizadas em formatos estruturados (a pessoa não precisa saber markdown nem LaTeX).
- Pode rodar de novo com `--section <nome>` para atualizar seções específicas (ex.: `/setup --section search` para refazer as buscas sem refazer o perfil inteiro).
- A Seção 9 (busca) do Caminho C, e as perguntas equivalentes do Caminho A, sugerem proativamente tipos de vaga que a pessoa talvez não tenha considerado.
- Nunca deduza gênero pelo nome; nunca grave no perfil dados que o currículo brasileiro não deve levar (CPF, RG, idade, estado civil, foto).
- No fim, sugira rodar `/scrape` e `/apply` com uma vaga de teste.
