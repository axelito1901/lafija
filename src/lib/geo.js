/* Centro por defecto (Lanús) cuando no hay ubicación. */
export const DEFAULT_CENTER = { lat: -34.712, lng: -58.395 }

/* Ubicación del dispositivo con mensajes claros cuando no se puede. */
export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new Error('La ubicación solo funciona en páginas seguras (https). En el celular, abrí la app con "npm run celular" o desde la versión publicada.'))
      return
    }
    if (!navigator.geolocation) { reject(new Error('Este navegador no permite usar la ubicación. Escribí tu barrio.')); return }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      err => reject(new Error(
        err.code === 1 ? 'La ubicación está bloqueada para esta página. Tocá el candado de la barra de direcciones y permitila.'
          : err.code === 3 ? 'Tardó demasiado en encontrar tu ubicación. Probá de nuevo o escribí tu barrio.'
            : 'No pudimos saber dónde estás. Revisá que la ubicación del dispositivo esté activada.')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 })
  })
}
