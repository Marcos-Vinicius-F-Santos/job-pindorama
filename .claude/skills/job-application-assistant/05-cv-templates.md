---
framework_version: 1.5.0
---

# Modelos de currículo e guia de personalização

<!-- SETUP: o resumo profissional e a ordem das seções são personalizados pelo /setup -->

## Modelo: LaTeX fiel aos currículos de referência

Os currículos gerados pelo painel usam `cv/reference_template.tex`, que reproduz o layout dos PDFs de referência: papel Letter, corpo Times, títulos Helvetica em negrito, linhas horizontais, cabeçalho compacto e entradas de experiência/formação alinhadas em colunas.

**Arquivo gerado:** `cv/main_<company>_<role>.tex`
**Compilar com:** **lualatex** no MiKTeX/TeX Live. O pdflatex costuma falhar em instalações recentes do MiKTeX com erros de expansão de fonte do `fontawesome5`; o lualatex compila os mesmos arquivos sem problema.
**Referência principal:** `cv/reference_template.tex` (currículo completo, com todas as competências, experiências e conquistas — use como fonte para montar os currículos direcionados). `cv/main_example.tex` é legado e não deve ser usado para novas gerações.

### Comando de compilação

```bash
cd cv && lualatex -interaction=nonstopmode main_<company>_<role>.tex
```

Saída esperada: `Output written on main_<company>_<role>.pdf (2 pages, ...)`. Qualquer número de páginas diferente de 2 é uma falha a corrigir antes de mostrar à pessoa.

## Convenções do currículo brasileiro

Leia antes de montar qualquer currículo em português ou para vaga no Brasil.

**O que NÃO entra no currículo** (dados que abrem espaço para discriminação e que a LGPD manda
minimizar; nenhuma empresa séria precisa deles na triagem):
- **Foto**, salvo se a vaga pedir expressamente (alguns setores, como atendimento e moda, ainda pedem)
- **CPF, RG, CNH (número), título de eleitor, PIS**
- **Data de nascimento ou idade, estado civil, filhos, religião, gênero, saúde**
- **Endereço completo**: basta **cidade e UF** (o bairro só ajuda em vaga presencial em que o deslocamento pese)
- **Pretensão salarial**: vai no formulário ou na entrevista, quando perguntada (veja `08-application-forms.md`)
- **"Objetivo: conseguir uma vaga na área de..."**: substitua por um resumo profissional voltado à vaga

**O que entra no cabeçalho:** nome, cidade/UF, telefone com DDD (com +55 se a vaga for de empresa
estrangeira), e-mail profissional, LinkedIn e, quando fizer sentido, GitHub ou portfólio.
Pessoa com deficiência pode, **se quiser**, indicar "PcD" e o tipo de adaptação necessária,
especialmente ao concorrer a vagas afirmativas; é escolha dela, nunca automática.

**Títulos de seção em português** (veja a regra de idioma abaixo):

| Inglês (modelo) | Português |
|-----------------|-----------|
| Core Competencies / Skills | Competências |
| Professional Experience | Experiência Profissional |
| Education | Formação Acadêmica |
| Certifications | Cursos e Certificações |
| Languages | Idiomas |
| Publications | Publicações |
| Honors and Awards | Prêmios e Reconhecimentos |
| References | Referências |
| Available upon request. | Disponíveis mediante solicitação. |

**Referências** são raras em currículos brasileiros: em geral, omita a seção ou use só a linha
"Disponíveis mediante solicitação." quando sobrar espaço.

**Formação:** use os nomes do sistema brasileiro — "Bacharelado em ...", "Licenciatura em ...",
"Tecnólogo em ...", "Pós-graduação *lato sensu* (Especialização / MBA) em ...", "Mestrado em ...",
"Doutorado em ...". Curso em andamento: "Em andamento, conclusão prevista em 12/2026."

**Datas:** use o formato numérico `MM/AAAA - MM/AAAA` (ex.: `03/2016 - 07/2016`), com hífen ASCII
simples. Lê bem para recrutadores brasileiros e não depende do ATS entender abreviações de mês
em português. Emprego atual: `03/2022 - atual`.

**Números e moeda:** vírgula decimal e ponto de milhar no texto corrido ("R\$ 1,2 milhão",
"12.000 clientes"). Em LaTeX, o cifrão do real precisa de escape: `R\$`.

## Estrutura do documento

