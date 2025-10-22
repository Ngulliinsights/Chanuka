import { useState, useEffect } from "react"
import { logger } from '@/utils/browser-logger';

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// Enhanced media query hook with SSR support
export function useMediaQuery(query: string): boolean {
  // Always start with false to prevent hydration mismatches
  const [matches, setMatches] = useState<boolean>(false)
  const [isClient, setIsClient] = useState<boolean>(false)

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return
    }

    // Set isClient to true first
    setIsClient(true)

    const mediaQuery = window.matchMedia(query)
    const handleChange = () => setMatches(mediaQuery.matches)
    
    // Use setTimeout to set initial value after state update
    const timeoutId = setTimeout(() => {
      setMatches(mediaQuery.matches)
    }, 0)
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)
    
    // Cleanup function to remove event listener and clear timeout
    return () => {
      clearTimeout(timeoutId)
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  // Return false during SSR and before client-side hydration to prevent layout shifts
  // Only return actual matches value after we're confirmed to be on the client
  return isClient ? matches : false
}
