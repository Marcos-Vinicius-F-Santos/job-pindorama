# Guia de instalação

Passo a passo para colocar o job-pindorama para funcionar. Se você nunca usou terminal, comece
pelo [COMECE-AQUI.md](COMECE-AQUI.md), que faz o mesmo com cliques e pedidos ao Claude.

## 1. Pré-requisitos

### Claude Code

Instale o Claude Code (a CLI da Anthropic para o Claude):

```bash
npm install -g @anthropic-ai/claude-code
```

Você vai precisar de uma chave de API da Anthropic ou de uma assinatura Claude Pro/Team. Veja a [documentação do Claude Code](https://docs.anthropic.com/en/docs/claude-code) para os detalhes. No Windows, também dá para usar a extensão do Claude Code no VS Code.

### Python

O Python 3.10 ou mais novo é necessário para as ferramentas de apoio. Confira com:

```bash
python3 --version
```

No Windows, `py --version` costuma ser a checagem mais confiável. Se o seu sistema chama o Python de `python` em vez de `python3`, use `python` nos comandos abaixo.

> **Windows: `python` abre a Microsoft Store?** O Windows vem com atalhos falsos de `python` e `python3` que abrem a loja. Se o Python já estiver instalado, o problema costuma ser um terminal aberto antes da instalação, com o PATH antigo: feche e abra o terminal (ou o VS Code inteiro). Também dá para desligar os atalhos em Configurações → Aplicativos → Aliases de execução de aplicativo.

### Bun (para as ferramentas de busca)

As CLIs dos portais de vagas (`gupy-search`, `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `digai-search`, `linkedin-search` e `freehire-search`) são escritas em TypeScript e rodam com o Bun.

- Windows (o jeito mais simples):

```powershell
winget install Oven-sh.Bun
```

- Windows PowerShell, sem o winget:

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://bun.sh/install.ps1 | iex"
```

- macOS/Linux:

```bash
curl -fsSL https://bun.sh/install | bash
```

### LaTeX (para compilar currículos e cartas)

Instale uma distribuição LaTeX para compilar os arquivos `.tex` gerados em PDF:

- **Windows:** [MiKTeX](https://miktex.org/download) (ou `winget install MiKTeX.MiKTeX`)
- **macOS:** [MacTeX](https://tug.org/mactex/)
- **Linux:** `sudo apt install texlive-full` ou `sudo dnf install texlive-scheme-full`

O currículo compila com `lualatex` (o pdflatex costuma falhar no MiKTeX recente com erros de expansão de fonte do `fontawesome5`). A carta compila com `xelatex`, porque o `cover.cls` exige `fontspec` para as fontes Lato e Raleway.

#### Instalação mínima de TeX: TinyTeX/BasicTeX

Distribuições TeX completas funcionam de primeira, mas as mínimas precisam de alguns pacotes extras antes de os modelos padrão compilarem.

No macOS, uma instalação do TinyTeX só para o seu usuário evita um instalador para o sistema todo e não exige `sudo`:

```bash
curl -fsSL https://yihui.org/tinytex/install-bin-unix.sh -o /tmp/tinytex-install-bin-unix.sh
sh /tmp/tinytex-install-bin-unix.sh /tmp --no-path
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
```

O `export` acima só vale para a janela de terminal atual. Torne-o permanente, ou cada janela nova vai dizer `zsh: command not found: lualatex` (ou `xelatex`) mesmo com o TinyTeX instalado:

```bash
echo 'export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"' >> ~/.zshrc
source ~/.zshrc
lualatex --version   # deve imprimir uma versão, não "command not found"
```

(Quem usa Bash: acrescente ao `~/.bash_profile`.)

Depois instale as dependências dos modelos:

```bash
tlmgr install \
  moderncv fontawesome5 fontawesome6 academicons import luatexbase pgf \
  titlesec textpos xltxtra xunicode cite realscripts needspace
```

No BasicTeX/MacTeX, garanta primeiro que a pasta de binários do TeX está no `PATH` (por exemplo, via `/Library/TeX/texbin`) e rode o mesmo `tlmgr install ...`.

Testes rápidos depois da instalação:

```bash
cd cv && lualatex -interaction=nonstopmode -halt-on-error main_example.tex && cd ..

SMOKE_DIR="$(mktemp -d /tmp/ai-job-cover-smoke.XXXXXX)"
cp -R cover_letters/cover.cls cover_letters/OpenFonts "$SMOKE_DIR/"
cat >"$SMOKE_DIR/cover_smoke.tex" <<'EOF'
\documentclass[]{cover}
\begin{document}
\namesection{Teste}{Candidata}{test@example.com}
\companyname{Empresa Exemplo}
\companyaddress{Rua da Contratação, 123\\Cidade Exemplo - SP}
\currentdate{São Paulo, 19 de outubro de 2026}
\lettercontent{Prezada equipe de recrutamento,}
\lettercontent{Este teste confere se o xelatex carrega o cover.cls, as fontes incluídas e os acentos (ç, ã, é).}
\closing{Atenciosamente,}
\signature{Teste Candidata}
\end{document}
EOF
(cd "$SMOKE_DIR" && xelatex -interaction=nonstopmode -halt-on-error cover_smoke.tex)
```

#### Windows: MiKTeX básico

O instalador completo do MiKTeX traz todos os pacotes do CTAN e funciona de primeira, mas o instalador [Basic MiKTeX](https://miktex.org/download) (`basic-miktex-*.exe`), menor, só traz um conjunto mínimo de pacotes e precisa de umas configurações únicas antes de os modelos padrão compilarem.

Por padrão, o MiKTeX instala os pacotes que faltam sob demanda, mas abre uma janela de confirmação para cada um — o que trava terminais não interativos (inclusive a ferramenta Bash do Claude Code). Troque isso por uma instalação automática silenciosa:

```powershell
initexmf --admin --set-config-value=[MPM]AutoInstall=1
initexmf --set-config-value=[MPM]AutoInstall=1
```

(Rode a primeira linha num PowerShell de administrador se instalou o MiKTeX para todos os usuários; a segunda cobre uma instalação só do seu usuário. Só uma vai valer, conforme a instalação — rodar as duas não faz mal.)

> **Janela de permissão escondida.** Instaladores no Windows às vezes param em "Iniciando a instalação" porque a janela de permissão de administrador ficou atrás do VS Code. Procure o ícone piscando na barra de tarefas e clique em "Sim".

Se preferir não depender da instalação sob demanda (por exemplo, para compilar sem internet depois), instale de antemão o mesmo conjunto de pacotes da seção do TinyTeX acima, com o gerenciador de pacotes do MiKTeX:

```powershell
mpm --admin --install=moderncv --install=fontawesome5 --install=fontawesome6 --install=academicons --install=import --install=luatexbase --install=pgf --install=titlesec --install=textpos --install=xltxtra --install=xunicode --install=cite --install=realscripts --install=needspace
```

Tire o `--admin` se o MiKTeX estiver instalado só para o seu usuário. Se o nome de um pacote não for encontrado, `mpm --find=<nome>` procura o nome certo no repositório.

Testes rápidos depois da instalação (PowerShell):

```powershell
Set-Location cv; lualatex -interaction=nonstopmode -halt-on-error main_example.tex; Set-Location ..

$SmokeDir = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "ai-job-cover-smoke-$(Get-Random)")
Copy-Item cover_letters\cover.cls, cover_letters\OpenFonts -Destination $SmokeDir -Recurse
@'
\documentclass[]{cover}
\begin{document}
\namesection{Teste}{Candidata}{test@example.com}
\companyname{Empresa Exemplo}
\companyaddress{Rua da Contratação, 123\\Cidade Exemplo - SP}
\currentdate{São Paulo, 19 de outubro de 2026}
\lettercontent{Prezada equipe de recrutamento,}
\lettercontent{Este teste confere se o xelatex carrega o cover.cls, as fontes incluídas e os acentos (ç, ã, é).}
\closing{Atenciosamente,}
\signature{Teste Candidata}
\end{document}
'@ | Set-Content -Encoding utf8 (Join-Path $SmokeDir "cover_smoke.tex")
Push-Location $SmokeDir; xelatex -interaction=nonstopmode -halt-on-error cover_smoke.tex; Pop-Location
```

(O `-Encoding utf8` importa: sem ele, o Windows PowerShell 5.1 grava o arquivo na página de código do sistema e os acentos chegam errados ao xelatex.)

### Opcional: extração de texto para ATS (pypdf, depois pdftotext)

O `/apply` roda uma checagem de leitura por ATS no currículo compilado: extrai a camada de texto do PDF e confere contatos, ordem de leitura e cobertura de palavras-chave como um sistema de recrutamento (ATS) os vê.

O extrator padrão é o **pypdf** (BSD, `pip install pypdf`). O `pdftotext` do Poppler continua como plano B opcional:

- **Windows:** `choco install poppler`
- **macOS:** `brew install poppler`
- **Debian/Ubuntu:** `sudo apt install poppler-utils`

Se algum comando ainda usar `pdftotext -layout`, ele precisa passar também `-enc UTF-8`. Se **nenhum** extrator estiver disponível, o `/apply` pula a checagem mecânica com um aviso e faz uma revisão visual das palavras-chave — todo o resto funciona normalmente.

## 2. Fork e clone

```bash
gh repo fork rosanapegasgodoy/job-pindorama --clone
cd job-pindorama
gh repo set-default <seu-usuario-no-github>/job-pindorama
```

Ou à mão: faça o fork no GitHub e depois clone o seu fork.

> **A linha `set-default` não é opcional.** O `gh repo fork --clone` define o repositório
> de **upstream** como o repositório padrão do gh ("The `upstream` remote will be set as
> the default remote repository" — `gh repo fork --help`), e o gh usa o padrão para
> **criar issues e PRs**. Sem ela, qualquer `gh issue create` rodado depois a partir deste
> clone — por você ou por um agente a quem você pediu para acompanhar candidaturas — cai
> em silêncio no rastreador **público** do upstream, publicando o conteúdo da issue com a
> sua identidade do GitHub, num repositório em que você não consegue apagá-la (#389).

> **Antes de seguir: forks são públicos.** O GitHub não deixa tornar privado um fork de
> um repositório público, e o `/setup` (seção 4) grava os seus dados pessoais em arquivos
> **rastreados pelo git** — fazer push desses commits para um fork os publica. Se esta cópia
> é para a sua própria busca de emprego, e não para contribuir, prefira um **repositório
> privado** com este como `upstream`: veja a seção 8, passo 1, para os comandos exatos e
> para o motivo de ainda valer a pena versionar a sua personalização ali. Todo o resto
> deste guia funciona igual nos dois casos.

## 3. Instalar as dependências das CLIs de busca
Rode a partir da raiz do repositório.

```bash
python3 tools/install_portal_clis.py   # Windows: python tools\install_portal_clis.py
```

Ele roda `bun install` em toda CLI de portal em `.agents/skills/*/cli/` — descobertas, não listadas, então um portal que você acrescentar com o `/add-portal` ou copiar de outro fork entra num clone novo. Uma CLI cujo `package.json` declare um script de ciclo de vida na instalação (lifecycle script) é pulada e informada, em vez de executada. `--dry-run` mostra o que seria instalado.

Para todas as CLIs de portal que vêm no projeto a instalação é opcional: nenhuma tem dependências de execução e rodam só com o `bun`; o `bun install` só traz os tipos do TypeScript.

Teste rápido da Gupy:

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "analista de dados" --state SP --limit 5 --format table
```

Para outro portal brasileiro, gere uma skill equivalente com o `/add-portal` — ele monta a mesma estrutura de CLI para qualquer portal público e testa uma busca ao vivo antes de registrar. Veja a seção "Ferramentas de busca" do README.

## 4. Rodar a configuração do perfil

Abra o Claude Code no repositório:

```bash
claude
```

Depois rode a configuração:

```
/setup
```

O Claude vai oferecer três caminhos:

- **Caminho A (pasta de documentos):** coloque o currículo, a exportação do LinkedIn, diplomas, cartas de recomendação ou candidaturas anteriores em `documents/`. O Claude lê e cruza as informações antes de propor atualizações do perfil. É o melhor quando você tem vários arquivos.
- **Caminho B (importar um currículo):** compartilhe um currículo mencionando o arquivo com `@` ou colando o texto. O Claude extrai e pergunta o que faltar.
- **Caminho C (entrevista):** responda perguntas organizadas, seção por seção.

Os três caminhos produzem o mesmo resultado: os arquivos de perfil preenchidos. Em todos, o Claude vai perguntar também os **regimes que você aceita** (CLT, PJ, estágio), a **pretensão salarial** e o **gênero gramatical** para os textos.

### O que é preenchido

| Arquivo | Conteúdo |
|---------|----------|
| `CLAUDE.md` | O seu perfil completo |
| `01-candidate-profile.md` | Formação, experiência e competências, estruturadas |
| `02-behavioral-profile.md` | Avaliação comportamental |
| `04-job-evaluation.md` | Áreas de competência e objetivos de carreira personalizados |
| `05-cv-templates.md` | Modelos de resumo profissional para a sua trajetória |
| `06-cover-letter-templates.md` | Linha de contato e assinatura da carta |
| `07-interview-prep.md` | Exemplos STAR da sua experiência |
| `cv/main_example.tex` | O seu currículo em LaTeX com os dados reais |
| `search-queries.md` | Buscas de vagas para o `/scrape` |

### Rodando a configuração de novo

Dá para atualizar seções específicas depois:

```
/setup --section skills
/setup --section experience
/setup --section search
```

A opção `--section search` é especialmente útil à medida que as prioridades mudam. Ela refaz a entrevista de configuração da busca e sugere tipos de vaga que você talvez não tenha considerado, com base no perfil completo.

## 5. Opcional: configurar a referência salarial

Se você tem dados salariais (de uma pesquisa salarial, de um guia de consultoria, do Glassdoor ou de pesquisa própria):

1. **Opção A:** crie o `salary_data.json` à mão na raiz do repositório (veja o formato em `tools/README_SALARY_TOOL.md`)
2. **Opção B:** converta de uma planilha Excel (cabeçalhos em português, como "Empresa", "Cidade", "Salário médio", são reconhecidos):
   ```bash
   pip install openpyxl
   python3 tools/convert_salary_excel.py caminho/para/salarios.xlsx --source "Minha pesquisa salarial 2026"
   ```

Isso cria o `salary_data.json` que o fluxo do `/apply` usa como referência salarial. Se você pular este passo, a consulta salarial é simplesmente omitida e a avaliação usa fontes públicas.

## 6. Testar o fluxo

Ache uma vaga que interesse a você e rode:

```
/apply https://empresa.gupy.io/jobs/12345678
```

Ou cole a descrição da vaga direto:

```
/apply [cole aqui o texto da vaga]
```

O Claude vai:
1. Avaliar o encaixe com o seu perfil (incluindo o regime e os sinais de golpe)
2. Perguntar se você quer seguir
3. Rascunhar um currículo e uma carta personalizados
4. Pedir a um agente revisor que critique os rascunhos
5. Revisar e apresentar o resultado final

## 7. Compilar os seus documentos

Depois que o `/apply` criar os arquivos LaTeX:

```powershell
# PowerShell
Set-Location cv; lualatex main_<company>_<role>.tex; Set-Location ..
Set-Location cover_letters; xelatex cover_<company>_<role>.tex; Set-Location ..
```

```bash
# Bash / zsh / Git Bash
cd cv && lualatex main_<company>_<role>.tex && cd ..
cd cover_letters && xelatex cover_<company>_<role>.tex && cd ..
```

Esses comandos valem para os modelos padrão (currículo moderncv, carta `cover.cls`). Para usar o seu próprio modelo, rode o `/add-template` — ele registra o motor de compilação, as fontes, as regras de estilo e o limite de páginas do modelo, testa a compilação e o liga ao `/apply`. Veja a seção "Modelos próprios" do README.

## 8. Trazendo atualizações do upstream para o seu fork

Há dois níveis de upstream:

- **Para quem usa o job-pindorama:** o upstream é este repositório (`https://github.com/rosanapegasgodoy/job-pindorama.git`), que traz a adaptação para o Brasil.
- **Para o próprio job-pindorama:** o upstream é o projeto original (`https://github.com/MadsLorentzen/ai-job-search`), que continua melhorando o método. Como este fork traduziu os arquivos de instrução, quase toda atualização do original precisa ser portada à mão; as ferramentas abaixo ajudam a escolher o que vale.

Planeje as atualizações desde o primeiro dia:

**Prefira versões marcadas ao `master` cru.** Versões com tag são pontos de checagem revisados, cada uma descrita no [CHANGELOG.md](CHANGELOG.md). Atualizar para uma tag traz um estado estável e documentado, em vez do que o `master` estiver no meio de uma revisão. Busque as tags com `git fetch upstream --tags` e mescle uma versão (por exemplo, `git merge v1.0.0`) quando quiser estabilidade; puxe o `master` direto só quando quiser especificamente as mudanças ainda não lançadas. Os passos abaixo valem nos dois casos — troque `upstream/master` pela tag da versão onde aparecer.

1. **Versione a sua personalização — mas saiba para onde vão esses commits.** O `/setup` edita o CLAUDE.md e os arquivos de perfil no lugar; essas edições são *suas*, e versioná-las é o que deixa as atualizações se mesclarem limpas. Mas um **fork deste repositório no GitHub é público** — forks de repositórios públicos não podem ser privados —, então tudo o que você versionar *e fizer push para um fork* fica visível para qualquer pessoa. Se quiser o seu perfil num remoto, não faça push para um fork: crie um repositório **privado**, faça push para ele e acrescente este repositório como o remoto `upstream` (`git remote add upstream https://github.com/rosanapegasgodoy/job-pindorama.git`) para continuar recebendo atualizações. Versionar só localmente, sem push, também tudo bem. Os arquivos realmente sensíveis (tracker, dados salariais, `documents/`, arquivos das candidaturas) são ignorados pelo git e nunca entram nele de qualquer forma. Uma árvore de trabalho com mudanças não versionadas é o motivo mais comum de o `git pull` se recusar a mesclar (`Your local changes ... would be overwritten`).

   Receita do repositório privado com o `gh`:
   ```bash
   gh repo create minha-busca --private --clone
   cd minha-busca
   git remote add upstream https://github.com/rosanapegasgodoy/job-pindorama.git
   git fetch upstream
   git merge upstream/master --allow-unrelated-histories
   git remote set-url --push upstream DISABLE   # impede push acidental para o upstream público
   gh repo set-default <seu-usuario-no-github>/minha-busca
   ```
2. **Veja o que mudou antes de puxar:**
   ```bash
   git fetch upstream
   python3 tools/check_upstream_updates.py
   ```
   Ele compara os marcadores `framework_version` dos seus arquivos do método com os do upstream e lista exatamente quais arquivos de método mudaram, com o comando de diferença de cada um.

   Duas ferramentas respondem a duas perguntas diferentes, e vale rodar as duas:
   - **`check_upstream_updates.py`** — *quais dos meus arquivos personalizados mudaram?* Lê o carimbo `framework_version` de cada arquivo de método, então aponta exatamente os arquivos personalizados que uma versão tocou.
   - **`upstream_triage.py`** — *quais commits do upstream merecem minha atenção?* Percorre os commits que você não tem e os separa em "vale revisar" e "provavelmente pular", descartando o que você já trouxe com cherry-pick (reconhecido por `git patch-id`, então trabalho portado some sem contabilidade), commits que só tocam arquivos que o seu fork removeu, e SHAs listados em `.github/upstream-wontport.txt`. Só gera relatório — imprime linhas `git cherry-pick` prontas para rodar, mas nunca mescla, faz push ou abre PR, porque num fork "aplica sem conflito" não é "está correto".

     ```bash
     python3 tools/upstream_triage.py --remote upstream
     ```

     Forks também herdam um `.github/workflows/upstream-watch.yml` que roda isso toda semana e grava o resultado numa única issue rotativa (ele não faz nada no modelo original e fica desligado num fork até você ligar o Actions).
3. **Mescle normalmente.** `git merge upstream/master` (ou `git pull`) faz a mescla de três vias das edições do upstream em volta da sua personalização; como as edições de método raramente tocam as linhas que o `/setup` preencheu, a maioria das atualizações entra limpa. Um conflito num arquivo personalizado é um *recurso*, não uma falha — significa que o upstream mudou o método numa seção que você personalizou, e o marcador de versão mais o commit no changelog dizem por quê. Resolva mantendo os seus dados e adotando a mudança de método em volta deles.

## Solução de problemas

### "salary_data.json not found"
É esperado se você não configurou a referência salarial. O fluxo do `/apply` pula esse passo sozinho.

### As CLIs de busca não funcionam
Confira se o Bun está instalado e se você rodou `python tools/install_portal_clis.py`. As ferramentas precisam de acesso à internet para buscar vagas. Se a Gupy parar de responder, rode `/scrape health gupy` — o portal pode ter mudado a rota de busca (veja `.agents/skills/gupy-search/url-reference.md`).

### `fetch_page.py` falha com "curl exit 2" no Windows
Versões antigas do `fetch_page.py` sempre passavam `--compressed`, que o `curl` nativo do Windows (em `System32`) recusa. A versão atual consulta o `curl --version` e só passa a opção quando o curl tem decodificadores. Se o erro aparecer, atualize o repositório. Instalar outro curl não resolve sozinho: um programa que chama `curl` sem caminho encontra o do `System32` antes do PATH.

### Erros de compilação LaTeX
- Currículo: usa `lualatex` (o pdflatex costuma falhar no MiKTeX recente com erros de expansão de fonte do `fontawesome5`; o lualatex compila os mesmos arquivos sem problema)
- Carta: usa `xelatex` (para as fontes em `OpenFonts/fonts/`)
- Garanta que a sua distribuição LaTeX tem o pacote `moderncv`
- `Missing $ inserted` perto de um valor em reais: escreva `R\$`, não `R$`

### Fontes não encontradas na carta
O modelo da carta espera as fontes em `cover_letters/OpenFonts/fonts/`. Confira se a pasta existe e tem os arquivos das fontes Lato e Raleway.

### `.claude/settings.local.json` antigo de um clone anterior
As permissões compartilhadas do Claude Code ficam em `.claude/settings.json`: uma lista `allow` restrita aos comandos exatos que o fluxo roda (cada CLI de portal pelo caminho, os scripts de `tools/`, `salary_lookup.py`, `pdftotext`), uma lista `ask` que sempre pergunta antes de editar os arquivos que definem permissões ou de rodar `git push`, e uma lista `deny` que bloqueia comandos com cara de envio de dados e a leitura de arquivos de credenciais em qualquer modo. O `SECURITY.md` tem a tabela completa. Versões antigas deste repositório versionavam um `.claude/settings.local.json` mais amplo, que pré-aprovava `Bash(curl:*)`, `Bash(python:*)` e `Bash(bun:*)`. Se você clonou antes dessa mudança, o git deixa o arquivo antigo na sua cópia, e as permissões dele continuam valendo por cima do `settings.json`. Apague-o (ou reduza-o às suas preferências pessoais):

```bash
rm .claude/settings.local.json
```
