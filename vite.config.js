import { defineConfig } from "vite";
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const root = resolve(__dirname);

function htmlInputs() {
  const entries = {};
  for (const f of readdirSync(root)) {
    if (f.endsWith(".html") && !f.startsWith(".")) {
      const name = f === "index.html" ? "index" : f.replace(/\.html$/, "");
      entries[name] = resolve(root, f);
    }
  }
  return entries;
}

export default defineConfig({
  root,
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
    open: false,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: htmlInputs(),
    },
  },
});
