import React, { useState } from 'react'
import { useWorkspaceStore } from '../store/workspaceStore'
import CapabilityTable from '../components/capability/CapabilityTable'
import CapabilityDrawer from '../components/capability/CapabilityDrawer'

export default function CapabilityLibrary() {
  const { capabilities } = useWorkspaceStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [certFilter, setCertFilter] = useState('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCap, setSelectedCap] = useState(null)

  const handleEdit = (cap) => {
    setSelectedCap(cap)
    setDrawerOpen(true)
  }

  const handleCreate = () => {
    setSelectedCap(null)
    setDrawerOpen(true)
  }

  const filteredCapabilities = capabilities.filter((cap) => {
    const matchesSearch = 
      cap.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cap.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cap.clientType && cap.clientType.toLowerCase().includes(searchQuery.toLowerCase()))
      
    const matchesCert = 
      certFilter === 'All' || 
      cap.certification === certFilter

    return matchesSearch && matchesCert
  })

  const certs = ['All', 'None', 'FedRAMP High', 'ISO 27001', 'SOC 2 Type II']

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Title & Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif font-bold text-xl sm:text-2xl text-[var(--text)] tracking-tight">Capability Library</h2>
          <p className="text-xs text-[var(--muted)] mt-1 font-medium font-sans">Manage organization past performance credentials, compliance certifications, and project values.</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] hover:opacity-95 px-4.5 py-3 text-xs font-bold text-white shadow-sm transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Capability Record
        </button>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[var(--surface)] p-4 rounded-3xl border border-[var(--border)] shadow-sm">
        {/* Search */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Search Records</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by domain, summary details, client type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            />
            <div className="absolute left-3 top-3.5 text-[var(--muted)]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Cert Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Certification</label>
          <select
            value={certFilter}
            onChange={(e) => setCertFilter(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition cursor-pointer"
          >
            {certs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table grid */}
      <CapabilityTable 
        capabilities={filteredCapabilities} 
        onEdit={handleEdit} 
      />

      <CapabilityDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedCap(null)
        }}
        capabilityToEdit={selectedCap}
      />
    </div>
  )
}