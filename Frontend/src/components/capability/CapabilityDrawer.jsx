import React, { useEffect, useState } from 'react'
import Drawer from '../ui/Drawer'
import { toastError } from '../ui/ToastProvider'

/**
 * CapabilityDrawer — form for creating or editing a capability.
 *
 * All save/update logic is delegated to the `onSave` callback so the
 * parent (CapabilityLibrary) can call the real API mutations.
 *
 * Field mapping (backend CapabilityCreate/CapabilityUpdate):
 *   title, description, domain, certification, year, client_type
 */
export default function CapabilityDrawer({ isOpen, onClose, capabilityToEdit, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    domain: '',
    certification: 'None',
    year: new Date().getFullYear(),
    client_type: '',
  })

  useEffect(() => {
    if (capabilityToEdit) {
      setFormData({
        title: capabilityToEdit.title || '',
        description: capabilityToEdit.description || capabilityToEdit.summary || '',
        domain: capabilityToEdit.domain || '',
        certification: capabilityToEdit.certification || 'None',
        year: capabilityToEdit.year || new Date().getFullYear(),
        client_type: capabilityToEdit.client_type || capabilityToEdit.clientType || '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        domain: '',
        certification: 'None',
        year: new Date().getFullYear(),
        client_type: '',
      })
    }
  }, [capabilityToEdit, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) {
      toastError('Title and Description are required')
      return
    }
    onSave?.({
      title: formData.title.trim(),
      description: formData.description.trim(),
      domain: formData.domain.trim() || null,
      certification: formData.certification !== 'None' ? formData.certification : null,
      year: formData.year ? Number(formData.year) : null,
      client_type: formData.client_type.trim() || null,
    })
  }

  const certs = ['None', 'FedRAMP High', 'ISO 27001', 'SOC 2 Type II']

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={capabilityToEdit ? 'Edit Capability Record' : 'Add Capability Record'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Title</label>
          <input
            type="text"
            placeholder="e.g. FedRAMP SSO & Identity Gateway"
            value={formData.title}
            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Domain Area</label>
          <input
            type="text"
            placeholder="e.g. Identity & Access Management"
            value={formData.domain}
            onChange={(e) => setFormData((p) => ({ ...p, domain: e.target.value }))}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Certification</label>
            <select
              value={formData.certification}
              onChange={(e) => setFormData((p) => ({ ...p, certification: e.target.value }))}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition cursor-pointer"
            >
              {certs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Year Completed</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData((p) => ({ ...p, year: parseInt(e.target.value) || '' }))}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Client / Industry Type</label>
          <input
            type="text"
            placeholder="e.g. Federal Government"
            value={formData.client_type}
            onChange={(e) => setFormData((p) => ({ ...p, client_type: e.target.value }))}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">
            Description / Project Summary
          </label>
          <textarea
            placeholder="Describe the system architecture, scope, achievements, and technologies used."
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
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
