# Ferramenta de referência salarial

## O que é?

A ferramenta de consulta salarial (`salary_lookup.py`) compara os salários de uma empresa com uma referência, a partir dos seus próprios dados. Ela é usada no fluxo do `/apply` para mostrar como a remuneração de uma empresa se compara com o mercado.

**A ferramenta é opcional.** Se você não tiver dados salariais, o passo de salário é simplesmente pulado no `/apply`, e a avaliação usa fontes públicas (guias salariais de consultorias, Glassdoor Brasil, Novo CAGED), dizendo qual usou.

## Como funciona

A ferramenta lê um arquivo `salary_data.json` na raiz do repositório com referências salariais por empresa. Ela usa correspondência aproximada para achar empresas pelo nome, lidando com acentos (busque "Itau" e ela acha "Itaú"), sufixos societários brasileiros (Ltda., S.A., S/A, SA, ME, EPP, EIRELI, SLU), palavras como "Grupo", "Holding" e "Participações", e partes entre parênteses ou depois de vírgula ("Banco Santander (Brasil) S.A.", "Lojas Renner, Filial Recife"). "Brasil" **não** é removido do nome de propósito: senão "Banco do Brasil" viraria só "Banco".

O formato aceita dados por índice ou valores absolutos. Por exemplo:
- Index 100 = median salary (índice 100 = salário mediano; maior é melhor)
- Valores absolutos de salário em reais
- Qualquer métrica própria que você queira acompanhar

## Formato dos dados

A ferramenta espera um `salary_data.json` com esta estrutura:

```json
{
  "metadata": {
    "source": "Pesquisa salarial 2026",
    "index_baseline": 100,
    "index_label": "Índice",
    "baseline_description": "Índice 100 = salário mediano do setor privado"
  },
  "companies": [
    {
      "company": "Mercado Livre Ltda.",
      "city": "Osasco",
      "categories": {
        "all_employees": { "count": 500, "index": 108.5 },
        "engineering": { "count": 120, "index": 112.3 }
      }
    },
    {
      "company": "WEG S.A.",
      "city": "Jaraguá do Sul",
      "categories": {
        "all_employees": { "count": 200, "index": 105.2 }
      }
    }
  ]
}
```

### Campos

- **metadata.source**: de onde vêm os dados (para referência)
- **metadata.index_baseline**: o valor de referência (ex.: 100 para dados por índice; 0 para valores absolutos)
- **metadata.index_label**: rótulo da coluna de índice na saída
- **metadata.baseline_description**: explicação legível da referência
- **companies[].company**: nome da empresa (obrigatório)
- **companies[].city**: cidade/local (opcional, usado para filtrar)
- **companies[].categories**: categorias salariais com nome, cada uma com `count` e/ou `index`

## Opções de configuração

### Opção A: criar o salary_data.json à mão

Crie o arquivo à mão com dados de qualquer fonte: pesquisas salariais, guias de consultorias de recrutamento, Glassdoor, conversas com pessoas da área ou pesquisa própria.

### Opção B: converter de uma planilha Excel

Se você tem os dados numa planilha Excel:

```bash
pip install openpyxl
python3 tools/convert_salary_excel.py caminho/para/salarios.xlsx \
  --source "Minha pesquisa salarial 2026" \
  --baseline 100 \
  --baseline-desc "Índice 100 = salário mediano"
```

No Windows, use `py` ou `python` conforme o seu PATH. Se o seu sistema usa `python` em vez de `python3`, troque nos exemplos.

O conversor detecta a organização da planilha sozinho:
- Procura uma coluna "Empresa" (ou "Company"/"Firma") e uma coluna opcional "Cidade" (ou "City"/"By")
- Trata as demais colunas como dados salariais e junta os pares de quantidade e índice pela categoria: "Qtd. funcionários TI" + "Salário médio TI" viram a categoria `ti`
- Reconhece cabeçalhos acentuados ("Salário", "Média", "Remuneração", "Índice", "Quantidade", "Funcionários", "Colaboradores")
- Lê números no formato brasileiro (`12.345,67`) e no americano (`12,345.67`)
- Descarta colunas de identificação (`ID`, `CPF`, `Matrícula`), que nunca são dado salarial

### Opção C: montar a partir de pesquisa

Comece com um modelo vazio e acrescente empresas à medida que pesquisar:

```json
{
  "metadata": {
    "source": "Pesquisa própria",
    "index_baseline": 0,
    "index_label": "Salário mensal bruto CLT (R$)",
    "baseline_description": "Salário mensal aproximado, bruto, em regime CLT"
  },
  "companies": [
    {
      "company": "Acme Tecnologia Ltda.",
      "city": "São Paulo",
      "categories": {
        "junior": { "index": 5500 },
        "pleno": { "index": 9000 },
        "senior": { "index": 14000 }
      }
    }
  ]
}
```

Deixe claro no `index_label` se o valor é **bruto CLT** ou **valor PJ**: os dois não se comparam diretamente (veja a seção de regime em `04-job-evaluation.md`).

## Uso

```bash
python3 salary_lookup.py "Mercado Livre"
python3 salary_lookup.py "WEG" --city "Jaraguá do Sul"
python3 salary_lookup.py "Itau" --json
python3 salary_lookup.py --list-all
python3 salary_lookup.py --validate      # confere o seu salary_data.json antes de usar
```

## Observações importantes

- O arquivo de dados (`salary_data.json`) **fica fora do git** (veja o `.gitignore`). Os seus dados salariais podem ser proprietários ou confidenciais.
- Se o arquivo de dados não existir, o `salary_lookup.py` sai com uma mensagem de erro útil e o fluxo do `/apply` pula o passo de referência salarial.
- A correspondência aproximada lida com variações de nomes de empresas brasileiras: sufixos societários, acentos e correspondências parciais.
- `--validate` confere o arquivo atrás de categorias malformadas e nomes de empresa duplicados e imprime um relatório, sem fazer consulta.
- As mensagens de saída da ferramenta continuam em inglês (por compatibilidade com o projeto original); os nomes de empresa e de cidade aparecem como estão no arquivo.
