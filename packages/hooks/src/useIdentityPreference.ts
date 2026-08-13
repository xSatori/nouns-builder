import * as React from 'react'

export const FARCASTER_PRIORITY_STORAGE_KEY = 'nouns-builder:farcaster-priority'
const PREFERENCE_EVENT = 'nouns-builder:farcaster-priority-change'

const readPreference = () =>
  typeof window !== 'undefined' &&
  window.localStorage.getItem(FARCASTER_PRIORITY_STORAGE_KEY) === 'true'

export const useIdentityPreference = () => {
  const [preferFarcaster, setPreferFarcasterState] = React.useState(false)

  React.useEffect(() => {
    const syncPreference = () => setPreferFarcasterState(readPreference())
    syncPreference()
    window.addEventListener('storage', syncPreference)
    window.addEventListener(PREFERENCE_EVENT, syncPreference)
    return () => {
      window.removeEventListener('storage', syncPreference)
      window.removeEventListener(PREFERENCE_EVENT, syncPreference)
    }
  }, [])

  const setPreferFarcaster = React.useCallback((enabled: boolean) => {
    window.localStorage.setItem(FARCASTER_PRIORITY_STORAGE_KEY, String(enabled))
    setPreferFarcasterState(enabled)
    window.dispatchEvent(new Event(PREFERENCE_EVENT))
  }, [])

  return { preferFarcaster, setPreferFarcaster }
}
