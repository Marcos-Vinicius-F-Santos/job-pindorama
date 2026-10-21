# AGROSearch (Agroforce): rotas e campos

Levantado em outubro de 2026. O portal (`agroforce.agrosearch.com.br/portal.html`) é uma página
única em JavaScript; a base da API vem de `config.js`
(`window.APP_CONFIG.apiBase = 'https://apim-agroforce-prod.azure-api.net/v1'`).

## Busca

`GET https://apim-agroforce-prod.azure-api.net/v1/public/vagas` → array com todas as vagas
abertas (35 em outubro de 2026): `{ dealId, titulo, modelo }`. `modelo` é texto livre com
regime, benefícios e modelo de trabalho. `dealId` negativo = recrutamento interno da AGROSearch.

## Detalhe

`GET https://apim-agroforce-prod.azure-api.net/v1/public/vagas/<dealId>` →
`{ dealId, titulo, divisao, descricao, responsabilidades: [], requisitos: [], modelo, temQuestionario }`.
Os itens das listas às vezes já vêm com "- " ou "•": a CLI tira o marcador.

Página no portal: `https://agroforce.agrosearch.com.br/portal.html#/vaga/<dealId>`.

## Acesso

- `robots.txt`: nem o portal nem o gateway da API publicam um (404), o que é permissão.
- Termos de uso: não encontrados no site da AGROSearch.
