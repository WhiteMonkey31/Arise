/**
 * scorer.js — Compute win probability score from compliance items.
 * Returns axes scores and overall probability with GO/NO-GO recommendation.
 */

import { complete } from "./aiClient.js";

const GO_THRESHOLD = parseFloat(process.env.WIN_SCORE_GO_THRESHOLD || "65") / 100;

/**
 * Compute win score from compliance items and workspace context.
 * @param {Array<{requirementText, requirementCategory, status, matchScore}>} items
 * @param {{name, sector}} workspace
 * @returns {Promise<{overall, axes, gap_count, verdict}>}
 */
export async function computeWinScore(items, workspace) {
  if (!items.length) {
    return {
      overall: 0,
      axes: {
        technical_alignment: 0,
        compliance_coverage: 0,
        past_performance: 0,
        solution_clarity: 0,
        risk_profile: 0,
      },
      gap_count: 0,
      verdict: "No requirements analyzed yet.",
    };
  }

  const passCount = items.filter((i) => i.status === "PASS").length;
  const partialCount = items.filter((i) => i.status === "PARTIAL").length;
  const gapCount = items.filter((i) => i.status === "GAP").length;
  const total = items.length;

  // Base compliance coverage
  const complianceCoverage = (passCount + partialCount * 0.5) / total;

  // Category breakdowns
  const byCategory = {};
  for (const item of items) {
    const cat = (item.requirementCategory || "General").toLowerCase();
    if (!byCategory[cat]) byCategory[cat] = { pass: 0, partial: 0, gap: 0, total: 0 };
    byCategory[cat].total++;
    if (item.status === "PASS") byCategory[cat].pass++;
    else if (item.status === "PARTIAL") byCategory[cat].partial++;
    else byCategory[cat].gap++;
  }

  const catScore = (cat) => {
    const d = byCategory[cat];
    if (!d) return 0.5;
    return (d.pass + d.partial * 0.5) / d.total;
  };

  const axes = {
    technical_alignment: catScore("technical"),
    compliance_coverage: complianceCoverage,
    past_performance: catScore("experience"),
    solution_clarity: catScore("management"),
    risk_profile: Math.max(0, 1 - gapCount / Math.max(total, 1)),
  };

  // Overall = weighted average
  const weights = [0.25, 0.25, 0.2, 0.15, 0.15];
  const axisValues = Object.values(axes);
  const overall = axisValues.reduce((sum, v, i) => sum + v * weights[i], 0);

  // Get AI verdict
  let verdict = "";
  try {
    const prompt = `You are a bid strategy expert. Based on these win scores, write a 2-sentence strategic verdict.

Workspace: "${workspace.name}" | Sector: ${workspace.sector}
Overall Score: ${Math.round(overall * 100)}%
Pass: ${passCount}/${total} | Partial: ${partialCount}/${total} | Gap: ${gapCount}/${total}
Axes: ${JSON.stringify(axes)}

Write 2 concise sentences explaining the bid's strengths and main risks. No formatting.`;
    verdict = await complete(prompt, "scorer");
  } catch {
    verdict =
      overall >= GO_THRESHOLD
        ? `Strong compliance alignment with ${passCount} of ${total} requirements covered. Recommend proceeding with the bid.`
        : `Coverage gaps in ${gapCount} of ${total} requirements present significant risk. Strengthen capability evidence before proceeding.`;
  }

  return {
    overall: Math.round(overall * 100) / 100,
    axes: Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    gap_count: gapCount,
    verdict: verdict.trim(),
  };
}

/**
 * Compute GO/NO-GO recommendation.
 * @param {{overall, axes, gap_count}} winScore
 * @param {{name, sector}} workspace
 * @returns {Promise<{decision, score, reasoning, risks}>}
 */
export async function computeGoNoGo(winScore, workspace) {
  const score = Math.round(winScore.overall * 100);
  const decision = winScore.overall >= GO_THRESHOLD ? "GO" : "NO-GO";

  let reasoning = "";
  let risks = [];

  try {
    const prompt = `You are a bid strategy expert. Analyze this bid and provide:
1. A 3-sentence strategic reasoning for the ${decision} decision
2. Up to 4 key risks as short bullet strings

Workspace: "${workspace.name}" | Sector: ${workspace.sector}
Score: ${score}% | Decision: ${decision} | Gaps: ${winScore.gap_count}
Axes: ${JSON.stringify(winScore.axes)}

Return ONLY valid JSON (no markdown):
{
  "reasoning": "...",
  "risks": ["risk 1", "risk 2", "risk 3"]
}`;

    const response = await complete(prompt, "scorer");
    const cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.search(/\{/);
    const parsed = JSON.parse(cleaned.slice(start));
    reasoning = parsed.reasoning || "";
    risks = parsed.risks || [];
  } catch {
    reasoning =
      decision === "GO"
        ? `Score of ${score}% exceeds the ${Math.round(GO_THRESHOLD * 100)}% threshold. Compliance coverage is strong with well-matched capabilities. Proceed with proposal development focusing on identified gaps.`
        : `Score of ${score}% falls below the ${Math.round(GO_THRESHOLD * 100)}% threshold. Significant capability gaps exist that need addressing. Consider strengthening the capability library before bidding.`;
    risks =
      winScore.gap_count > 0
        ? [
            `${winScore.gap_count} unmatched compliance requirement(s)`,
            "Capability evidence may be insufficient for all categories",
            "Review and enhance the capability library",
          ]
        : ["Monitor proposal quality throughout drafting"];
  }

  return { decision, score, reasoning, risks };
}
