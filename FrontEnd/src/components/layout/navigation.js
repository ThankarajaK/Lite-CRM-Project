import {
  BarChart3,
  Briefcase,
  CheckSquare,
  LayoutDashboard,
  Monitor,
  Settings,
  Users,
  UserPlus,
  Clock3,
  BookOpen,
  Megaphone,
  UserCog,
} from 'lucide-react'

/** Main sidebar navigation. Order here is the order on screen. */

export const NAV_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    subtitle: 'Overview of your sales activity',
  },

  {
    to: '/leads',
    label: 'Leads',
    icon: UserPlus,
    subtitle: 'Capture leads and qualify them',
  },

  {
    to: '/contacts',
    label: 'Contacts',
    icon: Users,
    subtitle: 'Log activity, then move a contact to Deals',
  },

  {
    to: '/deals',
    label: 'Deals',
    icon: Briefcase,
    subtitle: 'Proposal → Negotiation → Won or Lost',
  },

  {
    to: '/tasks',
    label: 'Tasks',
    icon: CheckSquare,
    subtitle: 'Manage your follow-ups and activities',
  },

  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    subtitle: 'Understand your sales performance',
  },

  {
    label: 'Course Interested',
    to: '/course-interested',
    icon: BookOpen,
  },

  {
    to: '/learning-modes',
    label: 'Learning Modes',
    icon: Monitor,
    subtitle: 'Manage lead learning modes',
    permission: 'manage_catalogue',
  },

  {
    to: '/course-durations',
    label: 'Course Durations',
    icon: Clock3,
    subtitle: 'Manage lead course durations',
    permission: 'manage_catalogue',
  },

  {
    to: '/lead-sources',
    label: 'Lead Sources',
    icon: Megaphone,
    subtitle: 'Manage lead sources',
    permission: 'manage_catalogue',
  },

  {
    to: '/user-management',
    label: 'User Management',
    icon: UserCog,
    subtitle: 'Manage workspace users',
    permission: 'manage_users',
  },
]

/** Pinned to the bottom of the sidebar. */

export const BOTTOM_NAV_ITEMS = [
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    subtitle: 'Workspace and account preferences',
  },
]

export const ALL_NAV_ITEMS = [
  ...NAV_ITEMS,
  ...BOTTOM_NAV_ITEMS,
]

/** Look up the page title/subtitle for the header from the current path. */

export function getPageMeta(pathname) {
  const match =
    ALL_NAV_ITEMS.find((item) => item.to === pathname) ??
    ALL_NAV_ITEMS
      .filter((item) => item.to !== '/')
      .find((item) => pathname.startsWith(item.to))

  return (
    match ?? {
      label: 'Not found',
      subtitle: '',
      to: pathname,
    }
  )
}