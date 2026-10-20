# /add-template - Registrar um modelo próprio de currículo ou carta

Você vai ajudar a pessoa a registrar o próprio modelo de currículo ou de carta de apresentação no projeto — LaTeX, Typst ou qualquer outra ferramenta que gere PDF pela linha de comando. O projeto vem com o moderncv (estilo banking) para currículos e um `cover.cls` próprio para cartas. Este comando deixa a pessoa trocar pelo modelo dela: guardar os arquivos do modelo, registrar as instruções de uso (extensão do fonte, comando de compilação, fontes tipográficas, regras de estilo, limite de páginas), verificar que o modelo compila e ligá-lo ao fluxo do `/apply`, para toda candidatura futura usá-lo.

`$ARGUMENTS` pode conter um subcomando, um caminho de arquivo ou nada.

Siga estes passos **na ordem**.

---

## Passo 0: Interpretar os argumentos

- Se `$ARGUMENTS` contiver `--list`: rode o **Modo lista** abaixo e pare.
- Se `$ARGUMENTS` contiver `--use <nome>`: rode o **Modo troca** abaixo e depois siga para o **Passo 5: Ativar** com os metadados do modelo resolvidos. `--use default` desativa qualquer modelo próprio e restaura as orientações padrão (veja o Passo 5).
- Se `$ARGUMENTS` contiver um caminho de arquivo ou um arquivo mencionado com @: trate-o como o fonte do modelo e leve-o para o Passo 1.
- Caso contrário: comece o registro no Passo 1.

### Modo lista

Use o Glob com `templates/**/TEMPLATE.md` para achar os modelos registrados. Para cada um, leia o manifesto e imprima uma tabela:

```
## Modelos registrados

| Nome | Tipo | Fonte | Ferramenta | Fontes tipográficas | Ativo |
|------|------|-------|------------|---------------------|-------|
| <nome> | Currículo / Carta | .tex/.typ/... | lualatex/typst/... | <fonte principal> | sim/não |
```

Um modelo está **ativo** se o `05-cv-templates.md` (currículo) ou o `06-cover-letter-templates.md` (carta) tiver um bloco gerenciado `ACTIVE-TEMPLATE` que o cite. Se não houver modelos próprios, diga isso e explique que o `/add-template` registra um. Pare aqui.

### Modo troca

Se `$ARGUMENTS` contiver `--use <nome>`:

1. Se `<nome>` for `default`, pule a resolução do modelo e siga para o Passo 5 com `default` como alvo da ativação.
2. Use o Glob com `templates/**/TEMPLATE.md` e ache os manifestos cuja pasta-mãe tenha exatamente o nome `<nome>`.
3. Se nenhum manifesto corresponder, pare e diga que o modelo não está registrado. Sugira `/add-template --list` para ver os nomes disponíveis.
4. Se mais de um manifesto corresponder, pare e liste os caminhos dos manifestos. Peça à pessoa para renomear um dos modelos; a ativação precisa ser inequívoca.
5. Leia o `TEMPLATE.md` correspondente e extraia:
   - **Tipo:** `Currículo` ou `Carta`
   - **Extensão do fonte:** ex.: `.tex`, `.typ`
   - **Comando de compilação:** o comando completo declarado
   - **Ferramenta:** ex.: `lualatex`, `typst` (rótulo de exibição)
   - **Limite de páginas:** `<N> página(s)`
   - **Fontes tipográficas:** a linha completa de resumo das fontes
6. Derive a pasta do modelo a partir do caminho do manifesto e confira se `template<extensão>` existe na mesma pasta. Se não existir, pare com um erro; o registro do modelo está incompleto.
7. Derive o `<tipo>` para o Passo 5 a partir do caminho do manifesto:
   - `templates/cv/<nome>/TEMPLATE.md` -> `cv`
   - `templates/cover_letters/<nome>/TEMPLATE.md` -> `cover_letters`
8. Siga para o Passo 5 usando `<nome>`, `<tipo>`, `<extensão>`, `<comando de compilação>`, o rótulo da ferramenta, o resumo das fontes, o limite de páginas, o caminho do esqueleto e o caminho do manifesto resolvidos. Não rode de novo os Passos 1-4; o `--use` troca um modelo já registrado.

---

## Passo 1: Tipo e fonte do modelo

Pergunte à pessoa (pule o que `$ARGUMENTS` já responder):

