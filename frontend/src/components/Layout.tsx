import { LogOut, Send } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
export function Layout() {
  const { user, logout } = useAuthStore()
  const home = user?.role === 'REVIEWER' ? '/reviewer' : '/applications'
  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to={home} className="flex items-center gap-2 text-lg font-extrabold">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-ink">
              <Send size={20} />
            </span>
            Submita
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <button className="btn-outline" onClick={logout}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </>
  )
}
