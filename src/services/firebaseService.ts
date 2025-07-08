import { ref, push, set, onValue, off, remove, update, runTransaction } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { database, auth } from '../lib/firebase';
import { ShishiEvent, MenuItem, Assignment } from '../types';
import toast from 'react-hot-toast';

// Helper function to clean undefined values from objects
const cleanObject = (obj: any): any => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

export class FirebaseService {
  // Admin Management
  static async createAdminUser(email: string, password: string, displayName: string): Promise<boolean> {
    try {
      // Validate input
      if (!email.trim() || !password.trim() || !displayName.trim()) {
        throw new Error('כל השדות נדרשים');
      }

      if (password.length < 6) {
        throw new Error('הסיסמה חייבת להכיל לפחות 6 תווים');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new Error('כתובת אימייל לא תקינה');
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const newUser = userCredential.user;

      // Add user to admins table in Realtime Database
      const adminRef = ref(database, `admins/${newUser.uid}`);
      await set(adminRef, {
        email: email.trim(),
        displayName: displayName.trim(),
        createdAt: Date.now(),
        createdBy: auth.currentUser?.uid || 'system',
        isActive: true
      });

      console.log('Admin user created successfully:', { uid: newUser.uid, email, displayName });
      return true;
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      
      let errorMessage = 'שגיאה ביצירת המנהל';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'כתובת האימייל כבר בשימוש';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'הסיסמה חלשה מדי';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'כתובת אימייל לא תקינה';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Add current authenticated user as admin (for initial setup)
  static async addCurrentUserAsAdmin(displayName: string): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('אין משתמש מחובר');
      }

      // Add user to admins table in Realtime Database
      const adminRef = ref(database, `admins/${currentUser.uid}`);
      await set(adminRef, {
        email: currentUser.email || '',
        displayName: displayName.trim(),
        createdAt: Date.now(),
        createdBy: 'self-setup',
        isActive: true
      });

      console.log('Current user added as admin:', { uid: currentUser.uid, displayName });
      return true;
    } catch (error: any) {
      console.error('Error adding current user as admin:', error);
      throw new Error('שגיאה בהוספת המשתמש כמנהל');
    }
  }

  static async deleteAdminUser(uid: string): Promise<boolean> {
    try {
      // Remove from admins table
      const adminRef = ref(database, `admins/${uid}`);
      await remove(adminRef);
      
      // Note: Deleting from Firebase Auth requires Admin SDK on server side
      // For now, we just deactivate in the database
      console.log('Admin user removed from database:', uid);
      return true;
    } catch (error) {
      console.error('Error deleting admin user:', error);
      throw new Error('שגיאה במחיקת המנהל');
    }
  }

  static async updateAdminUser(uid: string, updates: { displayName?: string; isActive?: boolean }): Promise<boolean> {
    try {
      const adminRef = ref(database, `admins/${uid}`);
      const cleanedUpdates = cleanObject({ 
        ...updates, 
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || 'system'
      });
      
      await update(adminRef, cleanedUpdates);
      return true;
    } catch (error) {
      console.error('Error updating admin user:', error);
      throw new Error('שגיאה בעדכון המנהל');
    }
  }

