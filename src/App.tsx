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
import { auth } from './lib/firebase';
import { signInAnonymously, signOut } from 'firebase/auth';

function App() {
  const { 
    initializeUser, 
    setEvents, 
    setMenuItems, 
    setAssignments, 
    setLoading, 
    isLoading,
    user,
    setListenerUnsubscribers,
    clearAndUnsubscribeListeners
  } = useStore();
  
  const isAdmin = user?.isAdmin || false;
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  
  const [currentView, setCurrentView] = useState<'events' | 'admin'>('events');
  const [showEventForm, setShowEventForm] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Effect 1: Handles Authentication Flow & User Initialization
  useEffect(() => {
    if (isAuthLoading) {
      setLoading(true);
      return;
    }
    
    if (authUser) {
      initializeUser(authUser);
    } else {
      signInAnonymously(auth).catch(err => {
        console.error("Anonymous sign-in failed:", err);
        setInitializationError("שגיאה בהתחברות למערכת. אנא רענן את הדף.");
        setLoading(false);
      });
    }
  }, [isAuthLoading, authUser, initializeUser, setLoading]);

  // Effect 2: Sets up Firebase Listeners ONCE user is authenticated
  useEffect(() => {
    if (!authUser) {
      // On logout or initial load before auth, ensure any previous listeners are cleared.
      clearAndUnsubscribeListeners();
      return;
    }

    console.log('Setting up Firebase listeners for user:', authUser.uid);
    setLoading(true); // Start loading before setting up listeners
    
    try {
      const unsubscribeEvents = FirebaseService.subscribeToEvents(setEvents);
      const unsubscribeMenuItems = FirebaseService.subscribeToMenuItems(setMenuItems);
      const unsubscribeAssignments = FirebaseService.subscribeToAssignments((data) => {
        setAssignments(data);
        setLoading(false); // End loading only after initial data has arrived
      });
      
      // Store the unsubscribe functions in the global state
      setListenerUnsubscribers([
        unsubscribeEvents,
        unsubscribeMenuItems,
        unsubscribeAssignments,
      ]);
      
      console.log('Firebase listeners set up successfully');

      // The main cleanup is now handled by clearAndUnsubscribeListeners,
      // but this return is still good practice for when the component unmounts entirely.
      return () => {
        clearAndUnsubscribeListeners();
      };
    } catch (error) {
      console.error('Error setting up listeners:', error);
      setInitializationError('שגיאה בטעינת הנתונים.');
      setLoading(false);
    }
  }, [authUser, setEvents, setMenuItems, setAssignments, setLoading, setListenerUnsubscribers, clearAndUnsubscribeListeners]);

  // Effect 3: Timeout for loading state
  useEffect(() => {
    let timeoutId: number | undefined;

    if (isLoading) {
      timeoutId = window.setTimeout(() => {
        if (useStore.getState().isLoading) {
          console.error("App is stuck on loading for over 15 seconds. Forcing a refresh.");
          setInitializationError("האפליקציה נתקעה בטעינה. מנסה לרענן...");
          
          signOut(auth).finally(() => {
              window.location.reload();
          });
        }
      }, 15000); 
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">מאתחל את האפליקציה...</p>
        </div>
      </div>
    );
  }

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
          <EventsList />
        )}
        {currentView === 'admin' && isAdmin && <AdminPanel />}
      </main>

      {showEventForm && currentView === 'events' && isAdmin && (
        <EventForm
          onClose={() => setShowEventForm(false)}
        />
      )}

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