A fonte executável do layout atual é `cv/reference_template.tex`; o bloco `moderncv` abaixo é uma referência histórica do template legado e não deve ser copiado para novas gerações. Preserve a classe `article` em papel Letter, as fontes Times/Helvetica, as margens e as macros do template atual.

```latex
\documentclass[11pt,a4paper,sans]{moderncv}
\moderncvstyle{banking}
\moderncvcolor{blue}

% Força o nome e os títulos de seção a saírem no azul do moderncv (color1).
% O banking padrão deixa os dois em preto: o \colorlet de
% moderncvstylebanking.sty copia (não aponta para) a cor de destaque anterior
% ao esquema, então as cores do nome ficam congeladas antes do \moderncvcolor.
% Redefinir depois resolve. \namefont é o gancho por onde passam todas as
% macros de nome, então isto funciona também no moderncv 2.3.1 (apt do
% Debian/Ubuntu), que nem tem \firstnamestyle/\lastnamestyle.
\renewcommand*{\namefont}{\fontsize{34}{36}\bfseries\upshape}
\colorlet{firstnamecolor}{color1}
\colorlet{lastnamecolor}{color1}
\colorlet{namecolor}{color1}
\renewcommand*{\sectionstyle}[1]{{\sectionfont\color{color1}#1}}

\usepackage[utf8]{inputenc}
% Só para o caso de compilar com pdflatex (o motor documentado é o lualatex,
% que pula este ramo). Sem a codificação T1, o pdflatex monta letras
% acentuadas com \accent e a camada de texto do PDF guarda a letra decomposta
% - `a` + U+0303 em vez de U+00E3 -, então um ATS que procura "Gestão" não
% encontra, embora a página pareça certa. O moderncv 2.5 carrega T1 sozinho no
% pdflatex; o 2.3.1 (apt do Debian/Ubuntu) não. \ifpdftex vem do iftex, que
% toda versão do moderncv carrega.
\ifpdftex\usepackage[T1]{fontenc}\fi
% O moderncv carrega o hyperref num gancho \AtEndPreamble, então o
% \hypersetup precisa ir num \AtEndPreamble nosso: no moderncv < 2.4 um
% \usepackage{hyperref} solto conflita com o \RequirePackage[unicode]{hyperref}
% da própria classe. A partir da 2.4.0 a classe repassa as opções por
% \PassOptionsToPackage, o que elimina o conflito.
\AtEndPreamble{\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    filecolor=magenta,
    urlcolor=blue,
    pdftitle={Marcos Santos - CV},
    % Mantenha pdfpagemode=UseNone: este bloco roda depois do \AtEndPreamble
    % do próprio moderncv (o moderncv.cls define pdfpagemode ali), então um
    % FullScreen aqui ganharia e abriria todo currículo em tela cheia.
    pdfpagemode=UseNone,
}}
\usepackage[scale=0.80]{geometry}
\usepackage{import}

% Dados pessoais (veja "Convenções do currículo brasileiro": sem CPF, idade ou estado civil)
\name{Marcos}{Santos}
% Para o endereço, basta "Cidade - UF". Sem endereço a listar, APAGUE a linha
% inteira: \address{}{}{} falha com "There's no line here to end" em todas
% as versões do moderncv.
\address{Lagoa da Prata - MG}{}{}
\phone[mobile]{+55 37 99829-2763}
\email{marcossantosjdev@gmail.com}
\extrainfo{\href{https://www.linkedin.com/in/marcos-santos-b9b544214/}{LinkedIn}, \href{https://github.com/Marcos-Vinicius-F-Santos}{GitHub}}

\begin{document}
\makecvtitle

% 1. Resumo profissional (1-3 frases, personalizado por vaga)
% 2. Competências
% 3. Formação Acadêmica
% 4. Experiência Profissional
% 5. Publicações selecionadas (se houver)
% 6. Prêmios e Reconhecimentos (se houver)
% 7. Referências (em geral omitidas no Brasil)

\end{document}
```

### Ajuste de cores

