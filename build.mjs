import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname);
const outputRoot = resolve(projectRoot, "dist");
const serverRoot = resolve(outputRoot, "server");
const configRoot = resolve(outputRoot, ".openai");

const routeFiles = [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/index.html", "index.html", "text/html; charset=utf-8"],
  ["/styles.css", "styles.css", "text/css; charset=utf-8"],
  ["/app.js", "app.js", "text/javascript; charset=utf-8"],
  ["/ui.js", "ui.js", "text/javascript; charset=utf-8"],
];

const routes = {};
for (const [route, fileName, contentType] of routeFiles) {
  routes[route] = {
    body: await readFile(resolve(projectRoot, fileName), "utf8"),
    contentType,
  };
}

const workerSource = `// Arquivo gerado automaticamente por build.mjs.
const ROUTES = Object.freeze(${JSON.stringify(routes)});

const securityHeaders = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
});

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname.length > 1 && url.pathname.endsWith("/")
      ? url.pathname.slice(0, -1)
      : url.pathname;
    const asset = ROUTES[pathname];

    if (!asset) {
      return new Response("Página não encontrada.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders },
      });
    }

    return new Response(request.method === "HEAD" ? null : asset.body, {
      status: 200,
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": pathname === "/" || pathname === "/index.html"
          ? "no-cache"
          : "public, max-age=3600",
        ...securityHeaders,
      },
    });
  },
};
`;

await rm(outputRoot, { recursive: true, force: true });
await mkdir(serverRoot, { recursive: true });
await mkdir(configRoot, { recursive: true });
await writeFile(resolve(serverRoot, "index.js"), workerSource, "utf8");
await writeFile(
  resolve(configRoot, "hosting.json"),
  await readFile(resolve(projectRoot, ".openai", "hosting.json"), "utf8"),
  "utf8",
);

console.log(`Build concluído: ${Object.keys(routes).length} rotas estáticas empacotadas.`);
