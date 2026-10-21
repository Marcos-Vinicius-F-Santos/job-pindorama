# /add-portal - Gerar uma skill de busca para um portal de vagas do seu mercado

Você vai ajudar a pessoa a construir uma skill de busca para um portal de vagas do mercado dela. O projeto já traz exemplos prontos do padrão (o `gupy-search`, para o Portal Gupy; `solides-search`, `vagas-search`, `infojobs-search` e `remotar-search`, que compartilham uma base comum em `cli/src/helpers.ts` com um `parse.ts` por portal; e os que funcionam em qualquer país, `linkedin-search` e `freehire-search`) — este comando transforma esse convite num fluxo guiado: investigar o portal, montar a skill a partir da estrutura canônica e testar uma busca ao vivo antes de registrar qualquer coisa.

O gerador **não depende de país**: funciona para qualquer portal, em qualquer mercado e idioma. No Brasil, candidatos naturais são InHire, Empregos.com.br, BNE, Trabalha Brasil e portais de nicho da sua área; Catho, Indeed, Glassdoor, Hays e Coodesh já foram investigados e bloqueiam robôs ou proíbem a busca no `robots.txt`, o Compleo exige token, e EmpregaAgro e Perfil Agro tinham poucas vagas (4 e 2) em outubro de 2026 — sempre sujeitos à checagem de `robots.txt` e de termos de uso do Passo 2. As skills geradas são específicas do mercado e vivem no fork da pessoa.

`$ARGUMENTS` pode conter um subcomando, a URL de um portal ou nada.

Siga estes passos **na ordem**.

---

## Passo 0: Interpretar os argumentos

- Se `$ARGUMENTS` contiver `--list`: use o Glob com `.agents/skills/*/SKILL.md`, imprima uma tabela das skills de portal instaladas (nome, mercado pela descrição, fonte de dados pelo `url-reference.md`) e pare.
- Se `$ARGUMENTS` contiver uma URL: trate-a como a URL do portal e leve-a para o Passo 1.
- Caso contrário: comece a entrevista no Passo 1.

---

## Passo 1: Entrevista - dados básicos do portal

Pergunte à pessoa (pule o que `$ARGUMENTS` já responder):

1. **URL do portal** - o site público de vagas (ex.: `https://www.catho.com.br`, `https://trampos.co`).
2. **Nome da skill** - em kebab-case, terminado em `-search` (ex.: `vagas-search`, `catho-search`). Não pode colidir com uma pasta existente em `.agents/skills/`.
3. **Mercado e idioma** - que país ou região o portal cobre e em que idioma as vagas são publicadas. Isso orienta as frases de ativação do `SKILL.md` (inclua termos no idioma local, como faz o `gupy-search`: "buscar vagas", "procurar emprego", "vagas CLT").
4. **Uma busca de teste realista** - um cargo ou competência que a pessoa de fato buscaria, usado no teste ao vivo do Passo 4.

---

## Passo 2: Investigar o portal

Faça o reconhecimento antes de escrever código. Use o WebFetch (ou `python3 tools/fetch_page.py '<URL>' --text` via Bash quando o WebFetch for recusado) no portal:

1. **Ache o padrão da URL de busca.** Carregue a página de busca do portal, faça uma busca (mentalmente na barra de endereço ou via coleta) e identifique: o endpoint de busca, o parâmetro de consulta e os parâmetros de local, idade da vaga e paginação. Prefira uma API JSON se houver uma por trás do site (procure endpoints `/api/` nas chamadas do JavaScript da página, ou dados embutidos como `__NEXT_DATA__` — foi assim que o `gupy-search` foi feito, veja o `url-reference.md` dele); senão, planeje ler a página HTML de resultados.
2. **Colete uma resposta de busca** para a busca de teste e identifique os campos de cada resultado: **id, título, empresa, local, data de publicação e URL**. Para HTML, anote as classes ou atributos que ancoram cada campo. Para JSON, anote os caminhos dos campos. No Brasil, procure também o **regime** (CLT, PJ, estágio), que vale ouro na avaliação.
3. **Ache o padrão da página de detalhe** - a URL que devolve o texto completo de uma vaga, e onde ficam nela a descrição, o prazo, o regime e o link de candidatura.
4. **Confira os requisitos de acesso e os termos.**
   - Colete o `robots.txt` e veja se os caminhos de busca e de detalhe são proibidos.
   - Se o portal exigir login para ver as vagas, **pare**: este padrão só funciona com páginas públicas. Diga à pessoa e sugira verificar se o portal tem uma API oficial.
   - Se o `robots.txt` proibir os caminhos ou os termos do portal proibirem acesso automatizado, diga à pessoa com clareza e deixe-a decidir se segue para uso pessoal. Se seguir, o `SKILL.md` gerado **precisa** trazer um aviso destacado de uso apenas pessoal (copie o tom da seção "⚠️ Personal use only" do `linkedin-search`: volume baixo, nada de uso comercial ou em massa, responsabilidade própria).