O `\renewcommand*` em `\namefont` e as três linhas `\colorlet` no preâmbulo são necessários no lualatex+MiKTeX. Sem eles, o nome e os títulos de seção saem em preto mesmo com `\moderncvcolor{blue}`, o que destoa do resto do esquema azul (links, marcadores, ícones de contato). A causa: `moderncvstylebanking.sty` define as cores do nome com `\colorlet`, que *copia* a cor de destaque como ela está antes de o esquema ser aplicado, então as cores do nome ficam presas ao valor anterior; redefini-las com `\colorlet` depois de `\moderncvcolor{blue}` (como faz o preâmbulo) volta a apontá-las para `color1`. `\namefont` é o gancho comum de todas as macros de nome, então o bloco funciona em qualquer versão — inclusive o moderncv 2.3.1 do apt do Debian/Ubuntu, que nem tem `\firstnamestyle`/`\lastnamestyle`. Os dois nomes saem em negrito; para peso normal, troque `\bfseries` por `\mdseries` na linha do `\namefont` (o peso mora ali, então vale para o nome todo). Não remova os ajustes: na maioria das instalações recentes, o padrão sai visivelmente errado.

### Espaçamento dentro de listas itemize (importante)

**Não ponha `\vspace{...}` entre os `\item` de uma lista `itemize`.** Mesmo com o código simétrico, isso às vezes produz um espaço bem maior antes de um único item: o `\vspace` entre itens cria uma quebra de parágrafo que interage de forma imprevisível com o `\itemsep` interno da lista, e o LaTeX deixa um dos espaços maior que os outros. Remova o `\vspace` entre itens e deixe o `itemize` usar o espaçamento uniforme dele.

```latex
% ERRADO - de vez em quando gera um espaço exagerado antes de um item
\begin{itemize}
\item \textbf{Foo}: ...
\vspace{1pt}
\item \textbf{Bar}: ...
\vspace{1pt}
\item \textbf{Baz}: ...
\end{itemize}

% CERTO - espaçamento uniforme com o itemsep nativo da lista
\begin{itemize}
\item \textbf{Foo}: ...
\item \textbf{Bar}: ...
\item \textbf{Baz}: ...
\end{itemize}
```

Dois padrões parecidos estão corretos e devem ficar:
- `\vspace{1pt}` logo depois de `\section{...}` (entre o título da seção e o primeiro item) — fica entre o título e a lista, não entre itens.
- `\vspace{3pt}` entre blocos `\cventry` de nível superior em Experiência Profissional ou Formação — dá respiro entre um cargo e outro e sai consistente.

### Os títulos de seção precisam estar no idioma do currículo (importante)

Títulos como `\section{Core Competencies}`, `Professional Experience`, `Education`, `Languages`, `Publications`, `Honors and Awards`, `References` (e quaisquer outros que o seu modelo defina), além da linha `Available upon request.` sob Referências, são **texto fixo em inglês no modelo** — não se traduzem sozinhos. Sempre que o idioma do currículo (veja `CV language` no perfil) não for inglês, traduza também todos eles, não só o texto corrido. Um currículo com resumo e tópicos em português debaixo de títulos em inglês parece descuidado, e é fácil esquecer justamente porque a tradução do texto é a parte óbvia do trabalho. Para português, use a tabela de "Convenções do currículo brasileiro" acima. A mesma regra vale para qualquer outro idioma — confira explicitamente na verificação.

**Idioma padrão:** currículo em **português** para vagas no Brasil anunciadas em português; em
**inglês** quando a vaga está em inglês ou a empresa é estrangeira. Se a vaga pede inglês fluente
mas o anúncio está em português, o currículo fica em português (a fluência se mostra na seção
Idiomas e na entrevista).

## Personalização seção a seção

### Resumo profissional (boa prática)
É a seção mais importante de personalizar. Aparece logo depois de `\makecvtitle`.

Escreva de 5 a 7 linhas que funcionem como um "pitch": uma apresentação concisa e convincente de por que você é qualificada(o) para *esta vaga específica*. Foque no que a empresa ganha ao contratar.

Quando a vaga está fora da sua área de origem, **abra com o argumento de transferência** — a frase ou as duas que ligam a sua trajetória ao problema deles (ex.: física de ondas e processamento de sinais de radar) vão no início do resumo, não escondidas na carta. É a carta mais forte de quem muda de área; jogue primeiro.

**Crie 2 ou 3 modelos de resumo para os seus principais tipos de vaga:**

<!-- SETUP: preenchidos com base na sua trajetória -->
**Para vagas de backend Java / Java com Spring Boot:**
> Desenvolvedor de software com mais de 2 anos de experiência em aplicações corporativas, com foco em backend Java, integrações e entregas ponta a ponta. Experiência com Java 17/21, REST, SQL, SAP RFC/BAPI/JCo e Git, além de Spring Boot, testes automatizados, Flyway e Docker em projetos pessoais. Atua conectando levantamento com negócio, modelagem de dados, implementação e evolução de soluções com resultados mensuráveis.

