import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["warm-crab-57.loca.lt", "tough-lemons-shop.loca.lt"],
    host: "0.0.0.0",
    hmr: {
      clientPort: 443
    }
  }
})
