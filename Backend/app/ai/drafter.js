/**
 * drafter.js — AI proposal section generation and regeneration.
 */

import { complete, streamComplete } from "./aiClient.js";

const TARGET_WORDS = parseInt(process.env.PROPOSAL_TARGET_WORDS || "500", 10);

/**
 * Generate a proposal section for a compliance requirement.
 * @param {{requirementText, requirementCategory}} requirement
 * @param {{title, domain, summary, certification}} capability - matched capability (may be null)
 * @param {{name, sector}} workspace
 * @returns {Promise<{content, wordCount, qualityBadge}>}
 */
export async function generateSection(requirement, capability, workspace) {
  const capContext = capability
    ? `Past Performance: ${capability.title} — ${capability.summary} (Domain: ${capability.domain}, Cert: ${capability.certification})`
    : "No direct capability match found — draft a general response addressing the requirement.";

  const prompt = `You are a professional proposal writer for a government/enterprise RFP response.

Write a compelling ${TARGET_WORDS}-word proposal section addressing the following requirement.

RFP Requirement: ${requirement.requirementText}
Category: ${requirement.requirementCategory}
Client Context: ${workspace.name} (${workspace.sector} sector)
${capContext}

Guidelines:
- Write in first person plural ("We", "Our team")  
- Be specific, confident, and evidence-based
- Reference the capability/past performance where applicable
- Address the requirement directly
- Use professional but accessible language
- Do NOT use headers or bullet points — write in flowing paragraphs

Write only the section content (no titles, no meta-commentary):`;

  const content = await complete(prompt, "drafter");
  const wordCount = content.trim().split(/\s+/).length;

  const qualityBadge =
    wordCount >= TARGET_WORDS * 0.8
      ? capability
        ? "Strong"
        : "Needs Review"
      : "Short";

  return { content: content.trim(), wordCount, qualityBadge };
}

/**
 * Stream-regenerate a proposal section.
 * @param {{requirementText, requirementCategory, currentContent}} section
 * @param {{name, sector}} workspace
 * @param {(token: string) => void} onToken
 * @param {() => void} onDone
 */
export async function regenerateSectionStream(section, workspace, onToken, onDone) {
  const prompt = `You are a professional proposal writer. Improve and rewrite the following proposal section.

RFP Requirement: ${section.requirementText}
Current Draft:
${section.currentContent || "(no existing content)"}

Workspace: ${workspace.name} (${workspace.sector})

Rewrite this section to be more compelling, specific, and professional. 
Target ${TARGET_WORDS} words. Write only the improved content (no titles, no commentary):`;

  await streamComplete(prompt, onToken, onDone);
}
