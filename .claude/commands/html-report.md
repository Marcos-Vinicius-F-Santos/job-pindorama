# /html-report - Gerar o painel de candidaturas

Gere um painel HTML autossuficiente a partir de `job_search_tracker.csv` e dos arquivos de candidatura em `documents/applications/`. A saída é um único arquivo `.html` — sem servidor, sem dependências — que abre direto no navegador. O painel é todo em português do Brasil.

## Passo 0: Interpretar os argumentos

- Sem argumento → grava em `reports/application-dashboard.html`
- Um caminho como argumento (ex.: `/html-report ~/Desktop/relatorio.html`) → usa esse caminho
- Opção `--open` → depois de gravar, diga à pessoa para abrir o arquivo (você não consegue abrir um navegador diretamente)

Crie `reports/` se não existir.

---

## Passo 1: Reunir os dados

Leia em paralelo:

1. **`job_search_tracker.csv`** — a fonte principal. Leia cada linha como um registro com os campos:
   `date`, `company`, `sector`, `role`, `role_type`, `channel`, `status`, `contact_person`, `fit_rating`, `notes`, `cv_file`, `cover_letter_file`, `source`, `deadline`

   Linhas gravadas antes de `deadline` existir têm treze campos e nenhum décimo quarto valor. Trate o campo ausente como vazio — nunca descarte a linha, e nunca deduza um prazo a partir da `date` dela.

2. **`documents/applications/*/outcome.md`** — para cada candidatura resolvida, leia o arquivo de resultado para obter as etapas de entrevista exatas alcançadas (as caixas marcadas) e as observações. Junte isso à linha do tracker correspondente por empresa+cargo com correspondência aproximada (minúsculas, ignorando pontuação). Se houver um arquivo para uma linha sem correspondência, anexe-o como contexto extra mesmo assim.

Normalização de status — leve os valores do tracker a seis categorias canônicas antes de calcular as estatísticas:
- `drafted` → **Rascunho** (documentos gravados pelo `/apply`, ainda não enviados)
- `applied` → **Ativa** (currículo enviado, nenhum sinal adicional)
- `interview` → **Entrevista**
- `offer` → **Proposta**
- `hired` → **Contratação**
- `rejected` / `no_response` / `no response` / `offer_declined` / `offer declined` / `withdrawn` → **Recusada/Encerrada**
- qualquer outro valor → **Recusada/Encerrada**, e cite o valor não reconhecido (unrecognised) uma vez no detalhamento por status — a correspondência não diferencia maiúsculas

   O mapa de categorias aceita as grafias antigas com espaço na leitura, para nada gravado antes
   de as formas canônicas serem fixadas sumir das estatísticas; o **Vocabulário de status do tracker**
   do `/outcome` é o conjunto oficial.

---

## Passo 2: Calcular as estatísticas

A partir dos dados normalizados, calcule:

**Linhas em Rascunho ficam fora de todas as estatísticas abaixo** — nunca foram enviadas. Informe a contagem de Rascunho à parte, e inclua-a só no detalhamento por status.

- **Total de candidaturas**
- **Por categoria de status:** contagem por categoria
- **Por setor:** contagem por valor único de setor
- **Por canal:** portal × online × indicação × outro
- **Por ano/temporada:** agrupe pelo campo `date` (que pode ser um ano como `2025` ou uma data completa)
- **Taxas do funil:** que % passou da triagem de currículo (chegou à Entrevista ou além). Calcule a etapa alcançada pelo histórico, não pelo status atual: uma candidatura conta como tendo alcançado uma etapa quando o status atual a implica **ou** quando as caixas de etapa do `outcome.md` juntado (Passo 1.2) mostram que a etapa foi alcançada — uma linha `rejected` cujo arquivo de resultado marca uma etapa de entrevista chegou à Entrevista, e uma linha `hired` passou por todas as etapas antes da Contratação. Usar só o status atual subconta todas as etapas anteriores por construção: uma busca terminada pareceria uma em que ninguém foi entrevistado.
- **Taxa de recusa:** recusas de verdade (`rejected`, `no_response`) ÷ candidaturas com desfecho final. `offer_declined` (a pessoa recusou a proposta — um sucesso) e `withdrawn` (desistência da pessoa) não são recusas e ficam fora do numerador; linhas em Entrevista e Proposta ainda não estão resolvidas, então ficam fora do denominador junto com as Ativas. A *categoria* Recusada/Encerrada continua agrupando todas as linhas encerradas para o gráfico de rosca — a taxa só não pode reutilizar a categoria às cegas.

---

## Passo 3: Gerar o HTML

Grave um único arquivo HTML autossuficiente, com `<html lang="pt-BR">`. Todo o CSS fica inline num bloco `<style>`. Todo o JS fica inline num bloco `<script>`. Desenhe os gráficos de rosca e de barras como SVG inline gerado à mão — sem Chart.js, sem CDN, sem dependência externa de nenhum tipo. O relatório precisa abrir completo sem internet, sempre.

**Escape (obrigatório):** faça o escape HTML de todo valor vindo do CSV ou dos arquivos de resultado (`&` `<` `>` `"` `'`) antes de interpolá-lo na página — isso inclui células de tabela, atributos `title` de observações truncadas e qualquer texto posto dentro do SVG (rótulos `<text>`, dicas dos gráficos). Observações e nomes de empresa copiados de vagas trazem esses caracteres com frequência (C&A, P&G); sem escape, quebram o layout ou injetam marcação numa página que a pessoa abre o tempo todo.

