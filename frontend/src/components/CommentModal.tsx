import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
export function CommentModal({
  open,
  title,
  confirmLabel,
  onClose,
  onConfirm,
  busy = false,
}: {
  open: boolean
  title: string
  confirmLabel: string
  onClose: () => void
  onConfirm: (comment: string) => void
  busy?: boolean
}) {
  const [comment, setComment] = useState('')
  useEffect(() => {
    if (open) setComment('')
  }, [open])
  if (!open) return null
  function submit(e: FormEvent) {
    e.preventDefault()
    if (comment.trim()) onConfirm(comment.trim())
  }
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form onSubmit={submit} className="card w-full max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <label className="label mt-5">Reviewer comment</label>
        <textarea
          autoFocus
          className="field min-h-28"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Explain what the applicant needs to know."
        />
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-accent" disabled={!comment.trim() || busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
