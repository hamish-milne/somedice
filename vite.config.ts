import { defineConfig } from "vite-plus";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import prefresh from "@prefresh/rolldown";

export default defineConfig({
  plugins: [{ enforce: "pre", ...mdx({ remarkPlugins: [remarkGfm] }) }, prefresh(), tailwindcss()],
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "preact",
    },
  },
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
    },
  },
  worker: {
    format: "es",
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
