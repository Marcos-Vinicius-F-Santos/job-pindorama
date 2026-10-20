---
framework_version: 1.1.0
---

# Modelos de carta de apresentação e guia de personalização

## Modelo: cover.cls próprio (XeLaTeX)

As cartas usam uma classe LaTeX própria (`cover.cls`) com as fontes Lato e Raleway.

**Arquivo gerado:** `cover_letters/cover_<company>_<role>.tex`
**Compilar com:** XeLaTeX (o cover.cls exige fontspec)
**Pasta de fontes:** `cover_letters/OpenFonts/fonts/`

### Comando de compilação

```bash
cd cover_letters && xelatex -interaction=nonstopmode cover_<company>_<role>.tex
```

Saída esperada: `Output written on cover_<company>_<role>.pdf (1 page, ...)`. Qualquer número de páginas diferente de 1 é uma falha a corrigir antes de mostrar à pessoa.

## Carta de apresentação no Brasil

Muitos processos seletivos brasileiros **não pedem carta**. Antes de redigir, veja o que a vaga
e o formulário pedem:

- **A vaga pede carta, ou o formulário tem campo de anexo para ela:** faça a carta completa deste modelo.
- **O formulário tem um campo de texto** ("Por que você quer trabalhar aqui?", "Conte um pouco sobre você", "Mensagem para quem recruta"): escreva uma versão curta, em texto puro, respeitando o limite de caracteres do campo (na Gupy costuma haver um). Use os mesmos argumentos da carta, condensados. Veja `08-application-forms.md`.
- **Candidatura simplificada** (LinkedIn "Candidatura simplificada", Gupy "candidatura rápida"), sem campo para carta: não force. Uma mensagem curta para quem recruta no LinkedIn cumpre o papel.
- **Vaga em inglês ou empresa estrangeira:** a carta completa, em inglês, é esperada.

## Ciclo de compilar e inspecionar (OBRIGATÓRIO)

Depois de escrever a carta e antes de mostrar à pessoa, sempre compile e inspecione o PDF visualmente. Repita até o layout ficar limpo:

1. Rode `xelatex -interaction=nonstopmode cover_<company>_<role>.tex`
2. Confirme que tem exatamente 1 página e que a compilação deu certo
3. Leia o PDF com a ferramenta Read e confira: a assinatura cabe no pé, nenhum texto cortado, a fonte dos tópicos igual à do corpo

### Armadilha conhecida do modelo: itemize dentro de `\lettercontent{}`

A macro `\lettercontent{}` acrescenta `\\` ao fim do argumento. Isso quebra quando o argumento termina em `\end{itemize}`, porque o `\\` não tem linha para quebrar depois que o ambiente fecha, e o resultado é `! LaTeX Error: There's no line here to end.` e nenhum PDF.

**Errado (quebra a compilação):**
```latex
\lettercontent{Veja como a minha experiência se conecta à vaga:
\begin{itemize}
    \item ...
\end{itemize}}
```

**Certo — feche o `\lettercontent{}` antes da lista e envolva a lista na mesma fonte Raleway-Medium, para a tipografia continuar igual:**
```latex
\lettercontent{Veja como a minha experiência se conecta à vaga:}

{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\fontsize{11pt}{13pt}\selectfont
\begin{itemize}
    \item ...
\end{itemize}\par}
\vspace{6pt}

\lettercontent{[próximo parágrafo]}
```

O envoltório de fonte é obrigatório — se você só tirar o `\begin{itemize}` de dentro do `\lettercontent{}` sem o bloco `\fontspec`, os tópicos saem na fonte padrão do corpo (Lato) e destoam do resto da carta.

## Estrutura do documento

```latex
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Carta de apresentação - [Empresa], [Cargo]
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\documentclass[]{cover}
\usepackage{fancyhdr}

\pagestyle{fancy}
\fancyhf{}

\rfoot{Página \thepage \hspace{0pt}}
\thispagestyle{empty}
\renewcommand{\headrulewidth}{0pt}
\begin{document}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%     NOME NO TOPO
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\namesection{}{\Huge{[YOUR_NAME]}}{  \href{mailto:[YOUR_EMAIL]}{[YOUR_EMAIL]} | [YOUR_PHONE] |  \urlstyle{same}\href{[YOUR_LINKEDIN_URL]}{LinkedIn}
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%     CONTEÚDO DA CARTA
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% Data por extenso, à mão: o \today sem configuração de idioma sai em inglês.
\currentdate{[Cidade], [dia] de [mês] de [ano]}
\lettercontent{Olá, [Nome],}

\lettercontent{[Abertura - a vaga e a ligação com a sua trajetória, 2-3 frases]}

\lettercontent{[Corpo - a experiência mais relevante, apresentando a lista de tópicos]}

{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\fontsize{11pt}{13pt}\selectfont
\begin{itemize}
    \item {[Conquista ou competência concreta 1]}
    \item {[Conquista ou competência concreta 2]}
    \item {[Conquista ou competência concreta 3]}
\end{itemize}\par}

\lettercontent{[Ligação com a empresa - por que esta vaga, por que esta empresa em particular]}

\lettercontent{[Encaixe pessoal - pontos fortes de comportamento, contribuição para o time, 2-3 frases]}

\lettercontent{Fico à disposição para conversarmos.}

\begin{flushright}
% Sem \\ no fim de \closing{} - o cover.cls já acrescenta o seu \\, e uma
% quebra dupla gera "! LaTeX Error: There's no line here to end."
\closing{Atenciosamente,}

\signature{[YOUR_NAME]}
\end{flushright}
\end{document}
```

