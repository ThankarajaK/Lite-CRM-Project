import { NavLink } from 'react-router-dom'
import { ChevronLeft, PanelLeft, X } from 'lucide-react'
import Avatar from '../ui/Avatar'
import Tooltip from '../ui/Tooltip'
import { BOTTOM_NAV_ITEMS, NAV_ITEMS } from './navigation'
import { cn } from '../../utils/format'

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon

  const link = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar on the left edge */}
          <span
            className={cn(
              'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
          />

          <Icon className="h-[18px] w-[18px] shrink-0" />

          {!collapsed ? (
            <span className="truncate">
              {item.label}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )

  return collapsed ? (
    <Tooltip
      label={item.label}
      side="right"
      className="w-full"
    >
      <div className="w-full">
        {link}
      </div>
    </Tooltip>
  ) : (
    link
  )
}

/**
 * Persistent sidebar on desktop, slide-in drawer on mobile.
 *
 * `collapsed` is desktop-only (icon rail);
 * `mobileOpen` controls the drawer.
 */
export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  user,
}) {
  /*
   * Only show navigation items when the logged-in user
   * has the permission required by that item.
   *
   * Items without a permission requirement remain
   * visible to everyone who can access the sidebar.
   */
  const userPermissions =
    new Set(user?.permissions ?? [])

  const hasPermission = (
    permission,
  ) =>
    !permission ||
    userPermissions.has(permission)

  const visibleNavItems =
    NAV_ITEMS.filter((item) =>
      hasPermission(item.permission)
    )

  const visibleBottomNavItems =
    BOTTOM_NAV_ITEMS.filter((item) =>
      hasPermission(item.permission)
    )

  const content = (isCollapsed) => (
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200 px-4',
          isCollapsed && 'justify-center px-0'
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          L
        </span>

        {!isCollapsed ? (
          <span className="truncate text-base font-semibold tracking-tight text-slate-900">
            LiteCRM
          </span>
        ) : null}

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close menu"
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main navigation */}
      <nav
        className={cn(
          'flex-1 space-y-1 overflow-y-auto py-4',
          isCollapsed
            ? 'px-2'
            : 'px-3'
        )}
      >
        {!isCollapsed ? (
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Menu
          </p>
        ) : null}

        {visibleNavItems.map(
          (item) => (
            <NavItem
              key={item.to}
              item={item}
              collapsed={isCollapsed}
              onNavigate={
                onCloseMobile
              }
            />
          )
        )}
      </nav>

      {/* Bottom: settings + profile */}
      <div
        className={cn(
          'shrink-0 space-y-1 border-t border-slate-200 py-3',
          isCollapsed
            ? 'px-2'
            : 'px-3'
        )}
      >
        {visibleBottomNavItems.map(
          (item) => (
            <NavItem
              key={item.to}
              item={item}
              collapsed={isCollapsed}
              onNavigate={
                onCloseMobile
              }
            />
          )
        )}

        <div
          className={cn(
            'mt-2 flex items-center gap-3 rounded-lg px-3 py-2',
            isCollapsed &&
              'justify-center px-0'
          )}
        >
          <Avatar
            name={
              user?.name ||
              'User'
            }
            size="sm"
          />

          {!isCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {user?.name ||
                  'User'}
              </p>

              <p className="truncate text-xs text-slate-500">
                {user?.role || ''}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 transition-[width] duration-200 lg:block',
          collapsed
            ? 'w-[72px]'
            : 'w-64'
        )}
      >
        {content(collapsed)}

        {/* Collapse toggle sits on the sidebar edge */}
        <button
          type="button"
          onClick={
            onToggleCollapse
          }
          aria-label={
            collapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar'
          }
          className="absolute -right-3 top-20 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 lg:flex"
        >
          {collapsed ? (
            <PanelLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 animate-fade-in"
            onClick={
              onCloseMobile
            }
            aria-hidden="true"
          />

          <div className="absolute inset-y-0 left-0 w-64 shadow-pop animate-slide-in-left">
            {content(false)}
          </div>
        </div>
      ) : null}
    </>
  )
}