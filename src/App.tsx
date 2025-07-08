import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import { FirebaseService } from './services/firebaseService';
import { Header } from './components/Layout/Header';
import { EventsList } from './components/Events/EventsList';
import { AdminPanel } from './components/Admin/AdminPanel';
import { EventForm } from './components/Admin/EventForm';
import { AlertCircle } from 'lucide-react';

function App() {
  const { 
    initializeUser, 
    setEvents, 
    setMenuItems, 
    setAssignments, 
    setLoading, 
    setError,
    setIsAdmin,
    isLoading,
    error 
  } = useStore();
  
  const { isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<'events' | 'admin'>('events');
  const [showEventForm, setShowEventForm] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        setInitializationError(null);
        
        console.log('Initializing app...');
        
        // Initialize user
        initializeUser();
        
        // Update admin status from auth
        setIsAdmin(isAdmin);
        
        console.log('Setting up Firebase listeners...');
        
        // Set up Firebase listeners with error handling
        const unsubscribeEvents = FirebaseService.subscribeToEvents((events) => {
          console.log('Events received from Firebase:', events.length, events);
          setEvents(events);
        });
        
        const unsubscribeMenuItems = FirebaseService.subscribeToMenuItems((items) => {
          console.log('Menu items received:', items.length);
          setMenuItems(items);
        });
        
        const unsubscribeAssignments = FirebaseService.subscribeToAssignments((assignments) => {
          console.log('Assignments received:', assignments.length);
          setAssignments(assignments);
          setLoading(false);
        });

        console.log('Firebase listeners set up successfully');

        // Cleanup subscriptions
        return () => {
          console.log('Cleaning up Firebase listeners');
          unsubscribeEvents();
          unsubscribeMenuItems();
          unsubscribeAssignments();
        };
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitializationError('שגיאה באתחול האפליקציה. אנא רענן את הדף.');
        setLoading(false);
      }
    };

    const cleanup = initializeApp();
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [initializeUser, setEvents, setMenuItems, setAssignments, setLoading, setIsAdmin, isAdmin]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען את האפליקציה...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (initializationError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-md w-full text-center">
          <div className="bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">שגיאה באתחול</h2>
          <p className="text-gray-600 mb-4">{initializationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            רענן דף
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="pb-8">
        {currentView === 'events' && (
          <EventsList onCreateEvent={isAdmin ? () => setShowEventForm(true) : undefined} />
        )}
        {currentView === 'admin' && isAdmin && <AdminPanel />}
      </main>

      {/* Event Form Modal - Available from events view for admins */}
      {showEventForm && currentView === 'events' && isAdmin && (
        <EventForm
          onClose={() => setShowEventForm(false)}
        />
      )}

      {/* Toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            maxWidth: '400px'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff'
            }
          }
        }}
      />
    </div>
  );
}

export default App;