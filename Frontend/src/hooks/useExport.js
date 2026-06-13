/**
 * useExport — wraps exportService with loading state and toast feedback.
 *
 * const { exportDoc, isExporting } = useExport(workspaceId)
 * exportDoc() → triggers DOCX download
 */

import { useState } from 'react'
import { exportProposal } from '../services/exportService'
import { toastSuccess, toastError } from '../components/ui/ToastProvider'

export function useExport(workspaceId) {
  const [isExporting, setIsExporting] = useState(false)

  async function exportDoc() {
    setIsExporting(true)
    try {
      await exportProposal(workspaceId)
      toastSuccess('DOCX document downloaded successfully!')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Export failed'
      toastError(msg)
    } finally {
      setIsExporting(false)
    }
  }

  return { exportDoc, isExporting }
}
