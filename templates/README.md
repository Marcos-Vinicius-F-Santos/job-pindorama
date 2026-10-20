# Modelos próprios

Esta pasta guarda os modelos registrados pela pessoa (LaTeX, Typst ou qualquer outra ferramenta com um comando de compilação declarado), gerenciados pelo comando `/add-template`. O projeto funciona de primeira com os modelos padrão (moderncv para currículos, `cover.cls` para cartas) — esta pasta só recebe conteúdo quando você registra os seus.

## Organização

```
templates/
├── cv/
│   └── <nome-do-modelo>/
│       ├── template.<ext>  # Esqueleto sem dados pessoais (marcadores [PLACEHOLDER]), ex.: template.tex ou template.typ
│       ├── TEMPLATE.md      # Manifesto: extensão do fonte, comando de compilação, fontes, limite de páginas, regras de estilo, armadilhas
│       ├── *.cls / *.sty    # Arquivos de classe/estilo, ou pacotes Typst (se o modelo precisar)
│       └── fonts/           # Arquivos de fonte incluídos (se não usar fontes do sistema)
└── cover_letters/
    └── <nome-do-modelo>/
        └── (mesma organização)
```

## Como funciona

- O `/add-template` entrevista você sobre as instruções do modelo (extensão do fonte, comando de compilação, fontes, regras de estilo, limite de páginas), guarda os arquivos aqui e roda uma compilação de teste obrigatória antes de registrar qualquer coisa.
- Ativar um modelo acrescenta um bloco gerenciado ao `05-cv-templates.md` ou ao `06-cover-letter-templates.md`, que é o que o `/apply` lê ao redigir e compilar — não precisa de mais nenhuma ligação.
- `/add-template --list` mostra os modelos registrados; `/add-template --use <nome>` troca; `/add-template --use default` volta aos modelos padrão.

Os modelos são guardados com marcadores `[PLACEHOLDER]` no lugar de dados pessoais, então podem ser versionados e compartilhados.
