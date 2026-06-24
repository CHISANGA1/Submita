import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { listApplications } from '../../api/applications'
import { errorMessage } from '../../api/client'
import { ApplicationTable } from '../../components/ApplicationTable'
import type { Status } from '../../types'

const pageSize = 5

const filters: ['ALL' | Status, string][] = [
  ['ALL', 'All'],
  ['SUBMITTED', 'Submitted'],
  ['UNDER_REVIEW', 'Under review'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
]
export function QueuePage() {
  const [filter, setFilter] = useState<'ALL' | Status>('SUBMITTED')
  const [currentPage, setCurrentPage] = useState(1)
  const query = useQuery({ queryKey: ['applications'], queryFn: listApplications })
  const apps = query.data?.filter((app) => filter === 'ALL' || app.status === filter) ?? []
  const totalPages = Math.max(1, Math.ceil(apps.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageStart = (activePage - 1) * pageSize
  const paginatedApps = apps.slice(pageStart, pageStart + pageSize)

  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          Applications queue
        </p>
        <p className="mt-2 text-slate-500">Review requests and keep decisions moving.</p>
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map(([value, label]) => (
          <button
            key={value}
            className={
              filter === value ? 'btn-primary whitespace-nowrap' : 'btn-outline whitespace-nowrap'
            }
            onClick={() => {
              setFilter(value)
              setCurrentPage(1)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {query.isLoading && <p>Loading queue…</p>}
      {query.isError && <p className="error">{errorMessage(query.error)}</p>}
      {!query.isLoading && apps.length === 0 && (
        <div className="card text-center">
          <h2 className="font-bold">Queue is clear</h2>
          <p className="mt-1 text-sm text-slate-500">There are no applications with this status.</p>
        </div>
      )}
      {apps.length > 0 && (
        <ApplicationTable
          applications={paginatedApps}
          pathPrefix="/reviewer/applications"
          footer={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {pageStart + 1}–{Math.min(pageStart + pageSize, apps.length)} of{' '}
                {apps.length} applications
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
