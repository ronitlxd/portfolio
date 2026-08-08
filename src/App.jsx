import { useEffect } from 'react'
import useMediaQuery from './hooks/useMediaQuery'
import Experience from './scene/Experience'
import MobilePage from './mobile/MobilePage'

/**
 * Desktop / wide screens: the full 3D room + Windows 98 OS on the CRT.
 * Phones / narrow screens (<= 820px): a clean single-column scroll page with
 * the same content. The 3D scene is not mounted at all on mobile.
 */
export default function App() {
  const isMobile = useMediaQuery('(max-width: 820px)')

  useEffect(() => {
    // The mobile page needs the document to scroll; the 3D scene locks it.
    document.body.classList.toggle('allow-scroll', isMobile)
    return () => document.body.classList.remove('allow-scroll')
  }, [isMobile])

  return isMobile ? <MobilePage /> : <Experience />
}
