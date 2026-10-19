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
