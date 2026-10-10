/**
 * Standalone PDF render worker.
 *
 * WHY THIS EXISTS
 * --------------
 * Rendering a PDF requires a real Chromium, which needs ~300-500MB RSS. The
 * API is deployed on a 512MB free instance and must NOT host Chromium: doing so
 * both starves the API and OOMs mid-render. This process owns a single, warm
 * browser and exposes one narrow, authenticated endpoint (`POST /render`).
 *
 * The API delegates to it only when `PDF_WORKER_URL` is set; otherwise it falls
 * back to an in-process browser for local development.
 *
 * DESIGN
 * ------
 * - One browser, reused across requests, launched at boot (no cold-start timeout).
 * - Bounded concurrency: Chromium pages are memory-heavy, so we cap in-flight
 *   renders rather than letting one burst exhaust the worker.
 * - Fail-fast auth: a shared secret header, compared in constant time.
 * - Hard timeouts on navigation AND on the whole render, so a hung page can
 *   never wedge a slot.
 * - Structured JSON logs (with correlation id) for auditability.
 * - Graceful shutdown on SIGTERM so deploys drain in-flight renders.
 *
 * ENV
 * ---
 *  WORKER_PORT / PORT          listen port (default 3002)
 *  PDF_WORKER_TOKEN            shared secret; REQUIRED (server refuses to start without it)
 *  PUPPETEER_EXECUTABLE_PATH   system Chromium path (set in the worker image)
 *  PDF_WORKER_CONCURRENCY      max simultaneous renders (default 1)
 *  PDF_NAV_TIMEOUT_MS          page load timeout (default 60000)
 *  PDF_RENDER_TIMEOUT_MS       whole-render timeout (default 120000)
 *  PDF_MAX_HTML_BYTES          request body cap (default 5MB)
 */

import * as http from "http";
import * as crypto from "crypto";
import puppeteer, { Browser, Page, PDFOptions } from "puppeteer";

const PORT = Number(process.env.WORKER_PORT || process.env.PORT || 3002);
const TOKEN = (process.env.PDF_WORKER_TOKEN || "").trim();
const EXECUTABLE_PATH =
  (process.env.PUPPETEER_EXECUTABLE_PATH || "").trim() || undefined;
const CONCURRENCY = Math.max(1, Number(process.env.PDF_WORKER_CONCURRENCY || 1));
const NAV_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.PDF_NAV_TIMEOUT_MS || 60_000),
);
const RENDER_TIMEOUT_MS = Math.max(
  10_000,
  Number(process.env.PDF_RENDER_TIMEOUT_MS || 120_000),
);
const MAX_HTML_BYTES = Math.max(
  65_536,
  Number(process.env.PDF_MAX_HTML_BYTES || 5 * 1024 * 1024),
);

if (!TOKEN) {
  // Refuse to start rather than expose an unauthenticated HTML->PDF oracle that
  // can read local files via file:// or SSRF internal endpoints.
  console.error(
    JSON.stringify({
      level: "fatal",
      msg: "PDF_WORKER_TOKEN is required; refusing to start unauthenticated.",
    }),
  );
  process.exit(1);
}

function log(level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({ level, ts: new Date().toISOString(), msg, ...extra }),
  );
}

// ---------------------------------------------------------------------------
// Browser lifecycle
// ---------------------------------------------------------------------------

let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  log("info", "launching chromium", {
    executablePath: EXECUTABLE_PATH || "(bundled)",
  });
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });
  browser.on("disconnected", () => {
    log("warn", "chromium disconnected; will relaunch on next render");
    browserPromise = null;
  });
  return browser;
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  const browser = await browserPromise;
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

// ---------------------------------------------------------------------------
// Bounded concurrency
// ---------------------------------------------------------------------------

let active = 0;
const waiting: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < CONCURRENCY) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
}

function release(): void {
  active--;
  const next = waiting.shift();
  if (next) next();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

interface RenderRequest {
  html: string;
  options?: PDFOptions;
}

const DEFAULT_OPTIONS: PDFOptions = {
  format: "A4",
  printBackground: true,
  margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
};

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function render(
  req: RenderRequest,
  correlationId: string,
): Promise<Buffer> {
  await acquire();
  const startedAt = Date.now();
  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    page.setDefaultTimeout(NAV_TIMEOUT_MS);

    await withTimeout(
      page.setContent(req.html, { waitUntil: "networkidle0", timeout: NAV_TIMEOUT_MS }),
      RENDER_TIMEOUT_MS,
      "setContent",
    );

    const pdf = await withTimeout(
      page.pdf({ ...DEFAULT_OPTIONS, ...(req.options || {}) }),
      RENDER_TIMEOUT_MS,
      "pdf",
    );

    const buffer = Buffer.from(pdf);
    log("info", "rendered pdf", {
      correlationId,
      bytes: buffer.length,
      ms: Date.now() - startedAt,
    });
    return buffer;
  } finally {
    if (page) await page.close().catch(() => undefined);
    release();
  }
}

// ---------------------------------------------------------------------------
// HTTP surface
// ---------------------------------------------------------------------------

function secureEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function readBody(req: http.IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error(`Request body exceeds ${limit} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const correlationId = String(req.headers["x-correlation-id"] || "-");

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", active, concurrency: CONCURRENCY }));
    return;
  }

  if (req.method !== "POST" || req.url !== "/render") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  if (!secureEqual(String(req.headers["x-worker-token"] || ""), TOKEN)) {
    log("warn", "unauthorized render attempt", { correlationId });
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  try {
    const raw = await readBody(req, MAX_HTML_BYTES);
    const parsed = JSON.parse(raw) as RenderRequest;
    if (!parsed || typeof parsed.html !== "string" || parsed.html.length === 0) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "html_required" }));
      return;
    }
    const pdf = await render(parsed, correlationId);
    res.writeHead(200, {
      "content-type": "application/pdf",
      "content-length": String(pdf.length),
      "x-correlation-id": correlationId,
    });
    res.end(pdf);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "render failed", { correlationId, error: message });
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "render_failed", message }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  log("info", "pdf worker listening", { port: PORT, concurrency: CONCURRENCY });
  // Warm the browser immediately so the first request does not pay launch cost.
  getBrowser().catch((err) =>
    log("warn", "initial chromium warmup failed", {
      error: err instanceof Error ? err.message : String(err),
    }),
  );
});

async function shutdown(signal: string): Promise<void> {
  log("info", "shutting down", { signal });
  server.close();
  const pending = browserPromise;
  browserPromise = null;
  if (pending) {
    await pending.then((b) => b.close()).catch(() => undefined);
  }
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
