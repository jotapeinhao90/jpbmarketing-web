# Desplegar GestiónPyme como PWA (para iPhone)

## Actualizar el sitio (cada vez que cambies algo)

```
cd "/Users/jotape/Gravity/jpbmarketing/herramientas/Gestor financiero"
node scripts/sync-frontend.js
npx wrangler pages deploy web --project-name=gestipyme-personal --branch=main --commit-dirty=true
```

Después de desplegar, siempre verificá que la contraseña siga pidiéndose (no debería devolver 200 sin login):

```
curl -s -o /dev/null -w "%{http_code}\n" https://gestipyme-personal.pages.dev/
```

Tiene que dar **401**. Si da 200, algo rompió la protección — no lo dejes así.

## Credenciales de acceso (Safari, una sola vez)

**Usuario:** `gestipyme`
**Contraseña:** `xxOngxmCl5WNsbzx`

## Notas de infraestructura (por si hay que tocar esto de nuevo)

- `wrangler.jsonc` en la raíz del proyecto es **obligatorio** — sin él, esta versión de Wrangler no detecta la carpeta `functions/` y el sitio queda público sin querer.
- La carpeta `functions/` (en la raíz, NO `pages-functions/`) es la que Cloudflare necesita para encontrar `_middleware.js` (la contraseña) y las rutas `/api/*`. `scripts/sync-frontend.js` la copia a `web/functions/` también, pero la que cuenta para el detector de Cloudflare es la de la raíz.
- El KV namespace `gestipyme_push_subs` (id `8ac8c3a283724adea820045735aecdb3`) guarda las suscripciones a notificaciones push de cada dispositivo.
- Los secretos `PAGES_USER` / `PAGES_PASS` (la contraseña de arriba) ya están cargados en Cloudflare — no hace falta volver a ponerlos salvo que se pierdan.

## Instalar en el iPhone

1. Safari → `https://gestipyme-personal.pages.dev` → usuario/clave de arriba.
2. Compartir → "Agregar a pantalla de inicio".
3. En Configuración de la app → "Notificaciones push" → Activar (pide permiso una vez).
