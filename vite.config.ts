import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/cashflow-pwa/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["vite.svg"],
      manifest: {
        name: "Cashflow Helper",
        short_name: "Cashflow",
        start_url: ".",
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#1d4ed8",
        icons: [
          {
            src: "vite.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ],
});
