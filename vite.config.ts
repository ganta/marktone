/// <reference types="vitest/config" />
import { resolve } from "node:path";

import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  publicDir: "public",
  build: {
    outDir: "dist",
    minify: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/app/content.tsx"),
        background: resolve(__dirname, "src/app/background.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return ["content", "background"].includes(chunkInfo.name)
            ? "[name].js"
            : "assets/[name]-[hash].js";
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.includes("content.css")) {
            return "content.css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [resolve(__dirname, "tests/setup.ts")],
  },
});
