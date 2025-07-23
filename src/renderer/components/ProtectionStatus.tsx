import React from 'react';

interface ProtectionStatusProps {
  isProtected: boolean;
}

const ProtectionStatus: React.FC<ProtectionStatusProps> = ({ isProtected }) => {
  if (!isProtected) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      <span className="font-medium">🔒 Content Protected</span>
    </div>
  );
};

export default ProtectionStatus;