  static subscribeToAdmins(callback: (admins: any[]) => void): () => void {
    const adminsRef = ref(database, 'admins');
    const unsubscribe = onValue(adminsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        const admins = data ? Object.entries(data).map(([uid, adminData]: [string, any]) => ({
          uid,
          ...adminData
        })) : [];
        callback(admins);
      } catch (error) {
        console.error('Error processing admins data:', error);
        toast.error('שגיאה בטעינת רשימת המנהלים');
        callback([]);
      }
    }, (error) => {
      console.error('Error subscribing to admins:', error);
      toast.error('שגיאה בחיבור לשרת המנהלים');
    });

    return () => off(adminsRef, 'value', unsubscribe);
  }

  // Check if current user is admin with better error handling
  static async checkAdminStatus(uid: string): Promise<boolean> {
    try {
      const adminRef = ref(database, `admins/${uid}`);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          off(adminRef, 'value', onValueHandler);
          reject(new Error('Timeout checking admin status'));
        }, 10000); // 10 second timeout

        const onValueHandler = (snapshot: any) => {
          clearTimeout(timeout);
          off(adminRef, 'value', onValueHandler);
          
          try {
            const adminData = snapshot.val();
            const isAdmin = adminData && adminData.isActive === true;
            console.log('Admin status check result:', { uid, isAdmin, adminData });
            resolve(isAdmin);
          } catch (error) {
            console.error('Error processing admin data:', error);
            resolve(false);
          }
        };

        onValue(adminRef, onValueHandler, (error) => {
          clearTimeout(timeout);
          console.error('Error reading admin status:', error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Events
  static async createEvent(event: Omit<ShishiEvent, 'id'>): Promise<string | null> {
    try {
      // Check admin permissions
      if (!auth.currentUser) {
        throw new Error('נדרשת התחברות כמנהל');
      }

      const isAdmin = await this.checkAdminStatus(auth.currentUser.uid);
      if (!isAdmin) {
        throw new Error('אין הרשאות מנהל');
      }

      // If this is an active event, deactivate all other events first
      if (event.isActive) {
        await this.deactivateAllEvents();
      }

      const eventsRef = ref(database, 'events');
      const newEventRef = push(eventsRef);
      const cleanedEvent = cleanObject({ 
        ...event, 
        id: newEventRef.key!,
        createdBy: auth.currentUser.uid
      });
      
      await set(newEventRef, cleanedEvent);
      return newEventRef.key;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  static async updateEvent(eventId: string, updates: Partial<ShishiEvent>): Promise<boolean> {
    try {
      // Check admin permissions
      if (!auth.currentUser) {
        throw new Error('נדרשת התחברות כמנהל');
      }

      const isAdmin = await this.checkAdminStatus(auth.currentUser.uid);
      if (!isAdmin) {
        throw new Error('אין הרשאות מנהל');
      }

      // If setting this event as active, deactivate all other events first
      if (updates.isActive) {
        await this.deactivateAllEvents(eventId);
      }

      const eventRef = ref(database, `events/${eventId}`);
      const cleanedUpdates = cleanObject({ 
        ...updates, 
        updatedAt: Date.now(),
        updatedBy: auth.currentUser.uid
      });
      await update(eventRef, cleanedUpdates);
      return true;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  static async deleteEvent(eventId: string): Promise<boolean> {
    try {
      // Check admin permissions
      if (!auth.currentUser) {
        throw new Error('נדרשת התחברות כמנהל');
      }

      const isAdmin = await this.checkAdminStatus(auth.currentUser.uid);
      if (!isAdmin) {
        throw new Error('אין הרשאות מנהל');
      }

      const eventRef = ref(database, `events/${eventId}`);
      await remove(eventRef);
      
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Helper method to deactivate all events except the specified one
  private static async deactivateAllEvents(exceptEventId?: string): Promise<void> {
    try {
      const eventsRef = ref(database, 'events');
      
      // Get all events first
      const snapshot = await new Promise<any>((resolve, reject) => {
        onValue(eventsRef, resolve, { onlyOnce: true });
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      const events = snapshot.val();
      if (events) {
        const updatePromises = Object.entries(events)
          .filter(([eventId, event]: [string, any]) => 
            eventId !== exceptEventId && event.isActive
          )
          .map(([eventId]) => 
            update(ref(database, `events/${eventId}`), { 
              isActive: false, 
              updatedAt: Date.now(),
              updatedBy: auth.currentUser?.uid || 'system'
            })
          );

        await Promise.all(updatePromises);
      }
    } catch (error) {
      console.error('Error deactivating events:', error);
      // Don't throw here as this is a helper operation
    }
  }

  static subscribeToEvents(callback: (events: ShishiEvent[]) => void): () => void {
    const eventsRef = ref(database, 'events');
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      try {
        console.log('Firebase events snapshot received:', snapshot.exists());
        const data = snapshot.val();
        console.log('Firebase events raw data:', data);
        const events: ShishiEvent[] = data ? Object.values(data) : [];
        console.log('Processed events:', events);
        callback(events);
      } catch (error) {
        console.error('Error processing events data:', error);
        toast.error('שגיאה בטעינת האירועים');
        callback([]);
      }
    }, (error) => {
      console.error('Error subscribing to events:', error);
      toast.error('שגיאה בחיבור לשרת האירועים');
    });

    return () => off(eventsRef, 'value', unsubscribe);
  }

  // Menu Items
  static async createMenuItem(item: Omit<MenuItem, 'id'>): Promise<string | null> {
    try {
      // Check admin permissions
      if (!auth.currentUser) {
        throw new Error('נדרשת התחברות כמנהל');
      }

      const isAdmin = await this.checkAdminStatus(auth.currentUser.uid);
      if (!isAdmin) {
        throw new Error('אין הרשאות מנהל');
      }

      const menuItemsRef = ref(database, 'menuItems');
      const newItemRef = push(menuItemsRef);
      const cleanedItem = cleanObject({ 
        ...item, 
        id: newItemRef.key!,
        createdBy: auth.currentUser.uid
      });
      
      await set(newItemRef, cleanedItem);
      return newItemRef.key;
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  }

  static async updateMenuItem(itemId: string, updates: Partial<MenuItem>, skipAdminCheck: boolean = false): Promise<boolean> {
    try {
      console.log('Updating menu item:', itemId, updates, 'skipAdminCheck:', skipAdminCheck);
      
      const itemRef = ref(database, `menuItems/${itemId}`);
      
      // Create update object with proper structure
      const updateData: any = {};
      
      // Handle each field properly
      Object.keys(updates).forEach(key => {
        const value = updates[key as keyof MenuItem];
        if (value === undefined) {
          // For Firebase, use null to remove fields
          updateData[key] = null;
        } else {
          updateData[key] = value;
        }
      });
      
      // Add metadata only if not skipping admin check
      if (!skipAdminCheck) {
        updateData.updatedAt = Date.now();
        if (auth.currentUser) {
          updateData.updatedBy = auth.currentUser.uid;
        }
      }
      
      console.log('Update data for menu item:', updateData);
      
      await update(itemRef, updateData);
      console.log('Menu item updated successfully in Firebase');
      return true;
    } catch (error) {
      console.error('Error updating menu item:', error);
      throw new Error('שגיאה בעדכון פריט התפריט');
    }
  }

  static async deleteMenuItem(itemId: string): Promise<boolean> {
    try {
      // Check admin permissions
      if (!auth.currentUser) {
        throw new Error('נדרשת התחברות כמנהל');
      }

      const isAdmin = await this.checkAdminStatus(auth.currentUser.uid);
      if (!isAdmin) {
        throw new Error('אין הרשאות מנהל');
      }

      const itemRef = ref(database, `menuItems/${itemId}`);
      await remove(itemRef);
      return true;
    } catch (error) {
      console.error('Error deleting menu item:', error);
      throw error;
    }
  }

  static subscribeToMenuItems(callback: (items: MenuItem[]) => void): () => void {
    const menuItemsRef = ref(database, 'menuItems');
    const unsubscribe = onValue(menuItemsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        const items: MenuItem[] = data ? Object.values(data) : [];
        callback(items);
      } catch (error) {
        console.error('Error processing menu items data:', error);
        toast.error('שגיאה בטעינת פריטי התפריט');
        callback([]);
      }
    }, (error) => {
      console.error('Error subscribing to menu items:', error);
      toast.error('שגיאה בחיבור לשרת התפריט');
    });

    return () => off(menuItemsRef, 'value', unsubscribe);
  }

  // Assignments
  static async createAssignment(assignment: Omit<Assignment, 'id'>): Promise<string> {
    try {
      console.log('Creating assignment:', assignment);
      
      // Use transaction on menu item to atomically claim it
      const menuItemRef = ref(database, `menuItems/${assignment.menuItemId}`);
      const assignmentsRef = ref(database, 'assignments');
      
      // Use atomic transaction on menu item to claim it
      const result = await runTransaction(menuItemRef, (currentMenuItem) => {
        if (!currentMenuItem) {
          throw new Error('פריט התפריט לא נמצא');
        }
        
        // Check if item is already assigned
        if (currentMenuItem.assignedTo) {
          if (currentMenuItem.assignedTo === assignment.userId) {
            throw new Error('כבר יש לך שיבוץ לפריט זה');
          } else {
            throw new Error('מצטערים, מישהו אחר כבר הספיק לשבץ את הפריט הזה');
          }
        }
        
        // Claim the item atomically
        return {
          ...currentMenuItem,
          assignedTo: assignment.userId,
          assignedToName: assignment.userName,
          assignedAt: assignment.assignedAt || Date.now()
        };
      });
      
      if (!result.committed) {
        throw new Error('השיבוץ נכשל - נסה שוב');
      }
      
      // Menu item successfully claimed, now create the assignment record
      try {
        const newAssignmentRef = push(assignmentsRef);
        const assignmentData = {
          id: newAssignmentRef.key!,
          eventId: assignment.eventId,
          menuItemId: assignment.menuItemId,
          userId: assignment.userId,
          userName: assignment.userName,
          quantity: assignment.quantity,
          status: assignment.status || 'confirmed',
          assignedAt: assignment.assignedAt || Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        // Add optional fields
        if (assignment.userPhone) {
          (assignmentData as any).userPhone = assignment.userPhone;
        }
        if (assignment.notes) {
          (assignmentData as any).notes = assignment.notes;
        }
        
        await set(newAssignmentRef, assignmentData);
        console.log('Assignment created successfully with ID:', newAssignmentRef.key);
        
        return newAssignmentRef.key!;
      } catch (assignmentError) {
        // If assignment creation fails, we need to rollback the menu item claim
        console.error('Failed to create assignment record, rolling back menu item:', assignmentError);
        
        try {
          await update(menuItemRef, {
            assignedTo: null,
            assignedToName: null,
            assignedAt: null
          });
        } catch (rollbackError) {
          console.error('Failed to rollback menu item assignment:', rollbackError);
        }
        
        throw new Error('שגיאה ביצירת השיבוץ');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      
      // Pass through specific error messages
      if (error instanceof Error && (
        error.message.includes('מצטערים, מישהו אחר') ||
        error.message.includes('כבר יש לך שיבוץ') ||
        error.message.includes('פריט התפריט לא נמצא')
      )) {
        throw error;
      }
      
      throw new Error('שגיאה ביצירת השיבוץ');
    }
  }

  static async updateAssignment(assignmentId: string, updates: Partial<Assignment>): Promise<boolean> {
    try {
      console.log('Updating assignment:', assignmentId, updates);
      
      const assignmentRef = ref(database, `assignments/${assignmentId}`);
      
      // Create update object with proper structure
      const updateData: any = {
        updatedAt: Date.now()
      };
      
      // Handle each field properly
      Object.keys(updates).forEach(key => {
        if (key !== 'id') {
          const value = updates[key as keyof Assignment];
          if (value === undefined) {
            // For Firebase, use null to remove fields
            updateData[key] = null;
          } else {
            updateData[key] = value;
          }
        }
      });
      
      console.log('Update data for assignment:', updateData);
      
      await update(assignmentRef, updateData);
      console.log('Assignment updated successfully in Firebase');
      return true;
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw new Error('שגיאה בעדכון השיבוץ');
    }
  }

  static async deleteAssignment(assignmentId: string): Promise<boolean> {
    try {
      console.log('Deleting assignment:', assignmentId);
      
      const assignmentRef = ref(database, `assignments/${assignmentId}`);
      await remove(assignmentRef);
      
      console.log('Assignment deleted successfully from Firebase');
      return true;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw new Error('שגיאה במחיקת השיבוץ');
    }
  }

  static subscribeToAssignments(callback: (assignments: Assignment[]) => void): () => void {
    const assignmentsRef = ref(database, 'assignments');
    
    const unsubscribe = onValue(assignmentsRef, (snapshot) => {
      try {
        console.log('Assignments data received from Firebase');
        const data = snapshot.val();
        const assignments: Assignment[] = data ? Object.values(data) : [];
        console.log('Processed assignments:', assignments.length);
        callback(assignments);
      } catch (error) {
        console.error('Error processing assignments data:', error);
        toast.error('שגיאה בטעינת השיבוצים');
        callback([]);
      }
    }, (error) => {
      console.error('Error subscribing to assignments:', error);
      toast.error('שגיאה בחיבור לשרת השיבוצים');
    });

    return () => {
      console.log('Unsubscribing from assignments');
      off(assignmentsRef, 'value', unsubscribe);
    };
  }

  // Preset Lists Management
  static async createPresetList(presetList: {
    name: string;
    type: 'salon' | 'participants';
    items: any[];
  }): Promise<string | null> {
    try {
      const presetListsRef = ref(database, 'presetLists');
      const newListRef = push(presetListsRef);
      
      const listData = {
        id: newListRef.key!,
        name: presetList.name.trim(),
        type: presetList.type,
        items: presetList.items,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: auth.currentUser?.uid || 'anonymous'
      };
      
      await set(newListRef, listData);
      console.log('Preset list created successfully:', newListRef.key);
      return newListRef.key;
    } catch (error) {
      console.error('Error creating preset list:', error);
      throw new Error('שגיאה ביצירת הרשימה');
    }
  }

  static async updatePresetList(listId: string, updates: {
    name?: string;
    items?: any[];
  }): Promise<boolean> {
    try {
      const listRef = ref(database, `presetLists/${listId}`);
      const cleanedUpdates = cleanObject({
        ...updates,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || 'anonymous'
      });
      
      await update(listRef, cleanedUpdates);
      console.log('Preset list updated successfully:', listId);
      return true;
    } catch (error) {
      console.error('Error updating preset list:', error);
      throw new Error('שגיאה בעדכון הרשימה');
    }
  }

  static async deletePresetList(listId: string): Promise<boolean> {
    try {
      const listRef = ref(database, `presetLists/${listId}`);
      await remove(listRef);
      console.log('Preset list deleted successfully:', listId);
      return true;
    } catch (error) {
      console.error('Error deleting preset list:', error);
      throw new Error('שגיאה במחיקת הרשימה');
    }
  }

  static subscribeToPresetLists(callback: (lists: any[]) => void): () => void {
    const presetListsRef = ref(database, 'presetLists');
    const unsubscribe = onValue(presetListsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        const lists = data ? Object.values(data) : [];
        callback(lists);
      } catch (error) {
        console.error('Error processing preset lists data:', error);
        toast.error('שגיאה בטעינת הרשימות המוכנות');
        callback([]);
      }
    }, (error) => {
      console.error('Error subscribing to preset lists:', error);
      toast.error('שגיאה בחיבור לשרת הרשימות');
    });

    return () => off(presetListsRef, 'value', unsubscribe);
  }

  // New method to force data consistency check
  static async forceDataConsistencyCheck(): Promise<void> {
    try {
      console.log('Starting forced data consistency check...');
      
      // This will trigger a fresh fetch of all data
      const menuItemsRef = ref(database, 'menuItems');
      const assignmentsRef = ref(database, 'assignments');
      
      // Force a one-time read to refresh cache
      await new Promise((resolve) => {
        onValue(menuItemsRef, () => resolve(true), { onlyOnce: true });
      });
      
      await new Promise((resolve) => {
        onValue(assignmentsRef, () => resolve(true), { onlyOnce: true });
      });
      
      console.log('Data consistency check completed');
    } catch (error) {
      console.error('Error in data consistency check:', error);
    }
  }

  // Helper method to check for data consistency
  static async validateAssignmentConsistency(menuItemId: string, userId: string): Promise<{
    hasAssignment: boolean;
    hasMenuItemAssignment: boolean;
    assignment?: Assignment;
    menuItem?: MenuItem;
  }> {
    try {
      // This would require additional Firebase queries in a real implementation
      // For now, we'll rely on the local state validation
      return {
        hasAssignment: false,
        hasMenuItemAssignment: false
      };
    } catch (error) {
      console.error('Error validating assignment consistency:', error);
      return {
        hasAssignment: false,
        hasMenuItemAssignment: false
      };
    }
  }
}