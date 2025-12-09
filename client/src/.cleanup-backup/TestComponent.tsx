

import { useEffect } from 'react';

import { logger } from '@client/utils/logger';

export default function TestComponent() {
  useEffect(() => {
    logger.info('Simplified App mounted for debugging', { component: 'Chanuka' });
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Chanuka Platform</h1>
      <p className="text-gray-600">App is working correctly!</p>
    </div>
  );
}

