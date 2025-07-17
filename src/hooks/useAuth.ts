// src/hooks/useAuth.ts

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { User } from '../types';

/**
 * Hook לניהול מצב האימות - מותאם לארכיטקטורת Multi-Tenant
 * מאזין לשינויים במצב ההתחברות ומסנכרן עם ה-Store
 */
export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { setUser, clearCurrentEvent } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        setFirebaseUser(user);
        
        // טעינת פרופיל המשתמש מ-Database
        const userProfileRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userProfileRef);

        if (snapshot.exists()) {
          setUser(snapshot.val() as User);
        } else {
          // יצירת פרופיל חדש למשתמש חדש
          const newUserProfile: User = {
            id: user.uid,
            name: user.displayName || 'משתמש חדש',
            email: user.email || '',
            createdAt: Date.now(),
          };
          await set(userProfileRef, newUserProfile); 
          setUser(newUserProfile);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        clearCurrentEvent();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, clearCurrentEvent]);

  return {
    user: firebaseUser,
    isLoading,
  };
}