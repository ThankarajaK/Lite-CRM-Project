import { Navigate, Route, Routes } from 'react-router-dom'
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

import { crmApi } from './lib/api'

/**
 * LiteCRM application shell.
 * Authentication is API-backed; CRM data is progressively API-backed.
 */
export default function App() {
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
                onLogout={() => {
                  crmApi.logout().catch(() => {})
                  setUser(null)
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