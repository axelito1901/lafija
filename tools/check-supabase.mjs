// Revisa que el proyecto de Supabase esté bien conectado: node tools/check-supabase.mjs
// Lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY de .env.local (o del entorno). No escribe nada.
import { readFileSync, existsSync } from 'node:fs'
for (const f of ['.env.local', '.env']) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2] }
const url = process.env.VITE_SUPABASE_URL?.replace(/\/$/, ''), key = process.env.VITE_SUPABASE_ANON_KEY
const ok = t => console.log('  ✔', t), bad = t => { console.log('  ✘', t); fails++ }
let fails = 0
if (!url || !key || /TU_PROYECTO|TU_CLAVE/.test(url + key)) { console.log('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local (ver SUPABASE.md, paso 3).'); process.exit(1) }
const H = { apikey: key, Authorization: `Bearer ${key}` }
const get = async p => { const r = await fetch(url + p, { headers: H }); return { status: r.status, body: await r.json().catch(() => null) } }
console.log('Conexión'); try { const r = await get('/rest/v1/'); r.status === 200 ? ok('El proyecto responde y la clave es válida') : bad(`Respuesta ${r.status}: revisá la URL y la clave anon`) } catch (e) { bad('No se pudo conectar: ' + e.message); process.exit(1) }
console.log('Tablas (migraciones)')
for (const [t, mig] of [['profiles', '0001'], ['complexes', '0001'], ['courts', '0001'], ['bookings', '0001'], ['reviews', '0001'], ['app_settings', '0001'], ['client_notes', '0002']]) {
  const r = await get(`/rest/v1/${t}?select=*&limit=1`)
  if (r.status === 404 || r.body?.code === 'PGRST205' || r.body?.code === '42P01') bad(`Falta la tabla ${t}: correr la migración ${mig}`)
  else ok(t)
}
console.log('Seguridad (sin iniciar sesión)')
const b = await get('/rest/v1/bookings?select=id&limit=1'); Array.isArray(b.body) && b.body.length === 0 ? ok('Las reservas no se ven sin sesión') : bad('¡Alguien sin sesión puede ver reservas! Revisá que las políticas (RLS) de la migración 0001 estén aplicadas')
const p = await get('/rest/v1/profiles?select=id&limit=1'); Array.isArray(p.body) && p.body.length === 0 ? ok('Los perfiles no se ven sin sesión') : bad('¡Alguien sin sesión puede ver perfiles!')
const c = await get('/rest/v1/complexes?select=id,approval,active&limit=100'); Array.isArray(c.body) && c.body.every(x => x.approval === 'approved' && x.active) ? ok('Sin sesión solo se ven complejos aprobados y activos') : bad('Se ven complejos sin aprobar sin iniciar sesión')
console.log('Fotos (migración 0003, opcional)')
const s = await fetch(`${url}/storage/v1/bucket/photos`, { headers: H }); s.status === 200 ? ok('El espacio de fotos existe') : console.log('  –  No existe el espacio "photos": las fotos se guardan dentro de la base. Corré la migración 0003 para guardarlas como archivos.')
console.log(fails ? `\n${fails} problema(s) para resolver.` : '\nTodo en orden: la app ya puede usar este proyecto.'); process.exit(fails ? 1 : 0)