5. **Confira se o portal pode ser acessado sem credencial.** Alguns portais só devolvem conteúdo útil por um serviço de coleta de terceiros (uma API paga de desbloqueio/proxy). **Este passo nunca passa por cima do Passo 2.4:** se o `robots.txt` ou os termos do portal proíbem o acesso, isso se decide lá, e um serviço de coleta pago não muda a resposta. O caminho de credencial existe para portais cujo `robots.txt` permite o acesso, mas cuja proteção contra robôs bloqueia coletas comuns. Quando isso se aplicar e a coleta de teste só funcionar por esse serviço, diga à pessoa **antes de montar a skill** — um portal que cobra por consulta é outra proposta, diferente de um gratuito, e ela pode preferir pular. Anote qual serviço e qual variável de ambiente; as regras de uso estão no contrato das skills de portal, no Passo 3.

Registre tudo o que achou — endpoints, parâmetros, âncoras de campos, peculiaridades —; você vai escrever isso no `url-reference.md` no Passo 3.

---

## Passo 3: Montar a skill

**Referência canônica:** leia `.agents/skills/linkedin-search/` e `.agents/skills/gupy-search/` antes de gerar — são exemplos sem dependências desta mesma estrutura (o primeiro lê HTML, o segundo lê JSON). Copie a arquitetura, não a leitura específica de cada portal.

Crie `.agents/skills/<nome>/` com:

```
<nome>/
├── SKILL.md              # Definição da skill com frases de ativação
├── url-reference.md      # Documentação dos endpoints do Passo 2
└── cli/
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    ├── src/
    │   ├── cli.ts        # Leitura de opções, texto de ajuda, despacho de comandos
    │   ├── helpers.ts    # Coleta com espera progressiva, leitores, gravação de erros
    │   └── commands/
    │       ├── search.ts
    │       └── detail.ts
    └── tests/
        └── helpers.ts    # utilitários de teste runCLI + parseJSON (copie do gupy-search)
```

### O contrato das skills de portal (toda skill gerada PRECISA seguir)

Estas convenções são o que torna as skills de portal intercambiáveis para o `/scrape` e para quem lê a documentação de qualquer skill:

- **Comandos:** `search` e `detail <id|url>`.
- **Opções de busca:** `--query`/`-q`, `--jobage <dias>` (idade da vaga; mapeie para o parâmetro do portal, ou filtre do lado da CLI e registre isso no SKILL.md se o portal não tiver), `--page <n>` (começando em 1), `--limit <n>` (limite do lado da CLI), `--format json|table|plain` (padrão `json`). Acrescente `--location`/`-l` se o portal aceitar local como parâmetro; se só aceitar o local dentro da consulta, documente isso no SKILL.md ("inclua a cidade no `--query`").
- **Formato da saída JSON:** `{ "meta": { "count": ..., "page": ... }, "results": [...] }`, em que cada resultado tem pelo menos `id`, `title`, `company`, `location`, `date`, `url` (valores ausentes são `null`, nunca omitidos).
- **Erros:** gravados no **stderr** como `{ "error": "...", "code": "..." }`, código de saída `1`. Nunca grave erros no stdout.
- **Coleta:** um User-Agent honesto que diga o nome da ferramenta (`Mozilla/5.0 (compatible; <portal>-cli/1.0)`, a convenção que toda CLI de portal do projeto segue) — nunca se passar por um navegador completo, e **sem URLs no User-Agent** (toda URL literal nos fontes conta como host do portal na checagem de procedência do `/apply`); se o portal recusar esse UA, a escalada para cabeçalhos de navegador passa pelo filtro de `robots.txt` em `.claude/skills/job-application-assistant/09-web-research.md`, não pelo padrão da CLI. Espera progressiva com variação aleatória em 429/5xx (no máximo ~6 novas tentativas), `""`/`null` em 404 em vez de quebrar.
- **Leitura de HTML:** divida a resposta em pedaços por resultado e leia cada um separadamente, para um cartão malformado não quebrar o resto (veja `parseJobCards` em `linkedin-search/cli/src/helpers.ts`).
- **Dependências:** por padrão, **zero dependências de execução** (só `bun` + `fetch` + leitura por regex), como o `linkedin-search` e o `gupy-search` — o `bun install` só deve trazer os tipos de desenvolvimento. Só acrescente uma biblioteca de leitura se a marcação do portal realmente derrotar a leitura em pedaços por regex, e diga isso no README.
- **Credenciais:** uma skill que precisa de chave de API (Passo 2.5) lê a chave **só** de uma variável de ambiente chamada `<SERVIÇO>_API_TOKEN`. Nunca a deixe fixa no código, nunca a aceite como opção da CLI (opções vazam para o histórico do shell e para a lista de processos), e nunca grave um token real no `url-reference.md`, num exemplo do README ou numa fixture de teste. Se a variável não estiver definida, saia com `1` com o erro JSON padrão no stderr e o código `MISSING_CREDENTIALS`, citando a variável a definir — nunca caia num pedido sem autenticação que falha de forma confusa. O `.gitignore` do repositório cobre o `.env`; não versione um.

