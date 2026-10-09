import { useEffect, useState } from 'react'

/* Pronóstico por hora de Open-Meteo (gratis, sin clave). Si no hay conexión, simplemente no se muestra. */
const cache = new Map()
const WMO = [[0, 'Despejado', 'sun'], [2, 'Algo nublado', 'cloud-sun'], [3, 'Nublado', 'cloud'], [48, 'Neblina', 'fog'], [57, 'Llovizna', 'rain'], [67, 'Lluvia', 'rain'], [77, 'Nieve', 'cloud'], [82, 'Chubascos', 'rain'], [99, 'Tormenta', 'storm']]
const describe = code => WMO.find(([max]) => code <= max) || WMO[1]

export function loadForecast(lat, lng) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`
  if (!cache.has(key)) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation_probability,weather_code&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=8`
    cache.set(key, fetch(url).then(r => (r.ok ? r.json() : Promise.reject(new Error('sin pronóstico')))).then(j => {
      const h = j.hourly, out = {}
      h.time.forEach((t, i) => { out[t.slice(0, 13)] = { temp: Math.round(h.temperature_2m[i]), rain: h.precipitation_probability[i] ?? 0, code: h.weather_code[i] } })
      return out
    }).catch(e => { cache.delete(key); throw e }))
  }
  return cache.get(key)
}

/* Clima de un turno: { temp, rain, label, kind } o null mientras carga, no hay datos o la fecha está lejos. */
export function useWeather(complex, date, time) {
  const [w, setW] = useState(null)
  useEffect(() => {
    setW(null)
    if (!complex || complex.lat == null || !date || !time) return
    let alive = true
    loadForecast(complex.lat, complex.lng).then(f => {
      const x = f[`${date}T${time.slice(0, 2)}`]
      if (alive && x) { const [, label, kind] = describe(x.code); setW({ ...x, label, kind }) }
    }).catch(() => {})
    return () => { alive = false }
  }, [complex?.id, complex?.lat, date, time])
  return w
}
