import React from 'react';

interface ConfirmationModalProps {
  message: string;
  options: {
    label: string;
    onClick: () => void;
    className?: string;
  }[];
  onClose: () => void;
}

export function ConfirmationModal({ message, options, onClose }: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">אישור פעולה</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{message}</p>
        </div>
        <div className="flex justify-end p-4 bg-gray-50 rounded-b-xl space-x-2 rtl:space-x-reverse">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={option.onClick}
              className={`px-4 py-2 rounded-md ${option.className || 'bg-gray-200 text-gray-800'}`}
            >
              {option.label}
            </button>
          ))}
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
