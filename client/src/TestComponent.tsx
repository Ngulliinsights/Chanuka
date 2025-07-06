
import React from 'react';

export default function TestComponent() {
  React.useEffect(() => {
    console.log('Simplified App mounted for debugging');
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Chanuka Platform</h1>
      <p className="text-gray-600">App is working correctly!</p>
    </div>
  );
}
