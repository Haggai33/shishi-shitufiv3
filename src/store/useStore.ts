// src/store/useStore.ts

import { create } from 'zustand';
import { User, ShishiEvent, MenuItem, Assignment, Participant } from '../types';

// הגדרת המצב הגלובלי של האפליקציה
interface AppState {
  user: User | null; // המשתמש המחובר (תמיד יהיה מארגן)
  organizerEvents: ShishiEvent[]; // רשימת האירועים של המארגן (עבור הדאשבורד)
  currentEvent: ShishiEvent | null; // האירוע הספציפי שבו המשתמש צופה כרגע
  isLoading: boolean;
  
  // פעולות לעדכון המצב
  setUser: (user: User | null) => void;
  setOrganizerEvents: (events: ShishiEvent[]) => void;
  setCurrentEvent: (event: ShishiEvent | null) => void;
  setLoading: (loading: boolean) => void;
  clearCurrentEvent: () => void;
}

export const useStore = create<AppState>((set) => ({
  // מצב התחלתי
  user: null,
  organizerEvents: [],
  currentEvent: null,
  isLoading: true, // מתחילים במצב טעינה

  // הגדרת הפעולות
  setUser: (user) => set({ user }),
  
  setOrganizerEvents: (events) => set({ organizerEvents: events, isLoading: false }),
  
  setCurrentEvent: (event) => set({ currentEvent: event, isLoading: false }),
  
  setLoading: (loading) => set({ isLoading: loading }),

  // פעולה לניקוי נתוני האירוע הנוכחי בעת יציאה מהעמוד
  clearCurrentEvent: () => set({ currentEvent: null }),
}));

// --- Selectors ---
// פונקציות עזר נוחות לשליפת נתונים מקוננים מהאירוע הנוכחי.
// זה מונע לוגיקה מסובכת בתוך הרכיבים.

/**
 * סלקטור שמחזיר מערך של פריטי תפריט מהאירוע הנוכחי.
 */
export const selectMenuItems = (state: AppState): MenuItem[] => {
  const event = state.currentEvent;
  if (!event?.menuItems) return [];
  
  // Firebase מחזיר אובייקט, אנחנו ממירים אותו למערך ומוסיפים את המזהה
  return Object.entries(event.menuItems).map(([id, item]) => ({
    ...(item as Omit<MenuItem, 'id'>),
    id,
    eventId: event.id, // מוסיפים את מזהה האירוע לנוחות
  }));
};

/**
 * סלקטור שמחזיר מערך של שיבוצים מהאירוע הנוכחי.
 */
export const selectAssignments = (state: AppState): Assignment[] => {
  const event = state.currentEvent;
  if (!event?.assignments) return [];
  
  return Object.entries(event.assignments).map(([id, assignment]) => ({
    ...(assignment as Omit<Assignment, 'id'>),
    id,
    eventId: event.id,
  }));
};

/**
 * סלקטור שמחזיר מערך של משתתפים מהאירוע הנוכחי.
 */
export const selectParticipants = (state: AppState): Participant[] => {
    const event = state.currentEvent;
    if (!event?.participants) return [];

    return Object.entries(event.participants).map(([id, participant]) => ({
        ...(participant as Omit<Participant, 'id'>),
        id,
    }));
};
