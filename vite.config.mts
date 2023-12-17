/// <reference types="vitest" />
import path from "path";
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
  },
  test: {

  }
});