1. **Tipo:** é um modelo de **currículo** ou de **carta de apresentação**?
2. **Fonte:** onde está o modelo? Aceite qualquer um destes:
   - Um caminho ou uma menção @ a um arquivo-fonte de qualquer ferramenta (`.tex` mais `.cls`/`.sty` opcionais, `.typ` mais pacotes locais opcionais, ou outro formato que compila para PDF)
   - O conteúdo do modelo colado
   - Uma pasta com o modelo e os arquivos que ele usa (arquivos de classe/pacote, fontes, imagens)

Leia todos os arquivos fornecidos. Se o modelo incluir algo que a ferramenta declarada não traz por padrão — um `.cls`/`.sty` próprio que não faz parte das distribuições TeX comuns, um pacote Typst importado por um `#import` local, ou o equivalente em outra ferramenta —, confirme que a pessoa tem o arquivo e peça se faltar — o modelo não compila sem ele.

---

## Passo 2: Registrar as instruções do modelo

Entreviste a pessoa sobre os metadados de que o `/apply` precisa para usar o modelo corretamente. Deduza o máximo possível do fonte primeiro (LaTeX: documentclass, chamadas `\fontspec`, geometry, cores; Typst: regras `#set`/`#show`, `#import`s; outras ferramentas: o que o formato expuser) e apresente as suas deduções para confirmação, em vez de fazer perguntas às cegas.

Colete:

1. **Nome** - identificador curto em kebab-case (ex.: `awesome-cv`, `classico-serifado`). Não pode colidir com uma pasta existente em `templates/`.
2. **Extensão do fonte** - a extensão do arquivo principal (`.tex`, `.typ`, ...), deduzida do arquivo-fonte fornecido.
3. **Comando de compilação** - o comando completo que o `/apply` e a compilação de teste do Passo 4 vão rodar, usando `<file>` (sem extensão) como marcador do nome base de saída:
   - **Fonte `.tex`**: deduza o motor como antes — se o fonte usa `fontspec` ou carrega arquivos de fonte por caminho, ele exige `xelatex` ou `lualatex`; diga isso à pessoa em vez de deixá-la escolher o `pdflatex`. Escreva como `rm -f <file>.pdf && mkdir -p build && lualatex -interaction=nonstopmode -output-directory=build <file>.tex && mv build/<file>.pdf ./` (ou o motor adequado).
   - **Fonte `.typ`**: o padrão é `typst compile <file>.typ <file>.pdf` — o Typst tem um único binário, sem escolha de motor.
   - **Qualquer outro**: sem orientação embutida; peça à pessoa o comando exato de compilação.

   **Regra da pasta de compilação:** se a ferramenta consegue redirecionar os arquivos intermediários, o comando declarado os manda para uma pasta `build/` ao lado do fonte, e mesmo assim deixa o PDF ao lado do fonte, onde o `/apply` o lê. No LaTeX, use `-output-directory=build`. Ele também move o PDF, daí o `mv`. O TeX Live não cria a pasta, daí o `mkdir -p`. Uma compilação que falha pula o `mv`, daí o `rm -f` no começo, para uma compilação LaTeX com falha nunca deixar um PDF velho onde o `/apply` inspeciona. Depois de uma compilação com falha, leia o log em `build/`. Se o Passo 4 falhar só por causa do redirecionamento (ex.: `\include` de uma subpasta), tire o redirecionamento mas mantenha o `rm -f` do começo, e registre o motivo em "Armadilhas conhecidas". Se a ferramenta não grava nada além do PDF (`typst compile`) ou não tem opção de redirecionar, mantenha o comando como está — nunca trave o registro por causa desta regra.
4. **Fontes tipográficas** - que fonte(s) o modelo usa e de onde vêm:
   - **Arquivos de fonte incluídos** (`.ttf`/`.otf` que vêm com o modelo): copie-os para a pasta do modelo no Passo 3 e registre o caminho relativo usado para carregá-los (`Path` do `\fontspec` no LaTeX, caminho de fonte no Typst, ou equivalente).
   - **Fontes do sistema / da distribuição**: registre o nome da fonte e anote que a máquina da pessoa precisa tê-la instalada.
