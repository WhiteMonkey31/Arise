import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./app/routes/authRoutes.js";
import aiRoutes from "./app/routes/aiRoutes.js";
import prisma from "./app/db/prisma.js";

dotenv.config();

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
let allowedOrigins = ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"];
try {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    const parsed = JSON.parse(envOrigins);
    if (Array.isArray(parsed)) allowedOrigins = parsed;
  }
} catch {}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({
  limit: "10mb",
  strict: false, // accept null/primitives without throwing
}));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api", aiRoutes);

// ── Health / readiness checks ─────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", db: "ok" });
  } catch (e) {
    res.status(503).json({ status: "not ready", db: e.message });
  }
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ detail: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`AI provider (extractor): ${process.env.EXTRACTOR_PROVIDER || "claude"}`);
  console.log(`AI provider (drafter):   ${process.env.DRAFTER_PROVIDER || "claude"}`);
  console.log(`AI provider (scorer):    ${process.env.SCORER_PROVIDER || "claude"}`);

  // Warn about placeholder API keys
  const provider = (process.env.EXTRACTOR_PROVIDER || "gemini").toLowerCase();
  if (provider === "gemini" && (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith("your-"))) {
    console.warn("\n⚠  WARNING: GEMINI_API_KEY is not set. AI features (extraction, scoring, drafting) will fail.");
    console.warn("   Set a real key in Backend/.env to enable AI.\n");
  } else if (provider === "claude" && (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-your"))) {
    console.warn("\n⚠  WARNING: ANTHROPIC_API_KEY is not set. AI features will fail.\n");
  } else if (provider === "openai" && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith("sk-your"))) {
    console.warn("\n⚠  WARNING: OPENAI_API_KEY is not set. AI features will fail.\n");
  }
});
