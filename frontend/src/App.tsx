import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { ApplicationDetailPage } from './pages/applicant/ApplicationDetailPage'
import { MyApplicationsPage } from './pages/applicant/MyApplicationsPage'
import { QueuePage } from './pages/reviewer/QueuePage'
import { ReviewDetailPage } from './pages/reviewer/ReviewDetailPage'
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route element={<ProtectedRoute role="APPLICANT" />}>
            <Route path="/applications" element={<MyApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute role="REVIEWER" />}>
            <Route path="/reviewer" element={<QueuePage />} />
            <Route path="/reviewer/applications/:id" element={<ReviewDetailPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
