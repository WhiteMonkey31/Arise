import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCapabilities, createCapability, updateCapability, deleteCapability } from '../services/capabilityService'
import { useDebounce } from '../hooks/useDebounce'
import CapabilityTable from '../components/capability/CapabilityTable'
import CapabilityDrawer from '../components/capability/CapabilityDrawer'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toastSuccess, toastError } from '../components/ui/ToastProvider'

const CAPS_KEY = ['capabilities']

export default function CapabilityLibrary() {
  const qc = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [certFilter, setCertFilter] = useState('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCap, setSelectedCap] = useState(null)

  const debouncedSearch = useDebounce(searchQuery, 350)

  const { data: capabilities = [], isLoading } = useQuery({
    queryKey: [...CAPS_KEY, debouncedSearch, certFilter],
    queryFn: () =>
      listCapabilities({
        search: debouncedSearch || undefined,
        certification: certFilter !== 'All' ? certFilter : undefined,
        limit: 200,
      }),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: createCapability,
    onSuccess: () => { qc.invalidateQueries({ queryKey: CAPS_KEY }); toastSuccess('Capability added') },
    onError: (err) => toastError(err.response?.data?.detail || 'Failed to add capability'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateCapability(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CAPS_KEY }); toastSuccess('Capability updated') },
    onError: (err) => toastError(err.response?.data?.detail || 'Failed to update capability'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCapability,
    onSuccess: () => { qc.invalidateQueries({ queryKey: CAPS_KEY }); toastSuccess('Capability deleted') },
    onError: (err) => toastError(err.response?.data?.detail || 'Failed to delete capability'),
  })

  const handleEdit = (cap) => { setSelectedCap(cap); setDrawerOpen(true) }
  const handleCreate = () => { setSelectedCap(null); setDrawerOpen(true) }

  const handleSave = (capData) => {
    if (selectedCap) {
      updateMutation.mutate({ id: selectedCap.id, payload: capData })
    } else {
      createMutation.mutate(capData)
    }
    setDrawerOpen(false)
    setSelectedCap(null)
  }

  const handleDelete = (id) => { deleteMutation.mutate(id) }

  const certs = ['All', 'None', 'FedRAMP High', 'ISO 27001', 'SOC 2 Type II']

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Title & Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif font-bold text-xl sm:text-2xl text-(--text) tracking-tight">Capability Library</h2>
          <p className="text-xs text-(--muted) mt-1 font-medium font-sans">Manage organization past performance credentials, compliance certifications, and project values.</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-(--accent) hover:opacity-95 px-4.5 py-3 text-xs font-bold text-white shadow-sm transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Capability Record
        </button>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-(--surface) p-4 rounded-3xl border border-(--border) shadow-sm">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Search Records</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by domain, summary, client type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-(--border) bg-(--surface) pl-9 pr-3 py-2.5 text-xs text-(--text) focus:border-(--accent) focus:outline-hidden transition"
            />
            <div className="absolute left-3 top-3.5 text-(--muted)">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Certification</label>
          <select
            value={certFilter}
            onChange={(e) => setCertFilter(e.target.value)}
            className="rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-xs text-(--text) focus:border-(--accent) focus:outline-hidden transition cursor-pointer"
          >
            {certs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : (
        <CapabilityTable
          capabilities={capabilities}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <CapabilityDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedCap(null) }}
        capabilityToEdit={selectedCap}
        onSave={handleSave}
      />
    </div>
  )
}
