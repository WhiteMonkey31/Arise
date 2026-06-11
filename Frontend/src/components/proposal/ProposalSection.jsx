import React, { useState, useEffect } from 'react'
import WordCountBar from './WordCountBar'
import RegenerateButton from './RegenerateButton'
import VersionHistory from './VersionHistory'
import AIStreamText from '../ui/AIStreamText'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { toastSuccess } from '../ui/ToastProvider'

export default function ProposalSection({ workspaceId, section }) {
  const { updateProposalText, approveProposalSection, rejectProposalSection } = useWorkspaceStore()
  
  const [text, setText] = useState(section.text)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)

  // Sync state if text changes from store restores
  useEffect(() => {
    setText(section.text)
  }, [section.text])

  const handleTextChange = (e) => {
    setText(e.target.value)
    updateProposalText(workspaceId, section.id, e.target.value)
  }

  const handleApprove = () => {
    approveProposalSection(workspaceId, section.id)
    toastSuccess('Section approved!')
  }

  const handleReject = () => {
    rejectProposalSection(workspaceId, section.id)
    toastSuccess('Section reset to pending review.')
  }

  const handleRegenerateSubmit = (styleInstruction) => {
    setIsStreaming(true)
    
    let regeneratedMockText = ''
    const inst = styleInstruction.toLowerCase()
    
    if (inst.includes('concise') || inst.includes('short')) {
      regeneratedMockText = `Our identity platform uses a certified FedRAMP SSO gateway with direct PIV/CAC card certificate parsing. Handshakes query federal OCSP servers, ensuring instant credentials verification. This maps USDA secure configurations.`
    } else if (inst.includes('technical') || inst.includes('detail')) {
      regeneratedMockText = `The proposed architecture incorporates a certified FedRAMP High Single Sign-On (SSO) gateway. Identity assertions utilize PKI client certificates extracted via X.509 handshake configurations, resolving directly against authority OSCP endpoints. Session bounds leverage cryptographically signed JSON Web Tokens (JWT) using RSASSA-PKCS1-v1_5 algorithms.`
    } else {
      regeneratedMockText = `Our core architecture deploys a FedRAMP certified identity provider. It supports secure, hardware-token PIV/CAC authentication for active agency profiles. Access validation integrates with public OCSP cert registries. This configuration is based on USDA-proven security standards.`
    }

    setStreamingText(regeneratedMockText)

    // Simulate typing: ~25ms per token
    const words = regeneratedMockText.split(' ').length
    const duration = words * 50

    setTimeout(() => {
      setIsStreaming(false)
      setText(regeneratedMockText)
      updateProposalText(workspaceId, section.id, regeneratedMockText)
      toastSuccess('AI drafting complete!')
    }, duration + 500)
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-sm space-y-4 transition-all hover:shadow-md">
      {/* Header Info */}
      <div className="flex justify-between items-start gap-4 select-none">
        <div className="space-y-1">
          <span className="font-mono text-[9px] font-bold text-[var(--accent)] bg-[var(--accent-bg)] border border-[var(--border)] px-2.5 py-0.5 rounded-lg">
            Requirement {section.requirementId}
          </span>
          <h4 className="font-serif font-bold text-sm sm:text-base text-[var(--text)] mt-1">{section.heading}</h4>
        </div>

        {/* Action Status Badge */}
        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border tracking-wider uppercase ${
          section.approved === 'Approved'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200'
            : section.approved === 'Pending'
            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200'
            : 'bg-stone-50 dark:bg-stone-900/10 text-[var(--muted)] border-[var(--border)]'
        }`}>
          {section.approved}
        </span>
      </div>

      {/* Editor Body */}
      <div className="relative border border-[var(--border)] rounded-2xl overflow-hidden focus-within:border-[var(--accent)] transition-all">
        {/* Editor Toolbar Mockup */}
        <div className="bg-stone-50 dark:bg-stone-900/40 px-3 py-1.5 border-b border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-semibold select-none">
          <div className="flex items-center gap-3">
            <span>AI Draft Editor</span>
            <span>•</span>
            <button 
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="hover:text-[var(--text)] transition underline cursor-pointer font-bold"
            >
              History
            </button>
          </div>
          <span className="font-mono text-[9px]">{wordCount} words</span>
        </div>

        {/* Edit Panel */}
        <div className="p-4 bg-[var(--surface)]">
          {isStreaming ? (
            <AIStreamText text={streamingText} isStreaming={true} speed={25} />
          ) : (
            <textarea
              value={text}
              onChange={handleTextChange}
              rows={4}
              className="w-full bg-transparent border-0 p-0 text-xs sm:text-[13.5px] leading-relaxed text-[var(--text)] focus:ring-0 focus:outline-hidden resize-none font-serif leading-relaxed select-text"
            />
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <WordCountBar current={wordCount} target={section.targetWordCount} />

        <div className="flex items-center gap-2 select-none">
          <RegenerateButton onRegenerate={handleRegenerateSubmit} isLoading={isStreaming} />
          
          {section.approved === 'Approved' ? (
            <button
              type="button"
              onClick={handleReject}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-bold text-[var(--text)] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 transition cursor-pointer"
            >
              Reject Draft
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApprove}
              className="rounded-xl bg-[var(--accent)] px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
            >
              Approve Draft
            </button>
          )}
        </div>
      </div>

      <VersionHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        section={section}
        onRestore={(restoredText) => {
          setText(restoredText)
          updateProposalText(workspaceId, section.id, restoredText)
        }}
      />
    </div>
  )
}