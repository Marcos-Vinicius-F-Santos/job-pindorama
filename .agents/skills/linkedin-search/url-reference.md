# Referência de URLs das vagas do LinkedIn

Rotas públicas e sem autenticação `jobs-guest` usadas por esta skill. Globais — as mesmas
rotas servem a todo mercado; só o valor de `location` muda.

> Só para uso pessoal — acesso automatizado vai contra os Termos de Serviço do LinkedIn; mantenha o volume baixo.

## Busca

```
GET https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search
```

Parâmetros de consulta:

| Parâmetro | Significado | Exemplo |
|-----------|-------------|---------|
| `keywords` | Consulta em texto livre | `engenheiro de dados` |
| `location` | Nome do lugar | `São Paulo, Brasil` · `Recife, Pernambuco, Brasil` · `Remote` |
| `f_TPR` | Janela de publicação (segundos) | `r604800` (7 dias), `r2592000` (30 dias) |
| `f_WT` | Modelo de trabalho | `1` presencial · `2` remoto · `3` híbrido |
| `start` | Deslocamento da paginação (10 por página) | `0`, `10`, `20`, … |

Devolve uma lista HTML de cartões de vaga (um `<li>` por vaga). A CLI lê cada cartão pelo
`data-entity-urn="urn:li:jobPosting:<id>"` e extrai título, empresa, local, data e URL.

## Detalhe

```
GET https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/<jobId>
```

Devolve o HTML de uma vaga: título (`top-card-layout__title`), empresa
(`topcard__org-name-link`), local (`topcard__flavor--bullet`), a descrição completa
(`show-more-less-html__markup` / `description__text`) e os critérios da vaga
(senioridade, tipo de contratação, função, setores).

## Observações

- Não exige autenticação.
- Respeite os limites de requisição — a CLI recua em 429/5xx.
- Funciona em qualquer país: passe qualquer `--location` (cidade, estado, país ou "Remote").
