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
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import SearchBar from '../ui/SearchBar'
import Tooltip from '../ui/Tooltip'
import { useClickOutside, useEscapeKey } from '../../hooks/useDismissable'
import { notifications as seedNotifications } from '../../data/mockData'
import { getPageMeta } from './navigation'
import { cn, formatRelativeTime } from '../../utils/format'

function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(seedNotifications)
  const ref = useClickOutside(open, () => setOpen(false))
  useEscapeKey(open, () => setOpen(false))

  const unread = items.filter((item) => item.unread).length

  return (
    <div ref={ref} className="relative">
      <Tooltip label="Notifications" side="bottom">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          aria-expanded={open}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </span>
          ) : null}
        </button>
      </Tooltip>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => setItems((current) => current.map((item) => ({ ...item, unread: false })))}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn('px-4 py-3 transition-colors hover:bg-slate-50', item.unread && 'bg-brand-50/40')}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                      item.unread ? 'bg-brand-600' : 'bg-transparent'
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{item.body}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(item.timestamp)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(open, () => setOpen(false))
  useEscapeKey(open, () => setOpen(false))

  const navigate = useNavigate()
  const items = [
    { label: 'Your profile', icon: User, action: () => {} },
    { label: 'Settings', icon: Settings, action: () => navigate('/settings') },
    { label: 'Help & support', icon: HelpCircle, action: () => {} },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-slate-100"
      >
        <Avatar name={user?.name || "User"} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-slate-900">
            {user?.name || "User"}
          </span>
          <span className="block text-xs leading-tight text-slate-500">{user?.role || ""}</span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop animate-fade-in"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">{user?.name || "User"}</p>
            <p className="truncate text-xs text-slate-500">{user?.email || ""}</p>
          </div>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => { item.action(); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <item.icon className="h-4 w-4 text-slate-400" />
              {item.label}
            </button>
          ))}
          <div className="mt-1 border-t border-slate-100 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => { onLogout(); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Top bar: page title and breadcrumb on the left,
 * search / notifications / user menu on the right.
 */
export default function Header({ user, onLogout, onOpenMobileMenu }) {
  const { pathname } = useLocation()
  const page = getPageMeta(pathname)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
            <span>LiteCRM</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-600">{page.label}</span>
          </nav>
          <h1 className="truncate text-base font-semibold text-slate-900">{page.label}</h1>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search: inline on desktop, toggled on mobile */}
          <div className="hidden md:block">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search anything..."
              className="w-56 lg:w-72"
            />
          </div>
          <Tooltip label="Search" side="bottom" className="md:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen((current) => !current)}
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
          </Tooltip>

          <NotificationsMenu />
          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </div>

      {searchOpen ? (
        <div className="border-t border-slate-200 px-4 py-2.5 md:hidden">
          <SearchBar value={query} onChange={setQuery} placeholder="Search anything..." />
        </div>
      ) : null}
    </header>
  )
}
