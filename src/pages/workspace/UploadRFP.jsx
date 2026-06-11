import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import DropZone from '../../components/upload/DropZone'
import ExtractionProgress from '../../components/upload/ExtractionProgress'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { toastSuccess } from '../../components/ui/ToastProvider'

export default function UploadRFP() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { populateRequirementsAfterUpload } = useWorkspaceStore()
  
  const [fileSelected, setFileSelected] = useState(null)
  const [isExtracting, setIsExtracting] = useState(false)

  const handleFileSelect = (file) => {
    setFileSelected(file)
    setIsExtracting(true)
  }

  const handleComplete = () => {
    populateRequirementsAfterUpload(workspaceId)
    toastSuccess('RFP document parsed successfully!')
    navigate(`/workspace/${workspaceId}/overview`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6 fade-in select-none">
      {!isExtracting ? (
        <div className="space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-[var(--text)] tracking-tight">Upload RFP Document</h2>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto leading-relaxed font-medium font-sans">
              Upload the original client RFP document. The engine will extract compliance items, flag technology gaps, and calibrate scores.
            </p>
          </div>
          <DropZone onFileSelect={handleFileSelect} />
        </div>
      ) : (
        <ExtractionProgress onComplete={handleComplete} />
      )}
    </div>
  )
}