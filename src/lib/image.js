/* Lee una imagen del dispositivo y la reduce (máx. 1200px, JPEG) para guardarla como data URL. */
export function fileToDataURL(file, max = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) { reject(new Error('Elegí un archivo de imagen.')); return }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No pudimos leer la imagen.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('No pudimos abrir la imagen.'))
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/* Foto lista para guardar. Con Supabase se sube al almacenamiento y se guarda solo el link;
   sin Supabase (modo demo) o si la subida falla, se guarda dentro de los datos como antes. */
export async function photoFromFile(file, { max = 1200, userId } = {}) {
  const dataUrl = await fileToDataURL(file, max)
  const { supabase } = await import('./supabase')
  if (!supabase || !userId) return dataUrl
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
    if (error) throw error
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl
  } catch { return dataUrl }
}