### Detalhes dos arquivos

- **Frontmatter do `SKILL.md`:** `name`, `version: 1.0.0`, uma `description` escrita para ativar a skill — precisa citar o portal, o mercado e trazer frases de ativação em inglês **e** no idioma do mercado; `context: fork`; `allowed-tools: Bash(bun run .agents/skills/<name>/cli/src/cli.ts *)`.
- **Corpo do `SKILL.md`:** o que a skill busca, o aviso de uso pessoal se o Passo 2 achou restrições nos termos, a referência de comandos com as opções, 4 a 6 exemplos de uso com o mercado da pessoa (cidades reais, cargos realistas), a tabela de formatos de saída e uma seção de Observações registrando as peculiaridades do portal achadas no Passo 2. Se o Passo 2.5 descobriu que o portal precisa de credencial, acrescente uma seção **Configuração** citando o serviço, a variável de ambiente exata a exportar e o fato de que toda chamada é cobrada — dito onde a pessoa lê antes de rodar a skill, não depois.
- **`url-reference.md`:** os endpoints, a tabela de parâmetros e as notas sobre a estrutura da resposta do Passo 2 — é o arquivo de que uma pessoa mantenedora vai precisar quando o portal mudar a marcação.
- **`package.json`:** nome `<portal>-cli`, `"type": "module"`, scripts `start`, `test` (`bun test --timeout 30000`) e `typecheck` (`tsc --noEmit`); só dependências de desenvolvimento no padrão sem dependências.
- **`tests/`:** copie `runCLI`/`parseJSON` de `gupy-search/cli/tests/helpers.ts`, depois acrescente testes com `fetch` simulado (sem rede, para o CI ser determinístico) e um arquivo pequeno de teste ao vivo, ligado só por variável de ambiente: `search` com a busca de teste sai com código 0 e ≥1 resultado com `id`/`title`/`url` não nulos; uma opção falsa ou um argumento obrigatório faltando sai com 1 e um erro JSON no stderr.

---

## Passo 4: Testar uma busca ao vivo (OBRIGATÓRIO)

Nunca registre uma skill de portal que não devolveu resultados reais. Suposições de marcação do Passo 2 costumam perder peculiaridades que só aparecem ao vivo.

1. Instale os tipos de desenvolvimento e confira a tipagem:
   ```bash
   cd .agents/skills/<nome>/cli && bun install && bun run typecheck
   ```
2. Rode a busca ao vivo com a busca de teste da pessoa:
   ```bash
   bun run src/cli.ts search -q "<busca de teste>" --limit 5 --format table
   ```
3. Confira se os resultados são reais e completos: títulos e empresas preenchidos (não strings vazias nem pedaços de HTML), URLs que levam ao portal, datas que fazem sentido, acentos certos. Se os campos vierem nulos ou embaralhados, corrija os leitores em `helpers.ts` e rode de novo. Repita até ficar limpo.
4. Pegue um `id` (ou a `url`) dos resultados e rode o `detail`:
   ```bash
   bun run src/cli.ts detail <id> --format plain
   ```
   Confira se a descrição é texto legível (entidades decodificadas, tags removidas, quebras de parágrafo preservadas).
