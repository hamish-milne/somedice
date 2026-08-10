import { defineConfig } from "vite-plus";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import prefresh from "@prefresh/rolldown";
import remarkGitHubAlerts, { type RemarkGitHubAlertsOptions } from "remark-github-markdown-alerts";
import { readFileSync } from "node:fs";

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [
          remarkGfm,
          [
            remarkGitHubAlerts,
            {
              mode: "component",
              alerts: {
                caution: {
                  iconElementHtml: readFileSync("./src/icons/caution.svg", "utf-8"),
                },
                important: {
                  iconElementHtml: readFileSync("./src/icons/important.svg", "utf-8"),
                },
                note: {
                  iconElementHtml: readFileSync("./src/icons/note.svg", "utf-8"),
                },
                tip: {
                  iconElementHtml: readFileSync("./src/icons/tip.svg", "utf-8"),
                },
                warning: {
                  iconElementHtml: readFileSync("./src/icons/warning.svg", "utf-8"),
                },
              },
            } as RemarkGitHubAlertsOptions,
          ],
        ],
      }),
    },
    prefresh(),
    tailwindcss(),
  ],
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
