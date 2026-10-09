/*
  Pagos — punto único de integración.

  PROVIDER = 'demo'        → simula la aprobación (no cobra nada). Es el modo por defecto.
  PROVIDER = 'mercadopago' → pide al backend (Supabase Edge Function) que cree la preferencia
                             de pago y redirige al checkout de Mercado Pago.

  El access token de Mercado Pago NUNCA va en el frontend: vive en la Edge Function.
  Ver PAYMENTS.md para el contrato del endpoint y el webhook.
*/
export const PROVIDER = import.meta.env.VITE_PAYMENTS_PROVIDER || 'demo'
const ENDPOINT = import.meta.env.VITE_MP_PREFERENCE_ENDPOINT || ''

export const providerLabel = PROVIDER === 'mercadopago' ? 'Mercado Pago' : 'Mercado Pago (prueba)'

/**
 * @param {{booking:object, amountCents:number, kind:'deposit'|'full'}} req
 * @returns {Promise<{status:'approved'|'redirect'|'rejected', ref?:string, url?:string}>}
 */
export async function startPayment({ booking, amountCents, kind }) {
  if (PROVIDER === 'mercadopago') {
    if (!ENDPOINT) throw new Error('Falta configurar VITE_MP_PREFERENCE_ENDPOINT.')
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id, amountCents, kind, backUrl: `${location.origin}${location.pathname}#/reservas` }),
    })
    if (!res.ok) throw new Error('No pudimos iniciar el pago. Probá de nuevo en unos minutos.')
    const { initPoint } = await res.json()
    return { status: 'redirect', url: initPoint }
  }
  await new Promise(r => setTimeout(r, 900))
  return { status: 'approved', ref: `demo-${Date.now()}` }
}
