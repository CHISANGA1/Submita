import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, RotateCcw, X } from 'lucide-react'
import { createApplication, listApplications } from '../../api/applications'
import { errorMessage } from '../../api/client'
import { ApplicationForm } from '../../components/ApplicationForm'
import { ApplicationTable } from '../../components/ApplicationTable'
import type { Status } from '../../types'

const filters: ['ALL' | Status, string][] = [
  ['ALL', 'All'],
  ['SUBMITTED', 'Submitted'],
  ['UNDER_REVIEW', 'Under review'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
]
const pageSize = 5

export function MyApplicationsPage() {
  const [creating, setCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['applications'], queryFn: listApplications })
  const mutation = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['applications'] })
      setCreating(false)
    },
  })

  const filteredApplications =
    query.data?.filter(
      (application) => statusFilter === 'ALL' || application.status === statusFilter,
    ) ?? []
  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageStart = (activePage - 1) * pageSize
  const paginatedApplications = filteredApplications.slice(pageStart, pageStart + pageSize)

  function clearFilters() {
    setStatusFilter('ALL')
    setCurrentPage(1)
  }

  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">My applications</p>
        </div>
        <button
          className="btn-accent"
          onClick={() => {
            mutation.reset()
            setCreating(true)
          }}
        >
          <Plus size={17} /> New application
        </button>
      </div>
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4">
          <section
            className="card my-6 w-full max-w-2xl p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-application-title"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  New application
                </p>
                <h2 id="create-application-title" className="mt-1 text-2xl font-extrabold">
                  Create a draft
                </h2>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border text-slate-500 transition hover:bg-slate-50 hover:text-ink"
                onClick={() => setCreating(false)}
                aria-label="Close new application form"
              >
                <X size={18} />
              </button>
            </div>
            {mutation.isError && <p className="error mb-4">{errorMessage(mutation.error)}</p>}
            <ApplicationForm
              onSubmit={(input) => mutation.mutate(input)}
              busy={mutation.isPending}
              onCancel={() => setCreating(false)}
            />
          </section>
        </div>
      )}
      {query.data && query.data.length > 0 && (
        <div className="mb-6 flex gap-3 overflow-x-auto pb-1">
          {filters.map(([value, label]) => (
            <button
              key={value}
              className={`whitespace-nowrap rounded-xl border px-6 py-3 text-base font-bold transition ${
                statusFilter === value
                  ? 'border-ink bg-ink text-white'
                  : 'border-slate-200 bg-white text-ink hover:border-slate-400'
              }`}
              onClick={() => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {query.isLoading && <p>Loading applications…</p>}
      {query.isError && <p className="error">{errorMessage(query.error)}</p>}
      {query.data?.length === 0 && (
        <div className="card text-center">
          <h2 className="font-bold">No applications yet</h2>
          <p className="mt-1 text-sm text-slate-500">Create a draft to get started.</p>
        </div>
      )}
      {query.data && query.data.length > 0 && filteredApplications.length === 0 && (
        <div className="card text-center">
          <h2 className="font-bold">No matching applications</h2>
          <p className="mt-1 text-sm text-slate-500">
            Try changing or clearing the selected filters.
          </p>
          <button className="btn-outline mt-4" onClick={clearFilters}>
            <RotateCcw size={15} /> Clear filters
          </button>
        </div>
      )}
      {filteredApplications.length > 0 && query.data && (
        <ApplicationTable
          applications={paginatedApplications}
          footer={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {pageStart + 1}–
                {Math.min(pageStart + pageSize, filteredApplications.length)} of{' '}
                {filteredApplications.length} applications
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-600">
                  Page {activePage} of {totalPages}
                </span>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border bg-white transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setCurrentPage(activePage - 1)}
                  disabled={activePage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border bg-white transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setCurrentPage(activePage + 1)}
                  disabled={activePage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          }
        />
      )}
    </>
  )
}
