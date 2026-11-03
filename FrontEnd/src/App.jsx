import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AppLayout from './components/layout/AppLayout'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'

import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Contacts from './pages/Contacts'
import Deals from './pages/Deals'
import Tasks from './pages/Tasks'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Login from './pages/Login'

import LearningModes from './pages/LearningModes'
import CourseDurations from './pages/CourseDurations'
import CourseInterested from './pages/CourseInterested'
import LeadSources from './pages/LeadSources'
import UserManagement from './pages/UserManagement'
import RolePermissions from './pages/RolePermissions'
import BusinessConfiguration from './pages/BusinessConfiguration'
import WorkspaceAudit from './pages/WorkspaceAudit'

import { crmApi } from './lib/api'

/**
 * LiteCRM application shell.
 * Authentication is API-backed; CRM data is progressively API-backed.
 */
export default function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    crmApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  if (user === undefined) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        Loading LiteCRM…
      </div>
    )
  }

  if (!user) {
    return <Login onAuthenticated={setUser} />
  }

  return (
    <DataProvider user={user}>
      <ToastProvider>
        <Routes>
          <Route
            element={
              <AppLayout
                user={user}
                onLogout={async () => {
                  // End the server session before allowing another user to sign in.
                  try {
                    await crmApi.logout()
                  } catch {
                    // Always clear the local UI session, even if the request fails.
                  }

                  // Remove any stale deep-link destination from the previous user.
                  try {
                    sessionStorage.removeItem('litecrm_post_login_redirect')
                  } catch {
                    // Storage may be unavailable; navigation still resets the route.
                  }

                  setUser(null)
                  navigate('/', { replace: true, state: null })
                }}
              />
            }
          >
            <Route path="/" element={<Dashboard />} />

            <Route path="/leads" element={<Leads />} />

            <Route path="/contacts" element={<Contacts />} />

            {/* Old link kept working after the Customers → Contacts rename. */}
            <Route
              path="/customers"
              element={<Navigate to="/contacts" replace />}
            />

            <Route path="/deals" element={<Deals />} />

            <Route path="/tasks" element={<Tasks />} />

            <Route path="/reports" element={<Reports />} />

            {/* Admin catalogue pages */}
            <Route
              path="/course-interested"
              element={<CourseInterested />}
            />

            <Route
              path="/learning-modes"
              element={<LearningModes />}
            />

            <Route
              path="/course-durations"
              element={<CourseDurations />}
            />

            <Route
              path="/lead-sources"
              element={<LeadSources />}
            />

            {/* User Management */}
            <Route
              path="/user-management"
              element={<UserManagement />}
            />

            <Route path="/settings" element={<Settings />} />

            <Route path="/role-permissions" element={<RolePermissions />} />
            <Route path="/business-configuration" element={<BusinessConfiguration />} />
            <Route
              path="/audit"
              element={
                user.permissions?.includes('view_audit')
                  ? <WorkspaceAudit />
                  : <Navigate to="/" replace />
              }
            />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Route>
        </Routes>
      </ToastProvider>
    </DataProvider>
  )
}