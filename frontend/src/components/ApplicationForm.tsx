import { useState, type FormEvent } from 'react'
import type { ApplicationInput, Category } from '../types'
const categories: Category[] = ['GRANT', 'LOAN', 'PROCUREMENT', 'OTHER']
export function ApplicationForm({
  initial,
  onSubmit,
  submitLabel = 'Save draft',
  busy = false,
  onCancel,
}: {
  initial?: ApplicationInput
  onSubmit: (input: ApplicationInput) => void
  submitLabel?: string
  busy?: boolean
  onCancel?: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'GRANT')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '')
  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      title: title.trim(),
      category,
      description: description.trim(),
      amount: amount === '' ? null : Number(amount),
    })
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Title</label>
        <input
          className="field"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you requesting?"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Category</label>
          <select
            className="field"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Amount (optional)</label>
          <input
            className="field"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="field min-h-32"
          required
          maxLength={10000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide enough context for the reviewer."
        />
      </div>
      <div className="flex gap-3">
        <button className="btn-accent" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-outline" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
