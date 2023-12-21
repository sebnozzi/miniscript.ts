/// <reference types="vitest" />
import path from "path";
import { fileURLToPath } from 'node:url';
import { defineConfig } from "vite";

const fileName = {
  es: `miniscript-ts.mjs`,
  cjs: `miniscript-ts.cjs`,
  iife: `miniscript-ts.js`,
};

const formats = Object.keys(fileName) as Array<keyof typeof fileName>;

export default defineConfig({
  base: "./",
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "MiniScriptTs",
      formats,
      fileName: (format) => fileName[format],
    },
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: [
        fileURLToPath(new URL('examples', import.meta.url))
      ]
    }
  },
  test: {

  }
});
