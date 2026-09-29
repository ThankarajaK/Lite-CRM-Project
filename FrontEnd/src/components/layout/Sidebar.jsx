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
          // Base item
          'group relative flex min-h-10 w-full items-center rounded-lg text-sm font-medium',
          'transition-all duration-150 ease-out',
          'focus-visible:outline-none',

          // Spacing
          collapsed
            ? 'justify-center px-0'
            : 'gap-3 px-3',

          // Active / inactive
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',

          // Prevent content from forcing sidebar width
          'min-w-0 overflow-hidden'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full',
              'bg-brand-600 transition-opacity duration-150',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
          />

          {/* Icon */}
          <Icon
            aria-hidden="true"
            className={cn(
              'h-[18px] w-[18px] shrink-0',
              isActive
                ? 'text-brand-600'
                : 'text-slate-500 group-hover:text-slate-700'
            )}
          />

          {/* Label */}
          {!collapsed ? (
            <span className="min-w-0 flex-1 truncate">
              {item.label}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip
        label={item.label}
        side="right"
        className="block w-full"
      >
        <div className="w-full">
          {link}
        </div>
      </Tooltip>
    )
  }

  return link
}

/**
 * LiteCRM application sidebar.
 *
 * Desktop:
 *   - Persistent sidebar
 *   - Expandable / collapsible icon rail
 *
 * Tablet:
 *   - Uses the desktop shell when lg breakpoint is reached
 *
 * Mobile:
 *   - Slide-in drawer
 *
 * Existing permissions and navigation are preserved.
 */
export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  user,
}) {
  /*
   * Preserve existing permission-based navigation.
   *
   * Items without a permission requirement are visible
   * to all authenticated users.
   */
  const userPermissions = new Set(user?.permissions ?? [])

  const hasPermission = (permission) =>
    !permission || userPermissions.has(permission)

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    hasPermission(item.permission)
  )

  const visibleBottomNavItems = BOTTOM_NAV_ITEMS.filter((item) =>
    hasPermission(item.permission)
  )

  /**
   * Sidebar content is shared between:
   * - desktop expanded
   * - desktop collapsed
   * - mobile drawer
   */
  const content = (isCollapsed) => (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white">

      {/* =========================================================
          LOGO / BRAND
          ========================================================= */}
      <div
        className={cn(
          'flex h-16 min-h-16 shrink-0 items-center',
          'border-b border-slate-200',
          isCollapsed
            ? 'justify-center px-2'
            : 'gap-2.5 px-4'
        )}
      >
        {/* Logo */}
        <span
          className="
            flex h-8 w-8 shrink-0 items-center justify-center
            rounded-lg bg-brand-600
            text-sm font-bold text-white
            shadow-sm
          "
          aria-hidden="true"
        >
          L
        </span>

        {/* Brand name */}
        {!isCollapsed ? (
          <span className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-slate-900">
            LiteCRM
          </span>
        ) : null}

        {/* Mobile close */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="
            ml-auto flex h-9 w-9 shrink-0 items-center justify-center
            rounded-lg text-slate-400
            transition-colors
            hover:bg-slate-100 hover:text-slate-700
            focus-visible:outline-none
            lg:hidden
          "
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* =========================================================
          MAIN NAVIGATION
          ========================================================= */}
      <nav
        aria-label="Main navigation"
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto',
          'scrollbar-slim',
          'py-4',
          isCollapsed ? 'px-2' : 'px-3'
        )}
      >
        {!isCollapsed ? (
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Menu
          </p>
        ) : null}

        <div className="space-y-1">
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              collapsed={isCollapsed}
              onNavigate={onCloseMobile}
            />
          ))}
        </div>
      </nav>

      {/* =========================================================
          BOTTOM AREA
          ========================================================= */}
      <div
        className={cn(
          'shrink-0 border-t border-slate-200 py-3',
          isCollapsed ? 'px-2' : 'px-3'
        )}
      >
        {/* Bottom navigation */}
        <div className="space-y-1">
          {visibleBottomNavItems.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              collapsed={isCollapsed}
              onNavigate={onCloseMobile}
            />
          ))}
        </div>

        {/* =======================================================
            CURRENT USER
            ======================================================= */}
        <div
          className={cn(
            'mt-2 flex min-w-0 items-center rounded-lg',
            'border border-transparent',
            'transition-colors',
            isCollapsed
              ? 'justify-center px-0 py-2'
              : 'gap-3 px-3 py-2'
          )}
        >
          <Avatar
            name={user?.name || 'User'}
            size="sm"
          />

          {!isCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {user?.name || 'User'}
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
      {/* =========================================================
          DESKTOP SIDEBAR
          ========================================================= */}
      <aside
        aria-label="Sidebar navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden',
          'border-r border-slate-200 bg-white',
          'transition-[width] duration-200 ease-out',
          'lg:block',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {content(collapsed)}

        {/* =====================================================
            COLLAPSE BUTTON
            ===================================================== */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={
            collapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar'
          }
          aria-expanded={!collapsed}
          className="
            absolute -right-3 top-20 z-10
            hidden h-6 w-6 items-center justify-center
            rounded-full
            border border-slate-200
            bg-white
            text-slate-500
            shadow-sm
            transition-all duration-150
            hover:bg-slate-50
            hover:text-slate-700
            hover:shadow
            focus-visible:outline-none
            lg:flex
          "
        >
          {collapsed ? (
            <PanelLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      {/* =========================================================
          MOBILE DRAWER
          ========================================================= */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation menu"
            className="
              absolute inset-0
              cursor-default
              bg-slate-950/40
              backdrop-blur-[1px]
              animate-fade-in
            "
            onClick={onCloseMobile}
          />

          {/* Drawer */}
          <div
            className="
              absolute inset-y-0 left-0
              w-[min(18rem,85vw)]
              max-w-[85vw]
              overflow-hidden
              bg-white
              shadow-pop
              animate-slide-in-left
            "
          >
            {content(false)}
          </div>
        </div>
      ) : null}
    </>
  )
}