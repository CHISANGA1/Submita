import { Check, RotateCcw, X } from 'lucide-react'
import type { Status } from '../types'

const stages = ['Draft', 'Submitted', 'Under review', 'Decision']
const stageDescriptions = [
  'Application is being prepared',
  'Application sent to the queue',
  'Reviewer is assessing the request',
  'Final outcome recorded',
]

function stageIndex(status: Status) {
  if (status === 'DRAFT') return 0
  if (status === 'SUBMITTED') return 1
  if (status === 'UNDER_REVIEW') return 2
  return 3
}

export function ApplicationProgress({
  status,
  returnedForChanges = false,
}: {
  status: Status
  returnedForChanges?: boolean
}) {
  const currentStage = stageIndex(status)
  const terminal = status === 'APPROVED' || status === 'REJECTED'
  const finalLabel =
    status === 'APPROVED' ? 'Approved' : status === 'REJECTED' ? 'Rejected' : 'Decision'
  const labels = [...stages.slice(0, 3), finalLabel]

  return (
    <aside className="h-fit rounded-2xl border p-5 lg:sticky lg:top-6">
      <div className="mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Progress</p>
          <p className="mt-1 text-sm text-slate-600">
            {returnedForChanges
              ? 'Changes requested before this application can be resubmitted.'
              : terminal
                ? `This application has been ${status.toLowerCase()}.`
                : 'Follow the application through each review stage.'}
          </p>
        </div>
        {returnedForChanges && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
            <RotateCcw size={13} /> Returned
          </span>
        )}
      </div>

      <ol>
        {labels.map((label, index) => {
          const completed = index < currentStage
          const current = index === currentStage
          const rejected = current && status === 'REJECTED'
          const approved = current && status === 'APPROVED'
          const returned = current && returnedForChanges

          return (
            <li key={label} className="relative flex gap-3 pb-7 last:pb-0">
              {index < labels.length - 1 && (
                <span
                  className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${index < currentStage ? 'bg-accent' : 'bg-slate-200'
                    }`}
                />
              )}
              <span
                className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition ${rejected
                  ? 'border-red-500 bg-red-500 text-white'
                  : approved
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : returned
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : completed
                        ? 'border-accent bg-accent text-white'
                        : current
                          ? 'border-accent bg-white text-accent'
                          : 'border-slate-200 bg-white text-slate-400'
                  }`}
              >
                {rejected ? (
                  <X size={15} />
                ) : approved || completed ? (
                  <Check size={15} />
                ) : returned ? (
                  <RotateCcw size={14} />
                ) : (
                  index + 1
                )}
              </span>
              <div className="pt-0.5">
                <p
                  className={`text-sm font-bold ${rejected
                    ? 'text-red-700'
                    : approved
                      ? 'text-emerald-700'
                      : current || completed
                        ? 'text-ink'
                        : 'text-slate-400'
                    }`}
                >
                  {returned && index === 0 ? 'Revisions' : label}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {returned && index === 0
                    ? 'Updates are needed before resubmission'
                    : stageDescriptions[index]}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
