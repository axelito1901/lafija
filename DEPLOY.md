# Publicar La Fija

## Frontend

Compilar:

```bash
npm run build
```

Publicar `dist/` en Vercel, Netlify, Cloudflare Pages o un servidor estático.

Como es una SPA, el hosting debe devolver `index.html` para las rutas internas.

## Variables

Crear `.env` a partir de `.env.example`:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase

Seguir `SUPABASE.md` (ejecutar `supabase/migrations/0001_la_fija.sql` en el SQL Editor).

Luego configurar Storage, Auth y las funciones de servidor para pagos y WhatsApp.
