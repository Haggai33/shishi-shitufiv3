import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { FirebaseService } from '../services/firebaseService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setUserAdminStatus } = useStore();

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
        // If the user is logged out, reset the admin status
        setUserAdminStatus(false);
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, [setUserAdminStatus]);

  const logout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged יטפל באיפוס המצב אוטומטית
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    isLoading,
    logout,
  };
}
