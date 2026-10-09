import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run celular` levanta la app con https en la red local.
// Los celulares solo dan la ubicación en páginas https; así se puede probar desde el teléfono.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'celular' ? [basicSsl()] : [])],
  build: {
    target: 'es2022',
    rollupOptions: { output: { manualChunks: id => (/node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react' : /node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id) ? 'motion' : undefined) } },
  },
  server: mode === 'celular' ? { host: true } : undefined,
}))
