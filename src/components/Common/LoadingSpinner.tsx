// src/components/Common/LoadingSpinner.tsx

import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500"></div>
  </div>
);

export default LoadingSpinner;
