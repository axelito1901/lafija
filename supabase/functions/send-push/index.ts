// Supabase Edge Function: manda un aviso push cuando se crea una fila en public.notifications.
// Se dispara con un Database Webhook (INSERT en notifications). Ver PUSH.md.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hola@lafija.app', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

Deno.serve(async req => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) return new Response('forbidden', { status: 403 })
  const { record } = await req.json()
  if (!record?.user_id) return new Response('ignored')
  const { data: subs } = await supabase.from('push_subscriptions').select('id, subscription').eq('user_id', record.user_id)
  const payload = JSON.stringify({ id: record.id, title: record.title, text: record.text, link: record.link })
  await Promise.all((subs ?? []).map(async s => {
    try { await webpush.sendNotification(s.subscription, payload) }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id) }
  }))
  return new Response('ok')
})
