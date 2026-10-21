# Robert Half Brasil: páginas e âncoras de leitura

Levantado em outubro de 2026 (Adobe Experience Manager + componentes `rhcl-*`).

## Busca

`GET https://www.roberthalf.com/br/pt/vagas[?pagenumber=<n>]`: 25 cartões por página, da vaga
mais nova para a mais antiga. `?keyword=`, `?query=`, `?search=`, `?worksite=` são ignorados no
HTML; a busca do site chama uma API interna (`*.jps.api.roberthalfonline.com/search`, com token),
que esta CLI não usa.

Cartão: `<rhcl-job-card job-id="<id>" variant="card">`:

| Campo | Âncora |
|-------|--------|
| título, URL | `<a href="..." slot="headline">` |
| local | `<li data-subslot="location">` ("Guarulhos, ") |
| modelo | `<li data-subslot="worksite">` (`remote`, `hybrid`, `onsite`) |
| tipo | `<li data-subslot="type">` (Permanente, Projetos, Temporário) |
| salário | `salary-min`, `salary-max` (0 = não informado), `salary-currency`, `salary-period` |
| descrição | `<li data-subslot="copy">`: HTML **escapado** (`&lt;p&gt;`) |
| data | `<li data-subslot="date">` (ISO) |

## Detalhe

`GET https://www.roberthalf.com/br/pt/vaga/<cidade>/<slug>/<id>`: traz o mesmo cartão (variante
`listing`, mais um `card` de relacionadas); a leitura pega o cartão do `job-id` pedido.

## Acesso

- `robots.txt`: `/br/pt/vagas` e `/br/pt/vaga` liberados.
- **Termos** (`/br/pt/termos-de-uso`): proíbem "dispositivos, processos ou mecanismos para
  monitorar, recuperar, pesquisar ou acessar dados do Site ou qualquer Material sem o
  consentimento prévio e por escrito da RHB, através, por exemplo, de robôs ou sistemas de
  varredura". Por isso o aviso de uso pessoal no SKILL.md.
