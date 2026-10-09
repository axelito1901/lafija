/* Lugares para autocompletar la ubicación.
   Primero una lista local (zona sur y CABA, funciona sin internet); después OpenStreetMap (Nominatim). */
export const LOCAL_PLACES = [
  ['Lanús', 'Buenos Aires', -34.7039, -58.3917], ['Lanús Oeste', 'Lanús', -34.7147, -58.4066], ['Lanús Este', 'Lanús', -34.7069, -58.3786],
  ['Remedios de Escalada', 'Lanús', -34.7253, -58.3923], ['Gerli', 'Lanús', -34.687, -58.379], ['Valentín Alsina', 'Lanús', -34.673, -58.412],
  ['Banfield', 'Lomas de Zamora', -34.7445, -58.3955], ['Lomas de Zamora', 'Buenos Aires', -34.7609, -58.4068], ['Temperley', 'Lomas de Zamora', -34.7756, -58.3942],
  ['Adrogué', 'Almirante Brown', -34.8, -58.39], ['Burzaco', 'Almirante Brown', -34.8282, -58.394], ['Monte Grande', 'Esteban Echeverría', -34.8195, -58.4686],
  ['Avellaneda', 'Buenos Aires', -34.6626, -58.365], ['Sarandí', 'Avellaneda', -34.68, -58.346], ['Wilde', 'Avellaneda', -34.7033, -58.3189],
  ['Quilmes', 'Buenos Aires', -34.7206, -58.2546], ['Bernal', 'Quilmes', -34.7086, -58.2797],
  ['Pompeya', 'CABA', -34.646, -58.417], ['Barracas', 'CABA', -34.646, -58.383], ['Parque Patricios', 'CABA', -34.637, -58.401],
  ['Boedo', 'CABA', -34.63, -58.417], ['Caballito', 'CABA', -34.619, -58.44], ['Flores', 'CABA', -34.628, -58.463], ['Palermo', 'CABA', -34.578, -58.426], ['Belgrano', 'CABA', -34.563, -58.456],
].map(([name, area, lat, lng]) => ({ name, area, lat, lng }))

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export const localMatches = q => { const t = norm(q).trim(); return t ? LOCAL_PLACES.filter(p => norm(p.name).includes(t) || norm(p.area).startsWith(t)).slice(0, 6) : [] }

const NOMI = 'https://nominatim.openstreetmap.org'
export async function searchPlaces(q, signal) {
  const url = `${NOMI}/search?format=json&countrycodes=ar&limit=5&addressdetails=1&accept-language=es&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const data = await res.json()
  return data.map(d => {
    const a = d.address || {}
    const name = a.suburb || a.neighbourhood || a.city_district || a.town || a.city || a.village || d.display_name.split(',')[0]
    const area = a.city && a.city !== name ? a.city : a.state_district || a.state || ''
    return { name, area, lat: Number(d.lat), lng: Number(d.lon) }
  })
}
export async function placeName({ lat, lng }) {
  try {
    const res = await fetch(`${NOMI}/reverse?format=json&zoom=14&accept-language=es&lat=${lat}&lon=${lng}`)
    const a = (await res.json()).address || {}
    return a.suburb || a.neighbourhood || a.city_district || a.town || a.city || 'Tu ubicación'
  } catch { return 'Tu ubicación' }
}
