import { api } from './client'
import type { Application, ApplicationDetail, ApplicationInput, Status } from '../types'
export async function listApplications() {
  const { data } = await api.get<{ data: Application[] }>('/applications/')
  return data.data
}
export async function getApplication(id: string) {
  const { data } = await api.get<{ data: ApplicationDetail }>(`/applications/${id}`)
  return data.data
}
export async function createApplication(input: ApplicationInput) {
  const { data } = await api.post<{ data: Application }>('/applications/', input)
  return data.data
}
export async function updateApplication(id: string, input: ApplicationInput) {
  const { data } = await api.put<{ data: Application }>(`/applications/${id}`, input)
  return data.data
}
export async function deleteApplication(id: string) {
  await api.delete(`/applications/${id}`)
}
export async function transitionApplication(id: string, to: Status, comment = '') {
  const { data } = await api.post<{ data: Application }>(`/applications/${id}/transition`, {
    to,
    comment,
  })
  return data.data
}
