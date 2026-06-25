import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Application } from '../types'
import { StatusBadge } from './StatusBadge'

const amountFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'ZMW',
})

const dateFormatter = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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
      {/* Mobile version */}
      <div className="space-y-3 lg:hidden">
        {applications.map((application) => (
          <Link
            key={application.id}
            to={`${pathPrefix}/${application.id}`}
            className="block rounded-xl border border-black/20 bg-white p-4 shadow-sm transition hover:border-accent hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold text-ink">
                  {application.title}
                </h3>

                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {application.description}
                </p>
              </div>

              <span className="shrink-0 rounded-lg p-1 text-slate-400">
                <ArrowUpRight size={18} />
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <StatusBadge status={application.status} />

              <span className="text-sm font-semibold text-slate-700">
                {application.amount === null
                  ? '—'
                  : amountFormatter.format(application.amount)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-3 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Type
                </p>
                <p className="mt-1 font-semibold text-slate-700">
                  {application.category}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Last updated
                </p>
                <p className="mt-1 whitespace-nowrap text-slate-500">
                  {dateFormatter(application.updated_at)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table version */}
      <div className="hidden overflow-x-auto rounded-t-2xl lg:block">
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
              <tr
                key={application.id}
                className="group transition hover:bg-slate-50/80"
              >
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
                  {application.amount === null
                    ? '—'
                    : amountFormatter.format(application.amount)}
                </td>

                <td className="px-5 py-4">
                  <StatusBadge status={application.status} />
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {dateFormatter(application.updated_at)}
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