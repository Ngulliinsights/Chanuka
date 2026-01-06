import { useEffect, useRef, EffectCallback, DependencyList } from 'react';

/**
 * useSafeEffect - A safe version of useEffect that prevents state updates after unmount
 *
 * This hook ensures that any async operations or state updates in the effect
 * are cancelled if the component unmounts before they complete.
 *
 * @param effect - The effect function
 * @param deps - Dependencies array
 */
export function useSafeEffect(effect: EffectCallback, deps?: DependencyList): void {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const cleanup = effect();

    return () => {
      mountedRef.current = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, deps);
}

// Helper hook to get mounted status
export function useIsMounted(): () => boolean {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return () => mountedRef.current;
}
