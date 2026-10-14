# Contexto compartido / Shared context — encargo #5934 · API y código común

## Estado / Status

Fase 1 implementada en ramas de API y admira-design. Sólo previews aisladas; sin merge, sin push a main y sin producción. Los cinco sitios deben integrar estos módulos en sus propios encargos antes de anunciar el paraguas global publicado. El acceso al servidor MCP XpaceOS y sus ayudas públicas no se modifica en esta fase.

Phase 1 is implemented in API and admira-design branches. Isolated previews only. The five platforms must integrate the modules in their own assignments; the global umbrella is not a production release. The live XpaceOS MCP service and public help are unchanged in this phase.

## Contrato / Contract

- `/marca <id>` / `/brand <id>`: sólo look and feel; disponible para cualquier usuario en Experto. Conserva el proyecto activo. `/marca off` restaura el look nativo. No incluye contenidos genéricos ni cambia asignaciones.
- `/proyecto <id>` / `/project <id>`: filtro de datos; sólo superusuario comprobado por la API contra la whitelist de admira-gate. `/proyecto off` limpia el filtro y también exige superusuario. Conserva la marca activa.
- `?marca=&proyecto=`: valores URL sobrescriben el contexto guardado después de verificar la sesión. Un proyecto no autorizado se retira de la URL y no se propaga. Las peticiones de datos de esa vista fallan para evitar mostrar una lista sin filtrar tras el rechazo.
- `GET/POST /ctx`: Bearer de `/auth/api-token` o token de admira-gate. Email sólo derivado de la sesión, nunca enviado por la UI. POST es un patch de `{marca?, proyecto?}` y rechaza campos ajenos. Estado en KV `ctx:v1:<email>`, separado por cuenta. KV es eventual: otra pestaña/región puede tardar hasta 60 s en restaurar la última preferencia; POST devuelve el valor escrito y los clientes envían explícitamente el filtro activo en cada lectura.
- Starbucks: provisionalmente sólo `locationId` con prefijo exacto `alsea-sbux-`. El alias legado `loc` se expone como `locationId`; si el ID de pantalla es ya un ID de local `alsea-sbux-*`, se usa como tal. No se deduce por nombre, etiqueta, marca visual o texto. `projects[]` nunca amplía esta regla. Metadatos pendientes requieren backfill en el encargo de inventario.

English: brand commands change presentation only; project commands filter data and require a server-verified superuser, including reset. URL parameters override saved context only after authentication. Context is scoped to the authenticated email, never a caller-supplied identity. Starbucks provisionally requires the exact `alsea-sbux-` location prefix; legacy `loc` and screen IDs that already are location IDs are supported. Project tags, names and brand appearance cannot override this rule. KV preferences are eventually consistent; filtered requests send their active project explicitly.

## Integración / Integration

Cargar una sola copia de cada módulo desde la misma revisión de la PR; no mezclar esta preview con el CDN de producción.

```html
<script>
window.ADMIRA_CONTEXT_OPTIONS = {
  // Existing expert-mode controller; never a role authorization source.
  expert: () => window.miShell.modo() === 'expert',
  api: 'https://api.admira.store'
};
</script>
<script src="/shared/contexto.js"></script>
<script src="/shared/marca-blanca.js" data-plataforma="studio"></script>
```

`data-plataforma`: la web que carga el módulo (studio/store/tv/app/biz). Distribuir junto al loader **todas** las hojas `marca-blanca*.css` de la misma revisión. Este loader común deriva de Studio y usa el catálogo, contraste, logo, favicon, modo y analizador existentes de admiranext.com.

### Una marca, cinco chromes (encargo #5979)

Cada web tiene su entrada en `WEBS` (marca-blanca.js): la hoja puente que se carga, la variante del catálogo que se pinta y dónde van el logo del cliente y «Volver a Admira». Con marca activa el loader pone `data-mb-web="<web>"` en `<html>`, y cada hoja puente lleva todas sus reglas bajo `:root[data-mb-marca][data-mb-web="<web>"]`: las reglas de una web nunca se aplican en otra (lo comprueba `test/marca-blanca-webs.test.cjs`).

