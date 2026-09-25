import { createContext, useContext } from 'react'
import { useLocalData } from '../hooks/useLocalData'

const DataContext = createContext(null)

export function DataProvider({ children, user }) {
  const store = useLocalData(user)
  const permissions = new Set(user?.permissions ?? [])
  const hasPermission = (permission) => permissions.has(permission)
  return <DataContext.Provider value={{ ...store, user, hasPermission }}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside a <DataProvider>')
  return context
}
