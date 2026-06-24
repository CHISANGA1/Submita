import { api } from './client'
import type { User } from '../types'
export async function login(email: string, password: string) {
  const { data } = await api.post<{ data: { token: string; user: User } }>('/auth/login', {
    email,
    password,
  })
  return data.data
}
export async function me() {
  const { data } = await api.get<{ data: User }>('/auth/me')
  return data.data
}
