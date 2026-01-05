import { useState, useEffect, useCallback, useRef } from "react"

import { useDeviceInfo } from './mobile/useDeviceInfo'
import React from 'react';

export function useIsMobile() {
  const { isMobile } = useDeviceInfo()
  return isMobile
}

// Enhanced media query hook with SSR support and debouncing
export function useMediaQuery(query: string): boolean {
  // Always start with false to prevent hydration mismatches
  const [matches, setMatches] = useState<boolean>(false)
  const [isClient, setIsClient] = useState<boolean>(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentQueryRef = useRef<string>('')
  const isMountedRef = useRef<boolean>(true)
  const mediaQueryRef = useRef<MediaQueryList | null>(null)

  const debouncedSetMatches = useCallback((value: boolean, queryToCheck: string) => {
    // Clear any existing timer to prevent race conditions
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    
    debounceTimerRef.current = setTimeout(() => {
      // Only update if query hasn't changed and component is still mounted
      if (isMountedRef.current && currentQueryRef.current === queryToCheck) {
        setMatches(value)
      }
      debounceTimerRef.current = null
    }, 100) // 100ms debounce
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    currentQueryRef.current = query
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return
    }

    // Set isClient to true first
    setIsClient(true)

    try {
      const mediaQuery = window.matchMedia(query)
      mediaQueryRef.current = mediaQuery
      
      const handleChange = () => {
        if (isMountedRef.current && currentQueryRef.current === query) {
          debouncedSetMatches(mediaQuery.matches, query)
        }
      }
      
      // Use setTimeout to set initial value after state update
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && currentQueryRef.current === query) {
          setMatches(mediaQuery.matches)
        }
      }, 0)
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange)
      
      // Cleanup function to remove event listener and clear timeout
      return () => {
        isMountedRef.current = false
        clearTimeout(timeoutId)
        
        // Clean up media query listener
        if (mediaQueryRef.current) {
          mediaQueryRef.current.removeEventListener('change', handleChange)
          mediaQueryRef.current = null
        }
        
        // Clean up debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
      }
    } catch (error) {
      // Handle potential errors with matchMedia
      console.warn('Error setting up media query:', error)
      return () => {
        isMountedRef.current = false
      }
    }
  }, [query, debouncedSetMatches])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [])

  // Return false during SSR and before client-side hydration to prevent layout shifts
  // Only return actual matches value after we're confirmed to be on the client
  return isClient ? matches : false
}

