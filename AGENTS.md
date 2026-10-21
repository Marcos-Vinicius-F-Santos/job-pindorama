---
framework_version: 1.1.3
---

# Orientações para agentes: job-pindorama

Este espaço de trabalho organiza a busca de emprego: ferramentas de busca de vagas, currículos, cartas de apresentação e preparação para entrevistas, adaptados ao mercado brasileiro. Converse em português do Brasil, a menos que a pessoa escreva em outro idioma.

## Ponteiros finos (fonte única da verdade)

Para evitar duplicação e divergência de configuração entre diferentes ambientes de agentes de IA (Claude Code, Google Antigravity, Codex, Cursor, Gemini CLI etc.), este espaço de trabalho usa um desenho de ponteiros finos. Todo ambiente de agente deve carregar as especificações canônicas e os perfis a partir dos arquivos e pastas abaixo:

1. **Perfil da pessoa candidata:**
   - O perfil, os contatos, a formação e as preferências de busca estão no [CLAUDE.md](CLAUDE.md) e nos arquivos de método do perfil em [.claude/skills/job-application-assistant/](.claude/skills/job-application-assistant/) (especificamente `01-*.md` etc.).
2. **Especificações canônicas do fluxo:**
   - As instruções passo a passo e os gatilhos das tarefas (setup, scrape, rank, apply, upskill, interview) estão na pasta [.claude/](.claude/) (especificamente em `.claude/skills/` e `.claude/commands/`).
   - Não duplique essas regras ou especificações. Trate os arquivos de `.claude/` como a fonte única da verdade.
3. **Skills de busca em portais:**
   - As CLIs de busca em portais de vagas ficam em [.agents/skills/](.agents/skills/), no formato portátil de Agent Skills (um `SKILL.md` por portal: `gupy-search`, `solides-search`, `vagas-search`, `infojobs-search`, `remotar-search`, `greenhouse-search`, `programathor-search`, `michaelpage-search`, `geekhunter-search`, `trampos-search`, `roberthalf-search`, `pcd-search`, `agrobase-search`, `agrosearch-search`, `linkedin-search`, `freehire-search`). O Codex e o Antigravity as descobrem sozinhos; o fluxo do `/scrape` em [.claude/skills/job-scraper/](.claude/skills/job-scraper/) as orquestra.
