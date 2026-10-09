# La Fija

> Novedades de la v4.1 y el análisis completo: ver `ANALISIS.md`.

Plataforma para reservar canchas: jugadores, dueños de complejos y administración.
React + Vite + Tailwind + Lucide. Tipografía Barlow / Barlow Semi Condensed. Mapa con Leaflet / OpenStreetMap. Supabase preparado.

## Arranque

```bash
npm install
npm run dev -- --host      # http://localhost:5173 (y la URL "Network" para probar desde el celular)
npm run build && npm run preview
```

En Windows también sirve `START-LA-FIJA.bat`.

### Probar en el celular (con ubicación)

Los celulares solo dan la ubicación en páginas **https**. Para probar desde el teléfono:

```bash
npm run celular      # o doble clic en START-LA-FIJA-CELULAR.bat
```

Abrí en el celular la dirección **Network** (empieza con `https://`). El navegador avisa que el certificado no es seguro: tocá *Avanzado → Continuar*; es normal en pruebas. La computadora y el celular tienen que estar en la misma red Wi-Fi.

## Cuentas de prueba

Sin variables de Supabase la app corre en **modo demo**: los datos viven en `localStorage` y la sesión persiste.
La pantalla de ingreso trae tres accesos directos (jugador, dueño, administrador). También se puede entrar con:

| Rol | Email | Contraseña |
|---|---|---|
| Jugador | jugador@lafija.demo | demo1234 |
| Dueño | dueno@lafija.demo | demo1234 |
| Administrador | admin@lafija.demo | demo1234 |

Cualquiera puede además crear una cuenta de jugador. Las fechas de los datos de prueba se corren solas para que "hoy" siga siendo hoy.

## Para dueños y administración

- **Alta de dueños:** desde el ingreso, "¿Tenés un complejo? Registralo". El complejo queda **en revisión** hasta que un admin lo aprueba; mientras tanto el dueño ve una lista de lo que le falta completar (foto, ubicación, descripción, canchas, WhatsApp).
- **Términos y privacidad:** `/terminos` y `/privacidad`, con casilla "Acepto" obligatoria al crear cuenta. Son textos base: conviene que los revise un abogado.
- **Cómo gana plata La Fija:** el admin elige en "Ingresos" entre gratis, comisión por reserva hecha por la app o abono mensual por complejo, y ve cuánto corresponde a cada complejo este mes. El dueño lo ve en Finanzas.

## Mensajes y avisos

- **WhatsApp:** `src/lib/messages.js` arma los mensajes con formato (confirmación, recordatorio, pedir pago, cancelación, invitación al partido). Antes de enviar se ve una vista previa editable (`ui/MessageSheet.jsx`). Se envía con un enlace `wa.me`: abre WhatsApp en el celular de quien lo manda. **No es envío automático**; para mandar solos hace falta WhatsApp Business API (necesita cuenta y plantillas aprobadas por Meta).
- **Notificaciones en la app:** campana en cada pantalla, con avisos guardados (reserva nueva, pago, cancelación) y avisos calculados (hoy jugás, falta pagar). Se generan en `lib/domain.js` (`notify`).
- **Recordatorios:** el dueño ve en Inicio los turnos de mañana y los recuerda con un toque.
- **Reservas fijas semanales:** al crear una reserva a mano, "Repetir" genera 4, 8 o 12 semanas y salta las fechas ocupadas.

## Pensada para cualquiera

