# Política de segurança

## Como relatar uma vulnerabilidade

Relate achados de segurança de forma privada pelo **[relato privado de vulnerabilidades do GitHub](https://github.com/rosanapegasgodoy/job-pindorama/security/advisories/new)** deste repositório, e não numa issue pública. Se o problema estiver no núcleo do fluxo (e não na adaptação para o Brasil), relate também ao [projeto original](https://github.com/MadsLorentzen/ai-job-search/security/advisories/new). Você recebe resposta em poucos dias, crédito na correção (se quiser) e uma divulgação pública coordenada com a correção.

Se o formulário privado não estiver disponível, abra uma issue pública que descreva a *classe* do problema, sem uma receita que funcione, e avise que tem detalhes para compartilhar em particular.

## Modelo de ameaças, dito com honestidade

Este é um fluxo com agentes: um modelo de linguagem com acesso a arquivos lê conteúdo da web não confiável (vagas) junto com os seus dados pessoais (currículo, perfil, histórico de candidaturas). Essa combinação é a principal superfície de risco, e não dá para eliminá-la por completo — só estreitá-la. Uma vaga pode trazer texto escondido escrito para conduzir o agente. O projeto responde a isso em dois níveis: regras de instrução, que dizem ao agente como tratar vagas, e regras de permissão, que limitam o que o agente pode fazer mesmo se for conduzido.

### Nível de instrução

O `/apply`, o `/rank`, o `/scrape`, o `/interview` e o próprio `09-web-research.md` da skill tratam o texto das vagas como dado, nunca como instrução: os agentes são orientados a não seguir orientações embutidas em vagas e a não acessar URLs encontradas no texto delas (a URL da vaga fornecida pela pessoa é a única exceção). A pesquisa do revisor parte da identidade da empresa que a pessoa confirmou, nunca de links do texto da vaga. O Passo 1 do `/apply` também classifica o host da vaga (portal instalado, ATS conhecido ou não verificado) antes de qualquer redação.

### Nível de permissão

Toda permissão que o projeto concede, onde ela mora, quanto tempo dura e o que a confere. "Guarda" é o `tools/security_guards.py`, que o CI roda em todo PR e que falha com qualquer entrada que não conheça.

| Superfície | O que é concedido | Duração | Guarda |
|---|---|---|---|
| `.claude/settings.json` `permissions.allow` | Cada CLI de portal que vem no projeto, pelo caminho exato (`gupy-search`, `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `linkedin-search`, `freehire-search`), o `salary_lookup.py`, os scripts de `tools/` (`rank_state`, `job_key`, `verify_pdf`, `verify_layout`, `robots_check`, `fetch_page`, `posting_guard`, `posting_signals`, `scrape_run`), o `pdftotext` e `Skill(job-application-assistant)` | A sessão inteira | Lista exata; qualquer acréscimo reprova o CI, a menos que entre em `ALLOWED_PERMISSIONS` no mesmo PR |
| `.claude/settings.json` `permissions.ask` | Sempre pergunta, mesmo por cima de uma regra allow ou de uma permissão de skill: edições em `settings.json`, `settings.local.json`, qualquer `.claude/skills/*/SKILL.md`, qualquer `.claude/commands/*.md`, `.claude/agents/**`, `.github/**`, `tools/security_guards.py`; e `git push` | A sessão inteira | Cada regra é obrigatória; removê-la reprova o CI |
| `.claude/settings.json` `permissions.deny` | Bloqueado em todo modo, inclusive `bypassPermissions`: `curl`/`wget` com opções de dados, formulário ou envio, `scp`, `sftp`, `ssh`, `nc`; leitura de `.env`, `.env.*`, `~/.ssh/**`, `~/.aws/**`, `~/.gnupg/**` (as negações de Read também cobrem `cat`/`head`/`tail`/`sed` no Bash) | A sessão inteira | Cada regra é obrigatória; removê-la reprova o CI |
| `allowed-tools` das skills (`.claude/skills/*/SKILL.md`) | `job-application-assistant`: Read, Glob, Grep, WebFetch, WebSearch, Edit, Write, AskUserQuestion. `scrape`: o mesmo mais Agent, `bun --version`, `tools/job_key.py`. `upskill`: Read, Write, Glob, Grep, WebFetch, WebSearch. Nenhum `Bash` puro em lugar nenhum. | A rodada que aciona a skill; some na sua próxima mensagem. Não depende da confiança no espaço de trabalho. | Lista exata (`ALLOWED_SKILL_TOOLS`); ferramentas puras e curingas reprovam o CI |
| `allowed-tools` das skills de portal (`.agents/skills/<nome>/SKILL.md`) | Exatamente o `cli/src/cli.ts` daquele portal e nada mais | A rodada que aciona | Conferido pelo caminho, então uma skill que conceda a CLI de outro portal, ou um glob, reprova o CI |
| Comandos de barra (`.claude/commands/*.md`) | Sem frontmatter `allowed-tools`; rodam sob as regras de sessão acima | - | A mesma checagem de frontmatter das skills |
| Subagentes (`.claude/agents/*.md`) | `posting-fetcher` (Passo 0 do `/apply`), `posting-scorer` (Passo 2 do `/rank`) e `application-reviewer` (Passo 3 do `/apply`): Read, Glob/Grep onde preciso, WebFetch, WebSearch, Bash — nunca Edit, Write nem Agent. O Bash dentro deles é limitado pela lista allow acima, porque a lista `tools:` de um agente tem granularidade de nome de ferramenta. Os agentes de busca em portais do `/scrape` ainda rodam como `general-purpose`. | Enquanto o agente roda | Checagem 5: todo agente precisa declarar `tools:` tirado de `ALLOWED_AGENT_TOOLS`; uma chave ausente (= todas as ferramentas) ou uma entrada `Bash(padrão)` reprova o CI |
| O filtro de integridade das vagas (`tools/posting_guard.py`) | Roda em toda vaga antes do Passo 1 do `/apply` (URL ou colada), dentro de cada pontuador do `/rank` e na vaga arquivada no `/interview`: remove HTML escondido e caracteres invisíveis, cita linhas com cara de instrução e URLs escondidas, lista palavras com alfabetos misturados, imprime um veredito de uma linha. Aconselha; a pessoa decide. O arquivo guarda contagens, nunca os trechos removidos. | - | Fixado por `tests/test_posting_guard.py` e `tests/test_posting_gate_wiring.py` |
| Os sinais de encaixe do texto da vaga (`tools/posting_signals.py`) | Rodam no `/scrape` (em lote e no texto completo das vagas de encaixe alto e médio) e em cada pontuador do `/rank`: apontam o modelo de trabalho que o texto declara, seleção interna, vaga exclusiva, intermediário e senioridade, citando o trecho. Só leem arquivo ou stdin e imprimem; não gravam nada nem acessam a rede. Aconselham; o perfil decide. | - | Fixado por `tests/test_posting_signals.py` |
| Hooks (`.claude/settings.json` `hooks`) | Nenhum. O projeto não traz hooks: um hook roda sem perguntar no momento em que o evento dispara, que é o vetor que o worm Shai-Hulud usou em agosto de 2026. | - | Qualquer hook reprova o CI |
| Compilação (`lualatex`, `xelatex`, o comando de um modelo próprio) | Não pré-aprovada: uma permissão `lualatex:*` também aprovaria `-shell-escape`. No modo padrão, cada compilação pergunta. Responder "não perguntar de novo" gravaria exatamente essa regra `lualatex` no seu `settings.local.json`, então responda a cada chamada. | - | - |
| Manifestos das CLIs de portal (`.agents/**/package.json`) | Sem scripts de ciclo de vida (`preinstall`, `postinstall`, ...) e sem `trustedDependencies`, então o `bun install` não executa código | - | Reprova o CI; o `tools/install_portal_clis.py` também pula um manifesto que tenha um |
| A nova tentativa com cabeçalhos de navegador (`tools/fetch_page.py`) | Um GET com argumentos fixos, só http(s), 45 s / 5 redirecionamentos / 10 MB, `robots.txt` aplicado sem opção de contornar, saída recusada dentro do repositório | - | Fixado por `tests/test_fetch_page.py`; a permissão cita o script, não o `curl` |

### O que isto não faz

- **Não é uma caixa de areia.** A caixa de areia do Bash do Claude Code não roda no Windows nativo, e no macOS e no Linux vem desligada. Se você usa macOS ou Linux, ligá-la nas suas configurações de usuário é o acréscimo mais forte que você pode fazer; nada neste repositório conflita com ela.
- **Regras de prefixo são alarmes, não muros.** `Bash(curl -d:*)` casa com um comando que começa assim; `curl -sS -d` não casa. A lista deny pega as formas óbvias e faz o resto exigir evasão deliberada, o que é diferente de impedir.
- **O WebFetch não é restrito por domínio.** A pesquisa de empresas precisa dele, e um GET para um host qualquer pode levar dados na URL. A regra de instrução (nunca acessar URLs do texto da vaga) é o que fica entre um link escondido e uma coleta; a camada de permissão não.
- **Os pontuadores do `/rank` ainda juntam a régua e a vaga num só contexto.** Cada agente de pontuação coleta e pontua um lote, então a régua da pessoa e a vaga não confiável dividem um contexto que também tem o WebFetch. O que a definição do agente remove é Edit, Write e shell sem restrição. Separar totalmente a coleta da pontuação passaria toda vaga por quem orquestra, o que o `/rank` foi feito para evitar.
- **O filtro é determinístico, não um oráculo.** O `posting_guard.py` pega as classes de ataque que deixam rastro: marcação escondida, caracteres invisíveis, frases dirigidas ao agente, links escondidos, letras parecidas de outros alfabetos. Uma manipulação escrita para parecer natural tanto para uma pessoa quanto para um agente não deixa rastro, e as regras de instrução continuam sendo a única defesa para isso.
- **Edit e Write são o que a skill faz.** Personalizar um currículo é editar arquivos, então essas ferramentas continuam concedidas. O que a lista `ask` garante é que um agente não consiga transformar isso em silêncio numa permissão maior: os arquivos que definem permissões sempre perguntam.

Defesas de instrução elevam a barra; defesas de permissão limitam o estrago. Nenhuma é garantia. Se você rodar este fluxo contra portais em que não confia nada, revise o que o agente coletou e escreveu antes de enviar qualquer coisa.

## Observações de escopo

- As CLIs de portal só fazem pedidos ao vivo quando você as roda; o CI nunca faz (o teste ao vivo do `gupy-search` só roda com `GUPY_LIVE=1`).
- Skills de forks da comunidade listadas no [índice de forks](https://github.com/MadsLorentzen/ai-job-search/discussions/78) do projeto original **não** são cobertas por esta política — revise o código que você copiar, como o próprio índice diz.
