import React, { useEffect, useState } from 'react'
import Drawer from '../ui/Drawer'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { toastSuccess, toastError } from '../ui/ToastProvider'

export default function CapabilityDrawer({ isOpen, onClose, capabilityToEdit }) {
  const { addCapability, updateCapability } = useWorkspaceStore()
  
  const [formData, setFormData] = useState({
    domain: '',
    certification: 'None',
    year: new Date().getFullYear(),
    contractValue: '',
    duration: '',
    clientType: '',
    summary: ''
  })

  useEffect(() => {
    if (capabilityToEdit) {
      setFormData({
        id: capabilityToEdit.id,
        domain: capabilityToEdit.domain || '',
        certification: capabilityToEdit.certification || 'None',
        year: capabilityToEdit.year || new Date().getFullYear(),
        contractValue: capabilityToEdit.contractValue || '',
        duration: capabilityToEdit.duration || '',
        clientType: capabilityToEdit.clientType || '',
        summary: capabilityToEdit.summary || ''
      })
    } else {
      setFormData({
        domain: '',
        certification: 'None',
        year: new Date().getFullYear(),
        contractValue: '',
        duration: '',
        clientType: '',
        summary: ''
      })
    }
  }, [capabilityToEdit, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.domain.trim() || !formData.summary.trim()) {
      toastError('Domain and Project Summary are required')
      return
    }

    if (capabilityToEdit) {
      updateCapability(formData)
      toastSuccess('Capability updated successfully')
    } else {
      addCapability(formData)
      toastSuccess('Capability added to library')
    }
    onClose()
  }

  const certs = ['None', 'FedRAMP High', 'ISO 27001', 'SOC 2 Type II']

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={capabilityToEdit ? 'Edit Capability Record' : 'Add Capability Record'}>
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Domain Area</label>
          <input
            type="text"
            placeholder="e.g. Identity & Access Management"
            value={formData.domain}
            onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Certification</label>
            <select
              value={formData.certification}
              onChange={(e) => setFormData(prev => ({ ...prev, certification: e.target.value }))}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition cursor-pointer"
            >
              {certs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Year Completed</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || '' }))}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Contract Value ($)</label>
            <input
              type="number"
              placeholder="e.g. 800000"
              value={formData.contractValue}
              onChange={(e) => setFormData(prev => ({ ...prev, contractValue: parseInt(e.target.value) || '' }))}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Duration</label>
            <input
              type="text"
              placeholder="e.g. 12 Months"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Client / Industry Type</label>
          <input
            type="text"
            placeholder="e.g. Federal Government"
            value={formData.clientType}
            onChange={(e) => setFormData(prev => ({ ...prev, clientType: e.target.value }))}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Project Summary & Credentials</label>
          <textarea
            placeholder="Describe the system architecture, size, scope, achievements, and technology stacks used."
            value={formData.summary}
            onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
            rows={5}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition resize-none leading-relaxed"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full mt-6 rounded-xl bg-[var(--accent)] px-4 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
        >
          {capabilityToEdit ? 'Save Changes' : 'Add to Capability Library'}
        </button>
      </form>
    </Drawer>
  )
}