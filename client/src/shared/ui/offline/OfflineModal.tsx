/**
 * Simple Offline Modal Component
 */

import React from 'react';

interface OfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OfflineModal: React.FC<OfflineModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">You're Offline</h2>
        <p className="mb-4">
          You're currently offline. Some features may not be available until you reconnect.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default OfflineModal;


