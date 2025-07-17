// src/store/useStore.ts

import { create } from 'zustand';
import { User, ShishiEvent, MenuItem, Assignment, Participant } from '../types';

// הגדרת המצב הגלובלי של האפליקציה - עכשיו הוא פשוט יותר ומותאם Multi-Tenant
interface AppState {
  user: User | null; // המשתמש המחובר (מארגן או אורח אנונימי)
  currentEvent: ShishiEvent | null; // האירוע הספציפי שבו המשתמש צופה כרגע
  isLoading: boolean;
  
  // פעולות לעדכון המצב
  setUser: (user: User | null) => void;
  setCurrentEvent: (event: ShishiEvent | null) => void;
  setLoading: (loading: boolean) => void;
  clearCurrentEvent: () => void;
  
  // פעולות לעדכון נתונים בתוך האירוע הנוכחי
  updateMenuItem: (itemId: string, updates: Partial<MenuItem>) => void;
  addMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (itemId: string) => void;
  
  updateAssignment: (assignmentId: string, updates: Partial<Assignment>) => void;
  addAssignment: (assignment: Assignment) => void;
  deleteAssignment: (assignmentId: string) => void;
  
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // מצב התחלתי
  user: null,
  currentEvent: null,
  isLoading: true, // מתחילים במצב טעינה

  // הגדרת הפעולות הבסיסיות
  setUser: (user) => set({ user }),
  
  // פעולה זו תקבל עכשיו את כל אובייקט האירוע מ-Firebase
  setCurrentEvent: (event) => set({ currentEvent: event, isLoading: false }),
  
  setLoading: (loading) => set({ isLoading: loading }),

  // פעולה לניקוי נתוני האירוע הנוכחי בעת יציאה מהעמוד
  clearCurrentEvent: () => set({ currentEvent: null }),

  // ===============================
  // פעולות לעדכון פריטי תפריט
  // ===============================
  
  updateMenuItem: (itemId, updates) => set((state) => {
    if (!state.currentEvent?.menuItems) return state;
    
    const updatedMenuItems = {
      ...state.currentEvent.menuItems,
      [itemId]: {
        ...state.currentEvent.menuItems[itemId],
        ...updates
      }
    };
    
    return {
      currentEvent: {
        ...state.currentEvent,
        menuItems: updatedMenuItems
      }
    };
  }),

  addMenuItem: (item) => set((state) => {
    if (!state.currentEvent) return state;
    
    const updatedMenuItems = {
      ...state.currentEvent.menuItems,
      [item.id]: {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        notes: item.notes,
        isRequired: item.isRequired,
        creatorId: item.creatorId,
        creatorName: item.creatorName,
        createdAt: item.createdAt,
        assignedTo: item.assignedTo,
        assignedToName: item.assignedToName,
        assignedAt: item.assignedAt
      }
    };
    
    return {
      currentEvent: {
        ...state.currentEvent,
        menuItems: updatedMenuItems
      }
    };
  }),

  deleteMenuItem: (itemId) => set((state) => {
    if (!state.currentEvent?.menuItems) return state;
    
    const updatedMenuItems = { ...state.currentEvent.menuItems };
    delete updatedMenuItems[itemId];
    
    // גם מוחקים את כל השיבוצים הקשורים לפריט זה
    const updatedAssignments = { ...state.currentEvent.assignments };
    Object.keys(updatedAssignments).forEach(assignmentId => {
      if (updatedAssignments[assignmentId].menuItemId === itemId) {
        delete updatedAssignments[assignmentId];
      }
    });
    
    return {
      currentEvent: {
        ...state.currentEvent,
        menuItems: updatedMenuItems,
        assignments: updatedAssignments
      }
    };
  }),

  // ===============================
  // פעולות לעדכון שיבוצים
  // ===============================
  
  updateAssignment: (assignmentId, updates) => set((state) => {
    if (!state.currentEvent?.assignments) return state;
    
    const updatedAssignments = {
      ...state.currentEvent.assignments,
      [assignmentId]: {
        ...state.currentEvent.assignments[assignmentId],
        ...updates
      }
    };
    
    return {
      currentEvent: {
        ...state.currentEvent,
        assignments: updatedAssignments
      }
    };
  }),

  addAssignment: (assignment) => set((state) => {
    if (!state.currentEvent) return state;
    
    const updatedAssignments = {
      ...state.currentEvent.assignments,
      [assignment.id]: {
        menuItemId: assignment.menuItemId,
        userId: assignment.userId,
        userName: assignment.userName,
        quantity: assignment.quantity,
        notes: assignment.notes,
        status: assignment.status,
        assignedAt: assignment.assignedAt
      }
    };
    
    return {
      currentEvent: {
        ...state.currentEvent,
        assignments: updatedAssignments
      }
    };
  }),

  deleteAssignment: (assignmentId) => set((state) => {
    if (!state.currentEvent?.assignments) return state;
    
    const updatedAssignments = { ...state.currentEvent.assignments };
    delete updatedAssignments[assignmentId];
    
    return {
      currentEvent: {
        ...state.currentEvent,
        assignments: updatedAssignments
      }
    };
  }),

  // ===============================
  // פעולות לעדכון משתתפים
  // ===============================
  
  addParticipant: (participant) => set((state) => {
    if (!state.currentEvent) return state;
    
    const updatedParticipants = {
      ...state.currentEvent.participants,
      [participant.id]: {
        name: participant.name,
        joinedAt: participant.joinedAt
      }
    };
    
    return {
      currentEvent: {
        ...state.currentEvent,
        participants: updatedParticipants
      }
    };
  }),

  removeParticipant: (participantId) => set((state) => {
    if (!state.currentEvent?.participants) return state;
    
    const updatedParticipants = { ...state.currentEvent.participants };
    delete updatedParticipants[participantId];
    
    return {
      currentEvent: {
        ...state.currentEvent,
        participants: updatedParticipants
      }
    };
  }),
}));

// ===============================
// Selectors - סלקטורים מותאמים
// ===============================

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

/**
 * סלקטור שמחזיר פריטי תפריט לפי קטגוריה
 */
export const selectMenuItemsByCategory = (category: string) => (state: AppState): MenuItem[] => {
  const menuItems = selectMenuItems(state);
  return menuItems.filter(item => item.category === category);
};

/**
 * סלקטור שמחזיר שיבוצים של משתמש ספציפי
 */
export const selectUserAssignments = (userId: string) => (state: AppState): Assignment[] => {
  const assignments = selectAssignments(state);
  return assignments.filter(assignment => assignment.userId === userId);
};

/**
 * סלקטור שמחזיר פריטים פנויים (לא משובצים)
 */
export const selectAvailableItems = (state: AppState): MenuItem[] => {
  const menuItems = selectMenuItems(state);
  return menuItems.filter(item => !item.assignedTo);
};

/**
 * סלקטור שמחזיר פריטים משובצים
 */
export const selectAssignedItems = (state: AppState): MenuItem[] => {
  const menuItems = selectMenuItems(state);
  return menuItems.filter(item => item.assignedTo);
};