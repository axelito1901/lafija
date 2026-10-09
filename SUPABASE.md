# Conectar La Fija a Supabase

Con Supabase, los datos dejan de vivir en cada celular: todos ven lo mismo y los avisos llegan entre usuarios.
Tiempo estimado: 20 minutos. Es gratis para empezar.

## 1. Crear el proyecto
1. Entrá a https://supabase.com, creá una cuenta y tocá **New project**.
2. Región: **São Paulo** (la más cercana a Argentina). Guardá la contraseña de la base en un lugar seguro.

## 2. Crear la base de datos
1. En el proyecto: **SQL Editor → New query**.
2. Copiá todo el contenido de `supabase/migrations/0001_la_fija.sql`, pegalo y tocá **Run**. Tiene que decir *Success*.
3. Repetí con `supabase/migrations/0002_client_notes.sql` (notas de clientes). Si ya tenías la base de la v4.0, corré solo esta.
4. Repetí con `supabase/migrations/0003_photos.sql` (fotos). Crea el espacio de almacenamiento `photos`: las fotos de complejos y canchas se guardan como archivos y la base solo guarda el link. Si no la corrés, la app igual funciona, pero las fotos se guardan dentro de la base y la hacen más lenta.
5. Repetí con `supabase/migrations/0004_after_match.sql` (después del partido): avisa para calificar 30 minutos después de jugar y para volver a jugar a los 3 días, agrega etiquetas a las reseñas y avisa al dueño de cada reseña nueva. Necesita la extensión `pg_cron` (Database → Extensions); si no la activás, avisa y el resto funciona. Con los avisos push configurados (`PUSH.md`) llegan también con la app cerrada.
6. Repetí con `supabase/migrations/0005_trust.sql` (calidad y confianza): la insignia **Verificado** (solo la ponés vos desde Administrador → Complejos) y los reportes de problemas de los jugadores.

## 3. Conectar la app
1. **Project Settings → API**: copiá la **Project URL** y la clave **anon public**.
2. En tu hosting (Vercel o Netlify) → variables de entorno:
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clave anon
3. Volvé a publicar. Desde ahora la app usa Supabase (el login demo desaparece).
4. Para probar en tu computadora: copiá `.env.example` como `.env.local`, completá los dos valores y corré `npm run check:supabase`. Revisa que la conexión funcione, que estén las tablas y que alguien sin sesión no pueda ver reservas ni perfiles. No escribe nada en tu base.

## 4. Ingreso con celular (código por SMS)
**Authentication → Sign In / Providers → Phone**: activalo y elegí un proveedor de SMS (Twilio o MessageBird). Tiene costo por mensaje.
Mientras no lo actives, se puede ingresar con email y contraseña.

## 5. Nombrarte administrador
1. Creá tu cuenta desde la app.
2. En **SQL Editor** ejecutá (con tu email):
   ```sql
   update public.profiles set role = 'admin' where email = 'tu@email.com';
   ```

## 6. Opcional
- **Avisos push con la app cerrada:** ver `PUSH.md`.
- **Pagos reales:** ver `PAYMENTS.md`. Mientras tanto, si querés probar el flujo de pago de prueba con Supabase, ejecutá
  `update public.app_settings set value = 'true' where key = 'demo_payments';` (y volvelo a `false` antes de cobrar de verdad).

## Qué protege la base (probado)
El esquema (migraciones 0001 a 0003) se aplica sin errores en Postgres 16, también corriéndolo dos veces seguidas, y el esquema original se probó con 48 pruebas de permisos: nadie puede hacerse admin, un dueño no puede aprobarse solo,
un jugador no puede marcarse pagado, ver reservas ajenas, cambiar el horario o el precio, ni reservar a nombre de otro;
un mismo turno no se puede reservar dos veces; una reserva pendiente vencida libera el turno; y los avisos
(reserva nueva, pagos, cancelaciones, lista de espera, turnos fijos, aprobación de complejos) los genera la base.
