import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import Modal from '../ui/Modal'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { toastSuccess, toastError } from '../ui/ToastProvider'

export default function CreateWorkspaceModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { createWorkspace } = useWorkspaceStore()
  
  // Calculate a default date (14 days from now)
  const getDefaultDate = () => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    name: '',
    sector: 'IT Services',
    budget: '',
    deadline: getDefaultDate()
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toastError('RFP Name is required')
      return
    }

    createWorkspace(formData)
    onClose()
    
    // Wait briefly for store state transition
    setTimeout(() => {
      const activeId = useWorkspaceStore.getState().activeWorkspaceId
      toastSuccess('Workspace created successfully')
      navigate(`/workspace/${activeId}/upload`)
    }, 50)
  }

  const footerActions = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--text) hover:bg-(--accent-bg) cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        className="rounded-xl bg-(--accent) px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 cursor-pointer"
      >
        Create Workspace
      </button>
    </>
  )

  const sectors = ['IT Services', 'Healthcare', 'Logistics', 'Construction', 'Financial Services', 'Other']

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Proposal Workspace" footerActions={footerActions}>
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">RFP / Opportunity Name</label>
          <input
            type="text"
            placeholder="e.g. US Federal Cloud Infrastructure Upgrade"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-xs text-(--text) focus:border-(--accent) focus:outline-hidden transition"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">Sector</label>
            <select
              value={formData.sector}
              onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
              className="rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-xs text-(--text) focus:border-(--accent) focus:outline-hidden transition cursor-pointer"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">Estimated Budget</label>
            <input
              type="text"
              placeholder="e.g. $1,500,000"
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
              className="rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-xs text-(--text) focus:border-(--accent) focus:outline-hidden transition"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">Submission Deadline</label>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
            className="rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-xs text-(--text) focus:border-(--accent) focus:outline-hidden transition cursor-pointer"
          />
        </div>
      </form>
    </Modal>
  )
}