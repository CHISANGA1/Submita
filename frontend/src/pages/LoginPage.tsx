import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { errorMessage } from '../api/client'
import { useAuthStore } from '../store/authStore'
export function LoginPage() {
  const navigate = useNavigate()
  const { token, user, setAuth } = useAuthStore()
  const [email, setEmail] = useState('applicant@test.com')
  const [password, setPassword] = useState('password123')
  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      navigate(data.user.role === 'REVIEWER' ? '/reviewer' : '/applications')
    },
  })
  if (token && user)
    return <Navigate to={user.role === 'REVIEWER' ? '/reviewer' : '/applications'} replace />
  function submit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }
  return (
    <main className="grid min-h-screen place-items-center bg-ink p-4">
      <div className="rounded-[10px] border-solid border-[1px] border-slate-300 w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-3xl text-accent font-extrabold">Bwanji</h1>
          <p className="mt-2 text-sm text-slate-300">Sign in to your account.</p>
        </div>
        {mutation.isError && <p className="error mb-4">{errorMessage(mutation.error)}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mt-2 text-sm text-slate-300">Email</label>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mt-2 text-sm text-slate-300">Password</label>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-accent w-full border-slate-300" disabled={mutation.isPending}>
            {mutation.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
