import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    // Member 3 is a sibling feature module: resolve its React and charts from this host app.
    dedupe: ["react", "react-dom", "recharts", "zod"],
  },
  server: { fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/recharts/")) return "charts";
          if (id.includes("/node_modules/react-dom/") || id.includes("/node_modules/react/")) return "react-vendor";
        },
      },
    },
  },
});
