/**
 * aiRoutes.js — All workspace, upload, compliance, scoring, proposal,
 *               capability, analytics, export, and job routes.
 *
 * Response shapes are aligned exactly to what the frontend services expect.
 */

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middlewares/authMiddleware.js";
import prisma from "../db/prisma.js";
import { extractRequirements } from "../ai/extractor.js";
import { matchRequirementsToCapabilities } from "../ai/matcher.js";
import { computeWinScore, computeGoNoGo } from "../ai/scorer.js";
import { generateSection, regenerateSectionStream } from "../ai/drafter.js";

const router = express.Router();

// ── Storage config ───────────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.LOCAL_STORAGE_PATH || "/tmp/rfp_uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatWorkspace(w) {
  return {
    id: w.id,
    name: w.name,
    sector: w.sector,
    deadline: w.deadline ? w.deadline.toISOString() : null,
    status: w.status,
    win_probability: w.winProbability,
    org_id: w.orgId,
    created_at: w.createdAt.toISOString(),
    updated_at: w.updatedAt.toISOString(),
  };
}

function formatJob(j) {
  return {
    id: j.id,
    status: j.status,       // "pending" | "processing" | "done" | "failed"
    progress_pct: j.progressPct,
    error_msg: j.errorMsg || null,
    job_type: j.jobType,
    workspace_id: j.workspaceId,
  };
}

function formatCapability(c) {
  let tags = [];
  try { tags = JSON.parse(c.tags); } catch { tags = []; }
  return {
    id: c.id,
    title: c.title,
    domain: c.domain,
    summary: c.summary,
    client_type: c.clientType,
    contract_value: c.contractValue,
    year: c.year,
    certification: c.certification,
    tags,
    org_id: c.orgId,
    created_at: c.createdAt.toISOString(),
  };
}

function formatComplianceItem(item) {
  return {
    id: item.id,
    requirement_text: item.requirementText,
    requirement_category: item.requirementCategory,
    status: item.status,
    match_score: item.matchScore,
    notes: item.notes,
    capability: item.capability ? {
      id: item.capability.id,
      title: item.capability.title,
      domain: item.capability.domain,
      summary: item.capability.summary,
    } : null,
  };
}

function formatProposal(p) {
  return {
    id: p.id,
    section_title: p.sectionTitle,
    requirement_id: p.requirementId,
    ai_draft: p.aiDraft,
    current_content: p.currentContent,
    word_count: p.wordCount,
    status: p.status,
    quality_badge: p.qualityBadge,
    workspace_id: p.workspaceId,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

// ── Background job runner ────────────────────────────────────────────────────

async function runExtractionJob(jobId, workspaceId, filePath, originalName, orgId) {
  try {
    await prisma.job.update({ where: { id: jobId }, data: { status: "processing", progressPct: 10 } });

    // Extract requirements from the uploaded file
    const requirements = await extractRequirements(filePath, originalName);
    await prisma.job.update({ where: { id: jobId }, data: { progressPct: 40 } });

    // Fetch org capabilities for matching
    const capabilities = await prisma.capability.findMany({ where: { orgId } });
    await prisma.job.update({ where: { id: jobId }, data: { progressPct: 55 } });

    // Create compliance items in DB
    await prisma.complianceItem.deleteMany({ where: { workspaceId } });
    const createdItems = await Promise.all(
      requirements.map((r) =>
        prisma.complianceItem.create({
          data: {
            requirementText: r.requirement_text,
            requirementCategory: r.requirement_category || "General",
            workspaceId,
            status: "GAP",
            matchScore: 0,
          },
        })
      )
    );
    await prisma.job.update({ where: { id: jobId }, data: { progressPct: 65 } });

    // Run capability matching
    const capForMatch = capabilities.map((c) => ({
      id: c.id, title: c.title, domain: c.domain, summary: c.summary, certification: c.certification,
    }));
    const reqForMatch = createdItems.map((i) => ({
      id: i.id, requirement_text: i.requirementText, requirement_category: i.requirementCategory,
    }));
    const matches = await matchRequirementsToCapabilities(reqForMatch, capForMatch);
    await prisma.job.update({ where: { id: jobId }, data: { progressPct: 85 } });

    // Update items with match results
    await Promise.all(
      matches.map((m) =>
        prisma.complianceItem.update({
          where: { id: m.requirement_id },
          data: {
            capabilityId: m.capability_id || null,
            matchScore: m.match_score,
            status: m.status,
          },
        })
      )
    );

    // Update workspace to analysing
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { status: "analysing" },
    });

    // Mark document COMPLETED
    await prisma.document.updateMany({
      where: { workspaceId, status: "PROCESSING" },
      data: { status: "COMPLETED" },
    });

    await prisma.job.update({ where: { id: jobId }, data: { status: "done", progressPct: 100 } });
  } catch (err) {
    console.error("Extraction job failed:", err);
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "failed", errorMsg: err.message },
    });
  }
}

