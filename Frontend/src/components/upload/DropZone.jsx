import React, { useState } from 'react'
import { toastError } from '../ui/ToastProvider'

export default function DropZone({ onFileSelect }) {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const validate = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') { toastError('Only PDF and DOCX files are supported'); return }
    if (file.size > 50 * 1024 * 1024) { toastError('File size exceeds 50 MB limit'); return }
    onFileSelect(file)
  }

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files?.[0]) validate(e.dataTransfer.files[0])
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center text-center p-10 md:p-14 border-2 border-dashed rounded-3xl transition-all duration-200 bg-(--surface) select-none cursor-pointer group ${
        isDragActive
          ? 'border-(--accent) bg-(--accent-bg) scale-[1.01]'
          : 'border-(--border) hover:border-(--accent) hover:bg-(--accent-bg)/40'
      }`}
    >
      {/* Upload icon */}
      <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center mb-5 transition-all duration-300 ${
        isDragActive
          ? 'bg-(--accent) border-(--accent) text-white scale-110'
          : 'bg-(--accent-bg) border-(--border) text-(--accent) group-hover:scale-105'
      }`}>
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>
      </div>

      <h3 className="font-serif font-bold text-sm sm:text-base text-(--text)">
        {isDragActive ? 'Drop your file here' : 'Upload RFP Document'}
      </h3>
      <p className="text-xs text-(--muted) mt-1.5 max-w-xs leading-relaxed font-medium font-sans">
        Drag and drop your PDF or DOCX here, or click to browse.
        <span className="block mt-1 text-[10px]">Max file size: 50 MB</span>
      </p>

      <div className="flex items-center gap-2 mt-4">
        <span className="px-2.5 py-0.5 rounded-lg bg-(--accent-bg) border border-(--border) text-[10px] font-bold text-(--accent)">PDF</span>
        <span className="px-2.5 py-0.5 rounded-lg bg-(--accent-bg) border border-(--border) text-[10px] font-bold text-(--accent)">DOCX</span>
      </div>

      <input
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => e.target.files?.[0] && validate(e.target.files[0])}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  )
}
