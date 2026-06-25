import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, History, Send, Trash2, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  deleteApplication,
  getApplication,
  transitionApplication,
  updateApplication,
} from '../../api/applications'
import { errorMessage } from '../../api/client'
import { ApplicationForm } from '../../components/ApplicationForm'
import { ApplicationProgress } from '../../components/ApplicationProgress'
import { AuditTrail } from '../../components/AuditTrail'
import { StatusBadge } from '../../components/StatusBadge'
export function ApplicationDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const query = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id),
    enabled: !!id,
  })
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['application', id] })
    void client.invalidateQueries({ queryKey: ['applications'] })
  }
  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateApplication>[1]) => updateApplication(id, input),
    onSuccess: () => {
      refresh()
      setEditing(false)
    },
  })
  const submit = useMutation({
    mutationFn: () => transitionApplication(id, 'SUBMITTED'),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: () => deleteApplication(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['applications'] })
      navigate('/applications')
    },
  })
  if (query.isLoading) return <p>Loading application…</p>
  if (query.isError || !query.data) return <p className="error">{errorMessage(query.error)}</p>
  const app = query.data
  const returnLog = [...app.audit_logs]
    .reverse()
    .find((log) => log.to_status === 'DRAFT' && log.comment)
  const busy = update.isPending || submit.isPending || remove.isPending
  return (
    <>
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold"
        to="/applications"
      >
        <ArrowLeft size={16} />
        Back to applications
      </Link>
      {(update.isError || submit.isError || remove.isError) && (
        <p className="error mb-4">{errorMessage(update.error || submit.error || remove.error)}</p>
      )}
      <section className="rounded-[10px] border-solid border-black/30 lg:border-[1px] w-full p-6 sm:p-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusBadge status={app.status} />
            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{app.title}</h1>
          </div>
          <div className="flex gap-2">
            <button
              className="relative grid h-10 w-10 place-items-center rounded-lg border bg-white text-slate-600 transition hover:border-slate-400 hover:text-ink"
              onClick={() => setAuditOpen(true)}
              aria-label="View audit trail"
              title="View audit trail"
            >
              <History size={18} />
              {app.audit_logs.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {app.audit_logs.length}
                </span>
              )}
            </button>
            {app.status === 'DRAFT' && !editing && (
              <>
                <button className="btn-outline" onClick={() => setEditing(true)}>
                  Edit
                </button>
                <button
                  className="btn-outline text-red-700"
                  disabled={busy}
                  onClick={() => {
                    if (confirm('Delete this draft?')) remove.mutate()
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            {returnLog && (
              <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Returned for changes</p>
                <p className="mt-1 text-sm text-amber-800">{returnLog.comment}</p>
              </div>
            )}
            {editing ? (
              <ApplicationForm
                initial={{
                  title: app.title,
                  category: app.category,
                  description: app.description,
                  amount: app.amount,
                }}
                onSubmit={(input) => update.mutate(input)}
                busy={update.isPending}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="space-y-8">
                <div className="grid gap-6 border-y py-6 sm:grid-cols-2">
                  <Field label="Category" value={app.category} />
                  <Field
                    label="Amount"
                    value={
                      app.amount == null
                        ? 'Not specified'
                        : new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: 'ZMW',
                        }).format(app.amount)
                    }
                  />
                </div>
                <div>
                  <p className="label">Description</p>
                  <p className="max-w-4xl whitespace-pre-wrap leading-7 text-slate-700">
                    {app.description}
                  </p>
                </div>
                {app.status === 'DRAFT' && (
                  <button className="btn-accent" disabled={busy} onClick={() => submit.mutate()}>
                    <Send size={16} />
                    Submit for review
                  </button>
                )}
              </div>
            )}
          </div>
          <ApplicationProgress status={app.status} returnedForChanges={Boolean(returnLog)} />
        </div>
      </section>
      {auditOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4">
          <section
            className="card my-6 max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-trail-title"
          >
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  Application history
                </p>
                <h2 id="audit-trail-title" className="mt-1 text-2xl font-extrabold">
                  Audit trail
                </h2>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border text-slate-500 transition hover:bg-slate-50 hover:text-ink"
                onClick={() => setAuditOpen(false)}
                aria-label="Close audit trail"
              >
                <X size={18} />
              </button>
            </div>
            <AuditTrail logs={app.audit_logs} />
          </section>
        </div>
      )}
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