5. Rode a suíte de testes: `bun run test`.
6. Mantenha o volume baixo durante as tentativas — um punhado de pedidos, não uma varredura. Se o portal limitar você no meio do teste, recue e avise a pessoa.

Não siga para o Passo 5 enquanto busca, detalhe e testes não passarem.

---

## Passo 5: Registrar

1. Pergunte se a pessoa quer o portal novo na estratégia de busca do `/scrape`. Se quiser:
   - A CLI do portal já é encontrada automaticamente pelo `/scrape` (ele descobre `.agents/skills/*/SKILL.md`) — não é preciso mais nenhuma ligação para busca e detalhe pela CLI.
   - **A pré-aprovação é por portal e deliberada.** O `/scrape` roda a CLI pelo Bash, e as únicas permissões permanentes são as entradas por portal em `.claude/settings.json`. Acrescente `Bash(bun run .agents/skills/<nome>/cli/src/cli.ts:*)` a `permissions.allow` ali **e** a `ALLOWED_PERMISSIONS` em `tools/security_guards.py` no mesmo commit — o guarda reprova o CI do fork por uma entrada de settings que ele não conhece, e esse é o passo de revisão funcionando como deve. Até as duas estarem no lugar, o `/scrape` pede permissão a cada chamada da CLI deste portal; a linha `allowed-tools` do próprio `SKILL.md` gerado só cobre as rodadas que acionam aquela skill diretamente.
   - Opcionalmente, acrescente buscas `site:` de reserva para esse portal em `.claude/skills/job-scraper/search-queries.md`, para o plano B continuar cobrindo o portal se a CLI não estiver disponível.
2. Lembre a pessoa de anotar a linha de instalação, se ela mantiver um README no fork:
   ```bash
   cd .agents/skills/<nome>/cli && bun install && cd ../../../..
   ```
   (Pule se a skill não tiver dependências e a pessoa não se importar com os tipos do typecheck.)
3. Explique que a skill é ativada sozinha pela descrição do `SKILL.md` — não precisa de mais nenhuma ligação.
4. A cobertura de CI também é automática: o job `cli-checks` descobre todo `.agents/skills/*/cli/package.json`, então os scripts `typecheck` e `test` da CLI nova rodam a cada push no fork sem editar o workflow.

---

## Passo 6: Confirmar

Apresente um resumo:

> **Skill de portal `<nome>` gerada e verificada.**
>
> - Arquivos: `.agents/skills/<nome>/` (SKILL.md, url-reference.md, CLI com testes)
> - Teste ao vivo: `search "<busca de teste>"` devolveu <N> resultados; `detail` verificado numa vaga
> - Fonte de dados: <resumo do endpoint>; <aviso de uso pessoal registrado, se for o caso>
>
> Experimente: `bun run .agents/skills/<nome>/cli/src/cli.ts search -q "<busca de teste>" --format table`
>
> Se o portal mudar a marcação depois, o `url-reference.md` registra as âncoras de leitura a atualizar.

---

## Princípios de projeto

- O gerador não depende de país; a saída é específica do mercado e fica no fork da pessoa.
- Investigação antes da montagem: o comando nunca gera leitores a partir de chutes — o Passo 2 coleta respostas reais primeiro, e o Passo 4 verifica contra dados ao vivo antes de registrar qualquer coisa.
- O contrato das skills de portal mantém toda skill gerada intercambiável com as que vêm no projeto: mesmos comandos, mesmas opções, mesmo formato de saída, mesma convenção de erros.
- Zero dependências de execução por padrão, como o `linkedin-search` e o `gupy-search` — uma skill de portal deve rodar num clone novo só com o `bun`.
- As regras de acesso aparecem, não são contornadas em silêncio: portais atrás de login são recusados, restrições de `robots.txt` e de termos são comunicadas à pessoa, e portais com restrição ganham um aviso destacado de uso apenas pessoal.
- Credenciais vivem no ambiente, nunca no repositório: uma skill gerada lê o token de uma variável de ambiente, falha com clareza quando ela não está definida e nunca o versiona. O custo por chamada é informado antes de a skill ser gerada, não descoberto depois.
