import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// SPA fallback: serve index.html for path-based routes in dev (e.g. /dashboard)
function spaFallback() {
  return {
    name: 'spa-fallback',
    configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
      server.middlewares.use((req: { method: string; url: string }, _res: unknown, next: () => void) => {
        if (req.method === 'GET' && !req.url?.includes('.') && !req.url?.startsWith('/@') && !req.url?.startsWith('/node_modules')) {
          req.url = '/index.html'
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), spaFallback()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
