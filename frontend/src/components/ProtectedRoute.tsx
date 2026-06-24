import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { Role } from '../types'
export function ProtectedRoute({ role }: { role?: Role }) {
  const { token, user } = useAuthStore()
  if (!token || !user) return <Navigate to="/login" replace />
  if (role && user.role !== role)
    return <Navigate to={user.role === 'REVIEWER' ? '/reviewer' : '/applications'} replace />
  return <Outlet />
}
