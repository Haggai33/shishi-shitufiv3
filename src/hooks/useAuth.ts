// src/hooks/useAuth.ts

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
// התיקון כאן: הוספנו את 'set' לרשימת הייבוא
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
  
  const { setUser, setOrganizerEvents, clearCurrentEvent } = useStore();

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
          // מקרה קצה: משתמש קיים ב-Auth אבל אין לו פרופיל ב-DB.
          // זה יכול לקרות אם תהליך ההרשמה נכשל באמצע.
          // ניצור לו פרופיל בסיסי.
          const newUserProfile: User = {
            id: user.uid,
            name: user.displayName || 'מארגן חדש',
            email: user.email || '',
            createdAt: Date.now(),
          };
          // כאן השתמשנו ב-'set' שהיה חסר
          await set(userProfileRef, newUserProfile); 
          setUser(newUserProfile);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setOrganizerEvents([]);
        clearCurrentEvent();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setOrganizerEvents, clearCurrentEvent]);

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