**Para vagas de software engineering / full stack Java/React:**
> Software Developer com experiência em aplicações corporativas, modernização de interfaces, integrações e colaboração com usuários e times multidisciplinares. Combina backend Java, APIs REST, SQL, React, Angular, TypeScript e ferramentas de qualidade e entrega. Busca contribuir em soluções de software corporativo e transformação digital, mantendo o foco em problemas reais de negócio.

Resumos marcados com *[Used for: <company>_<role>]* foram extraídos de rascunhos de candidaturas arquivadas pelo Caminho A do `/setup`. São **referência de redação, nunca fonte de fatos**: ao usar um deles, toda afirmação factual continua vindo de `01-candidate-profile.md` — um rascunho antigo não garante a própria exatidão.

### Competências (boa prática)
Reordene e dê ênfase conforme a vaga. Use rótulos de categoria em negrito.

Liste **5 a 7 competências-chave** em tópicos, ajustadas à vaga. Para cada uma, explique rapidamente como ela agrega à posição.

Use o termo central da própria vaga no rótulo em negrito quando ele se aplicar de verdade — ATS e recrutadores que leem na diagonal comparam ao pé da letra, e "MLOps" num título funciona melhor que uma paráfrase como "Implantação de ML".

### Formação Acadêmica
- Inclua sempre as formações mais altas
- Em vagas sêniores, seja breve (datas e títulos)
- Inclua o tema do TCC, da dissertação ou da tese quando for relevante para a vaga

#### Formação em andamento precisa dizer isso explicitamente

**Só o intervalo de anos não basta.** Uma entrada `2025-2026`, vista no meio de 2026, parece um curso *concluído*, porque quem lê na diagonal trata intervalo fechado como encerrado. Um resumo dizendo "concluindo..." não resolve: é na entrada de formação que a pessoa confere o diploma, então ela tem de se sustentar sozinha.

Diga a situação dentro da própria entrada:

```latex
\item{\cventry{03/2025 - atual}{[Curso], [Área]}{[Instituição]}{[Cidade - UF]}{}{\vspace{1pt}
Em andamento, conclusão prevista em [MM/AAAA]. [Temas relevantes]
}}
```

Qualquer forma consistente serve: `Em andamento, conclusão prevista em <MM/AAAA>.` / `Conclusão prevista: <MM/AAAA>.` / um campo de data `2025 - atual`.

Declarar um diploma que ainda não se tem é uma informação falsa, e do tipo que aparece na checagem de diploma ou de referências, não na entrevista. Evitar não custa nada. O mesmo vale para certificações e cursos em andamento.

**Confira a coerência:** para quem ainda estuda, o resumo, a entrada de formação e qualquer observação de disponibilidade (ex.: estágio com horário limitado) precisam dar a mesma data de conclusão. Contradição entre elas é pior que qualquer versão isolada.

### Experiência Profissional
- Reescreva os tópicos para destacar o que mais importa para a vaga
- Use 4 a 6 tópicos no cargo mais recente, 3 a 4 no anterior e 2 a 3 nos mais antigos
- **Destaque resultados mensuráveis** sempre que der: "Reduzi o tempo de processamento em X%", "Modelo adotado pelo time"
- Regime não precisa aparecer (CLT, PJ, estágio), mas estágio e trabalho como PJ contam como experiência e devem ser listados como tal: "Analista de Dados (PJ)" é aceitável quando ajudar a explicar a trajetória

#### Compare o tempo no cargo com o que aparece de trabalho

Antes de fechar, olhe cada cargo como um estranho vai olhar: **duração versus quanto trabalho aparece.** Um cargo de dois anos representado por um único projeto parece pouca entrega, seja isso justo ou não. Quem lê não sabe o que preencheu o tempo, então supõe, e a suposição não é favorável.

Isso pesa mais para quem **mudou de área** (parte do tempo foi aprendendo o novo campo), para **trabalhos de ciclo longo** (implantação industrial, projetos clínicos ou regulatórios, pesquisa — uma entrega leva trimestres de verdade) e para quem a empresa manteve num único cliente ou produto.

Três correções honestas, em ordem de preferência:

