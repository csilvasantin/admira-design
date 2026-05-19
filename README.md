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

## Archivos

- `tokens.css` — CSS vars (paleta, tipografías, espaciados, radios, sombras, transiciones)
- `nav.css` — Header de navegación fixed top con brand + items + CTA
- `group.css` — Pill "Admira · Xperience" para mostrar los dominios del grupo como conjunto
- `index.html` — Demo de los componentes con código de ejemplo

## Versionado

`v0.1.0` — primer release. Para evitar romper sitios que ya importan, cualquier breaking change → bump a `v0.2.0` en una rama distinta y los sitios importan la versión que prefieran (por ejemplo, `tokens.css?v=0.1.0`).

## Licencia

Privado · Admira Digital Networks · Carlos Silva · csilva@admira.com
