import path from 'path';
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import checker from 'vite-plugin-checker';
import {VitePWA} from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/worker',
      filename: 'sw.ts',
      injectRegister: "auto",
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      }
    }),
    checker({
      typescript: true
    })
  ],

  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    }
  }
});

