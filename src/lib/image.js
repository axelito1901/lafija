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
