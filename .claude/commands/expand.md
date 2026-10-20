# /expand - Ampliar as competências a partir de documentos e da presença online

Você vai enriquecer o perfil descobrindo competências escondidas em documentos e na presença pública online da pessoa. Este comando só acrescenta — nunca modifica o conteúdo existente do perfil, só o amplia.

Siga estes passos **exatamente na ordem**. Não pule nenhum.

---

## Passo 0: Ler os arquivos de perfil existentes

Leia estes dois arquivos em paralelo antes de qualquer outra coisa. Você precisa saber o que já está lá para não propor duplicatas.

- `.claude/skills/job-application-assistant/01-candidate-profile.md`
- `.claude/skills/job-application-assistant/02-behavioral-profile.md`

Mantenha esse conteúdo no contexto durante todo o comando. Não releia esses arquivos depois.

---

## Passo 1: Descoberta — examinar todas as fontes

Examine toda fonte disponível atrás de "itens de experiência" — qualquer coisa que indique competência, conhecimento ou habilidade. Processe as fontes nesta ordem.

### 1a. documents/cv/
Leia todos os arquivos em `documents/cv/`. Extraia:
- Todo curso ou disciplina listado (inclusive disciplinas da faculdade e cursos online)
- Toda certificação citada, com emissor e data
- Todo tópico de responsabilidade profissional (ferramentas, métodos, resultados)
- Todo projeto independente ou paralelo
- Todo trabalho voluntário ou atividade extracurricular (empresa júnior, iniciação científica, monitoria, centro acadêmico)

### 1b. documents/linkedin/
Leia todos os arquivos em `documents/linkedin/`. Extraia:
- Cursos e certificações da seção "Licenças e certificados"
- A lista de competências e recomendações de competências
- Experiências de voluntariado
- A seção de projetos
- Qualquer item da plataforma que ainda não apareceu no currículo

### 1c. documents/diplomas/
Leia todos os arquivos em `documents/diplomas/`. Extraia:
- Todos os nomes de disciplinas listados nos históricos
- O título e a área do TCC, da dissertação ou da tese
- Qualquer ênfase, habilitação ou linha de pesquisa

### 1d. documents/references/
Leia todos os arquivos em `documents/references/`. Extraia:
- A linguagem de competências usada por quem recomenda (que habilidades ou qualidades cita)
- Quaisquer projetos, ferramentas ou métodos específicos citados

### 1e. Perfil do GitHub
Procure o usuário do GitHub em `01-candidate-profile.md`. Se houver uma URL ou um usuário do GitHub:

1. Use o WebFetch ou o WebSearch para obter o perfil público e os repositórios fixados
2. Para cada repositório encontrado:
   - Colete o README do repositório
   - Anote: nome, descrição, linguagem(ns) principal(is), tópicos/tags, frameworks ou bibliotecas citados no README
   - Se o repositório representar um projeto técnico independente (não um esboço vazio nem um fork sem personalização), extraia um resumo do projeto (domínio do problema, stack e resultados técnicos demonstráveis) para considerar em Projetos independentes
3. Obtenha também a lista completa de repositórios, se disponível (para pegar os não fixados)

Se não houver usuário nem URL do GitHub no perfil, pule esta fonte e registre que foi pulada.

### 1f. Outras URLs do perfil
Procure em `01-candidate-profile.md` outras URLs (portfólio, site pessoal, Kaggle, Google Scholar, ResearchGate, **Currículo Lattes**, links de publicações). Para cada uma:
- Colete a página
- Extraia ferramentas, métodos, conjuntos de dados, prêmios ou competências citados

---

## Passo 2: Enriquecimento pela web

Para cada item de experiência descoberto no Passo 1, busque na web as competências que ele implica. Aplique as duas abordagens abaixo — não escolha uma em vez da outra.

### Abordagem A: consulta direta (ferramentas e frameworks explícitos)
Se o item cita uma ferramenta, framework, biblioteca, método ou plataforma específica, busque diretamente:
- `"[Nome do curso] [Plataforma] ementa conteúdo programático"` ou `"[Course name] [Provider] syllabus learning outcomes"`
- `"[Nome da certificação] competências avaliadas guia do exame"`
- `"[Ferramenta/framework] o que se aprende"`

Colete a página mais relevante e extraia a lista de competências.

### Abordagem B: competências deduzidas (pela descrição e pelo contexto)
Para cada item, tendo ou não a Abordagem A achado algo, raciocine também a partir da descrição:
- Que domínio de problema este item trata?
- Que métodos, habilidades ou conhecimentos alguém precisa para fazer este trabalho?
- Qual é o conjunto padrão de ferramentas para este tipo de trabalho?

Junte as duas abordagens numa única lista de competências por item.

### Priorize a consulta na web para:
- Cursos online com nome (Coursera, edX, Udemy, LinkedIn Learning, DataCamp, fast.ai, Alura, DIO, Fundação Bradesco, Escola Virtual.Gov etc.)
- Certificações com nome (AWS, GCP, Azure, Databricks, Tableau, PMP etc.)
- Disciplinas universitárias com ementa padrão
- Repositórios do GitHub com README que cita tecnologias específicas

### Deduza (sem consulta na web) para:
- Tópicos genéricos de responsabilidade sem ferramenta citada
- Descrições vagas de projetos
- Linguagem de cartas de recomendação (já formulada como competência — só registre)

---

## Passo 3: Montar o mapa de competências

Depois de enriquecer todos os itens, monte um mapa de competências sem duplicatas. Agrupe os achados nestas categorias:

**Competências técnicas — principais** (linguagens, frameworks e métodos centrais que você usa com regularidade)  
**Competências técnicas — secundárias** (ferramentas que você já usou, mas não são principais)  
**Conhecimento de domínio** (área de especialidade: geofísica, ML, PLN etc.)  
**Métodos e práticas** (ágil, controle de versão, reprodutibilidade, testes etc.)  
**Comportamentais** (sinais de liderança, comunicação e colaboração vindos de recomendações e descrições de projetos)  
**Projetos independentes e portfólio** (projetos técnicos distintos do GitHub, com domínio do problema, stack e principal marco técnico)

Para cada competência, registre:
- O nome da competência
- O item de origem (ex.: "Coursera — Especialização em Deep Learning", "GitHub — repo-name", "Carta de recomendação — Maria Souza")
- Se veio de consulta direta (A), de dedução (B) ou de ambas

Para cada projeto, registre:
- Nome do projeto
- Resumo em uma linha: problema tratado, stack usado e resultado/impacto verificável
- Origem (ex.: "GitHub — repo-name")

Tire tudo o que já estiver em `01-candidate-profile.md` ou `02-behavioral-profile.md`.

---

## Passo 4: Apresentar o resumo agrupado

Apresente todas as competências novas e os projetos a acrescentar para a pessoa revisar antes de gravar qualquer coisa. Formato:

```
## O /expand encontrou [N] novos sinais de competência em [M] fontes

**CURSOS E CERTIFICAÇÕES**
Fonte: [Nome do curso/certificação — Plataforma]
  + [Competência 1]
  + [Competência 2]
  ...

**PROJETOS E PORTFÓLIO**
Fonte: [GitHub — repo-name]
  + [Nome do projeto]: [Problema, stack e resultado]
  ...

**GITHUB — [repo-name]**
Fonte: README + dedução pelo stack
  + [Competência 1]
  + [Competência 2]
  ...

**RESPONSABILIDADES PROFISSIONAIS — [Empresa, Cargo]**
Fonte: tópicos do currículo + consulta direta das ferramentas
  + [Competência 1]
  ...

**SINAIS COMPORTAMENTAIS**
Fonte: [Carta de recomendação — Nome / Sobre do LinkedIn / Liderança em projeto]
  + [Sinal 1]
  ...

[mais seções conforme necessário]
```

Depois pergunte:

> **Como você quer seguir?**
>
> - **`all`** — Acrescentar tudo acima ao seu perfil
> - **`review`** — Passo com você por cada grupo de fontes, um de cada vez
> - **`skip`** — Cancelar sem gravar nada
>
> Ou liste grupos específicos para pular (ex.: "pular GitHub, acrescentar o resto").

Espere a resposta antes de gravar qualquer coisa.

---

## Passo 5: Gravar os acréscimos confirmados

Aplique só os itens confirmados. Use a ferramenta Edit para acrescentar às seções relevantes de cada arquivo — não reescreva arquivos inteiros.

### Acréscimos ao `01-candidate-profile.md`
- Projetos independentes → acrescente à seção `## Projetos independentes`, no formato `- **[Nome do projeto]**: [Descrição com stack e resultado] *(GitHub — repo-name)*`
- Competências técnicas (principais e secundárias) → acrescente à seção Competências técnicas
- Conhecimento de domínio → acrescente à seção Conhecimento de domínio ou Competências técnicas (siga a estrutura existente)
- Métodos e práticas → acrescente onde fizer sentido

Para cada acréscimo, inclua uma breve anotação da origem num comentário ou entre parênteses: *(Coursera — Especialização em Deep Learning)*, *(GitHub — nome-do-projeto)* etc. Isso torna as próximas execuções do `/expand` idempotentes.

### Acréscimos ao `02-behavioral-profile.md`
- Sinais comportamentais → acrescente à seção "Comportamentos mais fortes" ou "Como você trabalha melhor" (os títulos `##` do arquivo como vem no modelo — siga a estrutura existente)
- Marque sempre os acréscimos comportamentais deduzidos: *[Deduzido da carta de recomendação — Nome / revise antes de confiar nisto]*

---

## Passo 6: Relatório final

Depois de gravar, apresente:

```
## /expand concluído

### Acrescentado ao 01-candidate-profile.md
[Liste cada competência e projeto independente acrescentado, com a origem]

### Acrescentado ao 02-behavioral-profile.md
[Liste cada sinal comportamental acrescentado, com a origem]

### Fontes processadas
[Liste cada fonte examinada e quantas competências ela rendeu]

### Fontes puladas
[Liste as fontes ausentes, vazias ou que não renderam nada novo — com um motivo curto]

### Precisa de revisão manual
[Itens ambíguos, parcialmente legíveis, ou em que a consulta na web não trouxe uma ementa clara]
```

---

## Princípios de projeto

- **Só acréscimos.** Este comando nunca modifica o conteúdo existente do perfil. Só acrescenta.
- **Origem rastreável.** Todo acréscimo registra de onde veio, para as próximas execuções serem idempotentes e a pessoa poder verificar ou remover itens individualmente depois.
- **As duas abordagens, sempre.** Consulta na web e dedução são aplicadas juntas — não como alternativas. Um curso com nome recebe a ementa oficial E uma lista de competências raciocinada.
- **A pessoa confirma antes de gravar.** O mapa completo de competências é mostrado e confirmado antes de qualquer arquivo ser tocado.
- **Sinais comportamentais são marcados.** Tudo o que for deduzido de tom, linguagem ou sinais indiretos é marcado como deduzido, para ser revisado com senso crítico.
- **O GitHub é examinado por inteiro.** Todos os repositórios públicos são conferidos, não só os fixados — repositórios não fixados muitas vezes têm sinais importantes de competência.
- **Portfólio e projetos apoiados em código.** Projetos independentes acrescentados ao perfil precisam refletir projetos reais encontrados em repositórios públicos do GitHub — nunca afirmações de projeto inventadas.