5. **Regras de estilo** - o que a redação precisa preservar ao preencher o modelo: esquema de cores, ordem das seções, estilo dos títulos, espaçamento, formato dos tópicos, formato das datas (no Brasil, `MM/AAAA - MM/AAAA` — veja `05-cv-templates.md`).
6. **Limite de páginas** - número rígido de páginas do PDF compilado. Padrão: **2 páginas** para currículo, **1 página** para carta. O ciclo de compilar e inspecionar do `/apply` faz valer este limite.
7. **Armadilhas conhecidas** (opcional) - macros ou regras que quebram com certo conteúdo (como a interação `\lettercontent{}`/`itemize` do modelo padrão), caracteres que precisam de escape (o `R\$` dos valores em reais!), seções que não podem ser reordenadas.

---

## Passo 3: Guardar o modelo

Crie a pasta do modelo:

- Currículo: `templates/cv/<nome>/`
- Carta: `templates/cover_letters/<nome>/`

Grave nela:

1. **`template<extensão>`** (ex.: `template.tex`, `template.typ`) - o esqueleto do modelo. Troque todos os dados pessoais do fonte por marcadores `[PLACEHOLDER]` (`[YOUR_NAME]`, `[YOUR_EMAIL]`, `[YOUR_PHONE]`, `[YOUR_LINKEDIN_URL]`, ...), para o modelo poder ser compartilhado e não depender do perfil. Mantenha a estrutura, o preâmbulo e o estilo exatamente como fornecidos.
2. **Arquivos de classe/estilo/pacote** - copie os arquivos que acompanham o modelo (`.cls`/`.sty` no LaTeX, pacotes Typst locais, ou equivalentes) ao lado do esqueleto.
3. **`fonts/`** - copie aqui os arquivos de fonte incluídos, preservando a organização de pastas que o mecanismo de carregamento de fontes da ferramenta espera (`Path` do `\fontspec` no LaTeX, caminho de fonte no Typst, ...). Ajuste esses caminhos no esqueleto para serem relativos à pasta do modelo.
4. **`TEMPLATE.md`** - o manifesto. Use exatamente este formato:

```markdown
# Modelo: <nome>

- **Tipo:** Currículo | Carta
- **Extensão do fonte:** .tex | .typ | ...
- **Ferramenta:** lualatex | xelatex | pdflatex | typst | <outra> (só rótulo de exibição)
- **Limite de páginas:** <N> página(s)
- **Fontes tipográficas:** <fonte principal> (<incluída em fonts/ | fonte do sistema - precisa estar instalada>)
- **Classe/pacotes:** <documentclass/imports e pacotes fora do padrão, ou "padrão">

## Comando de compilação

    cd <pasta de saída> && <o comando completo declarado, ex.: rm -f <file>.pdf && mkdir -p build && lualatex -interaction=nonstopmode -output-directory=build <file>.tex && mv build/<file>.pdf ./ ou typst compile <file>.typ <file>.pdf>

## Regras de estilo

- <regra 1: cores, ordem das seções, estilo dos títulos, ...>
- <regra 2>

## Armadilhas conhecidas

- <armadilha e a correção, ou "nenhuma registrada">
```

---

## Passo 4: Verificar se o modelo compila (OBRIGATÓRIO)

Nunca registre um modelo sem uma compilação de teste bem-sucedida. Modelos que "parecem certos" falham com frequência por fonte faltando, classe ou pacote faltando, ou comando de compilação errado.

1. Copie `template<extensão>` para um arquivo de rascunho na mesma pasta (ex.: `_compile_test.tex` ou `_compile_test.typ`) e preencha todo `[PLACEHOLDER]` com dados fictícios realistas (nome, linha de contato, uma formação, um cargo com 3 tópicos — conteúdo suficiente para exercitar o layout), incluindo letras acentuadas (ç, ã, é) para conferir que a fonte as tem.
2. Compile com o comando declarado, trocando `<file>` por `_compile_test`:
   ```bash
   cd templates/<tipo>/<nome> && <comando declarado com <file> -> _compile_test>
   ```
3. Se a compilação falhar: mostre à pessoa as linhas de erro relevantes, diagnostique (arquivo de fonte faltando, motor/comando errado, classe ou pacote faltando), corrija o que puder (ex.: caminhos de fonte) e compile de novo. Se a correção precisar de algo que só a pessoa tem (um arquivo de fonte faltando, uma classe com licença restrita), peça e espere.
4. Com sucesso, confirme que um PDF foi gerado e leia-o para conferir se o layout sai razoável (sem texto sobreposto, fontes carregadas, acentos certos, número de páginas compatível com o limite declarado para o conteúdo fictício). Registre qualquer surpresa em "Armadilhas conhecidas" no manifesto.
5. Apague o fonte de rascunho, o PDF de rascunho, qualquer pasta `build/` criada pela compilação de teste e qualquer outro subproduto `_compile_test.*` deixado na pasta do modelo.