async function runGenerationJob(jobId, workspaceId) {
  try {
    await prisma.job.update({ where: { id: jobId }, data: { status: "processing", progressPct: 5 } });

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    const items = await prisma.complianceItem.findMany({
      where: { workspaceId },
      include: { capability: true },
    });

    if (!items.length) {
      await prisma.job.update({ where: { id: jobId }, data: { status: "failed", errorMsg: "No compliance items found. Upload an RFP first." } });
      return;
    }

    // Delete existing proposals and regenerate
    await prisma.proposal.deleteMany({ where: { workspaceId } });

    const step = Math.floor(90 / items.length);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const { content, wordCount, qualityBadge } = await generateSection(
          { requirementText: item.requirementText, requirementCategory: item.requirementCategory },
          item.capability ? { title: item.capability.title, domain: item.capability.domain, summary: item.capability.summary, certification: item.capability.certification } : null,
          { name: workspace.name, sector: workspace.sector }
        );

        await prisma.proposal.create({
          data: {
            workspaceId,
            requirementId: item.id,
            sectionTitle: item.requirementCategory || "General",
            aiDraft: content,
            currentContent: content,
            wordCount,
            qualityBadge,
            status: "draft",
          },
        });
      } catch (err) {
        console.error(`Failed to generate section for item ${item.id}:`, err.message);
        await prisma.proposal.create({
          data: {
            workspaceId,
            requirementId: item.id,
            sectionTitle: item.requirementCategory || "General",
            aiDraft: `[Section pending — ${item.requirementText.slice(0, 80)}]`,
            currentContent: "",
            wordCount: 0,
            qualityBadge: "Needs Review",
            status: "draft",
          },
        });
      }

      await prisma.job.update({ where: { id: jobId }, data: { progressPct: 5 + (i + 1) * step } });
    }

    await prisma.job.update({ where: { id: jobId }, data: { status: "done", progressPct: 100 } });
  } catch (err) {
    console.error("Generation job failed:", err);
    await prisma.job.update({ where: { id: jobId }, data: { status: "failed", errorMsg: err.message } });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKSPACES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/workspaces
router.get("/workspaces", requireAuth, async (req, res) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { orgId: req.user.orgId },
      orderBy: { createdAt: "desc" },
    });
    res.json(workspaces.map(formatWorkspace));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /api/workspaces
router.post("/workspaces", requireAuth, async (req, res) => {
  try {
    const { name, sector, deadline } = req.body;
    if (!name) return res.status(422).json({ detail: "name is required" });

    const workspace = await prisma.workspace.create({
      data: {
        name,
        sector: sector || "IT Services",
        deadline: deadline ? new Date(deadline) : null,
        orgId: req.user.orgId,
      },
    });
    res.status(201).json(formatWorkspace(workspace));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/workspaces/:id
router.get("/workspaces/:id", requireAuth, async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: { documents: true },
    });
    if (!ws) return res.status(404).json({ detail: "Not found" });
    res.json({ ...formatWorkspace(ws), documents: ws.documents });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PUT /api/workspaces/:id
router.put("/workspaces/:id", requireAuth, async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!ws) return res.status(404).json({ detail: "Not found" });

    const { name, sector, deadline, status } = req.body;
    const updated = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(sector !== undefined && { sector }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(status !== undefined && { status }),
      },
    });
    res.json(formatWorkspace(updated));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/workspaces/:id
router.delete("/workspaces/:id", requireAuth, async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!ws) return res.status(404).json({ detail: "Not found" });
    await prisma.workspace.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD & DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/workspaces/:id/upload
