import { create } from 'zustand';
import { User as AuthUser } from 'firebase/auth';
import { User, ShishiEvent, MenuItem, Assignment, AppState } from '../types';
import { saveUserToLocalStorage, getUserFromLocalStorage } from '../utils/userUtils';

interface StoreActions {
  // User actions
  setUser: (user: User | null) => void;
  initializeUser: (authUser: AuthUser) => void;
  
  // Events actions
  setEvents: (events: ShishiEvent[]) => void;
  addEvent: (event: ShishiEvent) => void;
  updateEvent: (eventId: string, updates: Partial<ShishiEvent>) => void;
  deleteEvent: (eventId: string) => void;
  
  // Menu items actions
  setMenuItems: (items: MenuItem[]) => void;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (itemId: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (itemId: string) => void;
  
  // Assignments actions
  setAssignments: (assignments: Assignment[]) => void;
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (assignmentId: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (assignmentId: string) => void;
  
  // UI state actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
}

export const useStore = create<AppState & StoreActions>((set, get) => ({
  // Initial state
  user: null,
  events: [],
  menuItems: [],
  assignments: [],
  isLoading: false,
  error: null,
  isAdmin: false,

  // User actions
  setUser: (user) => set({ user }),
  
  initializeUser: (authUser) => {
    if (!authUser) {
      console.error("initializeUser was called without an authenticated user.");
      return;
    }
    try {
      const localDetails = getUserFromLocalStorage(authUser.uid);

      const finalUser: User = {
        id: authUser.uid,
        name: authUser.displayName || localDetails?.name || '', // תן עדיפות לשם מ-Firebase אם קיים
        phone: localDetails?.phone || '',
        email: authUser.email || localDetails?.email || '',
        isAdmin: get().isAdmin,
        createdAt: localDetails?.createdAt || Date.now(),
      };

      saveUserToLocalStorage(finalUser);
      set({ user: finalUser });
      
      console.log('User initialized successfully:', { 
        uid: finalUser.id, 
        hasName: !!finalUser.name,
        isAdmin: finalUser.isAdmin 
      });
    } catch (error) {
      console.error('Error initializing user:', error);
      set({ error: 'שגיאה באתחול המשתמש' });
    }
  },

  // Events actions
  setEvents: (events) => set({ events }),
  
  addEvent: (event) => set((state) => ({
    events: [...state.events, event]
  })),
  
  updateEvent: (eventId, updates) => set((state) => ({
    events: state.events.map(event => 
      event.id === eventId ? { ...event, ...updates, updatedAt: Date.now() } : event
    )
  })),
  
  deleteEvent: (eventId) => set((state) => ({
    events: state.events.filter(event => event.id !== eventId),
    menuItems: state.menuItems.filter(item => item.eventId !== eventId),
    assignments: state.assignments.filter(assignment => assignment.eventId !== eventId)
  })),

  // Menu items actions
  setMenuItems: (items) => set({ menuItems: items }),
  
  addMenuItem: (item) => set((state) => ({
    menuItems: [...state.menuItems, item]
  })),
  
  updateMenuItem: (itemId, updates) => set((state) => ({
    menuItems: state.menuItems.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    )
  })),
  
  deleteMenuItem: (itemId) => set((state) => ({
    menuItems: state.menuItems.filter(item => item.id !== itemId),
    assignments: state.assignments.filter(assignment => assignment.menuItemId !== itemId)
  })),

  // Assignments actions
  setAssignments: (assignments) => {
    console.log('Setting assignments in store:', assignments.length);
    set({ assignments });
  },
  
  addAssignment: (assignment) => set((state) => {
    console.log('Adding assignment to store:', assignment.id);
    return {
      assignments: [...state.assignments, assignment]
    };
  }),
  
  updateAssignment: (assignmentId, updates) => set((state) => {
    console.log('Updating assignment in store:', assignmentId, updates);
    const updatedAssignments = state.assignments.map(assignment => 
      assignment.id === assignmentId ? { ...assignment, ...updates, updatedAt: Date.now() } : assignment
    );
    console.log('Updated assignments:', updatedAssignments.find(a => a.id === assignmentId));
    return {
      assignments: updatedAssignments
    };
  }),
  
  deleteAssignment: (assignmentId) => set((state) => {
    console.log('Deleting assignment from store:', assignmentId);
    return {
      assignments: state.assignments.filter(assignment => assignment.id !== assignmentId)
    };
  }),

  // UI state actions
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setIsAdmin: (isAdmin) => set({ isAdmin })
}));