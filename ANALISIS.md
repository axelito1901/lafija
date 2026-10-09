# La Fija v4.1 — análisis y cambios

Trabajo hecho sobre la v4.0, sin reescribir la app ni cambiar de tecnología (React + Vite + Tailwind + Supabase).

## 1. Qué ya existía y se conservó
Reserva guiada paso a paso, agenda (lista por cancha en el celular y grilla en computadora), turnos fijos pedidos por el jugador,
lista de espera, armar equipos, mensajes de WhatsApp con vista previa, agregar al calendario (.ics), reseñas con respuesta,
promociones, bloqueos, alta de dueños con revisión, términos y privacidad, modelo de negocio, esquema de Supabase con RLS.

## 2. Qué estaba incompleto y se mejoró (sin duplicar)
| Pedido | Antes | Ahora |
|---|---|---|
| Inicio del dueño | 3 números sueltos | Saludo + fecha, 4 métricas (reservas, recaudado, ocupación, disponibles), "Ocupación de hoy" (mayor demanda, próximo libre, confirmadas, pendientes), "Atención" con acceso directo a cada problema, 4 acciones rápidas |
| Agenda | Nombre y estado | Cabecera con día grande, ← Hoy →, ocupación y conteos; cada turno con importe y estado de pago con ícono + texto (Pagado, Seña, A cobrar, Pendiente, Bloqueado, Libre) |
| Reservas recurrentes | "Repetir 4/8/12 veces" | Frecuencia (semanal o cada 2 semanas) + fecha de fin, resumen de la serie, se saltean fechas ocupadas; cancelar una o toda la serie (ya existía) |
| Repetir reserva | No existía | "Repetir" en cada reserva: mañana, próximo mismo día o varias semanas, con vista previa de disponibilidad |
| Clientes | Lista simple | Frecuentes marcados (5+ reservas), dinero generado, última reserva, cancha habitual, próximas reservas, notas privadas |
| WhatsApp | Mensajes por reserva | "Recordar pago" (desde el inicio y desde cada reserva) con el texto pedido; "Compartir reserva" con el formato "Partido confirmado" |
| Reserva confirmada | Hoja con 3 botones | Momento propio: tilde animado, cancha/fecha/hora/precio/ubicación y 4 acciones (Compartir, Ver reserva, Cómo llegar, Al calendario) |
| Inicio del jugador | Botón "Buscar cancha" | "¿Cuándo querés jugar?": días como botones y debajo los próximos horarios libres de las canchas más cercanas; un toque lleva a confirmar |
| Búsqueda / favoritos | Tarjeta con "Ver horarios" | Cada tarjeta muestra horarios libres tocables del día elegido; "Mis favoritos" igual |
| Finanzas | Totales por período | Ingresos con comparación contra el período anterior a la misma altura, por cobrar, reservas, ticket promedio, gráfico de ingresos por día, movimientos paginados |
| Estadísticas | Barras | Ingresos, reservas, ticket promedio, horarios y días fuertes/flojos, canchas más usadas y recomendaciones calculadas (ver punto 4) |
| "Más" del dueño | Lista | Categorías: Gestión, Análisis, Configuración |

## 3. Qué estaba mal y se corrigió
- **Peso:** toda la app era un archivo de 862 kB. Ahora el panel del dueño, el de admin y el mapa se descargan solo cuando hacen falta (principal 611 kB, 181 kB comprimido; el mapa 159 kB aparte).
- **Errores técnicos al usuario:** los errores de Supabase llegaban con el texto técnico. Ahora se traducen ("Ese horario lo acaba de reservar otra persona", "No hay conexión…") y el detalle queda en la consola.
- **Estados solo por color:** los estados de reserva ahora llevan ícono + texto.
- **Estadísticas engañosas:** contaban como vacíos los días anteriores a la primera reserva (90 días daba 8% en vez de 17%). Ahora cuentan desde la primera reserva y lo aclaran.
- **Áreas táctiles chicas:** nombres de complejo y el atajo "Próximo libre" ahora miden 44 px.
- **Bloquear horario:** ahora pide confirmación con el resumen de lo que se bloquea.

## 4. Recomendaciones automáticas (sin inventar)
Se calculan con la ocupación real por día de la semana y franja de 2 horas. Solo se muestran con al menos 14 días y 20 reservas;
si no, la pantalla dice "Todavía no tenemos suficientes datos". Las franjas flojas (≤35%) ofrecen "Crear promoción", que abre el formulario con el horario ya cargado.

## 5. Base de datos
- Una sola migración nueva, **aditiva**: `supabase/migrations/0002_client_notes.sql` (notas privadas de clientes). No modifica tablas ni datos existentes y se puede correr dos veces.
- Probado en Postgres 16: 48 pruebas de permisos (las 44 anteriores + 4 nuevas: un dueño no ve ni escribe notas de otro, un jugador no las ve).

## 6. Seguridad revisada
Sin HTML inyectado (`dangerouslySetInnerHTML` no se usa); los textos de usuarios se muestran escapados por React; los mensajes
de WhatsApp se codifican en la URL; las imágenes subidas se validan como imagen y se reducen; los permisos los decide la base (RLS + triggers),
no el navegador. SQL injection no aplica (no hay SQL armado en el cliente). CSRF no aplica (Supabase usa token, no cookies de sesión).

## 7. Qué no se pudo verificar acá
- **Supabase real:** la base se probó en Postgres local y la app en modo demo; falta una pasada con tu proyecto (ver `SUPABASE.md`).
- **Avisos del celular:** el navegador de pruebas siempre los deniega; probalos en un teléfono.
- **Fotos reales:** dependen de cada dueño.

## 8. Pruebas
- 155 pruebas de punta a punta en la app (jugador, dueño y admin), sin errores en consola.
- Sin desbordes en 360, 375, 390, 430, 768, 1024, 1366 px, también con letra grande.
