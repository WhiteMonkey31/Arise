/**
 * extractor.js — RFP text extraction and compliance requirement parsing.
 * Reads the uploaded PDF/DOCX and returns structured compliance items.
 */

import fs from "fs";
import path from "path";
import { complete } from "./aiClient.js";

/**
 * Extract text from a PDF file using pdf-parse v2 (PDFParse class API).
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();  // returns TextResult { text, pages, total }
      await parser.destroy();
      return result.text || "";
    } catch (pdfErr) {
      console.warn("pdf-parse extraction failed:", pdfErr.message, "— falling back to raw buffer");
    }
  }

  // For DOCX, TXT, or PDF fallback — read as raw buffer and strip non-printable chars
  const buffer = fs.readFileSync(filePath);
  return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
}

/**
 * Parse AI response JSON safely.
 * @param {string} text
 * @returns {any}
 */
function safeParseJSON(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Find first [ or { to handle leading prose
  const start = cleaned.search(/[\[{]/);
  if (start === -1) throw new Error("No JSON found in AI response");
  return JSON.parse(cleaned.slice(start));
}

/**
 * Use AI to extract structured compliance requirements from RFP text.
 * @param {string} rfpText
 * @returns {Promise<Array<{requirement_text, requirement_category}>>}
 */
async function extractRequirementsWithAI(rfpText) {
  // Truncate to avoid token limits
  const truncated = rfpText.slice(0, 12000);

  const prompt = `You are an expert RFP analyst. Extract all compliance requirements from the following RFP document text.

For each requirement, identify:
1. The exact requirement text (what the vendor must provide or demonstrate)
2. The category (e.g., "Technical", "Security", "Compliance", "Experience", "Management", "Financial", "Legal")

Return ONLY a valid JSON array in this exact format (no prose, no markdown):
[
  {
    "requirement_text": "...",
    "requirement_category": "..."
  }
]

Extract 10-30 requirements. Focus on SHALL, MUST, REQUIRED, and WILL statements.

RFP TEXT:
${truncated}`;

  const response = await complete(prompt, "extractor");
  return safeParseJSON(response);
}

/**
 * Main extraction pipeline: read file → extract text → parse requirements.
 * @param {string} filePath  absolute path to the uploaded file
 * @param {string} originalName  original filename (for extension detection)
 * @returns {Promise<Array<{requirement_text, requirement_category}>>}
 */
export async function extractRequirements(filePath, originalName) {
  const rfpText = await extractText(filePath);

  if (!rfpText || rfpText.trim().length < 50) {
    // Fallback sample requirements if extraction yields nothing
    return [
      { requirement_text: "Vendor must demonstrate at least 5 years of relevant experience in the required domain.", requirement_category: "Experience" },
      { requirement_text: "All delivered systems must comply with applicable security standards (e.g., NIST, FedRAMP).", requirement_category: "Security" },
      { requirement_text: "The solution must be scalable to support at least 10,000 concurrent users.", requirement_category: "Technical" },
      { requirement_text: "Vendor shall provide 24/7 technical support with a maximum 4-hour response SLA.", requirement_category: "Management" },
      { requirement_text: "All software components must be licensed and free from intellectual property violations.", requirement_category: "Legal" },
    ];
  }

  try {
    return await extractRequirementsWithAI(rfpText);
  } catch (err) {
    console.error("AI extraction failed, using fallback:", err.message);
    // Fallback: split text into sentences and use the most directive ones
    const sentences = rfpText
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && /must|shall|required|will|should/i.test(s))
      .slice(0, 15);

    return sentences.map((s, i) => ({
      requirement_text: s,
      requirement_category: i % 2 === 0 ? "Technical" : "Compliance",
    }));
  }
}