| Web | Hoja puente | Variante del catálogo | Logo delante de |
|---|---|---|---|
| studio | `marca-blanca.css` | studio | `.pf-topbar .pf-topbar-brand` |
| store | `marca-blanca-store.css` | store | `#topBar .xs-brand` (o tras `#pfOptions`) |
| tv | `marca-blanca-tv.css` | store | `.yk-head`/`.yk-bar` (home) o `header.admtop .admbrand` |
| app | `marca-blanca-app.css` | yokup | `#yk-frame .yk-bar .yk-logo` |
| biz | `marca-blanca-biz.css` | app | `header .logo .logo-home` |

La variante del catálogo es la que cada web usaba antes del loader común, para que nada cambie de aspecto al integrarlo. Una página con un chrome distinto ajusta las anclas sin tocar el loader: `data-ancla-logo` (selectores separados por comas), `data-ancla-tras`, `data-ancla-volver` y `data-catalogo` en el `<script>`. **Web nueva:** entrada en `WEBS` + hoja `marca-blanca-<web>.css` con todas sus reglas bajo su `data-mb-web`; el test falla si falta la hoja o si una regla se sale.

The loader dresses each platform's own chrome: per-platform bridge sheet scoped by `data-mb-web`, the catalogue variant each platform already used, and per-platform anchors for the client logo and the back button, overridable from the script tag.

```js
await AdmiraContexto.ready;
await AdmiraContexto.comando('/marca lumbre');
await AdmiraContexto.comando('/proyecto starbucks');
const response = await AdmiraContexto.request('/signage/screens');
if (!response.ok) throw new Error('Project data unavailable');
const screens = (await response.json()).screens;
```

Registrar `/marca` y `/proyecto` con `comando` en el CLI existente; conservar historial, altura, identidades y comandos restantes. El módulo no instala otro CLI. Escuchar `admira:contexto` para refrescar la vista y `admira:contexto-error` para mostrar el rechazo. Las páginas usan `request` para `/grid/screens`, `/signage/screens`, `/stock` o `/stock/list`, `/grid/playlist` y `/grid/draft`. Esperar siempre a `ready`. `enlace(url)` y el observador propagan ambos parámetros en los enlaces de las cinco plataformas; preservan rutas, otros parámetros y fragmentos; excluyen `/auth/` y destinos externos. Los tokens sólo viajan al origen API configurado.

The host CLI routes commands through `comando` and retains its existing history and shell. Wait for `ready` before data reads. Handle context changes and errors; `request` supplies the session token and active project. Links between the five platforms retain routes, other parameters and fragments. Tokens never go to external links. Each host must provide its real authenticated token broker; the default is same-origin `/auth/api-token`. A host using admira-gate may provide `tokenProvider` returning `{ok, token, exp}`; do not store roles or infer identity in the browser.

## Retirada del atajo / Shortcut removal

No existe `pixeria:admin` ni un fallback de rol local en este módulo. Al integrar en Studio/Pixeria, sustituir la ruta antigua de `cliente-activo.js` y sus handlers de marca/filtro: no cargar ambos a la vez. La eliminación de los handlers antiguos en los sitios queda para sus PRs de integración, sin tocar aquí esos repos ni las cuentas asignadas a clientes. Sus restricciones propias deben mantenerse; este filtro de superusuario no es un sistema nuevo de ACL.

The shared module has no local admin shortcut. Platform integration must replace the legacy client-selector route and must preserve assigned-account restrictions. Do not load both implementations. This superuser view filter is not a new tenant ACL; legacy public unfiltered read endpoints remain public.

## Verificación / Verification

`node --test test/contexto.test.cjs`. Preview `preview.html`: cuatro pantallas de fixture (dos Starbucks y dos excluidas), sesiones sintéticas, clave exclusiva de sandbox, rol real consultado en whitelist. El email del fixture de superusuario es Carlos; no se usa ni se crea una sesión humana de Carlos. La preview API carece de bindings/secrets de producción y sólo permite las rutas de prueba. El rol lector muestra 403 al solicitar proyecto. La lectura pública del inventario real del 14-oct no mostró pantallas Starbucks: este resultado prueba el contrato con fixtures, no inventario físico ni playback.

Preview uses four fixture screens and synthetic sandbox sessions, with live whitelist role lookup. Its superuser fixture email is Carlos; it is not his human login. It proves filtering and permissions on test data, not production inventory or physical playback.
