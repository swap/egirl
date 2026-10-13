import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import bun from "@igloczek/astro-bun-adapter";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { readdirSync, writeFileSync, mkdirSync, statSync, existsSync } from "fs";
import { join, relative, sep } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const PAGE_EXT = /\.tsx$/;
const API_EXT = /\.ts$/;

const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
for (const [k, v] of Object.entries(env)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function to_pattern(rel) {
  const parts = rel.split(/[/\\]/).filter((p) => p && !/^\(.*\)$/.test(p));
  const file = parts.pop().replace(PAGE_EXT, "").replace(API_EXT, "");
  if (file !== "index") parts.push(file);
  const path = "/" + parts.join("/");
  return path === "/" ? "/" : path.replace(/\/+/g, "/");
}

function to_posix(p) {
  return p.split(sep).join("/");
}

function routes() {
  return {
    name: "routes",
    hooks: {
      "astro:config:setup"({ injectRoute, createCodegenDir, config }) {
        const root = fileURLToPath(config.root);
        const web_dir = join(root, "app/(web)");
        const api_dir = join(root, "app/(api)");
        const layout = to_posix(join(root, "app/layout.astro"));
        const gen = fileURLToPath(createCodegenDir());
        mkdirSync(gen, { recursive: true });

        for (const file of walk(web_dir).filter((f) => PAGE_EXT.test(f))) {
          const rel = relative(web_dir, file);
          const pattern = to_pattern(rel);
          const name =
            to_posix(rel).replace(PAGE_EXT, "").replace(/\//g, "_") || "index";
          const out = join(gen, `${name}.astro`);
          const pbx = to_posix(join(root, "app/_comps/lib/pbx.ts"));
          writeFileSync(
            out,
            `---
import Layout from ${JSON.stringify(layout)};
import Page from ${JSON.stringify(to_posix(file))};
import { Player } from ${JSON.stringify(to_posix(join(root, "app/_comps/ui/player.tsx")))};
import { ClientRouter } from "astro:transitions";
---
<Layout>
  <script>
    import { install } from ${JSON.stringify(pbx)};
    install();
  </script>
  <ClientRouter />
  <Player client:load transition:persist="music-player" />
  <Page client:load />
</Layout>
`,
          );
          injectRoute({ pattern, entrypoint: pathToFileURL(out).href });
        }

        for (const file of walk(api_dir).filter((f) => API_EXT.test(f))) {
          const pattern = to_pattern(relative(api_dir, file));
          injectRoute({
            pattern: pattern === "/" ? "/api" : `/api${pattern}`,
            entrypoint: pathToFileURL(file).href,
          });
        }
      },
    },
  };
}

export default defineConfig({
  srcDir: "./app",
  publicDir: "./static",
  output: "server",
  server: {
    port: 2000,
  },
  integrations: [react(), routes()],
  adapter: bun({
    mode: "standalone",
  }),
  vite: {
    envPrefix: ["PUBLIC_", "PBX_"],
    ssr: {
      external: ["@snowcats/pbx"],
    },
    resolve: {
      alias: [
        {
          find: "@/",
          replacement: `${fileURLToPath(new URL(".", import.meta.url))}/`,
        },
      ],
    },
    plugins: [tailwindcss()],
  },
});
