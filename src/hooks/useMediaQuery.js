import { useEffect, useState } from 'react'

/**
 * Returns true when the given media query matches. SSR-safe and updates live.
 * Used to switch between the 3D desktop experience and the mobile scroll page.
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    // Set once in case it changed between render and effect.
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
