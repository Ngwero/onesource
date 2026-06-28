import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { env, isSupabaseConfigured, isSmtpConfigured } from "./lib/env.js";
import productsRouter from "./routes/products.js";
import categoriesRouter from "./routes/categories.js";
import uploadRouter from "./routes/upload.js";
import heroRouter from "./routes/hero.js";
import ordersRouter from "./routes/orders.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import { requireSupabase } from "./lib/supabase.js";
import { isSupabaseConnectionError } from "./lib/supabaseErrors.js";
import { localProductCount } from "./lib/localSeed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = env.port;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

// Allow the browser to load external images (Unsplash, Supabase Storage, etc.)
// without being blocked by COEP / CORP policies.
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/upload") || req.path.startsWith("/uploads/")) {
    res.on("finish", () => {
      console.log(
        `[http] ${new Date().toISOString()} ${req.method} ${req.path} → ${res.statusCode}`
      );
    });
  }
  next();
});

app.get("/api/health", async (_req, res) => {
  try {
    const db = requireSupabase();
    const { count, error } = await db
      .from("products")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    res.json({ ok: true, products: count ?? 0, database: "supabase" });
  } catch (e) {
    if (isSupabaseConnectionError(e)) {
      return res.json({
        ok: true,
        products: localProductCount(),
        database: "local-seed",
        warning: e.message,
      });
    }
    res.status(503).json({ ok: false, error: e.message });
  }
});

app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/hero", heroRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders(res) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  })
);

const adminDir = path.join(__dirname, "public");
const adminHtml = path.join(adminDir, "admin.html");

app.get(["/admin", "/admin/"], (_req, res) => {
  res.sendFile(adminHtml);
});
app.use("/admin", express.static(adminDir));

const shopDist = path.join(__dirname, "..", "dist");
const shopIndex = path.join(shopDist, "index.html");
const serveShop = fs.existsSync(shopIndex);

if (serveShop) {
  app.use(
    express.static(shopDist, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (
          filePath.endsWith(".js") ||
          filePath.endsWith(".css") ||
          filePath.endsWith(".woff2") ||
          filePath.endsWith(".woff")
        ) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        // Ensure external images (Unsplash, Supabase) are never blocked by CORP
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      },
    })
  );
}

app.get("/", (_req, res) => {
  if (serveShop) {
    res.sendFile(shopIndex);
    return;
  }
  res.redirect("/admin");
});

if (serveShop) {
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/admin") ||
      req.path.startsWith("/uploads")
    ) {
      return next();
    }
    res.sendFile(shopIndex);
  });
}

app.listen(PORT, () => {
  console.log(`Stock API running at http://localhost:${PORT}`);
  if (serveShop) {
    console.log(`Shop: served from dist/ (same origin, /api)`);
  }
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(
    isSupabaseConfigured()
      ? "Database: Supabase"
      : "Warning: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env (npm run check:env)"
  );
  console.log(
    isSmtpConfigured()
      ? `SMTP: ${env.smtp.host}:${env.smtp.port}`
      : "Warning: SMTP not configured — password reset emails will not send (see server/.env.example)"
  );
});
