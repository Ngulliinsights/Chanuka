import { useState, useEffect, useCallback } from 'react';

export function useKeyboardFocus() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const getFocusClasses = useCallback(
    (baseClasses: string = '') => {
      const focusClasses = isKeyboardUser
        ? 'focus:outline-2 focus:outline-blue-500 focus:outline-offset-2'
        : 'focus:outline-none';
      return `${baseClasses} ${focusClasses}`.trim();
    },
    [isKeyboardUser]
  );

  return { isKeyboardUser, getFocusClasses };
}
