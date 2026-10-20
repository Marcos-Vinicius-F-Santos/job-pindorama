# Diário do projeto job-pindorama

Registro da adaptação do [ai-job-search](https://github.com/MadsLorentzen/ai-job-search) para o mercado de trabalho brasileiro.

---

## 2026-10-19: Sessão 1, ambiente e linha de base

**Objetivo:** preparar o computador (Windows 11), criar o fork público e o repositório privado, e deixar o projeto original funcionando antes de alterar qualquer coisa.

**Duração:** cerca de 35 minutos (das 16h50 às 17h25), contando a espera pelas instalações e o login no GitHub.

### O que foi instalado (via winget)

| Ferramenta | Versão | Para que serve |
|---|---|---|
| git | 2.53 (já existia) | Controle de versão |
| GitHub CLI (gh) | 2.102.0 | Criar o fork e o repositório privado pelo terminal |
| Python | 3.12.10 (já existia) | Scripts do projeto |
| Bun | 1.4.3 | Ferramentas de busca de vagas (TypeScript) |
| MiKTeX | 25.12 | Gera os PDFs de CV (lualatex) e carta (xelatex) |

Também instalei as 6 ferramentas de busca de portais que vêm no projeto, com `python tools\install_portal_clis.py`. Quase todas são de portais dinamarqueses, e trocá-las por portais brasileiros é o próximo desafio.

### Estrutura criada

- `job-pindorama`: fork **público**, só com o framework. Nunca recebe dados pessoais.
- `minha-busca`: repositório **privado** novo, que não é um fork. Fork de repositório público não pode ser privado. O `job-pindorama` está configurado como `upstream` só para receber atualizações, e o envio para ele foi bloqueado.

### Problemas e como foram resolvidos

1. **O Python "não existia", mas existia.** Os comandos `python` e `python3` abriam a Microsoft Store. Esses atalhos falsos vêm com o Windows. O Python 3.12 já estava instalado e o PATH estava certo, mas o terminal do VS Code tinha sido aberto antes e guardava a lista antiga. *Solução:* reabrir o VS Code, ou recarregar o PATH no terminal.
2. **A instalação do gh parou em "Iniciando a instalação".** A janela de permissão de administrador do Windows ficou escondida atrás do VS Code. *Solução:* achar o ícone piscando na barra de tarefas e clicar em "Sim".
3. **O login no GitHub (`gh auth login`) não aparecia o código.** O assistente interativo de perguntas confundiu. *Solução:* usar a versão direta, sem perguntas: `gh auth login --hostname github.com --git-protocol https --web`.
4. **Risco de abrir issues no repositório errado.** Por padrão, o gh aponta para o repositório original, que é público. *Solução:* `gh repo set-default` apontando cada pasta para o próprio repositório, como recomenda a seção 2 do SETUP.md.
5. **Privacidade do e-mail nos commits.** *Solução:* usar o e-mail anônimo do GitHub (`@users.noreply.github.com`) nos dois repositórios.

### Próxima sessão

- Rodar o `/setup` **só** no `minha-busca`, que é o privado.
- Começar a adaptação para o Brasil no `job-pindorama`.

---

## 2026-10-19 e 20: Sessão 2, tropicalização

**Objetivo:** adaptar o `job-pindorama` ao mercado brasileiro, no branch `tropicalizacao`.

**Decisões tomadas antes de começar:**
- Remover os 4 portais dinamarqueses (em vez de só deixá-los desligados).
- Traduzir **tudo** para português, inclusive as instruções internas (skills, comandos, agentes). Custo aceito: atualizações do projeto original vão exigir portar à mão.

### O que foi feito

| Frente | Resultado |
|---|---|
| Limpeza dinamarquesa | Jobindex, Jobnet, Jobbank e Jobdanmark removidos, inclusive das permissões e dos testes |
| Portal Gupy | CLI nova `gupy-search`: busca por cargo, cidade, UF, modelo (remoto/híbrido/presencial) e **regime** (CLT, PJ, estágio...); detalhe completo da vaga; 45 testes sem rede + 2 ao vivo |
| Salário em BRL | Sufixos Ltda., S.A., S/A, ME, EPP, EIRELI; planilhas com cabeçalhos acentuados e números `1.234,56`; testes com empresas brasileiras |
| Convenções BR | CLT × PJ na avaliação, sinais de golpe, vagas afirmativas, registro em conselho de classe, currículo sem foto/CPF/idade (LGPD), datas `MM/AAAA`, carta com "Atenciosamente" e data por extenso, processo seletivo brasileiro (testes da Gupy, vídeo gravado, dinâmica, pretensão salarial, aviso prévio), e-mails em português no `/gmail-sync`, Solides como ATS reconhecido |
| Gênero gramatical | Campo novo no perfil: os textos concordam conforme a pessoa escolher, nunca pelo nome |
| Tradução | Todos os comandos, skills, agentes, README, SETUP, SECURITY, CONTRIBUTING, modelos LaTeX e modelos do GitHub |

### Como os testes foram mantidos

Os testes do projeto conferem frases exatas dos arquivos de instrução (cerca de 650 verificações). A cada arquivo traduzido, um script listava as frases conferidas e um "mapa de âncoras" (inglês → português) atualizava os testes. Termos que são **dados** ficaram em inglês de propósito: status do tracker (`applied`, `no_response`...), vereditos (`PASS`, `Strong Fit`...), nomes de campo e marcadores `[YOUR_...]`.

Resultado final: os mesmos 768 testes que passavam antes continuam passando (774 no total; as 6 falhas são as antigas do `curl` do Windows, abaixo), mais os 45 testes da Gupy.

### Problemas e como foram resolvidos

1. **A API da Gupy que todo mundo cita não existe mais.** `portal.api.gupy.io/api/job` dá 404. *Solução:* descobri, no JavaScript do próprio portal, a rota que a página de busca usa (`portal.gupy.io/api/job-search/jobs`). Detalhes em `.agents/skills/gupy-search/url-reference.md`.
2. **Filtro com dois valores é ignorado em silêncio pela Gupy** (`type=clt&type=pj` devolve tudo). *Solução:* a CLI recusa listas e explica.
3. **URL no User-Agent virou brecha.** O teste de procedência pegou que uma URL do GitHub no User-Agent fazia `github.com` contar como portal confiável. *Solução:* User-Agent sem URL. O `freehire-search` original tem o mesmo defeito (não corrigido aqui, por ser código do original).
4. **"Salário" era partido em "sal" + "rio"** no conversor de planilhas, que só aceitava letras sem acento. *Solução:* a regra passou a aceitar qualquer letra acentuada.
5. **O LaTeX travou compilando.** O MiKTeX básico abria uma janela pedindo para instalar pacotes, escondida atrás do VS Code. *Solução:* `initexmf --set-config-value=[MPM]AutoInstall=1` (só para o usuário), instalar os pacotes que faltavam (`miktex packages install ...`) e `initexmf --update-fndb`.
6. **Falhas antigas do `fetch_page.py`.** O `curl` do Windows não aceita `--compressed`; seis testes já falhavam antes de qualquer mudança. *Solução documentada no SETUP:* instalar um curl completo (`winget install cURL.cURL`). Ainda não aplicada.

### Verificação

- Currículo e carta de exemplo compilados de verdade: 2 páginas e 1 página, acentos intactos na camada de texto (o que o ATS lê).
- Busca e detalhe da Gupy testados ao vivo.

### Commits (branch `tropicalizacao`)

| Commit | Frente |
|---|---|
| `7dcc962` | Remove os portais dinamarqueses |
| `bf1133b` | Skill de busca no Portal Gupy |
| `2e59eb1` | Referência salarial para empresas brasileiras |
| `2dfe2f5` | Tradução e convenções do mercado brasileiro |

Cada commit passa na suíte de testes sozinho (com as 6 falhas antigas do `curl`).

### Próxima sessão

- Revisar o branch `tropicalizacao`, fazer push e abrir o PR para o `master` do próprio `job-pindorama`.
- Instalar um curl completo e confirmar que as 6 falhas antigas somem.
- Levar o `job-pindorama` atualizado para o `minha-busca` e rodar o `/setup`.
- Candidatos a novos portais com o `/add-portal`: Vagas.com, Catho, InfoJobs, Trampos, Programathor (sujeitos à checagem de `robots.txt` e termos).
