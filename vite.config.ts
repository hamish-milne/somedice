import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";

export default defineConfig({
  plugins: [{ enforce: "pre", ...mdx({ remarkPlugins: [remarkGfm] }) }, react(), tailwindcss()],
  worker: {
    format: "es",
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
