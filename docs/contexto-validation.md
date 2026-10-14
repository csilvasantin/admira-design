# Validación / Validation — encargo #5934 · API y código común

Estado: entrega de fase 1 para revisión; sólo preview. / Status: phase 1 review delivery; preview only.

- API source: pixer-worker → pixer-eleven → api.admira.store. Los dos `/healthz` públicos devolvieron el mismo JSON y versión `v.14.10.2026.r2.11:13` durante la inspección del 14-oct. No se cambió el Worker de producción.
- Preview API: https://pixer-ctx-5934-preview.csilvasantin.workers.dev
- Preview frontend: https://codex-5934.admira-design-preview.pages.dev/preview?proyecto=starbucks
- Ayuda / Help: https://codex-5934.admira-design-preview.pages.dev/help/
- Catálogo MCP / MCP catalogue: https://codex-5934.admira-design-preview.pages.dev/mcp/context-contract.json

## Resultados / Results

API: 299 tests passed. Shared context: 6 tests passed. MCP stdio client discovered and called contexto_get/set/listar against the preview and read admira://context/contract successfully. Browser: no JavaScript exceptions.

Preview live checks / comprobaciones de preview:

- POST and GET `/ctx`: 200, `{marca:null, proyecto:"starbucks", superusuario:true}` with isolated superuser fixture session.
- GET `/signage/screens?proyecto=starbucks`: 200, exactly two fixtures, both locationId starting `alsea-sbux-`; excludes Xtanco and the fixture with a false Starbucks project tag but another location.
- GET `/stock?proyecto=starbucks`: exactly two matching fixtures, correct filtered total.
- Normal-user POST `/ctx {proyecto:"starbucks"}` and GET filtered screens: 403 `superuser-required`.
- `/marca lumbre`: actual HTML data-mb-marca=lumbre, body background rgb(247,240,230), proyecto stays Starbucks. Links propagate both verified parameters; reset affects only the selected field.
- Unprivileged URL `?proyecto=starbucks`: removed, no project on outgoing links. No local admin shortcut.
- Shared draft revisions retain 409 stale-rev behavior; metadata persists on legacy heartbeats.

Los resultados usan sesiones y datos sintéticos. El rol de sus emails se consulta en la whitelist real; la firma es exclusiva de la sandbox. No se usó sesión humana de Carlos, no se cambió producción, no se verificó playback físico. Inventario público observado: cero pantallas Starbucks en los listados leídos; backfill/location assignments pendientes de integración autorizada.

These results prove the phase 1 contract on isolated fixtures with live read-only whitelist role verification. They do not prove production inventory, platform rollout or physical playback. Platform integration, inventory metadata, production whitelist credentials and live XpaceOS MCP integration remain pending authorization and their separate work.
