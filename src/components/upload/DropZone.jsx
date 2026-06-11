import React, { useState } from 'react'
import { toastError } from '../ui/ToastProvider'

export default function DropZone({ onFileSelect }) {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const validateAndSelectFile = (file) => {
    if (!file) return
    
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      toastError('Only PDF and DOCX files are supported')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toastError('File size exceeds 50 MB limit')
      return
    }

    onFileSelect(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0])
    }
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center text-center p-10 md:p-14 border border-dashed rounded-3xl transition-all duration-200 bg-[var(--surface)] select-none ${
        isDragActive 
          ? 'border-[var(--accent)] bg-[var(--accent-bg)]' 
          : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]/30'
      }`}
    >
      <div className="h-12 w-12 rounded-2xl bg-[var(--accent-bg)] border border-[var(--border)] flex items-center justify-center mb-4 text-[var(--accent)]">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>
      </div>

      <h3 className="font-serif font-bold text-sm sm:text-base text-[var(--text)]">Upload your RFP document</h3>
      <p className="text-xs text-[var(--muted)] mt-1.5 max-w-xs leading-relaxed font-medium font-sans">
        Drag and drop your PDF or DOCX file here, or click to browse. Max size 50 MB.
      </p>

      <input
        type="file"
        id="rfp-file-input"
        accept=".pdf,.docx"
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  )
}