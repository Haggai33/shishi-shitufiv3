// src/pages/NotFoundPage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const NotFoundPage: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center p-4">
        <AlertTriangle size={64} className="text-orange-400" />
        <h1 className="mt-6 text-4xl font-bold text-gray-800">404</h1>
        <p className="mt-2 text-lg text-gray-600">אופס! נראה שהעמוד שחיפשת לא קיים.</p>
        <Link 
            to="/" 
            className="mt-8 inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
        >
            חזור לדף הבית
        </Link>
    </div>
);

export default NotFoundPage;
