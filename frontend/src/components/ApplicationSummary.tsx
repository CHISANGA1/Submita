import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Application } from '../types'
import { StatusBadge } from './StatusBadge'
export function ApplicationSummary({ application, to }: { application: Application; to: string }) {
  return (
    <Link
      to={to}
      className="card flex items-center justify-between gap-4 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={application.status} />
          <span className="text-xs font-semibold text-slate-500">{application.category}</span>
        </div>
        <h2 className="truncate text-lg font-bold">{application.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Updated {new Date(application.updated_at).toLocaleDateString()}
        </p>
      </div>
      <ChevronRight className="shrink-0 text-slate-400" />
    </Link>
  )
}