## Referência rápida de comandos

| Comando | Para quê |
|---------|----------|
| `\namesection{}{Nome}{contato}` | Cabeçalho com nome e contato |
| `\currentdate{data}` | Campo de data (em português, escreva por extenso: `São Paulo, 19 de outubro de 2026`) |
| `\lettercontent{texto}` | Parágrafo do corpo (com espaço depois) |
| `\closing{texto}` | Linha de despedida |
| `\signature{nome}` | Nome impresso abaixo da assinatura |

## Orientações de personalização

### Saudação
**Não adivinhe o gênero pelo nome.** Use formas neutras:
- Sabe o nome de quem recruta ou da liderança: "Olá, [Nome]," (aceito na maioria das empresas, de startups a multinacionais)
- Ambiente mais formal (setor público, jurídico, bancos tradicionais) ou sem nome: "Prezada equipe de recrutamento da [Empresa],"
- Se a própria pessoa recrutadora indicar como prefere ser tratada (no LinkedIn, na assinatura do e-mail), siga a indicação
- Evite "A quem possa interessar" e "Prezados senhores"

### Tamanho — limite rígido de 1 página
- Meta: 1 página, incluindo a assinatura
- Máximo: **nunca passe de 1 página**
- **Orçamento de palavras: 230 a 280 palavras** no corpo (sem contar a marcação LaTeX). O português ocupa mais espaço que o inglês por palavra; 330 palavras transbordam.
- **Conte sempre**: abertura + parágrafo com a lista + fechamento = 3 blocos. Acrescente um 4º só se os outros forem curtos.
- Ao acrescentar algo específico da empresa, corte em outro lugar para compensar, em vez de aumentar o total

### Entrelinha
- Acrescente `\usepackage{setspace}` e `\setstretch{1.0}` se a carta estiver longa e precisar caber em uma página
- Use `\vspace{.5cm}` entre as partes principais para facilitar a leitura (só se houver espaço)

### Listas de tópicos
- Ponha `\begin{itemize}...\end{itemize}` **fora** de um bloco `\lettercontent{}` (veja "Armadilha conhecida do modelo" acima), envolvido no `\fontspec` Raleway-Medium correspondente, para a fonte dos tópicos ser a do corpo
- 3 a 5 tópicos é o ideal
- Comece cada tópico com um rótulo em negrito ou um verbo de ação
- Use `\textbf{Rótulo:}` em tópicos por categoria
- Um tópico cujo texto começa com `[` literal precisa de chaves: `\item {[texto]}`. Sem chaves, o LaTeX lê `[texto]` como rótulo opcional do `\item` e o desenha fora da margem esquerda, ausente da camada de texto do PDF

### LaTeX Special Characters (caracteres especiais do LaTeX)
Faça o escape destes caracteres onde aparecerem no texto:
- E comercial: `\&` (nomes de empresa: C\&A, Natura \&Co) — sem escape, a compilação falha com erro
- Porcentagem: `\%` ("aumentei a receita em 30\%") — sem escape, **não** dá erro: tudo depois do `%` naquela linha some em silêncio, como comentário LaTeX
- Cifrão: `\$` (todo valor em reais: `R\$ 50 mil`), cerquilha: `\#`, sublinhado: `\_`
- Til: `\textasciitilde{}`, circunflexo: `\textasciicircum{}`, barra invertida: `\textbackslash{}`

### Idioma da carta
- A carta segue o **idioma da vaga**: vaga em português, carta em português; vaga em inglês, carta em inglês
- Mesma estrutura de modelo em qualquer idioma
- Português: data "São Paulo, 19 de outubro de 2026", despedida "Atenciosamente,", rodapé "Página"
- Inglês: data "October 19, 2026" (ou `\today`), despedida "Kind regards,", rodapé "Page"
- Outros idiomas: ajuste data e despedida à convenção local

## Checklist antes de finalizar
- [ ] Sem travessões (use vírgulas ou pontos)
- [ ] Sem clichês nem enchimento ("sou uma pessoa proativa e dinâmica")
- [ ] Toda afirmação apoiada em exemplo específico
- [ ] Enquadramento voltado ao futuro: foca nos problemas que você vai resolver, não só nas tarefas passadas
- [ ] A motivação cita a missão ou os valores desta empresa em particular
- [ ] Nome da empresa e cargo corretos do começo ao fim
- [ ] Data atual, por extenso e no idioma da carta
- [ ] Cabe em uma página
- [ ] Idioma igual ao da vaga
- [ ] Saudação adequada e neutra (com nome, se possível)
- [ ] Abertura envolvente e específica, não genérica

## Orientações de envio (boa prática)
- Envie só os documentos que a empresa pede
- Exporte em PDF para preservar a formatação
- Dê nomes claros aos arquivos: "[Seu Nome] - Currículo" e "[Seu Nome] - Carta de Apresentação"
- Siga todas as instruções da empresa sobre anonimato ou materiais específicos (alguns processos às cegas pedem currículo sem nome e sem foto)
