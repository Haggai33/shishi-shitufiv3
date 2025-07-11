import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { FirebaseService } from '../services/firebaseService';

// Global flag to handle logout race condition.
// This is a simple, effective way to manage state during the async logout process.
export let isCurrentlyLoggingOut = false;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setUserAdminStatus, clearAndUnsubscribeListeners } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // If a user is logged in, check their admin status
        try {
          const isAdmin = await FirebaseService.checkAdminStatus(firebaseUser.uid);
          setUserAdminStatus(isAdmin);
        } catch (error) {
          console.error("Failed to check admin status:", error);
          setUserAdminStatus(false); // Default to false on any error
        }
      } else {
        // If the user is logged out, ensure admin status is reset and listeners are cleared
        setUserAdminStatus(false);
        clearAndUnsubscribeListeners();
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, [setUserAdminStatus, clearAndUnsubscribeListeners]);

  const logout = async () => {
    isCurrentlyLoggingOut = true;
    try {
      clearAndUnsubscribeListeners();
      await signOut(auth);
      toast.success('התנתקת בהצלחה');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('שגיאה בעת ההתנתקות');
    } finally {
      // Reset the flag after a short delay to ensure all onCancel callbacks have fired.
      setTimeout(() => {
        isCurrentlyLoggingOut = false;
      }, 500);
    }
  };

  return {
    user,
    isLoading,
    logout,
  };
}