1. **Mostre mais trabalho real.** Pergunte o que mais aconteceu no período. Muitas vezes há projetos secundários, ferramentas internas ou trabalho de suporte que nunca entraram no currículo por parecerem menores. Melhor correção quando o material existe.
2. **Deixe explícitas as fases do cargo.** Se o período teve etapas, diga — um começo aprendendo o domínio ou apoiando o time, depois a responsabilidade pelo trabalho nomeado até a entrega. Uma trajetória em fases parece crescimento; um bloco indistinto de vários anos parece estagnação.
3. **Diga o que fez o ciclo ser longo.** Coleta de dados em ambiente real, validação com especialistas, implantação e ajustes contra resultados reais. Quem conhece a área aceita isso na hora.

**Nunca** encha com projetos inventados e **nunca** encurte discretamente as datas para a proporção melhorar. As duas coisas são descobríveis, e as duas são piores que o problema de percepção que tentam resolver.

**Prepare a resposta da entrevista também.** Se um período longo com pouca entrega visível sobreviver a essas correções, a pergunta vai vir. A pessoa precisa de uma resposta pronta em duas partes — o que de fato preencheu o tempo e qual foi o resultado — registrada no material de entrevista, e não improvisada na hora.

### Lacunas no histórico (boa prática)
Se houver um período sem emprego:
- Explique com naturalidade, se for preciso
- Mostre como o desenvolvimento profissional continuou nesse período
- Apresente como formação deliberada e reposicionamento de carreira

### Publicações
- Inclua o link do Google Scholar ou do Currículo Lattes, se houver
- Selecione as 3 ou 4 mais relevantes (nem sempre todas)
- Em vagas fora da academia, seja breve

### Links de evidência
Sempre que o currículo citar algo verificável — um projeto público, uma participação em hackathon, uma publicação —, inclua o link (`\href`) para quem lê conferir com um clique. Um currículo cujas afirmações mais fortes podem ser checadas fica mais crível no resto também.

### Prêmios e Reconhecimentos
- Formato curto, uma linha cada

### Referências
- No Brasil, em geral omita a seção ou use só "Disponíveis mediante solicitação."
- Se a vaga pedir (comum em vagas internacionais), liste 2 a 4 referências com nome, cargo, empresa e contato
- **Não anexe cartas de recomendação** — quem contrata costuma falar direto com as referências

### LaTeX Special Characters (caracteres especiais do LaTeX — importante)

Vagas e dados do perfil chegam como texto simples; o currículo é LaTeX. Faça o escape destes caracteres onde quer que apareçam no texto — nomes de empresa, tópicos de conquistas, listas de competências:

| Caractere | Escreva | Onde costuma aparecer |
|---|---|---|
| `&` | `\&` | nomes de empresa: C\&A, Natura \&Co, P\&G |
| `%` | `\%` | conquistas com número: "reduzi a latência em 40\%" |
| `$` | `\$` | **todo valor em reais**: R\$ 1,2 milhão |
| `#` | `\#` | "1º lugar (\#1)", C\# |
| `_` | `\_` | nomes de arquivo, identificadores de código |
| `~` | `\textasciitilde{}` | URLs, "aprox." com til |
| `^` | `\textasciicircum{}` | versões, matemática |

Dois modos de falha pedem atenção especial:

- **O `%` falha em silêncio.** Um `%` sem escape inicia um comentário LaTeX: a compilação termina sem nenhum erro e tudo o que vem depois do `%` naquela linha some do PDF. `Reduzi a latência em 40% e economizei R$ 2 milhões por ano` sai como "Reduzi a latência em 40" — o tópico mantém o pedaço impressionante e perde o resultado. Tópicos com números são exatamente onde a orientação manda você chegar ("use números sempre que der"), então confira cada `%` de cada tópico antes de compilar. O `R$` sem escape (`R\$`) também quebra: o `$` abre modo matemático.
- **O `&` falha de forma barulhenta** dentro de `\cventry` (erros de tabulação de alinhamento, `Missing } inserted`). O ciclo de compilação pega, mas faça o escape dos nomes de empresa logo de início em vez de depurar a compilação.

Armadilha parecida: um tópico cujo texto começa com `[` literal precisa de chaves — `\item {[texto]}` —, senão o LaTeX lê o trecho entre colchetes como rótulo opcional do `\item` e o desenha cortado na margem esquerda, com a compilação limpa. Os tópicos de exemplo do currículo modelo estão entre chaves exatamente por isso.

## Ciclo de compilar e inspecionar (OBRIGATÓRIO)

