# Como contribuir

Agradecemos o interesse em contribuir! O job-pindorama é a adaptação para o Brasil do [ai-job-search](https://github.com/MadsLorentzen/ai-job-search). Antes de abrir um PR, vale entender o que pertence a este fork e o que pertence ao projeto original — isso economiza trabalho e leva a sua contribuição para onde ela rende mais.

## A regra de onde cada coisa mora

**Este fork existe para o mercado brasileiro.** O projeto original é um modelo universal, sem país, sem idioma e sem dados pessoais; este fork adapta esse modelo ao Brasil. A consequência:

| Tipo de contribuição | Onde |
|---|---|
| Portais brasileiros (Vagas.com, Catho, InfoJobs, Trampos, Programathor, Solides...) | **Aqui** |
| Convenções do mercado brasileiro (CLT, PJ, benefícios, LGPD, processo seletivo, conselhos de classe) | **Aqui** |
| Correções e melhorias do português, da tradução ou da terminologia | **Aqui** |
| Fontes brasileiras de referência salarial e de pesquisa de empresas | **Aqui** |
| Correções de bugs e melhorias no núcleo do fluxo, que valem para qualquer país | **[No projeto original](https://github.com/MadsLorentzen/ai-job-search)** — leia o [CONTRIBUTING de lá](https://github.com/MadsLorentzen/ai-job-search/blob/master/CONTRIBUTING.md) |
| Dados de perfil pessoal | **Em lugar nenhum** — o modelo traz só marcadores; o seu perfil preenchido mora no seu repositório privado |

Uma correção de bug que você achar aqui, mas que existe também no original, vale mais lá: assim ela chega a todo mundo, e este fork a recebe de volta.

## O que é aceito aqui

- **Skills de portal brasileiras** geradas com o `/add-portal` e verificadas ao vivo, respeitando o `robots.txt` e os termos de uso de cada portal. Portais que só funcionam com login são recusados.
- **Ajustes de convenção brasileira** com fonte: uma regra trabalhista, tributária ou de prática de mercado precisa vir com referência (lei, órgão oficial, publicação confiável). Valores de imposto, alíquotas e prazos mudam — prefira descrever a regra e recomendar confirmação a fixar números.
- **Correções de texto**: português do Brasil natural, linguagem neutra quanto a gênero para a pessoa usuária, sem traduções literais do inglês.
- **Correções de robustez** com o caso de falha demonstrado.

## O que é recusado

- **Dados de perfil pessoal.** O CI confere os marcadores (`placeholder-integrity` no original).
- **Infraestrutura especulativa.** A complexidade precisa ser justificada por um problema que existe, não por um que talvez exista.
- **PRs que misturam assuntos.** Um assunto por PR.

## As afirmações são verificadas

As revisões aqui são empíricas, como no projeto original:

- Descreva o caso de falha e como reproduzi-lo.
- **Reproduza no caminho real, não numa entrada construída.** Um teste que falha antes e passa depois é necessário, mas não suficiente: a entrada que falha precisa ser uma que o fluxo de fato produz (a chamada documentada da CLI, a saída real do portal, um arquivo de dados real).
- Testes de CLI vão em `.agents/skills/<nome>/cli/tests/` (bun test, sem rede sempre que possível; testes ao vivo só ligados por variável de ambiente, como o `GUPY_LIVE=1` do `gupy-search`); testes das ferramentas Python vão em `tests/`.
- Rode o que o CI roda: `python tools/lint_skills.py`, `python tools/check_framework_version.py`, `python tools/security_guards.py`, `python -m unittest discover -s tests -t .` e, nas CLIs que você mexeu, `bun run typecheck` + `bun test`.
- Os testes conferem frases exatas dos arquivos de instrução (títulos de passo, regras-chave). Se você mudar uma dessas frases, atualize o teste que a confere no mesmo PR — e só mude se a frase nova disser a mesma coisa.

**Crédito:** uma mudança que incorpora o seu código recebe uma linha `Co-authored-by`; uma mudança escrita a partir da sua observação ou do seu relato recebe uma menção nominal na mensagem do commit e no PR.

## Notas práticas

- **Contrato das skills de portal**: comandos `search`/`detail`, `--format json|table|plain`, erros em JSON no stderr com saída 1, espera progressiva em 429/5xx, zero dependências de execução por padrão, User-Agent honesto sem URL. Veja a especificação do `/add-portal` e o `gupy-search` como implementação de referência.
- **Limites de uso pessoal**: skills de portal que tocam fontes com termos restritivos trazem um aviso destacado de uso apenas pessoal, e o CI de propósito não faz pedidos ao vivo a portais. Não "conserte" isso.
- **Mudanças em LaTeX**: os dois modelos precisam compilar (`lualatex` para o currículo, `xelatex` para a carta) e manter o número exato de páginas, com acentos corretos na camada de texto do PDF.
- **Ao abrir um PR a partir de um fork**, confira a lista "base repository" antes de publicar: o GitHub costuma apontar para o repositório de origem, e PRs com dados pessoais já foram parar em repositórios públicos por engano.

Dúvidas e propostas são bem-vindas nas issues deste repositório — abrir uma ideia antes de construir pode evitar trabalho na direção errada.
