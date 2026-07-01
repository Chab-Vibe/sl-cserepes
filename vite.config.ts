import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLEFILE=1 npm run build → egyetlen, önmagában futtatható HTML fájlba
// csomagol mindent (JS+CSS inline), hogy dupla kattintással, szerver nélkül
// is megnyitható legyen file://-ból.
const singlefile = process.env.SINGLEFILE === '1'

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(singlefile ? [viteSingleFile()] : [])],
  build: singlefile ? { outDir: 'dist-singlefile', assetsInlineLimit: Infinity } : undefined,
})
