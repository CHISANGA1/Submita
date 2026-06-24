import { ArrowRight } from 'lucide-react'
import type { AuditLog } from '../types'
import { StatusBadge } from './StatusBadge'
export function AuditTrail({ logs }: { logs: AuditLog[] }) {
  if (!logs.length) return <p className="text-sm text-slate-500">No transitions yet.</p>
  return (
    <ol className="relative ml-2 border-l border-slate-200">
      {logs.map((log) => (
        <li key={log.id} className="mb-6 ml-6 last:mb-0">
          <span className="absolute -left-1.5 mt-2 h-3 w-3 rounded-full bg-accent" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={log.from_status ?? log.to_status} />
            <ArrowRight size={14} />
            <StatusBadge status={log.to_status} />
          </div>
          <p className="mt-2 text-sm">
            <strong>{log.actor_name}</strong> · {new Date(log.created_at).toLocaleString()}
          </p>
          {log.comment && (
            <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{log.comment}</p>
          )}
        </li>
      ))}
    </ol>
  )
}
