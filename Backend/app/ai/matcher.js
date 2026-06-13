/**
 * matcher.js — Match compliance requirements against capability library.
 * Uses AI semantic matching to score and classify each requirement.
 */

import { complete } from "./aiClient.js";

const PASS_THRESHOLD = parseFloat(process.env.RAG_PASS_THRESHOLD || "0.75");
const PARTIAL_THRESHOLD = parseFloat(process.env.RAG_PARTIAL_THRESHOLD || "0.40");

/**
 * Simple keyword-based similarity score (0-1) as a fast fallback.
 * @param {string} requirement
 * @param {string} capability
 * @returns {number}
 */
function keywordSimilarity(requirement, capability) {
  const reqWords = new Set(requirement.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const capWords = capability.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  if (reqWords.size === 0) return 0;
  const matches = capWords.filter((w) => reqWords.has(w)).length;
  return Math.min(1, matches / reqWords.size);
}

/**
 * Use AI to match requirements against capabilities and score them.
 * @param {Array<{id, requirement_text, requirement_category}>} requirements
 * @param {Array<{id, title, domain, summary, certification}>} capabilities
 * @returns {Promise<Array<{requirement_id, capability_id|null, match_score, status}>>}
 */
export async function matchRequirementsToCapabilities(requirements, capabilities) {
  if (!requirements.length) return [];

  // If no capabilities, all are GAP
  if (!capabilities.length) {
    return requirements.map((r) => ({
      requirement_id: r.id,
      capability_id: null,
      match_score: 0,
      status: "GAP",
    }));
  }

  // Build a capability summary for the AI
  const capSummary = capabilities
    .slice(0, 20) // limit to avoid token overflow
    .map((c) => `ID:${c.id} | ${c.title} | Domain:${c.domain} | Cert:${c.certification} | ${c.summary}`)
    .join("\n");

  const reqList = requirements
    .map((r) => `ID:${r.id} | [${r.requirement_category}] ${r.requirement_text}`)
    .join("\n");

  const prompt = `You are a proposal compliance analyst. Match each requirement to the best capability from the library.

CAPABILITIES:
${capSummary}

REQUIREMENTS TO MATCH:
${reqList}

For each requirement, find the best matching capability. Assign a match_score from 0.0 to 1.0.
- 0.75-1.0 = PASS (strong match)
- 0.40-0.74 = PARTIAL (partial match)
- 0.0-0.39 = GAP (no good match)

Return ONLY a valid JSON array (no prose, no markdown fences):
[
  {
    "requirement_id": "...",
    "capability_id": "capability-id-or-null",
    "match_score": 0.85,
    "status": "PASS"
  }
]`;

  try {
    const response = await complete(prompt, "extractor");
    const cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.search(/\[/);
    if (start === -1) throw new Error("No JSON array in response");
    const matches = JSON.parse(cleaned.slice(start));

    // Validate and fill gaps
    const matchMap = new Map(matches.map((m) => [m.requirement_id, m]));

    return requirements.map((r) => {
      const m = matchMap.get(r.id);
      if (m) {
        const score = Math.max(0, Math.min(1, parseFloat(m.match_score) || 0));
        return {
          requirement_id: r.id,
          capability_id: m.capability_id || null,
          match_score: score,
          status: score >= PASS_THRESHOLD ? "PASS" : score >= PARTIAL_THRESHOLD ? "PARTIAL" : "GAP",
        };
      }
      // Fallback: keyword match
      let best = null;
      let bestScore = 0;
      for (const cap of capabilities) {
        const score = keywordSimilarity(r.requirement_text, `${cap.title} ${cap.summary} ${cap.domain}`);
        if (score > bestScore) { bestScore = score; best = cap; }
      }
      return {
        requirement_id: r.id,
        capability_id: bestScore >= PARTIAL_THRESHOLD ? best?.id || null : null,
        match_score: bestScore,
        status: bestScore >= PASS_THRESHOLD ? "PASS" : bestScore >= PARTIAL_THRESHOLD ? "PARTIAL" : "GAP",
      };
    });
  } catch (err) {
    console.error("AI matching failed, using keyword fallback:", err.message);

    return requirements.map((r) => {
      let best = null;
      let bestScore = 0;
      for (const cap of capabilities) {
        const score = keywordSimilarity(r.requirement_text, `${cap.title} ${cap.summary} ${cap.domain}`);
        if (score > bestScore) { bestScore = score; best = cap; }
      }
      return {
        requirement_id: r.id,
        capability_id: bestScore >= PARTIAL_THRESHOLD ? best?.id || null : null,
        match_score: bestScore,
        status: bestScore >= PASS_THRESHOLD ? "PASS" : bestScore >= PARTIAL_THRESHOLD ? "PARTIAL" : "GAP",
      };
    });
  }
}
