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

## Google Maps (opcional): mejor búsqueda de direcciones

El mapa es gratuito (OpenStreetMap, sin clave). Con una clave de Google, la búsqueda de barrio y dirección ("Av. Yrigoyen 4500") es mucho más precisa.

1. En https://console.cloud.google.com creá un proyecto y activá la facturación (hay un cupo gratis mensual; poné un presupuesto con alerta).
2. En **APIs y servicios → Biblioteca** activá **Places API (New)**.
3. En **Credenciales → Crear credencial → Clave de API**. Restringila: *Sitios web* con tu dominio de Vercel (`https://TU-APP.vercel.app/*`) y, en restricciones de API, solo **Places API (New)**.
4. En Vercel → Settings → Environment Variables agregá `VITE_GOOGLE_MAPS_KEY` con esa clave y hacé *Redeploy*.

Si la variable está vacía o Google falla, la app sigue con la búsqueda gratuita.
