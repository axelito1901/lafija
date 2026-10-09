# Avisos push (con la app cerrada)

Sin configurar nada, La Fija ya muestra avisos del sistema mientras la app está abierta en segundo plano
(el usuario los activa en **Cuenta → Avisos en este celular**). Para que lleguen **con la app cerrada**:

1. **Claves VAPID** (una sola vez): `npx web-push generate-vapid-keys`
2. En el hosting (Vercel/Netlify), variable `VITE_VAPID_PUBLIC_KEY` = la clave pública. Volvé a publicar.
3. En Supabase → Edge Functions → Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:tu@email`), `WEBHOOK_SECRET` (cualquier texto largo).
4. Publicar la función: `supabase functions deploy send-push --no-verify-jwt`
5. Supabase → Database → Webhooks → nuevo: tabla `notifications`, evento `INSERT`, tipo *HTTP Request* a la URL de la función, con el header `x-webhook-secret: <el mismo WEBHOOK_SECRET>`.

**iPhone:** los avisos web funcionan desde iOS 16.4 y solo si la app se agregó a la pantalla de inicio (Compartir → Agregar a inicio).