Depois de escrever o currículo e antes de mostrar à pessoa, sempre compile e inspecione o PDF visualmente. Repita até o layout ficar limpo. Fluxo:

1. Rode `lualatex -interaction=nonstopmode main_<company>_<role>.tex`
2. Confira o número de páginas: precisa ser exatamente 2
3. Leia o PDF com a ferramenta Read e inspecione as duas páginas
4. Procure **entradas órfãs**: a linha de título de um `\cventry` nunca pode ficar sozinha no pé da página 1 com os tópicos na página 2

### Corrigindo quebras de página comuns

**Problema: título da entrada na página 1, tópicos órfãos na página 2**
Acrescente `\needspace{5\baselineskip}` logo antes do `\cventry` problemático:
```latex
\needspace{5\baselineskip}
\item{\cventry{AAAA-AAAA}{Cargo}{Organização}{Local}{}{...}}
```
Inclua `\usepackage{needspace}` no preâmbulo.

**Ressalva — use `\needspace` antes de entradas, nunca antes de `\section`.** Um `\needspace` no nível da seção empurra a seção inteira (título e conteúdo) para a página seguinte sempre que o pedido não cabe, deixando espaço vazio acima e, em geral, *acrescentando* uma página em vez de economizar. Aplique só no `\cventry` que de fato fica órfão, e só depois que uma compilação mostrar o órfão.

**Problema: uma seção final transborda para a página 3 (ex.: Referências sozinha na página 3)**
Acrescente `\enlargethispage{2-3\baselineskip}` antes de uma seção do fim (ex.: antes de `\section{Prêmios e Reconhecimentos}`) para esticar a página 2 em algumas linhas. É o resgate padrão do LaTeX para transbordos por pouco.

**Problema: 3 páginas com conteúdo significativo na página 3**
Corte conteúdo — não comprima a geometria nem os `\vspace`. Veja a regra em "Corte por relevância" abaixo.

**Problema: o conteúdo termina cedo na página 2 (parece ralo)**
Recoloque o item mais relevante que tinha sido cortado — um currículo que termina no meio da página 2 parece incompleto.

## Leitura por ATS

A maioria das empresas passa os currículos por um ATS (no Brasil, Gupy, Solides, InHire, Kenoby e outros) antes de uma pessoa ver, e o ATS lê a **camada de texto** embutida no PDF, não a página desenhada. Um currículo pode passar na inspeção visual e ainda assim ser extraído como lixo. Depois que o layout passar no ciclo de compilar e inspecionar, verifique a camada de texto:

```bash
python tools/verify_pdf.py cv/main_<company>_<role>.pdf --dump-text cv/main_<company>_<role>.txt
```

A extração tenta primeiro o **pypdf** (`pip install pypdf`, licença BSD), depois o `pdftotext` do Poppler. Se um plano B ainda usar `pdftotext -layout`, ele precisa passar também `-enc UTF-8`: versões baseadas no Xpdf usam Latin-1 por padrão, o que faz cada caractere não ASCII de um currículo perfeito voltar como caractere de substituição — um desastre para o português. Se nenhum extrator estiver disponível, pule a checagem mecânica com um aviso e confie na leitura visual do PDF para a cobertura de palavras-chave.

O que conferir na extração:

- **Contato como texto literal.** Os ícones de contato do fontawesome no modelo padrão são extraídos como nomes de glifo (`MOBILE-ALT`, `Envelope`) — ruído inofensivo, porque o endereço e o número estão impressos ao lado. A falha é um dado de contato que existe *só* num ícone ou num link (como o texto `LinkedIn`, cuja URL não está na camada de texto): invisível para o ATS. O e-mail precisa sempre aparecer como texto impresso.
- **Nada embaralhado.** Marcadores `(cid:NNN)` ou caracteres `�` indicam uma fonte embutida sem mapeamento Unicode — o ATS vê o mesmo lixo. Isso aparece com fontes incomuns em modelos personalizados, não com o moderncv padrão no lualatex.
- **Ordem de leitura.** O estilo banking padrão tem uma coluna só, então a ordem extraída bate com a visual. Modelos personalizados (via `/add-template`) com barra lateral ou várias colunas podem intercalar linhas sem relação; se a ordem extraída estiver embaralhada, a pessoa está trocando compatibilidade com ATS por aparência e deve ser avisada.
- **Cobertura de palavras-chave.** Compare os termos obrigatórios e desejáveis da vaga com o texto extraído, no idioma da vaga. Prefira o termo exato da vaga a um sinônimo quando ele se aplicar de verdade — a comparação do ATS costuma ser literal. Nunca acrescente uma palavra-chave que o perfil não sustente. `verify_pdf.py --contains` normaliza os dois lados quanto a espaços, normalização Unicode (NFC) e substituições tipográficas do LaTeX antes de comparar — `'` chega à camada de texto como U+2019 e `--` como U+2013, então `--contains "Master's degree"` e `--contains "2016-2024"` batem com o que o modelo de fato desenha. O `.txt` gerado nunca é normalizado: é a camada crua que o ATS vê, e por isso a checagem de datas abaixo lê esse arquivo, não o `--contains`.
- **Acentos intactos (plano B com pdflatex).** No pdflatex sem codificação T1, a camada de texto guarda as letras acentuadas decompostas (`a` + til combinante em vez de `ã`); o pypdf lê "Gest" `ao` com um acento solto, e nenhuma das formas bate com a palavra digitada. O modelo padrão se protege com `\ifpdftex\usepackage[T1]{fontenc}\fi`; mantenha a linha nos currículos personalizados e nos modelos próprios que possam ser compilados com pdflatex. No lualatex ela não faz nada.