- **Reserva guiada:** una pregunta por pantalla (día → cancha → hora → confirmar) con barra de progreso. Ruta `/complejo/:id/reservar`. En desktop la ficha también tiene el panel rápido.
- **Jugar hoy:** la pantalla existe en el código (`PlayToday` en `screens/player/Wizard.jsx`) pero está desactivada por ahora: no tiene ruta ni botón.
- **Ingreso con el celular:** código de 6 números, sin contraseña. En demo el código es `123456`; con Supabase usa `signInWithOtp` por SMS (hay que activar un proveedor de SMS en Supabase). El email queda como alternativa.
- **Letra más grande:** en Cuenta. Agranda textos, botones y filas.
- **Guía de primera vez:** oscurece la pantalla y señala los botones reales, un paso por vez (jugador y dueño). Se puede volver a ver desde Ayuda.
- **Ubicación que se completa sola:** el campo "¿Dónde?" sugiere barrios mientras escribís (lista local de zona sur y CABA, y OpenStreetMap/Nominatim cuando hay internet) o usa tu ubicación. Las distancias se calculan desde ahí.
- **Armar equipos:** desde una reserva, se cargan los nombres y se reparten al azar en dos equipos; se manda por WhatsApp con el mismo formato que la invitación.
- **Mapa del complejo:** cada ficha muestra un mapa chico; tocarlo abre "Cómo llegar". Si el celular ya dio permiso de ubicación, las distancias se calculan solas desde donde estás.
- **Turno fijo:** el jugador pide "todos los jueves a las 21" desde una reserva (1, 2 o 3 meses). Al dueño le llega el pedido en Inicio; si lo aprueba se crean todas las reservas (se saltean las semanas ocupadas) y el jugador recibe el aviso.
- **Lista de espera:** en la reserva guiada, los horarios ocupados se pueden tocar para "Avisarme si se libera". Si alguien cancela, todos los anotados reciben un aviso con un botón que abre la reserva lista; el primero que reserva se lo queda. (Un pago pendiente que vence solo todavía no dispara el aviso: eso necesita un proceso en el servidor.)
- **Estadísticas del dueño:** ocupación, cobrado, faltas y cancelaciones en 7, 30 o 90 días; horarios que más se llenan y que quedan vacíos (con atajo para crear una promo); barras por horario, día y cancha.
- **Solo fútbol:** Fútbol 5, 7, 8 y 11. En cada reserva se muestra cuánto pone cada jugador.
- **Ayuda:** botón "?" en cada pantalla con preguntas frecuentes, glosario y WhatsApp de soporte (`VITE_SUPPORT_WHATSAPP`).
- **Pantallas de resultado:** después de pagar o cancelar, un tilde grande y una frase que dice qué pasó con la plata.
- **Dueño:** botón "+" flotante en la agenda y dictado por voz ("Juan Pérez, jueves a las 20, cancha 2"). El dictado usa el reconocimiento de voz del navegador: anda en Chrome (Android y escritorio); en iPhone depende de la versión de Safari, y si no está disponible el botón no aparece.

## Estructura

```
src/
  lib/        dominio y datos (sin React): domain.js, format.js, demoStore.js, payments.js, store.jsx, auth/sesión
  ui/         sistema de diseño: kit.jsx (botones, campos, sheets, toasts), Shell.jsx (navegación), MapView.jsx, shared.jsx
  screens/    player/ owner/ admin/ + Login.jsx
  index.css   tokens (colores, radios, tipografía) y componentes base
```

Todo el modelo es `Dueño → Complejo → Cancha`. Una reserva pertenece a jugador + complejo + cancha + fecha + horario.
Un índice único en la base impide dos reservas activas en el mismo turno.

## Pasar a producción

- **Base de datos y usuarios reales:** `SUPABASE.md` (paso a paso, ~20 minutos).
- **Avisos push con la app cerrada:** `PUSH.md`.
- **Cobros con Mercado Pago:** `PAYMENTS.md`.

### Probado y no probado
- El esquema de base de datos (`supabase/migrations/0001_la_fija.sql`) se probó en Postgres 16 con 48 pruebas de permisos y avisos (incluye `0002_client_notes.sql`).
- La app se probó de punta a punta en modo demo (155 pruebas). La conexión con un proyecto real de Supabase (`src/lib/remoteStore.js`) está escrita para ese esquema pero **no se probó contra Supabase real**: conviene hacer una pasada completa (registro, reserva, cancelación, aprobación) apenas lo conectes.
- Los avisos del sistema y el envío push dependen del navegador del celular: probalos en tu teléfono.
