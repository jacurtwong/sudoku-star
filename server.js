import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const leaderboardFile = path.join(dataDir, "leaderboard.json");
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

async function readLeaderboard() {
  try {
    return JSON.parse(await readFile(leaderboardFile, "utf8"));
  } catch {
    return {};
  }
}

async function writeLeaderboard(data) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(leaderboardFile, JSON.stringify(data, null, 2), "utf8");
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname);
  const cleanPath = requestedPath === "/" ? "/index.html" : requestedPath;
  const filePath = path.normalize(path.join(distDir, cleanPath));

  if (!filePath.startsWith(distDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let resolvedPath = filePath;
  try {
    const fileStat = await stat(resolvedPath);
    if (fileStat.isDirectory()) {
      resolvedPath = path.join(resolvedPath, "index.html");
    }
  } catch {
    resolvedPath = path.join(distDir, "index.html");
  }

  const extension = path.extname(resolvedPath);
  response.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=31536000, immutable",
  });
  createReadStream(resolvedPath).pipe(response);
}

createServer(async (request, response) => {
  try {
    if (request.url === "/api/leaderboard" && request.method === "GET") {
      sendJson(response, 200, await readLeaderboard());
      return;
    }

    if (request.url === "/api/leaderboard" && request.method === "PUT") {
      const data = await readJsonBody(request);
      await writeLeaderboard(data);
      sendJson(response, 200, data);
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Internal server error" });
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Sudoku server listening on port ${port}`);
});
