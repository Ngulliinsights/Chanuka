import { useState, useEffect } from 'react';

import { deviceDetector } from '@/core/mobile/device-detector';

/**
 * React hook for accessing device detection information.
 * Provides reactive access to mobile, tablet, and desktop detection.
 *
 * @returns Object containing device type booleans
 */
export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState(() => deviceDetector.getDeviceInfo());

  useEffect(() => {
    const unsubscribe = deviceDetector.onChange(setDeviceInfo);
    return unsubscribe;
  }, []);

  return {
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
    isDesktop: deviceInfo.isDesktop,
  };
}