### Datas precisam ser intervalos ASCII (falha de importação confirmada)

Vale saber porque a falha é **silenciosa**. Um currículo que passa em todas as outras checagens desta seção — extração limpa, sem `(cid:)`, contato intacto, ordem certa — ainda pode perder as datas na importação. Numa importação real no Workday, um currículo feito com este modelo perdeu a data de término de um contrato curto e não importou **nenhuma** entrada de formação, obrigando a redigitar tudo. Nada no PDF ou na camada de texto parecia errado.

Duas causas independentes, ambas fáceis de evitar:

1. **`--` numa data de `\cventry` vira travessão meia-risca (U+2013), não hífen.** O LaTeX junta `--` (dois hifens ASCII, U+002D) num único glifo de meia-risca, então `2016--2024` chega à camada de texto como `2016<U+2013>2024`. Muitos leitores só separam intervalos de datas no hífen ASCII e não enxergam intervalo nenhum. Escreva o argumento de data com **um hífen só**:

   ```latex
   \item{\cventry{03/2016 - 07/2024}{Cargo}{Organização}{Local}{}{...}}   % lido corretamente
   \item{\cventry{2016--2024}{Cargo}{Organização}{Local}{}{...}}          % meia-risca, pode falhar
   ```

   Isso vale **só para o argumento de data**. Mantenha `--` onde ele é tipograficamente correto no texto, por exemplo num intervalo numérico como `R\$ 600 mil--1 milhão`.

2. **Um ano solto não dá data de término ao leitor.** Um contrato curto, mandato ou estágio escrito como `\cventry{2016}` entra como data de início sem nada que a feche. Use um intervalo explícito, com meses quando o cargo durou menos de um ano:

   ```latex
   \item{\cventry{03/2016 - 07/2016}{Estágio}{Empresa}{Cidade - UF}{}{...}}
   ```

   Quando houver um intervalo real, use-o mesmo que um ano solto seja verdadeiro — um diploma escrito `1995` é verdade, mas importa pior que `1992-1995`. Não invente uma data de início que você não tem; um ano de formatura sozinho tudo bem, só espere ter de digitá-lo à mão.

**A causa 1 é verificada mecanicamente no passo 5d**: `python tools/verify_pdf.py cv/main_<company>_<role>.pdf --ascii-dates` varre a camada de texto crua atrás de um ano grudado num travessão Unicode e termina com código 1 citando cada ocorrência com o ponto de código (`U+2013 in 'Cargo 2016–2024'`). Lê a camada crua de propósito: a normalização que deixa `--contains "2016-2024"` bater com o que o modelo desenha converte essa mesma meia-risca de volta em `-`, então o `--contains` nunca vê isso. Basta um ano de qualquer lado do travessão, então `03/2016 – 07/2016` e `2016 – atual` também são pegos; um intervalo numérico sem ano (`R$ 600 mil–1 milhão`) fica de fora. **A causa 2 continua sendo uma leitura atenta**: depois de extrair a camada de texto, confirme que toda entrada de experiência tem início *e* fim. Como as duas falhas são silenciosas e invisíveis no PDF, de outro modo a pessoa só descobre ao preencher o formulário da candidatura.

## Orçamento de páginas — limite rígido de 2 páginas