router.post("/workspaces/:id/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!ws) return res.status(404).json({ detail: "Workspace not found" });
    if (!req.file) return res.status(422).json({ detail: "No file provided" });

    // Create DB document record
    const doc = await prisma.document.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        status: "PROCESSING",
        workspaceId: req.params.id,
        orgId: req.user.orgId,
      },
    });

    // Create a job
    const job = await prisma.job.create({
      data: {
        status: "pending",
        progressPct: 0,
        jobType: "extraction",
        workspaceId: req.params.id,
      },
    });

    // Run extraction asynchronously (fire and forget)
    setImmediate(() =>
      runExtractionJob(job.id, req.params.id, req.file.path, req.file.originalname, req.user.orgId)
    );

    res.json({
      document_id: doc.id,
      job_id: job.id,
      filename: req.file.originalname,
      status: "PROCESSING",
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/workspaces/:id/documents
router.get("/workspaces/:id/documents", requireAuth, async (req, res) => {
  try {
    const docs = await prisma.document.findMany({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs.map((d) => ({
      id: d.id,
      filename: d.originalName,
      status: d.status,
      created_at: d.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// JOBS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/jobs/:id
router.get("/jobs/:id", requireAuth, async (req, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ detail: "Job not found" });
    res.json(formatJob(job));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/workspaces/:id/compliance
router.get("/workspaces/:id/compliance", requireAuth, async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!ws) return res.status(404).json({ detail: "Not found" });

    const items = await prisma.complianceItem.findMany({
      where: { workspaceId: req.params.id },
      include: { capability: true },
      orderBy: { createdAt: "asc" },
    });

    const passCount = items.filter((i) => i.status === "PASS").length;
    const gapCount = items.filter((i) => i.status === "GAP").length;
    const partialCount = items.filter((i) => i.status === "PARTIAL").length;
    const total = items.length;
    const compliancePct = total > 0
      ? Math.round(((passCount + partialCount * 0.5) / total) * 100)
      : 0;

    res.json({
      total,
      pass_count: passCount,
      gap_count: gapCount,
      partial_count: partialCount,
      compliance_pct: compliancePct,
      items: items.map(formatComplianceItem),
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PATCH /api/workspaces/:id/compliance/:itemId
router.patch("/workspaces/:id/compliance/:itemId", requireAuth, async (req, res) => {
  try {
    const item = await prisma.complianceItem.findFirst({
      where: { id: req.params.itemId, workspaceId: req.params.id },
    });
    if (!item) return res.status(404).json({ detail: "Item not found" });

    const { status, notes, capability_id } = req.body;
    const updated = await prisma.complianceItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(capability_id !== undefined && { capabilityId: capability_id }),
      },
      include: { capability: true },
    });
    res.json(formatComplianceItem(updated));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WIN SCORE & GO/NO-GO
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/workspaces/:id/win-score
router.get("/workspaces/:id/win-score", requireAuth, async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!ws) return res.status(404).json({ detail: "Not found" });

    const items = await prisma.complianceItem.findMany({ where: { workspaceId: req.params.id } });
    if (!items.length) return res.status(404).json({ detail: "No requirements analyzed yet" });

    const score = await computeWinScore(
      items.map((i) => ({ requirementText: i.requirementText, requirementCategory: i.requirementCategory, status: i.status, matchScore: i.matchScore })),
      { name: ws.name, sector: ws.sector }
    );

    // Cache win probability on workspace
    await prisma.workspace.update({
      where: { id: ws.id },
      data: { winProbability: Math.round(score.overall * 100) },
    });

    res.json(score);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/workspaces/:id/go-no-go
router.get("/workspaces/:id/go-no-go", requireAuth, async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!ws) return res.status(404).json({ detail: "Not found" });

    const items = await prisma.complianceItem.findMany({ where: { workspaceId: req.params.id } });
    if (!items.length) return res.status(404).json({ detail: "No requirements analyzed yet" });

    const winScore = await computeWinScore(
      items.map((i) => ({ requirementText: i.requirementText, requirementCategory: i.requirementCategory, status: i.status, matchScore: i.matchScore })),
      { name: ws.name, sector: ws.sector }
    );
    const goNoGo = await computeGoNoGo(winScore, { name: ws.name, sector: ws.sector });

    res.json(goNoGo);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPOSALS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/workspaces/:id/proposals
router.get("/workspaces/:id/proposals", requireAuth, async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!ws) return res.status(404).json({ detail: "Not found" });

    const proposals = await prisma.proposal.findMany({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: "asc" },
    });
    res.json(proposals.map(formatProposal));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /api/workspaces/:id/proposals/generate
router.post("/workspaces/:id/proposals/generate", requireAuth, async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!ws) return res.status(404).json({ detail: "Not found" });

    const job = await prisma.job.create({
      data: {
        status: "pending",
        progressPct: 0,
        jobType: "generation",
        workspaceId: req.params.id,
      },
    });

    setImmediate(() => runGenerationJob(job.id, req.params.id));

    res.json({ job_id: job.id, message: "Proposal generation started" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/workspaces/:id/proposals/:sectionId
router.get("/workspaces/:id/proposals/:sectionId", requireAuth, async (req, res) => {
  try {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.sectionId, workspaceId: req.params.id },
    });
    if (!proposal) return res.status(404).json({ detail: "Not found" });
    res.json(formatProposal(proposal));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PUT /api/workspaces/:id/proposals/:sectionId
router.put("/workspaces/:id/proposals/:sectionId", requireAuth, async (req, res) => {
  try {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.sectionId, workspaceId: req.params.id },
    });
    if (!proposal) return res.status(404).json({ detail: "Not found" });

    const { current_content, section_title } = req.body;
    const updated = await prisma.proposal.update({
      where: { id: req.params.sectionId },
      data: {
        ...(current_content !== undefined && {
          currentContent: current_content,
          wordCount: current_content.trim().split(/\s+/).length,
        }),
        ...(section_title !== undefined && { sectionTitle: section_title }),
      },
    });
    res.json(formatProposal(updated));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PATCH /api/workspaces/:id/proposals/:sectionId/status
router.patch("/workspaces/:id/proposals/:sectionId/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["draft", "pending", "approved"].includes(status)) {
      return res.status(422).json({ detail: "status must be draft | pending | approved" });
    }
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.sectionId, workspaceId: req.params.id },
    });
    if (!proposal) return res.status(404).json({ detail: "Not found" });

    const updated = await prisma.proposal.update({
      where: { id: req.params.sectionId },
      data: { status },
    });
    res.json(formatProposal(updated));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /api/workspaces/:id/proposals/:sectionId/regenerate  (SSE stream)
router.post("/workspaces/:id/proposals/:sectionId/regenerate", requireAuth, async (req, res) => {
  // Also support GET for EventSource (token in query)
  const _doStream = async () => {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.sectionId, workspaceId: req.params.id },
    });
    if (!proposal) { res.status(404).json({ detail: "Not found" }); return; }

    const ws = await prisma.workspace.findUnique({ where: { id: req.params.id } });
    const compItem = proposal.requirementId
      ? await prisma.complianceItem.findUnique({ where: { id: proposal.requirementId } })
      : null;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let accumulated = "";

    const onToken = (token) => {
      accumulated += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    };

    const onDone = async () => {
      // Persist the new content
      try {
        await prisma.proposal.update({
          where: { id: req.params.sectionId },
          data: {
            currentContent: accumulated,
            wordCount: accumulated.trim().split(/\s+/).length,
            status: "draft",
          },
        });
      } catch {}
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    };

    await regenerateSectionStream(
      {
        requirementText: compItem?.requirementText || proposal.sectionTitle,
        requirementCategory: compItem?.requirementCategory || proposal.sectionTitle,
        currentContent: proposal.currentContent || proposal.aiDraft,
      },
      { name: ws?.name || "Workspace", sector: ws?.sector || "IT Services" },
      onToken,
      onDone
    );
  };

  _doStream().catch((err) => {
    if (!res.headersSent) res.status(500).json({ detail: err.message });
    else res.end();
  });
});

// GET /api/workspaces/:id/proposals/:sectionId/regenerate  (EventSource SSE)
router.get("/workspaces/:id/proposals/:sectionId/regenerate", requireAuth, async (req, res) => {
  const proposal = await prisma.proposal.findFirst({
    where: { id: req.params.sectionId, workspaceId: req.params.id },
  }).catch(() => null);
  if (!proposal) { res.status(404).json({ detail: "Not found" }); return; }

  const ws = await prisma.workspace.findUnique({ where: { id: req.params.id } }).catch(() => null);
  const compItem = proposal.requirementId
    ? await prisma.complianceItem.findUnique({ where: { id: proposal.requirementId } }).catch(() => null)
    : null;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let accumulated = "";

  await regenerateSectionStream(
    {
      requirementText: compItem?.requirementText || proposal.sectionTitle,
      requirementCategory: compItem?.requirementCategory || proposal.sectionTitle,
      currentContent: proposal.currentContent || proposal.aiDraft,
    },
    { name: ws?.name || "Workspace", sector: ws?.sector || "IT Services" },
    (token) => {
      accumulated += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    },
    async () => {
      try {
        await prisma.proposal.update({
          where: { id: req.params.sectionId },
          data: { currentContent: accumulated, wordCount: accumulated.trim().split(/\s+/).length, status: "draft" },
        });
      } catch {}
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  ).catch((err) => {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/workspaces/:id/export
router.post("/workspaces/:id/export", requireAuth, async (req, res) => {
  try {
    const ws = await prisma.workspace.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!ws) return res.status(404).json({ detail: "Not found" });

    const proposals = await prisma.proposal.findMany({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: "asc" },
    });

    if (!proposals.length) {
      return res.status(422).json({ detail: "No proposal sections to export. Generate proposals first." });
    }

    // Build a plain-text DOCX-like export (actual DOCX would require docx library)
    // For now return clean text as application/octet-stream with .txt extension
    // Replace with proper docx library if needed
    const content = [
      `PROPOSAL: ${ws.name}`,
      `Sector: ${ws.sector}`,
      `Exported: ${new Date().toLocaleDateString()}`,
      `${"=".repeat(60)}`,
      "",
      ...proposals.map((p, i) => [
        `SECTION ${i + 1}: ${p.sectionTitle.toUpperCase()}`,
        `${"-".repeat(40)}`,
        p.currentContent || p.aiDraft || "(No content)",
        "",
      ].join("\n")),
    ].join("\n");

    const safeName = ws.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="proposal_${safeName}.docx"`);
    res.send(Buffer.from(content, "utf-8"));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CAPABILITIES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/capabilities
router.get("/capabilities", requireAuth, async (req, res) => {
  try {
    const { domain, certification, year, search, limit = 200, offset = 0 } = req.query;

    const where = { orgId: req.user.orgId };
    if (domain) where.domain = domain;
    if (certification && certification !== "All") where.certification = certification;
    if (year) where.year = parseInt(year);
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
        { domain: { contains: search } },
        { clientType: { contains: search } },
      ];
    }

    const caps = await prisma.capability.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    });
    res.json(caps.map(formatCapability));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /api/capabilities
router.post("/capabilities", requireAuth, async (req, res) => {
  try {
    const { title, domain, summary, client_type, contract_value, year, certification, tags } = req.body;
    if (!title) return res.status(422).json({ detail: "title is required" });

    const cap = await prisma.capability.create({
      data: {
        title,
        domain: domain || "General",
        summary: summary || "",
        clientType: client_type || "",
        contractValue: contract_value || "",
        year: year ? parseInt(year) : null,
        certification: certification || "None",
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        orgId: req.user.orgId,
      },
    });
    res.status(201).json(formatCapability(cap));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PUT /api/capabilities/:id
router.put("/capabilities/:id", requireAuth, async (req, res) => {
  try {
    const cap = await prisma.capability.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!cap) return res.status(404).json({ detail: "Not found" });

    const { title, domain, summary, client_type, contract_value, year, certification, tags } = req.body;
    const updated = await prisma.capability.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(domain !== undefined && { domain }),
        ...(summary !== undefined && { summary }),
        ...(client_type !== undefined && { clientType: client_type }),
        ...(contract_value !== undefined && { contractValue: contract_value }),
        ...(year !== undefined && { year: year ? parseInt(year) : null }),
        ...(certification !== undefined && { certification }),
        ...(tags !== undefined && { tags: JSON.stringify(Array.isArray(tags) ? tags : []) }),
      },
    });
    res.json(formatCapability(updated));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/capabilities/:id
router.delete("/capabilities/:id", requireAuth, async (req, res) => {
  try {
    const cap = await prisma.capability.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!cap) return res.status(404).json({ detail: "Not found" });
    await prisma.capability.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /api/capabilities/import  (XLSX batch import)
router.post("/capabilities/import", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(422).json({ detail: "No file provided" });

    // Basic CSV/XLSX parsing — read lines as capability records
    // For full XLSX support install the 'xlsx' package; here we handle CSV
    const content = fs.readFileSync(req.file.path, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    if (!lines.length) return res.json({ created: 0, failed: 0, errors: ["Empty file"] });

    // Parse header line
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, "_"));
    const rows = lines.slice(1);

    let created = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].split(",");
      if (cols.every((c) => !c.trim())) continue;

      const record = {};
      headers.forEach((h, idx) => { record[h] = (cols[idx] || "").trim(); });

      const title = record.title || record.capability || record.name;
      if (!title) { failed++; errors.push(`Row ${i + 2}: missing title`); continue; }

      try {
        await prisma.capability.create({
          data: {
            title,
            domain: record.domain || "General",
            summary: record.summary || record.description || "",
            clientType: record.client_type || record.client || "",
            contractValue: record.contract_value || record.value || "",
            year: record.year ? parseInt(record.year) : null,
            certification: record.certification || "None",
            tags: JSON.stringify([]),
            orgId: req.user.orgId,
          },
        });
        created++;
      } catch (err) {
        failed++;
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    // Clean up temp file
    try { fs.unlinkSync(req.file.path); } catch {}

    res.json({ created, failed, errors });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/analytics/bid-history
router.get("/analytics/bid-history", requireAuth, async (req, res) => {
  try {
    const { sector, outcome, limit = 120 } = req.query;
    const where = { orgId: req.user.orgId };
    if (sector) where.sector = sector;
    if (outcome) where.outcome = outcome;

    const history = await prisma.bidHistory.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      take: parseInt(limit),
    });

    // If no history, derive from workspaces
    if (!history.length) {
      const workspaces = await prisma.workspace.findMany({
        where: { orgId: req.user.orgId, status: { in: ["submitted", "in_review"] } },
      });
      return res.json(workspaces.map((w) => ({
        id: w.id,
        bid_name: w.name,
        sector: w.sector,
        score: w.winProbability || 0,
        outcome: w.status === "submitted" ? "win" : "loss",
        compliance_pct: 0,
        submitted_at: w.updatedAt.toISOString(),
      })));
    }

    res.json(history.map((h) => ({
      id: h.id,
      bid_name: h.bidName,
      sector: h.sector,
      score: h.score,
      outcome: h.outcome,
      compliance_pct: h.compliancePct,
      submitted_at: h.submittedAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/analytics/win-rate-by-sector
router.get("/analytics/win-rate-by-sector", requireAuth, async (req, res) => {
  try {
    const history = await prisma.bidHistory.findMany({ where: { orgId: req.user.orgId } });

    if (!history.length) {
      // Derive from workspaces
      const workspaces = await prisma.workspace.findMany({ where: { orgId: req.user.orgId } });
      const sectorMap = {};
      for (const w of workspaces) {
        const s = w.sector || "Other";
        if (!sectorMap[s]) sectorMap[s] = { wins: 0, total: 0 };
        sectorMap[s].total++;
        if (w.status === "submitted") sectorMap[s].wins++;
      }
      const result = Object.entries(sectorMap)
        .map(([sector, d]) => ({
          sector,
          win_rate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0,
          wins: d.wins,
          total_bids: d.total,
        }))
        .sort((a, b) => b.win_rate - a.win_rate);
      return res.json(result);
    }

    const sectorMap = {};
    for (const h of history) {
      const s = h.sector;
      if (!sectorMap[s]) sectorMap[s] = { wins: 0, total: 0 };
      sectorMap[s].total++;
      if (h.outcome === "win") sectorMap[s].wins++;
    }
    const result = Object.entries(sectorMap)
      .map(([sector, d]) => ({
        sector,
        win_rate: Math.round((d.wins / d.total) * 100),
        wins: d.wins,
        total_bids: d.total,
      }))
      .sort((a, b) => b.win_rate - a.win_rate);
    res.json(result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/analytics/score-vs-outcome
router.get("/analytics/score-vs-outcome", requireAuth, async (req, res) => {
  try {
    const history = await prisma.bidHistory.findMany({ where: { orgId: req.user.orgId } });

    if (!history.length) {
      const workspaces = await prisma.workspace.findMany({
        where: { orgId: req.user.orgId, winProbability: { not: null } },
      });
      return res.json(workspaces.map((w) => ({
        score: w.winProbability,
        outcome: w.status === "submitted" ? "win" : "loss",
      })));
    }

    res.json(history.map((h) => ({ score: h.score, outcome: h.outcome })));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/analytics/compliance-vs-win-rate
router.get("/analytics/compliance-vs-win-rate", requireAuth, async (req, res) => {
  try {
    const history = await prisma.bidHistory.findMany({ where: { orgId: req.user.orgId } });
    res.json(history.map((h) => ({
      compliance_pct: h.compliancePct,
      outcome: h.outcome,
      sector: h.sector,
    })));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
