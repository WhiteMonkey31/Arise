import React, { useState, useEffect, useRef } from 'react'
import WordCountBar from './WordCountBar'
import RegenerateButton from './RegenerateButton'
import VersionHistory from './VersionHistory'
import AIStreamText from '../ui/AIStreamText'
import { useSaveProposal, useApproveProposal, useRejectProposal } from '../../hooks/useProposal'
import { openRegenerateStream } from '../../services/proposalService'
import { toastSuccess, toastError } from '../ui/ToastProvider'

/**
 * ProposalSection — renders one proposal section card.
 *
 * `section` prop shape (normalised in ProposalPage):
 *   { id, requirementId, heading, text, wordCount, approved, qualityBadge }
 */
export default function ProposalSection({ workspaceId, section }) {
  const saveMutation = useSaveProposal(workspaceId)
  const approveMutation = useApproveProposal(workspaceId)
  const rejectMutation = useRejectProposal(workspaceId)

  const [text, setText] = useState(section.text || '')
  const [isDirty, setIsDirty] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const esRef = useRef(null)

  // Sync text when parent data refreshes (e.g. after regenerate completes)
  useEffect(() => {
    if (!isDirty) setText(section.text || '')
  }, [section.text]) // eslint-disable-line

  const handleTextChange = (e) => {
    setText(e.target.value)
    setIsDirty(true)
  }

  const handleSave = () => {
    saveMutation.mutate(
      {
        sectionId: section.id,
        payload: { current_content: text, section_title: section.heading },
      },
      {
        onSuccess: () => { toastSuccess('Section saved!'); setIsDirty(false) },
        onError: (err) => toastError(err.response?.data?.detail || 'Save failed'),
      }
    )
  }

  const handleApprove = () => {
    approveMutation.mutate(section.id, {
      onSuccess: () => toastSuccess('Section approved!'),
    })
  }

  const handleReject = () => {
    rejectMutation.mutate(section.id, {
      onSuccess: () => toastSuccess('Section reset to pending review.'),
    })
  }

  // AI Regenerate — opens SSE stream from backend
  const handleRegenerateSubmit = (_styleInstruction) => {
    if (esRef.current) esRef.current.close()

    setIsStreaming(true)
    setStreamingText('')
    let accumulated = ''

    const es = openRegenerateStream(workspaceId, section.id)
    esRef.current = es

    es.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data)
        if (parsed.event === 'chunk') {
          accumulated += parsed.text
          setStreamingText(accumulated)
        } else if (parsed.event === 'done') {
          es.close()
          esRef.current = null
          setText(accumulated)
          setIsDirty(true)
          setIsStreaming(false)
          toastSuccess('AI drafting complete!')
        } else if (parsed.event === 'error') {
          es.close()
          esRef.current = null
          setIsStreaming(false)
          toastError(parsed.message || 'Regeneration failed')
        }
      } catch {
        // non-JSON chunk — ignore
      }
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      setIsStreaming(false)
      toastError('Connection to AI stream lost')
    }
  }

  // Clean up on unmount
  useEffect(() => () => esRef.current?.close(), [])

  const wordCount = text.split(/\s+/).filter(Boolean).length

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-sm space-y-4 transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 select-none">
        <div className="space-y-1">
          <span className="font-mono text-[9px] font-bold text-[var(--accent)] bg-[var(--accent-bg)] border border-[var(--border)] px-2.5 py-0.5 rounded-lg">
            Req {String(section.requirementId).slice(0, 8)}…
          </span>
          <h4 className="font-serif font-bold text-sm sm:text-base text-[var(--text)] mt-1">
            {section.heading}
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {section.qualityBadge && (
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold border bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 border-indigo-200 tracking-wider uppercase">
              {section.qualityBadge}
            </span>
          )}
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
      </div>

      {/* Editor */}
      <div className="relative border border-[var(--border)] rounded-2xl overflow-hidden focus-within:border-[var(--accent)] transition-all">
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
          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="text-[9px] font-bold text-[var(--accent)] hover:underline disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            )}
            <span className="font-mono text-[9px]">{wordCount} words</span>
          </div>
        </div>

        <div className="p-4 bg-[var(--surface)]">
          {isStreaming ? (
            <AIStreamText text={streamingText} isStreaming={true} speed={25} />
          ) : (
            <textarea
              value={text}
              onChange={handleTextChange}
              rows={4}
              className="w-full bg-transparent border-0 p-0 text-xs sm:text-[13.5px] leading-relaxed text-[var(--text)] focus:ring-0 focus:outline-hidden resize-none font-serif select-text"
            />
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <WordCountBar current={wordCount} target={150} />

        <div className="flex items-center gap-2 select-none">
          <RegenerateButton onRegenerate={handleRegenerateSubmit} isLoading={isStreaming} />

          {section.approved === 'Approved' ? (
            <button
              type="button"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-bold text-[var(--text)] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 transition cursor-pointer disabled:opacity-50"
            >
              Reject Draft
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="rounded-xl bg-[var(--accent)] px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer disabled:opacity-50"
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
          setIsDirty(true)
        }}
      />
    </div>
  )
}