O currículo **precisa** caber em exatamente 2 páginas compilado. Use estes limites como guia:

| Seção | Limite |
|-------|--------|
| Resumo profissional | 3-4 linhas |
| Competências | 5 itens, 1-2 linhas cada |
| Cargo mais recente | 4-5 tópicos |
| Cargo anterior | 2-3 tópicos |
| Cargos mais antigos | 2 tópicos (1 linha cada) |
| Formação | 2-3 entradas |
| Publicações | 2-3 entradas |
| Prêmios | 3 entradas, uma linha cada |
| Referências | "Disponíveis mediante solicitação." (uma linha) ou omitida |

**Na dúvida, corte em vez de espremer.** Reduzir `\vspace` ou a escala da geometria para forçar o conteúdo a caber deixa o currículo apertado.

## Corte por relevância (o jeito certo de encolher um currículo)

**Corte por sinal, não por seção.** Listas fixas de prioridade ("primeiro tire a formação mais antiga, depois encurte o cargo mais antigo...") erram quando um item relevante de "baixa prioridade" disputa com um item irrelevante de "alta prioridade". Um tópico de cargo antigo que fala direto com a vaga vale mais que um tópico de cargo recente que não fala.

Para cada linha candidata ao corte, avalie três coisas:

1. **Relevância para ESTA vaga** — a linha toca uma ferramenta, palavra-chave ou responsabilidade citada no anúncio?
2. **Exclusividade** — é o único lugar em que a afirmação aparece, ou ela se repete em outro ponto do currículo?
3. **Peso na narrativa** — a carta depende dela? Se cortar a linha obrigar a reescrever um parágrafo da carta, ela é estrutural.

Corte primeiro a linha de menor pontuação total, em qualquer seção.

### Ordem prática de cortes (do mais fácil ao último recurso)

1. **Redundância.** Se uma conquista aparece em Competências E num tópico de cargo, em geral a versão de Competências é o corte mais limpo (o tópico de experiência é evidência mais concreta).
2. **Enchimento no resumo.** Uma frase que só repete o que Publicações ou Competências vão mostrar. ("Publicações revisadas por pares sobre X..." já é uma entrada de Publicações — o resumo pode citar uma vez e parar.)
3. **Tópicos de experiência pouco relevantes.** Um tópico sobre um trabalho que não toca as palavras-chave da vaga, onde quer que esteja. Isso corta entre seções antes de mexer na lista estrutural.
4. **Conteúdo de apoio pouco relevante.** Um tópico de cargo antigo que não fala com a vaga. Uma certificação que não toca as ferramentas da vaga. Uma entrada de idioma que cabe numa linha.
5. **Publicações pouco relevantes.** Mantenha 1 ou 2 que mais combinem com a vaga. Corte o resto antes de mexer nos tópicos de experiência.
6. **Cortes estruturais, último recurso.** A formação mais antiga, reduzir um cargo antigo a 2 tópicos, juntar Certificações numa linha. Só acontecem se os cortes por relevância acima já se esgotaram.

### Armadilhas a evitar

- Não corte mecanicamente do fim de uma lista fixa de seções sem conferir a relevância. "Corte primeiro o cargo mais antigo" está errado se esse cargo é literalmente sobre a competência que a vaga pede.
- Não corte o único exemplo concreto em que a carta se apoia. A relevância se mede em relação à carta que você escreveu, não só à vaga — quem entrevista vai ter lido as duas.
- Não corte para caber se o excesso for mínimo (2,02 páginas). Prefira `\enlargethispage{2-3\baselineskip}` numa seção do fim para transbordos por pouco; reserve os cortes de conteúdo para transbordo real (conteúdo na página 3 além de uma única seção final).

## Ordem recomendada das seções

A ordem varia conforme o tipo de vaga:

**Para vagas técnicas / ciência de dados / ML:**
1. Resumo profissional
2. Competências
3. Experiência Profissional (da mais recente para a mais antiga)
4. Formação Acadêmica (da mais recente para a mais antiga)
5. Idiomas
6. Publicações e Prêmios
7. Referências (em geral omitida no Brasil)

**Para vagas especializadas / de domínio específico:**
1. Resumo profissional
2. Competências
3. Formação Acadêmica (da mais recente para a mais antiga) — o diploma é um qualificador-chave
4. Experiência Profissional (da mais recente para a mais antiga)
5. Publicações e Prêmios
6. Referências (em geral omitida no Brasil)
