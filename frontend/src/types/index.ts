export type Role = 'APPLICANT' | 'REVIEWER'
export type Status = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
export type Category = 'GRANT' | 'LOAN' | 'PROCUREMENT' | 'OTHER'
export interface User {
  id: string
  email: string
  name: string
  role: Role
}
export interface Application {
  id: string
  owner_id: string
  title: string
  category: Category
  description: string
  amount: number | null
  status: Status
  created_at: string
  updated_at: string
}
export interface AuditLog {
  id: string
  application_id: string
  actor_id: string
  actor_name: string
  from_status: Status | null
  to_status: Status
  comment: string | null
  created_at: string
}
export interface ApplicationDetail extends Application {
  owner_name: string
  audit_logs: AuditLog[]
}
export interface ApplicationInput {
  title: string
  category: Category
  description: string
  amount: number | null
}
export interface APIError {
  error: string
  code: string
}
