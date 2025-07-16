// src/App.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';

// ייבוא של הדפים האמיתיים שיצרנו
import DashboardPage from './pages/DashboardPage';
import EventPage from './pages/EventPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import LoadingSpinner from './components/Common/LoadingSpinner';

function App() {
  const { user: authUser, isLoading: isAuthLoading } = useAuth();

  // בזמן שהאפליקציה בודקת אם המשתמש מחובר, נציג אנימציית טעינה
  if (isAuthLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* אם המשתמש מחובר, נתיב ההתחברות מעביר אותו לדאשבורד */}
        <Route 
          path="/login" 
          element={authUser ? <Navigate to="/dashboard" /> : <LoginPage />} 
        />
        
        {/* הדאשבורד הוא נתיב מוגן. רק משתמש מחובר יכול לגשת אליו. */}
        <Route 
          path="/dashboard" 
          element={authUser ? <DashboardPage /> : <Navigate to="/login" />} 
        />
        
        {/* עמוד האירוע הציבורי. נגיש לכולם */}
        <Route path="/event/:organizerId/:eventId" element={<EventPage />} />
        
        {/* הנתיב הראשי (/) מעביר לדאשבורד אם מחוברים, או להתחברות אם לא. */}
        <Route 
          path="/" 
          element={<Navigate to={authUser ? "/dashboard" : "/login"} />} 
        />
        
        {/* נתיב לכל מקרה אחר (404) */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
