import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [TanStackRouterVite({ quoteStyle: "double" }), react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/trpc": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
      "/api/auth": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3002",
        ws: true,
      },
    },
  },
});
