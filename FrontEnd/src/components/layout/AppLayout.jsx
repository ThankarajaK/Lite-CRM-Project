import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { cn } from '../../utils/format'
import ConnectivityBanner from '../ui/ConnectivityBanner'

/**
 * Application shell: sidebar + header + routed page content.
 *
 * Responsive behavior:
 * Desktop  — persistent sidebar, collapsible to icon rail.
 * Tablet   — sidebar can collapse to icon rail.
 * Mobile   — sidebar becomes a slide-in drawer.
 *
 * The shell intentionally uses min-w-0 on the content area so individual
 * pages cannot force the entire application wider than the viewport.
 */
export default function AppLayout({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Scroll back to the top on navigation.
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    })
  }, [pathname])

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() =>
          setCollapsed((current) => !current)
        }
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        user={user}
      />

      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-col transition-[padding] duration-200',
          collapsed
            ? 'lg:pl-[72px]'
            : 'lg:pl-64',
        )}
      >
        <Header
          user={user}
          onLogout={onLogout}
          onOpenMobileMenu={() =>
            setMobileOpen(true)
          }
        />

        <ConnectivityBanner />

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-8">
          <div className="mx-auto w-full min-w-0 max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}