# Calendario de emisión — contrato compartido

Fuente de verdad **única** del calendario de emisión para las tres webs:

| Sitio | Rol | Capacidades |
|-------|-----|-------------|
| **pixeria.com** | `public` | Solo lectura: qué se emite hoy y cuántos huecos quedan disponibles. |
| **admira.app** (`/parrilla/`) | `sell` | Vender huecos libres + emitir. |
| **xpaceos.com** (`/control/`) | `owner` | Contenido propio, aceptar/rechazar ofertas, política + lista negra, emitir. |

El render es **idéntico** en las tres porque todas usan el mismo módulo
`emission-calendar.{js,css}` (este repo, `admira-design`), incluido por URL.
Los datos vienen del **mismo API `/grid`** del worker `pixer-eleven`.

---

## 1. Módulo de render (incluir por URL)

```html
<link rel="stylesheet" href="https://csilvasantin.github.io/admira-design/emission-calendar.css">
<script src="https://csilvasantin.github.io/admira-design/emission-calendar.js"></script>
```

El módulo trae **paleta propia** bajo `.ec-root` → se ve igual aunque la marca del
host (p.ej. la cream/orange de pixeria) sea distinta. Montaje:

```js
const cal = EmissionCalendar.mount(containerEl, {
  workerBase: 'https://pixer-eleven.csilvasantin.workers.dev',
  screen:   'xtanco-led-frontal',   // id lógico de pantalla
  date:     '2026-06-07',           // YYYY-MM-DD (Europe/Madrid)
  role:     'public',               // 'public' | 'sell' | 'owner'
  circuit:  'xtanco',               // solo owner (para subir contenido)
  storeName:'Xtanco',               // etiqueta del anunciante en contenido propio
  getKey:   () => localStorage.getItem('grid_key'), // clave de escritura (sell/owner)
  onData:   (day) => {},            // callback tras cada carga (el host pinta lo suyo)
  poll:     15000,                  // refresco automático (ms)
});
cal.setContext({ screen, date });   // cambiar pantalla/día
cal.emit();                         // (sell/owner) empujar a /signage/now
cal.refresh(); cal.destroy();
```

`role:'public'` no muestra ingresos ni acciones de escritura. `sell` permite vender
huecos libres. `owner` permite contenido propio + aceptar/rechazar ofertas inline.

### id lógico de pantalla
`<slug(storeId)>-<slug(surfaceName)>` — ej. `xtanco` + `LED Frontal` → `xtanco-led-frontal`.
El catálogo de tiendas/superficies está en `admira.app/locations.js`
(`window.loadOmnipLocationsAsync()`), surfaces de tipo `pantalla|escaparate|vending|mostrador`.

---

## 2. API `/grid` (worker `pixer-eleven`)

Base: `https://pixer-eleven.csilvasantin.workers.dev`. CORS abierto a las tres webs + localhost.
Escrituras requieren `key` (secret `GRID_KEY`) en el body, salvo `/grid/offer` (abierto: es la
entrada del marketplace; el dueño filtra con política + lista negra).

| Método | Ruta | Para |
|--------|------|------|
| GET  | `/grid/day?screen=&date=` | **La parrilla calculada** (lee esto para pintar). |
| GET/POST | `/grid/config?screen=` | Config de pantalla (franjas, slots, pixerScreens, circuit, policy, blacklist). |
| POST | `/grid/book` | Vender hueco / añadir propio (`status:'own'`). |
| POST | `/grid/unbook` | Quitar una reserva. |
| POST | `/grid/offer` | Oferta entrante (marketplace) — aplica lista negra + política. |
| POST | `/grid/decide` | El dueño acepta/rechaza una oferta pendiente. |
| GET/POST | `/grid/control?circuit=` | Política + lista negra del circuito. |
| POST | `/grid/emit` | Empuja el creativo de ahora a `/signage/now` de cada pixerScreen. |
| POST | `/grid/upload?circuit=&ext=&key=` | Sube creativo propio a R2 → URL servida por `/signage/media/`. |
| GET  | `/grid/screens` | Resumen de todas las pantallas configuradas. |
| GET/POST | `/grid/projects` | **Canales/proyectos** que agrupan circuitos (`[{id,name,circuits[]}]`). GET público (defaults si vacío); POST con `key`. Lo usa `admira.tv/cms.html` para filtrar flota+programación por canal. |

### `GET /grid/day` → forma de respuesta
```jsonc
{
  "ok": true, "screen": "...", "date": "YYYY-MM-DD",
  "config": { "name","circuit","policy","slotSeconds","pixerScreens":[],"bands":[...] },
  "bands": [{
    "id","label","from","to","capacity","slots":Number,
    "own","paid","pending","free","sold","isNow":Bool,
    "slots": [ { "kind":"free|own|paid|pending", "status":"free|sold|own|pending",
                 "bookingId","advertiser","title","category","creative":{type,url,name} } ]
  }],
  "pendingOffers": [ /* bookings con status 'pending' */ ],
  "totals": { "totalSlots","soldSlots","ownSlots","paidSlots","pendingSlots",
              "freeSlots","occupancy","revenue","bookings" },
  "now": { "date","hhmm","isToday" },
  "nowPlaying": { "bandId","kind","advertiser","title","creative","bookingId" } | { "bandId","free":true } | null
}
```

### Estados de un booking
- `own` — contenido propio del dueño (siempre emite).
- `accepted` / `sold` — oferta de pago aceptada / venta directa.
- `pending` — oferta esperando decisión del dueño (**NO emite** hasta aprobar).
- `rejected` — no ocupa hueco (se conserva para auditoría).

Política efectiva por pantalla = circuito (`grid:ctrl:<circuit>`) + override en la config de la
pantalla (`policy:'inherit'|'manual'|'auto'`). `manual` → ofertas a `pending`; `auto` → `accepted`
salvo que la **lista negra** (anunciante / categoría / término en título) las mande a `rejected`.

---

## Versionado
El módulo expone `EmissionCalendar.version`. Cambios incompatibles → subir versión y avisar.
Ante dudas de formato, este documento manda.