**Datas:** mostre as datas no formato brasileiro `DD/MM/AAAA` na tabela, mantendo a ordenação pela data ISO.

### Layout

```
┌─────────────────────────────────────────────┐
│  🔍 Painel da busca de emprego  Gerado: DATA │
├──────┬──────┬──────┬──────┬──────┬───────────┤
│Envia-│Rascu-│Ativas│Entre-│Propo-│Recusadas/ │  ← cartões de números
│das N │nho N │  N   │vista │sta N │Encerradas │
├──────┴──────┴──────┴──────┴──────┴───────────┤
│  Status (rosca)          │ Por setor (barras) │  ← linha de gráficos
├─────────────────────────────────────────────  ┤
│  Por canal (barras)  │  Funil (barras horiz.) │  ← linha de gráficos
├──────────────────────────────────────────────  ┤
│  Candidaturas  [Status ▾] [Setor ▾] [🔍 ...]  │  ← tabela com filtros
│  data │ empresa │ setor │ cargo │ status │ ... │
│  ...                                          │
└───────────────────────────────────────────────┘
```

### Especificação visual

- **Paleta:** propriedades CSS personalizadas. Cores por status:
  - Rascunho: `#64748b` (ardósia)
  - Ativa: `#3b82f6` (azul)
  - Entrevista: `#f59e0b` (âmbar)
  - Proposta: `#8b5cf6` (roxo)
  - Contratação: `#22c55e` (verde)
  - Recusada/Encerrada: `#ef4444` (vermelho)
- **Fonte:** pilha system-ui, sem fontes da web
- **Cartões de números:** fundo branco, sombra sutil, número grande em negrito, rótulo abaixo, borda esquerda na cor do status
- **Gráficos:** numa grade de 2 colunas em telas largas, empilhados em telas estreitas
- **Tabela:**
  - Linhas com sombreamento alternado
  - A coluna de status usa uma etiqueta colorida
  - A coluna `source` vira link se o valor for uma URL (começa com `http`)
  - Células vazias aparecem como `—`
  - Filtro no navegador: um campo de busca filtra as linhas por empresa + cargo + setor; os menus de status e de setor filtram de forma independente; os três se combinam (E)
  - Linhas ordenadas da mais nova para a mais antiga por padrão (por `date` decrescente, depois pela empresa em ordem alfabética)
- **Responsivo:** usável a partir de 900px, sem quebrar abaixo disso
- **Rodapé:** "Gerado pelo Claude Code · job-pindorama (baseado no ai-job-search) · {data ISO}"

### Gráficos (SVG inline)

1. **Rosca de status** — fatias por categoria de status, com as cores da paleta acima
2. **Barras por setor** (horizontais) — quantidade por setor, em ordem decrescente
3. **Barras por canal** — online / indicação / outro
4. **Funil de candidaturas** (barras horizontais) — Enviada → Entrevista → Proposta → Contratação, cada barra = quantas chegaram àquela etapa, derivado pela regra de funil do Passo 2 (status atual **mais** as caixas de etapa do `outcome.md` juntado), para quem foi entrevistado e depois recusado ainda contar na barra de Entrevista

Monte cada gráfico como um elemento `<svg>` escrito à mão: calcule o comprimento das barras e os ângulos dos arcos da rosca a partir das estatísticas do Passo 2 e emita os elementos `<rect>`/`<path>`/`<circle>` e `<text>` diretamente — sem biblioteca de gráficos, sem `<canvas>`. Cada `<svg>` tem `role="img"` e um `aria-label` resumindo o gráfico (ex.: "Status: 3 Ativas, 2 Entrevista, 1 Proposta"). Envolva cada um num `<div class="chart-card">` com um título `<h3>` acima. Lembre de fazer o escape de todo rótulo ou valor desenhado em nós `<text>`, conforme a regra de escape acima.

### Tabela: colunas a incluir

`Date` · `Deadline` · `Company` · `Role` · `Sector` · `Channel` · `Status` · `Notes` (truncadas em 80 caracteres, com dica `title` mostrando o texto completo) · `Source` (link ou `—`)

Mostre os cabeçalhos em português: Data · Prazo · Empresa · Cargo · Setor · Canal · Status · Observações · Origem. Colunas vazias em todas as linhas podem ser omitidas.

---

## Passo 4: Gravar e confirmar

Grave o HTML completo no caminho de saída com a ferramenta Write.

Depois apresente:

> **Painel gerado:** `<caminho de saída>`
>
> Abra em qualquer navegador — não precisa de servidor.
>
> **Resumo:**
> - Candidaturas enviadas: N · rascunhadas, ainda não enviadas: N
> - Ativas: N · Entrevista: N · Contratação: N · Recusadas/Encerradas: N
> - Funil: N% passaram da triagem de currículo
>
> Rode `/html-report` de novo sempre que acrescentar entradas via `/apply` ou `/outcome`, para atualizar o painel.

---

## Princípios de projeto

- **Autossuficiente.** Um arquivo, totalmente offline — os gráficos são SVG inline, sem CDN nem pedido externo de nenhum tipo.
- **Só dados.** Este comando lê e desenha; nunca grava no tracker nem no arquivo.
- **Idempotente.** Rodar de novo sobrescreve o relatório anterior no mesmo caminho — sem acúmulo.
- **Elegante com poucos dados.** Com poucas linhas, os gráficos aparecem corretamente para N pequeno; a tabela é o valor principal. Não esconda gráficos só porque N é pequeno.
- **Nada inventado.** Todo número do relatório vem direto do CSV ou dos arquivos de resultado. Não deduza nem estime campos ausentes.
