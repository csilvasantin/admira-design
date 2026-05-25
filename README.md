# Admira · Xperience · Design System

Sistema de diseño compartido para el grupo Admira. Una sola fuente de verdad para tokens (paleta, tipografías, espaciados) y componentes (nav header, group pill) que usan los sitios:

- [admira.studio](https://www.admira.studio) — Pixer.IA · plataforma de contenido IA
- [xpaceos.com](https://www.xpaceos.com) — XpaceOS · retail OS de 3 capas
- [admira.app](https://www.admira.app) — Xbusiness · marketplace de publicidad programática
- [admira.live](https://www.admira.live) — bridge operativo
- [admira.tv](https://www.admira.tv) — content hub
- [admira.store](https://www.admira.store) — RaaS robots Unitree

**Demo:** https://csilvasantin.github.io/admira-design/

## Cómo lo uso en otros sitios

```html
<link rel="stylesheet" href="https://csilvasantin.github.io/admira-design/tokens.css">
<link rel="stylesheet" href="https://csilvasantin.github.io/admira-design/nav.css">
<link rel="stylesheet" href="https://csilvasantin.github.io/admira-design/group.css">
```

Después usa las clases (ver `index.html` para markup completo):

```html
<nav class="admira-nav">
  <a class="admira-nav-brand" href="https://www.admira.app">
    <span class="admira-nav-brand-name">Admira</span>
    <span class="admira-nav-brand-tag">Xperience</span>
  </a>
  <div class="admira-nav-items">
    <a class="admira-nav-link admira-nav-link-external" href="https://www.admira.studio">Pixer.IA</a>
    <a class="admira-nav-link admira-nav-link-cta" href="mailto:csilva@admira.com">Contacto</a>
  </div>
</nav>
```

## Metaestilo del ecosistema (`meta.css`)

Capa "meta" que une las **3 soluciones** de AdmiraNext como capas de un mismo OS,
con el **digital twin de XpaceOS** como centro. El **cian** de XpaceOS es el color
**vertebrador** común; cada producto añade su acento de capa:

| Capa | Sitio | Rol | Acento |
|---|---|---|---|
| `os` | xpaceos.com | el OS / twin · **núcleo** | cian (espina) |
| `studio` | admira.studio | Pixer.IA · contenido | violeta |
| `app` | admira.app | OmniPublicity · demanda | ámbar |

Cada sitio declara su capa en el `<body>` y obtiene su acento; la espina cian se mantiene:

```html
<body data-layer="studio">  <!-- os | studio | app -->
<link rel="stylesheet" href="https://csilvasantin.github.io/admira-design/meta.css">
```

Componentes de `meta.css`:
- `.admira-spine-rail` — fina línea cian (tejido conectivo). `<hr class="admira-spine-rail">`
- `.admira-twin` — sello del ecosistema: núcleo XpaceOS + capas orbitando (CSS puro)
- `.admira-meta-hero` — hero común que presenta cada web como una capa del OS
- `.admira-ecosystem` — banda hub-and-spoke: el twin en el centro, las 3 capas alrededor

Tokens nuevos (aditivos): `--admira-spine*` (cian fijo) y `--admira-accent*` (cambia por `data-layer`).
Ver `meta.html` para el markup completo.

## Archivos

- `tokens.css` — CSS vars (paleta, tipografías, espaciados, radios, sombras, transiciones)
- `nav.css` — Header de navegación fixed top con brand + items + CTA
- `group.css` — Pill "Admira · Xperience" para mostrar los dominios del grupo como conjunto
- `meta.css` — **Metaestilo del ecosistema** (espina cian + acento por capa + twin + ecosistema)
- `index.html` — Demo de los componentes base
- `meta.html` — Demo del metaestilo (twin, hero, ecosistema, acentos por capa)

## Versionado

`v0.1.0` — primer release (tokens, nav, group).
`v0.2.0` — **capa meta** (`meta.css`): metaestilo del ecosistema con el twin de XpaceOS al centro. **Aditivo** — no altera el comportamiento de los sitios que solo importan v0.1.0; para usar el metaestilo, importa `meta.css` y añade `data-layer` al `<body>`.

## Licencia

Privado · Admira Digital Networks · Carlos Silva · csilva@admira.com
