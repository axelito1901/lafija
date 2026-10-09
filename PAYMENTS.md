# Pagos (Mercado Pago)

La app **no cobra nada todavía**. Está preparada para hacerlo sin tocar la interfaz.

## Cómo está armado

- `src/lib/payments.js` es el único punto de integración. Expone `startPayment({ booking, amountCents, kind })`.
- `VITE_PAYMENTS_PROVIDER=demo` (por defecto): aprueba el pago a los ~1 s, sin cobrar. La interfaz lo aclara ("Mercado Pago (prueba)").
- `VITE_PAYMENTS_PROVIDER=mercadopago`: hace `POST` a `VITE_MP_PREFERENCE_ENDPOINT` y redirige al `initPoint` que devuelva.
- La reserva se crea en estado **Pendiente** con vencimiento (`payWithinMinutes`). Si el pago no llega, el horario se libera solo.
- `applyPayment` (src/lib/domain.js) pasa la reserva a **Seña pagada** o **Confirmada** y registra lo cobrado.

## Lo que falta (necesita tus credenciales)

1. Una Edge Function `create-mp-preference` que reciba `{ bookingId, amountCents, kind, backUrl }`, valide el importe contra la reserva en la base
   y cree la preferencia con el **access token** (guardado como secreto de Supabase, nunca en el frontend). Responde `{ initPoint }`.
2. Un webhook (otra Edge Function) que reciba la notificación de Mercado Pago, consulte el pago y actualice `bookings`
   (`paid_cents`, `payment_status`, `status`). La confirmación debe salir de ahí, no de la vuelta del navegador.
3. Para cobrarle a cada dueño directamente, Mercado Pago Marketplace (OAuth por dueño). Definir si La Fija cobra comisión.
