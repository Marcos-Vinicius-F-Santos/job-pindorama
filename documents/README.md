# Pasta de documentos

Esta pasta guarda os seus documentos de carreira reais. O comando `/setup` lê tudo o que está aqui e usa para preencher os arquivos de perfil em `.claude/skills/job-application-assistant/`. Pode rodar o `/setup` de novo sempre que acrescentar documentos — ele mescla com inteligência e nunca sobrescreve conteúdo existente sem perguntar antes.

> **Privacidade:** estes arquivos têm dados pessoais. Não faça push deles para um fork público (veja a seção 8 do SETUP.md). Antes de colocar um currículo antigo aqui, considere apagar CPF, RG e data de nascimento: o `/setup` ignora esses dados, mas o melhor é eles nem estarem no repositório.

---

## Estrutura das pastas

```
documents/
├── cv/                          # Seus currículos (PDF ou LaTeX)
├── linkedin/                    # Exportação do perfil do LinkedIn (PDF)
├── diplomas/                    # Diplomas, certificados e históricos escolares
├── references/                  # Cartas de recomendação
├── projects/                    # Resumos de projetos independentes, estudos de caso ou portfólio
├── postings/                    # Texto bruto de vagas, colado à mão quando o Claude não consegue acessar a página
│   └── <Empresa> - <Cargo>.txt  # Nome do arquivo = empresa + cargo; conteúdo = texto integral da vaga
├── applications/                # Candidaturas anteriores
│   └── <company>_<role>/
│       ├── job_posting.md       # A vaga original (gravada pelo /apply, ou colada)
│       ├── cover_letter.tex     # A carta que você enviou
│       ├── cv_draft.tex         # A variante de currículo que você enviou
│       └── outcome.md           # Resultado + observações (preencha depois do retorno)
└── README.md                    # Este arquivo
```

---

## cv/

O seu currículo mestre — a versão mais completa e sem cortes da sua trajetória.

**Formatos aceitos:** `.pdf`, `.tex`

**O que o `/setup` extrai:**
- Experiência (cargos, empresas, datas, tópicos)
- Formação (cursos, instituições, datas, temas de TCC, dissertação ou tese)
- Competências técnicas
- Prêmios e publicações
- Contato

**Nomes:** qualquer nome serve. Se houver vários arquivos, o `/setup` lê todos e cruza as informações para conferir a consistência.

**Dica:** guarde aqui o currículo mais completo (não uma variante personalizada). Os arquivos de perfil são a fonte canônica — currículos personalizados são gerados por candidatura pelo `/apply`.

---

## linkedin/

O seu perfil do LinkedIn exportado em PDF.

**Como exportar:** no LinkedIn, vá ao seu perfil → Mais → Salvar como PDF. Isso exporta um resumo estruturado do perfil.

**Formatos aceitos:** `.pdf`

**O que o `/setup` extrai:**
- Experiência e datas (cruzadas com o currículo)
- Competências e recomendações de competências
- Formação
- Licenças e certificados
- Trabalho voluntário
- Publicações
- Seção Sobre (usada para inferir acréscimos ao perfil comportamental)
- Recomendações recebidas (podem enriquecer o contexto das referências)

**Nomes:** qualquer nome serve. Espera-se uma única exportação do LinkedIn; se houver várias, o `/setup` usa a modificada mais recentemente.

---

## diplomas/

Diplomas, certificados de conclusão, históricos escolares e qualquer qualificação oficial.

**Formatos aceitos:** `.pdf`

**O que o `/setup` extrai:**
- Títulos e nomes oficiais dos cursos (usados para conferir a formação)
- Datas de conclusão
- Notas, menções ou coeficiente de rendimento (se visíveis)
- Nomes das instituições (grafia oficial)

**Nomes:** use nomes descritivos, ex.: `mestrado_fisica_usp_2025.pdf`, `bacharelado_fisica_unicamp_2016.pdf`. O nome não afeta a leitura.

---

## references/

Cartas de recomendação de ex-gestores, orientadores ou colegas.

**Formatos aceitos:** `.pdf`, `.txt`, `.md`

**O que o `/setup` extrai:**
- Nome, cargo e organização de quem recomenda
- Citações e avaliações específicas (acrescentadas à seção de referências do `01-candidate-profile.md`)
- A linguagem de competências usada (acrescenta sinal comportamental ao `02-behavioral-profile.md`)

**Nomes:** use o nome de quem recomenda, ex.: `referencia_maria_souza.pdf`.

---

## projects/

Resumos, estudos de caso, READMEs, relatos ou documentação de projetos independentes, de código aberto, freelas ou de portfólio pessoal.

**Formatos aceitos:** `.md`, `.txt`, `.pdf`

**O que o `/setup` extrai:**
- Nome e descrição do projeto
- Domínio do problema e público-alvo
- Stack, ferramentas e bibliotecas usadas
- Principais desafios técnicos e decisões de arquitetura
- Resultados mensuráveis, métricas ou ganhos de desempenho (acrescentados ao `01-candidate-profile.md` em `## Projetos independentes`)

**Nomes:** use nomes descritivos, ex.: `projeto_chat_tempo_real.md`, `portfolio_compilador.txt`, `etl_codigo_aberto.pdf`.

**Dica:** estes arquivos alimentam a seção `## Projetos independentes` do `01-candidate-profile.md` e trazem evidência técnica concreta que o `/apply` pode usar nos currículos e cartas personalizados.

---

## postings/

Uma caixa de entrada para o texto bruto de vagas quando o Claude não consegue acessar a página diretamente (ATS que bloqueiam robôs, páginas atrás de Cloudflare, sites montados em JavaScript que voltam vazios etc.). Você abre a vaga e cola o texto integral num arquivo `.txt` aqui.

