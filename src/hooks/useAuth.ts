// src/hooks/useAuth.ts

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { ref, get, set } from 'firebase/database'; 
import toast from 'react-hot-toast';
import { auth, database } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { User } from '../types';

/**
 * Hook מותאם לניהול מצב האימות באפליקציית Multi-Tenant.
 * מאזין לשינויים במצב ההתחברות של המשתמש, מסנכרן את המידע עם ה-Store הגלובלי,
 * ומספק פונקציית התנתקות.
 */
export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // <<< שינוי: הסרנו את setOrganizerEvents
  const { setUser, clearCurrentEvent } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        setFirebaseUser(user);
        
        const userProfileRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userProfileRef);

        if (snapshot.exists()) {
          setUser(snapshot.val() as User);
        } else {
          const newUserProfile: User = {
            id: user.uid,
            name: user.displayName || 'מארגן חדש',
            email: user.email || '',
            createdAt: Date.now(),
          };
          await set(userProfileRef, newUserProfile); 
          setUser(newUserProfile);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        // <<< שינוי: הסרנו את הקריאה ל-setOrganizerEvents([])
        clearCurrentEvent();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  // <<< שינוי: הסרנו את setOrganizerEvents ממערך התלויות
  }, [setUser, clearCurrentEvent]);

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('התנתקת בהצלחה');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('שגיאה בעת ההתנתקות');
    }
  };

  return {
    user: firebaseUser,
    isLoading,
    logout,
  };
}