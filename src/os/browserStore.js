import { useSyncExternalStore } from 'react'

// Which project replica the browser window (windows/BrowserWindow.jsx) is
// showing. Windows are opened by id only (OS.jsx), so the folder sets this
// first and then opens the 'browser' window.

let current = null
const listeners = new Set()

export function showReplica(id) {
  current = id
  listeners.forEach((l) => l())
}

export function useCurrentReplica() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}
