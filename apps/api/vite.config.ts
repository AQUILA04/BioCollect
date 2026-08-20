import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const apiRoot = import.meta.dirname;

export default defineConfig({
  plugins: [react(), tailwindcss(), vitePluginManusRuntime()],
  resolve: {
    alias: {
      "@": path.resolve(apiRoot, "../web/src"),
      "@shared": path.resolve(apiRoot, "shared"),
    },
  },
  envDir: apiRoot,
  root: path.resolve(apiRoot, "../web"),
  publicDir: path.resolve(apiRoot, "../web/public"),
  build: {
    outDir: path.resolve(apiRoot, "dist/public"),
    emptyOutDir: true,
  },
  server: { host: true },
});
