/**
 * aiClient.js — unified AI provider wrapper.
 *
 * Primary provider: Gemini (via @google/genai)
 * Fallback providers: Claude (Anthropic), OpenAI
 *
 * Provider is selected per-role via env vars:
 *   EXTRACTOR_PROVIDER, DRAFTER_PROVIDER, SCORER_PROVIDER
 * Options: gemini | claude | openai  (default: gemini)
 */

import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const geminiModel = process.env.GEMINI_MODEL   || "gemini-2.5-flash";
const claudeModel = process.env.CLAUDE_MODEL   || "claude-opus-4-5";
const openaiModel = process.env.OPENAI_MODEL   || "gpt-4o";

/** Ensure the model name has the required "models/" prefix for @google/genai */
function geminiModelId() {
  const m = geminiModel.trim();
  return m.startsWith("models/") ? m : `models/${m}`;
}

/**
 * Retry an async fn up to `maxAttempts` times on 429 / rate-limit errors.
 * Waits retryDelay ms (doubles each attempt) before retrying.
 */
async function withRetry(fn, maxAttempts = 3, retryDelayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err?.message || String(err);
      const isRateLimit =
        msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") || msg.includes("rate limit");

      if (isRateLimit && attempt < maxAttempts) {
        // Extract retry delay from error if available, else use exponential backoff
        const retryMatch = msg.match(/retry.*?(\d+(?:\.\d+)?)s/i);
        const waitMs = retryMatch
          ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500
          : retryDelayMs * attempt;
        console.warn(`Rate limited. Waiting ${waitMs}ms before attempt ${attempt + 1}/${maxAttempts}…`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
}

// Lazy-initialise clients only when their keys are present
function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith("your-")) throw new Error("GEMINI_API_KEY is not set in .env");
  return new GoogleGenAI({ apiKey: key });
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.startsWith("sk-ant-your")) throw new Error("ANTHROPIC_API_KEY is not set in .env");
  return new Anthropic({ apiKey: key });
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.startsWith("sk-your")) throw new Error("OPENAI_API_KEY is not set in .env");
  return new OpenAI({ apiKey: key });
}

function resolveProvider(role) {
  const key = `${role.toUpperCase()}_PROVIDER`;
  return (process.env[key] || "gemini").toLowerCase();
}

/**
 * Call the configured AI provider and return the full response text.
 * @param {string} prompt
 * @param {"extractor"|"drafter"|"scorer"} role
 * @returns {Promise<string>}
 */
export async function complete(prompt, role = "extractor") {
  const provider = resolveProvider(role);

  try {
    // ── Gemini ──────────────────────────────────────────────────────────────
    if (provider === "gemini") {
      const genai = getGemini();
      const response = await withRetry(() =>
        genai.models.generateContent({
          model: geminiModelId(),
          contents: prompt,
        })
      );
      return response.text ?? "";
    }

    // ── OpenAI ───────────────────────────────────────────────────────────────
    if (provider === "openai") {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: openaiModel,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      });
      return response.choices[0].message.content || "";
    }

    // ── Claude (Anthropic) ───────────────────────────────────────────────────
    {
      const anthropic = getAnthropic();
      const response = await anthropic.messages.create({
        model: claudeModel,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content[0]?.text || "";
    }

  } catch (err) {
    const msg = err?.message || String(err);
    // Surface auth / key errors clearly
    if (
      msg.includes("API key") || msg.includes("authentication") ||
      msg.includes("invalid") || msg.includes("not set") ||
      msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED")
    ) {
      throw new Error(
        `AI auth error (${provider}): ${msg}. Check your ${provider.toUpperCase()}_API_KEY in Backend/.env`
      );
    }
    throw err;
  }
}

/**
 * Stream response tokens (SSE-style).
 * Gemini streaming is used when provider=gemini; falls back to buffered
 * complete() for other providers since they handle streaming differently.
 *
 * @param {string} prompt
 * @param {(token: string) => void} onToken
 * @param {() => void} onDone
 */
export async function streamComplete(prompt, onToken, onDone) {
  const provider = resolveProvider("drafter");

  try {
    // ── Gemini streaming ─────────────────────────────────────────────────────
    if (provider === "gemini") {
      const genai = getGemini();
      const result = await withRetry(() =>
        genai.models.generateContentStream({
          model: geminiModelId(),
          contents: prompt,
        })
      );
      for await (const chunk of result) {
        const token = chunk.text ?? "";
        if (token) onToken(token);
      }
      onDone();
      return;
    }

    // ── OpenAI streaming ─────────────────────────────────────────────────────
    if (provider === "openai") {
      const openai = getOpenAI();
      const stream = await openai.chat.completions.create({
        model: openaiModel,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      });
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || "";
        if (token) onToken(token);
      }
      onDone();
      return;
    }

    // ── Claude streaming ──────────────────────────────────────────────────────
    {
      const anthropic = getAnthropic();
      const stream = await anthropic.messages.stream({
        model: claudeModel,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
          onToken(chunk.delta.text);
        }
      }
      onDone();
    }

  } catch (err) {
    const msg = err?.message || String(err);
    if (
      msg.includes("API key") || msg.includes("authentication") ||
      msg.includes("not set") || msg.includes("API_KEY_INVALID") ||
      msg.includes("PERMISSION_DENIED")
    ) {
      throw new Error(
        `AI stream auth error (${provider}): ${msg}. Check your ${provider.toUpperCase()}_API_KEY in Backend/.env`
      );
    }
    throw err;
  }
}
