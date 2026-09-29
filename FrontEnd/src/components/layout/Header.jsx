import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react'

import Avatar from '../ui/Avatar'
import SearchBar from '../ui/SearchBar'
import Tooltip from '../ui/Tooltip'

import {
  useClickOutside,
  useEscapeKey,
} from '../../hooks/useDismissable'

import { notifications as seedNotifications } from '../../data/mockData'
import { getPageMeta } from './navigation'
import {
  cn,
  formatRelativeTime,
} from '../../utils/format'


/* ============================================================
   NOTIFICATIONS MENU
   ============================================================ */

function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(seedNotifications)

  const ref = useClickOutside(
    open,
    () => setOpen(false)
  )

  useEscapeKey(
    open,
    () => setOpen(false)
  )

  const unread = items.filter(
    (item) => item.unread
  ).length

  const markAllRead = () => {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        unread: false,
      }))
    )
  }

  return (
    <div
      ref={ref}
      className="relative"
    >
      <Tooltip
        label="Notifications"
        side="bottom"
      >
        <button
          type="button"
          onClick={() =>
            setOpen((current) => !current)
          }
          aria-label={`Notifications${
            unread
              ? `, ${unread} unread`
              : ''
          }`}
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn(
            'relative flex h-10 w-10 items-center justify-center',
            'rounded-xl text-slate-500',
            'transition-all duration-150',
            'hover:bg-slate-100 hover:text-slate-700',
            'focus-visible:ring-2 focus-visible:ring-brand-500',
            open &&
              'bg-brand-50 text-brand-600'
          )}
        >
          <Bell className="h-[18px] w-[18px]" />

          {unread > 0 ? (
            <span className="absolute right-2 top-2 flex h-2 w-2">
              <span className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </span>
          ) : null}
        </button>
      </Tooltip>

      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-50 mt-2',
            'w-[calc(100vw-1.5rem)] max-w-80',
            'overflow-hidden rounded-2xl',
            'border border-slate-200 bg-white',
            'shadow-dropdown animate-dropdown-in'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Notifications
              </p>

              {unread > 0 ? (
                <p className="mt-0.5 text-xs text-slate-400">
                  {unread} unread
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-400">
                  You're all caught up
                </p>
              )}
            </div>

            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {/* Notification list */}
          {items.length > 0 ? (
            <ul className="max-h-[min(22rem,60vh)] divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.id}
                  role="menuitem"
                  className={cn(
                    'px-4 py-3.5',
                    'transition-colors duration-150',
                    'hover:bg-slate-50',
                    item.unread &&
                      'bg-brand-50/40'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        item.unread
                          ? 'bg-brand-600'
                          : 'bg-transparent'
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.title}
                      </p>

                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        {item.body}
                      </p>

                      <p className="mt-1.5 text-xs text-slate-400">
                        {formatRelativeTime(
                          item.timestamp
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-10 text-center">
              <Bell className="mx-auto h-6 w-6 text-slate-300" />

              <p className="mt-2 text-sm font-medium text-slate-700">
                No notifications
              </p>

              <p className="mt-1 text-xs text-slate-400">
                You're all caught up.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}


/* ============================================================
   USER MENU
   ============================================================ */

function UserMenu({
  user,
  onLogout,
}) {
  const [open, setOpen] = useState(false)

  const navigate = useNavigate()

  const ref = useClickOutside(
    open,
    () => setOpen(false)
  )

  useEscapeKey(
    open,
    () => setOpen(false)
  )

  const items = [
    {
      label: 'Your profile',
      icon: User,
      action: () => {},
    },
    {
      label: 'Settings',
      icon: Settings,
      action: () =>
        navigate('/settings'),
    },
    {
      label: 'Help & support',
      icon: HelpCircle,
      action: () => {},
    },
  ]

  const displayName =
    user?.name || 'User'

  const displayRole =
    user?.role || ''

  const displayEmail =
    user?.email || ''

  const closeMenu = () =>
    setOpen(false)

  return (
    <div
      ref={ref}
      className="relative"
    >
      {/* User trigger */}
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'flex items-center gap-2',
          'rounded-xl p-1.5 pr-2',
          'transition-all duration-150',
          'hover:bg-slate-100',
          'focus-visible:ring-2 focus-visible:ring-brand-500',
          open &&
            'bg-slate-100'
        )}
      >
        <Avatar
          name={displayName}
          size="sm"
        />

        {/* Desktop user information */}
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-32 truncate text-sm font-semibold leading-tight text-slate-900">
            {displayName}
          </span>

          <span className="mt-0.5 block max-w-32 truncate text-xs leading-tight text-slate-500">
            {displayRole}
          </span>
        </span>

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400',
            'transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* User dropdown */}
      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-50 mt-2',
            'w-[calc(100vw-1.5rem)] max-w-64',
            'overflow-hidden rounded-2xl',
            'border border-slate-200 bg-white',
            'py-1.5 shadow-dropdown',
            'animate-dropdown-in'
          )}
        >
          {/* Account information */}
          <div className="border-b border-slate-100 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Avatar
                name={displayName}
                size="sm"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </p>

                <p className="truncate text-xs text-slate-500">
                  {displayRole}
                </p>
              </div>
            </div>

            {displayEmail ? (
              <p className="mt-2 truncate text-xs text-slate-400">
                {displayEmail}
              </p>
            ) : null}
          </div>

          {/* Menu items */}
          <div className="px-1.5 py-1">
            {items.map((item) => {
              const Icon = item.icon

              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.action()
                    closeMenu()
                  }}
                  className={cn(
                    'flex w-full items-center gap-3',
                    'rounded-lg px-3 py-2.5',
                    'text-left text-sm text-slate-700',
                    'transition-colors duration-150',
                    'hover:bg-slate-50',
                    'hover:text-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />

                  <span>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Logout */}
          <div className="border-t border-slate-100 px-1.5 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onLogout()
                closeMenu()
              }}
              className={cn(
                'flex w-full items-center gap-3',
                'rounded-lg px-3 py-2.5',
                'text-left text-sm text-slate-700',
                'transition-colors duration-150',
                'hover:bg-red-50 hover:text-red-700'
              )}
            >
              <LogOut className="h-4 w-4 shrink-0 text-slate-400" />

              <span>
                Sign out
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}


/* ============================================================
   HEADER
   ============================================================ */

/**
 * Top application bar.
 *
 * Desktop:
 * - Breadcrumb
 * - Page title
 * - Global search
 * - Notifications
 * - User menu
 *
 * Mobile:
 * - Menu button
 * - Page title
 * - Search button
 * - Notifications
 * - Avatar
 */
export default function Header({
  user,
  onLogout,
  onOpenMobileMenu,
}) {
  const { pathname } = useLocation()

  const page = getPageMeta(pathname)

  const [searchOpen, setSearchOpen] =
    useState(false)

  const [query, setQuery] =
    useState('')

  const toggleMobileSearch = () => {
    setSearchOpen(
      (current) => !current
    )
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30',
        'border-b border-slate-200',
        'bg-white/95 backdrop-blur-xl',
        'supports-[backdrop-filter]:bg-white/85'
      )}
    >
      <div className="flex min-h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">

        {/* ----------------------------------------------------
            MOBILE MENU
            ---------------------------------------------------- */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className={cn(
            '-ml-1 flex h-10 w-10 shrink-0',
            'items-center justify-center',
            'rounded-xl text-slate-500',
            'transition-all duration-150',
            'hover:bg-slate-100 hover:text-slate-700',
            'focus-visible:ring-2 focus-visible:ring-brand-500',
            'lg:hidden'
          )}
        >
          <Menu className="h-5 w-5" />
        </button>


        {/* ----------------------------------------------------
            PAGE INFORMATION
            ---------------------------------------------------- */}
        <div className="min-w-0 flex-1">

          {/* Desktop breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex"
          >
            <span className="font-medium">
              LiteCRM
            </span>

            <ChevronRight className="h-3 w-3 shrink-0" />

            <span className="truncate font-medium text-slate-600">
              {page.label}
            </span>
          </nav>

          {/* Page title */}
          <h1
            className={cn(
              'truncate text-base font-semibold',
              'tracking-tight text-slate-900',
              'sm:mt-0.5 sm:text-lg'
            )}
          >
            {page.label}
          </h1>
        </div>


        {/* ----------------------------------------------------
            HEADER ACTIONS
            ---------------------------------------------------- */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">

          {/* Desktop search */}
          <div className="hidden md:block">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search anything..."
              className="w-52 lg:w-64 xl:w-72"
            />
          </div>


          {/* Mobile search */}
          <Tooltip
            label={
              searchOpen
                ? 'Close search'
                : 'Search'
            }
            side="bottom"
            className="md:hidden"
          >
            <button
              type="button"
              onClick={toggleMobileSearch}
              aria-label={
                searchOpen
                  ? 'Close search'
                  : 'Search'
              }
              aria-expanded={searchOpen}
              className={cn(
                'flex h-10 w-10',
                'items-center justify-center',
                'rounded-xl text-slate-500',
                'transition-all duration-150',
                'hover:bg-slate-100 hover:text-slate-700',
                'focus-visible:ring-2 focus-visible:ring-brand-500',
                searchOpen &&
                  'bg-brand-50 text-brand-600'
              )}
            >
              {searchOpen ? (
                <X className="h-[18px] w-[18px]" />
              ) : (
                <Search className="h-[18px] w-[18px]" />
              )}
            </button>
          </Tooltip>


          {/* Notifications */}
          <NotificationsMenu />


          {/* Separator */}
          <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />


          {/* User */}
          <UserMenu
            user={user}
            onLogout={onLogout}
          />
        </div>
      </div>


      {/* ------------------------------------------------------
          MOBILE SEARCH PANEL
          ------------------------------------------------------ */}
      {searchOpen ? (
        <div
          className={cn(
            'border-t border-slate-100',
            'bg-slate-50/80',
            'px-3 py-3',
            'animate-slide-up',
            'md:hidden'
          )}
        >
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search anything..."
            className="w-full"
            autoFocus
          />
        </div>
      ) : null}
    </header>
  )
}