# Referência técnica: Portal Gupy

Levantamento feito em 2026-10-19. Este é o arquivo para consultar quando a Gupy mudar
algo e a CLI parar de funcionar.

## Acesso

| Item | Situação |
|------|----------|
| Login | Não precisa (busca e páginas de vaga são públicas) |
| Chave de API | Não precisa. `api.gupy.io` é a API das **empresas** e exige token: não usar |
| `portal.gupy.io/robots.txt` | `User-agent: *` / `Disallow:` (vazio, tudo liberado) |
| `<empresa>.gupy.io/robots.txt` | `Allow: /`, bloqueia só `/companies` e `/candidates` |
| User-Agent | O honesto (`gupy-cli/1.0`) é aceito; não é preciso fingir ser navegador |

Rotas antigas que **não existem mais** (404): `portal.api.gupy.io/api/job`,
`employability-portal.gupy.io/api/v1/jobs`.

## Busca

```
GET https://portal.gupy.io/api/job-search/jobs?jobName=<termo>&limit=<n>&offset=<n>
```

É a rota que a página `portal.gupy.io/job-search/term=<termo>` chama no navegador
(achada no JavaScript do portal: `u="/api/job-search/jobs"`).

| Parâmetro | Exemplo | Observação |
|-----------|---------|------------|
| `jobName` | `analista de dados` | Busca no título |
| `limit` | `25` | Até 100 testado |
| `offset` | `50` | Paginação por deslocamento |
| `state` | `São Paulo` | **Nome completo** do estado, não a sigla |
| `city` | `Recife` | Nome da cidade |
| `workplaceType` | `remote`, `hybrid`, `on-site` | **Um valor só** |
| `type` | `vacancy_legal_entity` | **Um valor só** (ver tabela abaixo) |
| `isPWD` | `true` | Vagas com o selo "também para PcD" (não usado pela CLI) |

**Armadilha:** repetir `type` ou `workplaceType` (`type=a&type=b`) não dá erro: a API
ignora o filtro e devolve tudo (o total pulou de 160 para 7.325 no teste). Por isso a
CLI aceita um valor por filtro.

Não há parâmetro de data de publicação; o resultado vem ordenado da mais nova para a
mais antiga (`sortBy`/`sortOrder` existem no front, mas não mudaram a ordem nos testes).

### Resposta

```json
{
  "data": [
    {
      "id": 12749301,
      "name": "Analista de Dados SR",
      "applicationDeadline": "2027-02-28T00:00:00.000Z",
      "description": "Trecho da descrição em texto, com entidades HTML (&nbsp;)",
      "careerPageName": "Afya",
      "careerPageLogo": "https://attachments.gupy.io/...png",
      "careerPageUrl": "",
      "type": "vacancy_type_effective",
      "publishedDate": "2026-10-19T20:39:28.532Z",
      "workplaceType": "hybrid",
      "city": "Belo Horizonte",
      "state": "Minas Gerais",
      "jobUrl": "https://afya.gupy.io/job/eyJqb2JJZCI6MTI3NDkzMDEsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=?jobBoardSource=gupy_portal",
      "badges": { "friendlyBadge": true, "isPWD": false },
      "disabilities": false
    }
  ],
  "pagination": { "total": 235, "limit": 12, "offset": 0 }
}
```

- Vagas remotas vêm com `city` e `state` vazios.
- O trecho do `jobUrl` depois de `/job/` é base64 de `{"jobId":12749301,"source":"gupy_portal"}`.
- A CLI devolve a URL canônica `https://<empresa>.gupy.io/jobs/<id>` (a mesma que a página
  declara como canônica), para a deduplicação não depender do parâmetro de origem.

### Regimes (`type`)

| Código | Rótulo no portal | Apelido na CLI |
|--------|------------------|----------------|
| `vacancy_type_effective` | Efetivo (CLT) | `clt`, `efetivo` |
| `vacancy_legal_entity` | Pessoa Jurídica | `pj` |
| `vacancy_type_internship` | Estágio | `estagio` |
| `vacancy_type_trainee` | Trainee | `trainee` |
| `vacancy_type_apprentice` | Aprendiz | `aprendiz` |
| `vacancy_type_temporary` | Temporário | `temporario` |
| `vacancy_type_outsource` | Terceiro | `terceiro` |
| `vacancy_type_autonomous` | Autônomo | `autonomo` |
| `vacancy_type_freelancer` | Freelancer | `freelancer` |
| `vacancy_type_intermittent` | Intermitente | `intermitente` |
| `vacancy_type_associate` | Associado | `associado` |
| `vacancy_type_lecturer` | Docente | `docente` |
| `vacancy_type_volunteer` | Voluntário | `voluntario` |
| `vacancy_type_talent_pool` | Banco de Talentos | `banco-de-talentos` |
| `vacancy_type_summer` | Summer job | `summer-job` |
| `vacancy_type_parter` | Sócio (grafia da Gupy) | (sem apelido) |

## Detalhe

```
GET https://<empresa>.gupy.io/jobs/<id>
```

Página HTML (Next.js). Os dados estão no `<script id="__NEXT_DATA__" type="application/json">`,
em `props.pageProps.job`. O subdomínio precisa ser o da empresa: o mesmo id em outro
subdomínio dá 404. `pageProps.canonicalUrl` confirma a forma canônica.

| Campo | Uso na CLI |
|-------|------------|
| `id`, `name` | `id`, `title` |
| `careerPage.name` | `company` |
| `description` (HTML) | `description` |
| `responsibilities` (HTML) | `responsibilities` |
| `prerequisites` (HTML) | `requirements` |
| `relevantExperiences` (HTML) | `additional_info`. No portal é "Informações adicionais"; costuma trazer benefícios e diferenciais |
| `addressCity`, `addressState`, `addressStateShortName`, `addressLine` | `city`, `state`, `location`, `address` |
| `jobType` | `contract`, `contract_code` |
| `workplaceType` | `workplace_type` |
| `publishedAt` | `date` |
| `registerEndDate` (ou `expiresAt`) | `deadline` |
| `handicapped` | `pcd` |
| `jobSteps[].name` | `steps` |

Outros campos presentes e não usados: `jobLanguage`, `skills` (normalmente `null`),
`quickApply`, `code`, `reason`, `company.subdomain`, `company.timezone`.
