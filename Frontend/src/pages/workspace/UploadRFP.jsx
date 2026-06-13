import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import DropZone from '../../components/upload/DropZone'
import ExtractionProgress from '../../components/upload/ExtractionProgress'
import { uploadDocument } from '../../services/uploadService'
import { useJobPoller } from '../../hooks/useJobPoller'
import { toastSuccess, toastError } from '../../components/ui/ToastProvider'

export default function UploadRFP() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()

  const [jobId, setJobId] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const { status, progress, isDone, error: jobError } = useJobPoller(jobId)

  // Once job is done, navigate to overview
  React.useEffect(() => {
    if (isDone && status === 'done') {
      toastSuccess('RFP document parsed successfully!')
      navigate(`/workspace/${workspaceId}/overview`)
    }
    if (isDone && status === 'failed') {
      toastError(jobError || 'RFP extraction failed')
    }
  }, [isDone, status]) // eslint-disable-line

  const handleFileSelect = async (file) => {
    setIsUploading(true)
    try {
      const result = await uploadDocument(workspaceId, file, setUploadProgress)
      setJobId(result.job_id)
    } catch (err) {
      toastError(err.response?.data?.detail || 'Upload failed')
      setIsUploading(false)
    }
  }

  // Derive combined progress: upload phase (0-50%) + extraction phase (50-100%)
  const combinedProgress = jobId
    ? 50 + Math.round((progress / 100) * 50)
    : Math.round(uploadProgress / 2)

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6 fade-in select-none">
      {!isUploading && !jobId ? (
        <div className="space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-(--text) tracking-tight">Upload RFP Document</h2>
            <p className="text-xs text-(--muted) max-w-sm mx-auto leading-relaxed font-medium font-sans">
              Upload the original client RFP document. The engine will extract compliance items, flag technology gaps, and calibrate scores.
            </p>
          </div>
          <DropZone onFileSelect={handleFileSelect} />
        </div>
      ) : (
        <ExtractionProgress progress={combinedProgress} status={status} onComplete={() => {}} />
      )}
    </div>
  )
}
