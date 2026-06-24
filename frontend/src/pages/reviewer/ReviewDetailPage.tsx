import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, History, Play, RotateCcw, X, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getApplication, transitionApplication } from '../../api/applications'
import { errorMessage } from '../../api/client'
import { AuditTrail } from '../../components/AuditTrail'
import { ApplicationProgress } from '../../components/ApplicationProgress'
import { CommentModal } from '../../components/CommentModal'
import { StatusBadge } from '../../components/StatusBadge'
import type { Status } from '../../types'
type CommentAction = { to: 'REJECTED' | 'DRAFT'; title: string; label: string } | null
export function ReviewDetailPage() {
  const { id = '' } = useParams()
  const client = useQueryClient()
  const [commentAction, setCommentAction] = useState<CommentAction>(null)
  const [auditOpen, setAuditOpen] = useState(false)
  const query = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id),
    enabled: !!id,
  })
  const mutation = useMutation({
    mutationFn: ({ to, comment = '' }: { to: Status; comment?: string }) =>
      transitionApplication(id, to, comment),
    onSuccess: () => {
      setCommentAction(null)
      void client.invalidateQueries({ queryKey: ['application', id] })
      void client.invalidateQueries({ queryKey: ['applications'] })
    },
  })
  if (query.isLoading) return <p>Loading application…</p>
  if (query.isError || !query.data) return <p className="error">{errorMessage(query.error)}</p>
  const app = query.data
  const returnLog = [...app.audit_logs]
    .reverse()
    .find((log) => log.to_status === 'DRAFT' && log.comment)
  const applicantName =
    app.owner_name ||
    app.audit_logs.find((log) => log.actor_id === app.owner_id)?.actor_name ||
    'Unknown applicant'
  return (
    <>
      <Link className="mb-6 inline-flex items-center gap-2 text-sm font-semibold" to="/reviewer">
        <ArrowLeft size={16} />
        Back to queue
      </Link>
      {mutation.isError && <p className="error mb-4">{errorMessage(mutation.error)}</p>}
      <section className="w-full rounded-[10px] border-solid border-black/30 p-6 sm:p-8 lg:border-[1px]">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusBadge status={app.status} />
            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{app.title}</h1>
          </div>
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
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
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
                        currency: 'USD',
                      }).format(app.amount)
                }
              />
              <Field label="Submitted by" value={applicantName} />
              <Field label="Last updated" value={new Date(app.updated_at).toLocaleString()} />
            </div>
            <div>
              <p className="label">Description</p>
              <p className="max-w-4xl whitespace-pre-wrap leading-7 text-slate-700">
                {app.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {app.status === 'SUBMITTED' && (
                <>
                  <button
                    className="btn-accent"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ to: 'UNDER_REVIEW' })}
                  >
                    <Play size={16} />
                    Start review
                  </button>
                  <button
                    className="btn-outline text-red-700"
                    onClick={() =>
                      setCommentAction({
                        to: 'REJECTED',
                        title: 'Reject application',
                        label: 'Reject',
                      })
                    }
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </>
              )}
              {app.status === 'UNDER_REVIEW' && (
                <>
                  <button
                    className="btn-accent"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ to: 'APPROVED' })}
                  >
                    <CheckCircle2 size={16} />
                    Approve
                  </button>
                  <button
                    className="btn-outline text-red-700"
                    onClick={() =>
                      setCommentAction({
                        to: 'REJECTED',
                        title: 'Reject application',
                        label: 'Reject',
                      })
                    }
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() =>
                      setCommentAction({
                        to: 'DRAFT',
                        title: 'Return for changes',
                        label: 'Return',
                      })
                    }
                  >
                    <RotateCcw size={16} />
                    Return for changes
                  </button>
                </>
              )}
            </div>
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
      <CommentModal
        open={!!commentAction}
        title={commentAction?.title ?? ''}
        confirmLabel={commentAction?.label ?? ''}
        busy={mutation.isPending}
        onClose={() => setCommentAction(null)}
        onConfirm={(comment) => commentAction && mutation.mutate({ to: commentAction.to, comment })}
      />
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
