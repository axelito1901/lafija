# La Fija — arquitectura

## Frontend
React + Vite + Tailwind/Vite tooling + Lucide React.

## Producción
React -> Supabase Auth -> PostgreSQL/RLS -> Storage.

Mercado Pago y WhatsApp se agregan después mediante backend/Edge Functions; nunca se exponen credenciales secretas en el frontend.

## Multi-tenant
`profiles` = jugadores, dueños y administradores.
`complexes` = sedes/complejos.
`courts` = canchas dentro de cada complejo.
`bookings` = reservas por complejo + cancha + fecha + hora.

## Concurrencia
La base de datos tiene un índice único parcial para impedir dos reservas activas en la misma cancha, fecha y hora. La función `create_booking` concentra validaciones y cálculo de seña.

## Modo local
Sin `.env` de Supabase, la UI puede seguir funcionando con datos locales. Esto no se usa como backend cuando el proyecto está configurado para producción.