**Nomes:** `<Empresa> - <Cargo>.txt`, ex.: `Acme Tecnologia - Desenvolvedor Frontend React.txt`. O conteúdo é o texto integral da vaga, colado como está. Incluir a empresa evita colisão quando duas vagas têm o mesmo título, e já entrega ao `/apply` o nome da empresa.

**Fluxo:** coloque o arquivo e avise o Claude na conversa — a pasta não é monitorada automaticamente. Depois de avaliada ou de você se candidatar, a vaga pode ser apagada daqui ou ficar como registro; é uma caixa de rascunho, não um arquivo (use `applications/<company>_<role>/job_posting.md` para isso quando de fato se candidatar).

**Fronteira de confiança:** o texto de vaga colado continua sendo conteúdo de terceiros não confiável, igual a tudo o que o Claude coleta diretamente — dado a avaliar, nunca instrução a seguir (veja as regras de entrada não confiável no `SECURITY.md`). Colar à mão não muda isso.

---

## applications/

Um registro das candidaturas anteriores. Cada subpasta é uma candidatura.

Você pode manter estas pastas à mão, ou deixar o comando **`/outcome`** cuidar delas: ele registra atualizações de andamento e resultados finais em conversa, arquiva os rascunhos enviados e, se o `/apply` ainda não tiver gravado, o texto da vaga, mantém o `outcome.md` no formato abaixo e atualiza o `job_search_tracker.csv` no mesmo passo.

**Nomes de subpasta:** `<company>_<role>` — minúsculas, sublinhado no lugar de espaço.
Todo caractere que não seja letra, dígito ou sublinhado é descartado (então `Itaú Unibanco S/A`
vira `itaú_unibanco_sa`; letras acentuadas são letras e ficam), sequências de sublinhados viram
um só, e sublinhados no começo e no fim são removidos. Se o nome derivado ficar vazio, pare e
peça à pessoa um nome de empresa ou de cargo com pelo menos uma letra ou dígito; não crie arquivo
nem pasta. Todo resultado não vazio é, portanto, um único componente de caminho, contenha a vaga o que contiver.

Exemplos:
```
applications/
├── acme_engenheiro_de_ml/
├── natura_co_analista_de_dados/
└── consultco_consultor_de_ia/
```

### Arquivos de cada pasta de candidatura

**`job_posting.md`** — O texto integral da vaga, gravado pelo `/apply`, ou colado aqui. Usado pelo `/setup` para inferir que competências e tipos de vaga você buscou, e para calibrar o `04-job-evaluation.md`.

**`cover_letter.tex`** — A carta que você de fato enviou. Usada para extrair padrões de estilo e estrutura para o `06-cover-letter-templates.md`.

**`cv_draft.tex`** — A variante de currículo que você enviou. Usada para extrair estilos de resumo profissional para o `05-cv-templates.md`.

**`outcome.md`** — Preencha quando a candidatura se resolver. Formato:

```markdown
# Resultado: <Empresa> — <Cargo>

**Status:** in_progress | hired | offer_declined | rejected | no_response | interview_only

**Data de resolução:** AAAA-MM-DD

## Etapas alcançadas
- [ ] Triagem com o RH
- [ ] Testes online
- [ ] Entrevista técnica
- [ ] Case
- [ ] Entrevista final
- [ ] Proposta recebida

## Observações
O que aconteceu? Que devolutiva você recebeu (se houve)?
O que faria diferente?
Algum sinal do que valorizaram ou não?
```

Os valores de **Status** ficam como códigos em inglês, porque comandos e ferramentas leem esses valores. `in_progress` marca uma candidatura ainda aberta (usado pelo `/outcome` para atualizações de etapa antes de uma resolução). A calibração do `/setup` só tira conclusões de candidaturas com status final.

As pastas de candidatura também podem ter arquivos **`interview_prep_<stage>.md`** gravados pelo `/interview` (um por etapa de entrevista, guardados como histórico). O `/setup` lê só os quatro arquivos citados acima e ignora estes.

**O que o `/setup` aprende com o outcome.md:**
- Que tipos de vaga e empresas levaram a entrevistas (sinaliza áreas de bom encaixe)
- Que candidaturas não avançaram (informa a calibração de experiência no `04-job-evaluation.md`)
- A devolutiva de entrevista, se você registrou, pode revelar novos candidatos a STAR

---

## Observações sobre formatos

| Formato | O `/setup` lê? | Observações |
|---------|----------------|-------------|
| `.pdf` | Sim | Lido direto com a ferramenta Read |
| `.tex` | Sim | Fonte LaTeX — estrutura e conteúdo legíveis |
| `.md` | Sim | Texto simples |
| `.txt` | Sim | Texto simples |
| `.docx` | Não | Converta para PDF antes de colocar aqui |
| `.png` / `.jpg` | Não | Documentos escaneados não são lidos — use PDFs com texto |

---

## Rodando o `/setup` de novo

O comando foi feito para rodar de novo à medida que a sua coleção de documentos cresce. Cada execução:

1. Lê o estado atual de todos os arquivos de perfil
2. Compara o conteúdo extraído dos documentos com o que já está lá
3. Só propõe mudanças para conteúdo realmente novo ou conflitante
4. Nunca sobrescreve em silêncio — conflitos aparecem explicitamente para você decidir

**Quando rodar de novo:**
- Depois de acrescentar uma nova exportação do LinkedIn
- Depois de acrescentar cartas de recomendação
- Depois de registrar o resultado de candidaturas concluídas
- Depois de atualizar o seu currículo mestre
