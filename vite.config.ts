import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
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
          if (assetInfo.name === "content.css") {
            return "content.css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
