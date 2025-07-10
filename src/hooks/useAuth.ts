import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useStore } from '../store/useStore';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setIsAdmin } = useStore(); // שימוש ב-setIsAdmin מה-store

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // אם המשתמש התנתק, נאפס את סטטוס המנהל ב-store
      if (!firebaseUser) {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [setIsAdmin]);

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