import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Dev rejimida /api so'rovlarini backendga proxy qilamiz (prod'dagi Caddy kabi).
// Docker ichida target = http://backend:8000 (VITE_PROXY_TARGET orqali beriladi),
// lokal (docker'siz) ishlaganda esa http://localhost:8000.
const apiTarget = process.env.VITE_PROXY_TARGET || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