Não siga para o Passo 5 enquanto a compilação de teste não passar.

---

## Passo 5: Ativar o modelo

A ativação liga o modelo ao `/apply` acrescentando um **bloco gerenciado** no topo do arquivo de orientações relevante — `05-cv-templates.md` para currículos, `06-cover-letter-templates.md` para cartas. O `/apply` lê esses arquivos tanto no passo de redação quanto no de compilação, então o bloco é tudo de que precisa.

Se o Passo 5 veio do Modo troca, use os metadados resolvidos do `TEMPLATE.md`. Se veio depois do registro de um modelo novo, use os metadados coletados e verificados nos Passos 2-4.

Insira (ou substitua, se já existir) este bloco logo depois do título H1 do arquivo:

```markdown
<!-- BEGIN ACTIVE-TEMPLATE (managed by /add-template - do not edit by hand) -->
> **Modelo próprio ativo: `<nome>`**
>
> Há um modelo próprio ativo. Onde este bloco conflitar com as orientações padrão abaixo, este bloco vence. As orientações estruturais abaixo (personalização, orçamento de páginas, regras de corte) continuam valendo.
>
> - **Esqueleto do modelo:** `templates/<tipo>/<nome>/template<extensão>` — use como referência de estrutura no lugar do modelo padrão
> - **Manifesto:** `templates/<tipo>/<nome>/TEMPLATE.md` — leia as regras de estilo e as armadilhas conhecidas antes de redigir
> - **Extensão do fonte:** `<extensão>` (não `.tex`, a menos que a ferramenta do próprio modelo seja LaTeX)
> - **Comando de compilação:** `<o comando completo declarado>` (não o comando citado nas orientações padrão abaixo — o passo de compilação do `/apply` precisa usar este). Rode a partir da pasta de saída. Se ele redirecionar para `build/`, o log fica em `build/`, e a limpeza do Passo 5e do `/apply` precisa apagar essa pasta `build/` também
> - **Fontes tipográficas:** <resumo das fontes, com qualquer nota de caminho para fontes incluídas>
> - **Limite de páginas:** exatamente <N> página(s)
> - **Arquivo de saída:** `cv/main_<company>_<role><extensão>` / `cover_letters/cover_<company>_<role><extensão>`; copie para a pasta de saída os arquivos de classe/pacote/fonte de que o modelo precisa, ou referencie-os por caminho relativo
<!-- END ACTIVE-TEMPLATE -->
```

Regras:

- Exatamente **um** bloco gerenciado por arquivo de orientações. Substitua o bloco inteiro entre os marcadores `BEGIN`/`END` ao trocar de modelo; nunca empilhe blocos.
- **`--use default`**: remova o bloco gerenciado inteiro. As orientações padrão do moderncv / cover.cls abaixo dele ficam intocadas e voltam a valer.
- Não modifique nada fora dos marcadores.

---

## Passo 6: Confirmar

Apresente um resumo:

> **Modelo `<nome>` registrado e ativado.**
>
> - Arquivos: `templates/<tipo>/<nome>/` (esqueleto, manifesto<, arquivos de classe/pacote><, fontes>)
> - Compilação de teste: passou com `<comando de compilação>` (<N> página(s))
> - O `/apply` agora vai redigir <currículos | cartas> a partir deste modelo.
>
> Próximos passos úteis:
> - `/add-template --list` — ver todos os modelos registrados
> - `/add-template --use <outro-nome>` — trocar de modelo
> - `/add-template --use default` — voltar ao modelo padrão <moderncv | cover.cls>

---

## Princípios de projeto

- O registro é idempotente: rodar de novo com o mesmo nome oferece atualizar o modelo existente em vez de duplicá-lo.
- Os modelos são guardados sem depender do perfil (marcadores `[PLACEHOLDER]`), para poderem ser compartilhados ou versionados sem vazar dados pessoais.
- A checagem de compilação do Passo 4 não é negociável — um modelo que nunca compilou vai falhar no meio do `/apply`, o pior lugar para descobrir isso.
- A ativação é um pequeno bloco gerenciado, não uma reescrita dos arquivos de orientação: o `/setup` e as edições manuais no `05`/`06` sobrevivem às trocas de modelo, e o `--use default` é uma reversão limpa.
