import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as AuthUser } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth, database } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { FirebaseService } from '../services/firebaseService';
import { ref, set, get } from 'firebase/database';
import { User } from '../types';

export let isCurrentlyLoggingOut = false;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setUserAdminStatus, clearAndUnsubscribeListeners } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: AuthUser | null) => {
      if (firebaseUser) {
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            createdAt: Date.now(),
            isAdmin: false,
          };
          await set(userRef, newUser);
          useStore.getState().setUser(newUser);
        } else {
          useStore.getState().setUser(snapshot.val());
        }
      }

      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const isAdmin = await FirebaseService.checkAdminStatus(firebaseUser.uid);
          setUserAdminStatus(isAdmin);
        } catch (error) {
          console.error("Failed to check admin status:", error);
          setUserAdminStatus(false);
        }
      } else {
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
