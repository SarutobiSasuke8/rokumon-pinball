// Serves the built game from dist/ at the same nested path the Rokumon hub uses,
// so the mobile touch tests load the real production bundle. /hub-bridge.js is
// answered with an empty script: the standalone (no hub SDK) case, without the
// 404 console error a missing file would log.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

const root = resolve("dist");
const mount = process.env.MOUNT ?? "/games/pinball/play/";
const port = Number(process.env.PORT ?? 4317);
const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (pathname === "/hub-bridge.js") return response.writeHead(200, { "content-type": "text/javascript" }).end("");
  if (!pathname.startsWith(mount)) return response.writeHead(404).end();
  const file = resolve(root, pathname.slice(mount.length) || "index.html");
  if (!file.startsWith(root + "/") && !file.startsWith(root + "\\")) return response.writeHead(403).end();
  try {
    const bytes = await readFile(file);
    response.setHeader("content-type", types[extname(file)] ?? "application/octet-stream");
    response.end(bytes);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, "127.0.0.1", () => console.log(`serving dist at http://127.0.0.1:${port}${mount}`));
