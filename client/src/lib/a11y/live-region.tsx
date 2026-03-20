import React, { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearAfter?: number;
}

export function LiveRegion({ message, politeness = 'polite', clearAfter = 5000 }: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = React.useState(message);

  useEffect(() => {
    setCurrentMessage(message);

    if (clearAfter && message) {
      const timer = setTimeout(() => setCurrentMessage(''), clearAfter);
      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
}

export function useLiveRegion() {
  const [message, setMessage] = React.useState('');

  const announce = (text: string, politeness: 'polite' | 'assertive' = 'polite') => {
    setMessage('');
    setTimeout(() => setMessage(text), 100);
  };

  return { message, announce, LiveRegion: () => <LiveRegion message={message} /> };
}
