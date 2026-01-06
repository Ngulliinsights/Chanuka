/**
 * Hook for managing bottom sheet state
 */

export function useBottomSheet() {
  return {
    isOpen: false,
    open: () => {},
    close: () => {},
  };
}
