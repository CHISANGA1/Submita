import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Application } from '../types'
import { StatusBadge } from './StatusBadge'

const amountFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'ZMW',
})

export function ApplicationTable({
  applications,
  footer,
  pathPrefix = '/applications',
}: {
  applications: Application[]
  footer?: ReactNode
  pathPrefix?: string
}) {
  return (
    <div className="w-full rounded-[10px] border-solid border-black/30 lg:border-[1px]">
      <div className="overflow-x-auto rounded-t-2xl">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="border-b border-black/30 bg-slate-50/80">
            <tr className="text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-4">Application</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Last updated</th>
              <th className="w-16 px-5 py-4">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/30">
            {applications.map((application) => (
              <tr key={application.id} className="group transition hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <Link
                    className="font-bold text-ink group-hover:text-accent"
                    to={`${pathPrefix}/${application.id}`}
                  >
                    {application.title}
                  </Link>
                  <p className="mt-1 max-w-sm truncate text-sm text-slate-500">
                    {application.description}
                  </p>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                  {application.category}
                </td>
                <td className="px-5 py-4 text-sm text-slate-700">
                  {application.amount === null ? '—' : amountFormatter.format(application.amount)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={application.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {new Date(application.updated_at).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    className="inline-flex rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-accent"
                    to={`${pathPrefix}/${application.id}`}
                    aria-label={`Open ${application.title}`}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="flex min-h-16 items-center border-t border-black/30 px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  )
}
