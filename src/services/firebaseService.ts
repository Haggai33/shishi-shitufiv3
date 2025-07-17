// src/services/firebaseService.ts

import { ref, push, set, get, onValue, off, remove, update, serverTimestamp } from 'firebase/database';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { database, auth } from '../lib/firebase';
import { ShishiEvent, MenuItem, Assignment, User, EventDetails } from '../types';

/**
 * שירות Firebase מותאם לארכיטקטורת Multi-Tenant
 * כל פעולה מתבצעת בהקשר של organizerId ו-eventId ספציפיים
 */
export class FirebaseService {
  
  // ===============================
  // פונקציות עזר פנימיות
  // ===============================
  
  /**
   * יוצר נתיב לאירוע ספציפי
   */
  private static eventPath(organizerId: string, eventId: string): string {
    return `organizerEvents/${organizerId}/events/${eventId}`;
  }

  /**
   * מוודא שלאירוע יש את כל המבנים הנדרשים
   */
  private static async ensureEventStructure(organizerId: string, eventId: string): Promise<void> {
    console.group('🔧 FirebaseService.ensureEventStructure');
    console.log('📥 Input parameters:', { organizerId, eventId });
    console.log('🔗 Event path:', this.eventPath(organizerId, eventId));
    
    try {
      const eventRef = ref(database, this.eventPath(organizerId, eventId));
      const snapshot = await get(eventRef);
      
      if (snapshot.exists()) {
        const eventData = snapshot.val();
        const updates: { [key: string]: any } = {};
        
        // וידוא שכל המבנים הנדרשים קיימים
        if (!eventData.menuItems) {
          console.log('➕ Adding missing menuItems structure');
          updates[`${this.eventPath(organizerId, eventId)}/menuItems`] = {};
        }
        if (!eventData.assignments) {
          console.log('➕ Adding missing assignments structure');
          updates[`${this.eventPath(organizerId, eventId)}/assignments`] = {};
        }
        if (!eventData.participants) {
          console.log('➕ Adding missing participants structure');
          updates[`${this.eventPath(organizerId, eventId)}/participants`] = {};
        }
        
        if (Object.keys(updates).length > 0) {
          console.log('💾 Applying structure updates:', updates);
          await update(ref(database), updates);
          console.log('✅ Structure updates applied');
        } else {
          console.log('✅ Event structure is already complete');
        }
      } else {
        console.warn('⚠️ Event does not exist:', this.eventPath(organizerId, eventId));
      }
      
      console.groupEnd();
    } catch (error) {
      console.error('❌ Error in ensureEventStructure:', error);
      console.groupEnd();
      throw error;
    }
  }

  // ===============================
  // ניהול מארגנים (Organizers)
  // ===============================

  /**
   * יוצר מארגן חדש במערכת
   */
  static async createOrganizer(email: string, password: string, displayName: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    // עדכון פרופיל ב-Firebase Auth
    await updateProfile(newUser, { displayName });
    
    // יצירת פרופיל משתמש ב-Database
    const userObject: User = {
      id: newUser.uid,
      name: displayName,
      email: newUser.email || '',
      createdAt: Date.now()
    };
    
    await set(ref(database, `users/${newUser.uid}`), userObject);
    return userObject;
  }

  // ===============================
  // ניהול אירועים (Events)
  // ===============================

  /**
   * יוצר אירוע חדש עבור מארגן ספציפי
   */
  static async createEvent(organizerId: string, eventDetails: EventDetails): Promise<string> {
    // קבלת שם המארגן
    const organizerSnapshot = await get(ref(database, `users/${organizerId}/name`));
    const organizerName = organizerSnapshot.val() || 'מארגן';

    // יצירת אירוע חדש
    const newEventRef = push(ref(database, `organizerEvents/${organizerId}/events`));
    const newEventId = newEventRef.key!;

    const fullEventData: Omit<ShishiEvent, 'id'> = {
      organizerId,
      organizerName,
      createdAt: Date.now(),
      details: eventDetails,
      menuItems: {},
      assignments: {},
      participants: {}
    };

    await set(newEventRef, fullEventData);
    return newEventId;
  }

  /**
   * מחזיר את כל האירועים של מארגן ספציפי
   */
  static async getEventsByOrganizer(organizerId: string): Promise<ShishiEvent[]> {
    const eventsRef = ref(database, `organizerEvents/${organizerId}/events`);
    const snapshot = await get(eventsRef);
    
    if (snapshot.exists()) {
      const eventsData = snapshot.val();
      return Object.entries(eventsData).map(([id, event]) => ({
        id,
        ...(event as Omit<ShishiEvent, 'id'>)
      }));
    }
    
    return [];
  }

  /**
   * מאזין לשינויים באירוע ספציפי
   */
  static subscribeToEvent(
    organizerId: string, 
    eventId: string, 
    callback: (eventData: ShishiEvent | null) => void
  ): () => void {
    const eventRef = ref(database, this.eventPath(organizerId, eventId));
    console.log('📖 Reading event data...');
    
    const onValueChange = async (snapshot: any) => {
      if (snapshot.exists()) {
        // וידוא מבנה תקין לפני החזרת הנתונים
        await this.ensureEventStructure(organizerId, eventId);
        
        const eventData = snapshot.val();
        console.log('📋 Current event data:', eventData);
        callback({
          id: eventId,
          ...eventData
        });
      } else {
        callback(null);
      }
    };

    onValue(eventRef, onValueChange, (error) => {
      console.error(`Error subscribing to event ${eventId}:`, error);
      callback(null);
    });

    return () => off(eventRef, 'value', onValueChange);
  }

  /**
   * מוחק אירוע ספציפי
   */
  static async deleteEvent(organizerId: string, eventId: string): Promise<void> {
    await remove(ref(database, this.eventPath(organizerId, eventId)));
  }

  /**
   * מעדכן פרטי אירוע
   */
  static async updateEventDetails(organizerId: string, eventId: string, updates: Partial<EventDetails>): Promise<void> {
    const detailsRef = ref(database, `${this.eventPath(organizerId, eventId)}/details`);
    await update(detailsRef, updates);
  }

  // ===============================
  // ניהול פריטי תפריט (Menu Items)
  // ===============================

  /**
   * מוסיף פריט חדש לתפריט
   */
  static async addMenuItem(
    organizerId: string, 
    eventId: string, 
    itemData: Omit<MenuItem, 'id'>
  ): Promise<string> {
    console.group('🍽️ FirebaseService.addMenuItem');
    console.log('📥 Input parameters:', { organizerId, eventId, itemData });
    console.log('🔗 Event path:', this.eventPath(organizerId, eventId));
    
    try {
      console.log('🔧 Ensuring event structure...');
      await this.ensureEventStructure(organizerId, eventId);
      console.log('✅ Event structure ensured');
      
      console.log('📝 Creating new item reference...');
      const newItemRef = push(ref(database, `${this.eventPath(organizerId, eventId)}/menuItems`));
      const newItemId = newItemRef.key!;
      console.log('🆔 Generated item ID:', newItemId);
      
      const finalItemData = {
        ...itemData,
        id: newItemId
      };
      
      console.log('📋 Final item data to save:', finalItemData);
      console.log('💾 Saving to Firebase...');
      
      await set(newItemRef, finalItemData);
      console.log('✅ Menu item saved successfully!');
      console.groupEnd();
      
      return newItemId;
    } catch (error) {
      console.error('❌ Error in addMenuItem:', error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * מוסיף פריט חדש ומשבץ אותו למשתמש (אופציונלי)
   */
  static async addMenuItemAndAssign(
    organizerId: string,
    eventId: string,
    itemData: Omit<MenuItem, 'id'>,
    assignToUserId: string | null,
    assignToUserName: string
  ): Promise<string> {
    console.group('🍽️➕👤 FirebaseService.addMenuItemAndAssign');
    console.log('📥 Input parameters:', { organizerId, eventId, itemData, assignToUserId, assignToUserName });
    console.log('🔗 Event path:', this.eventPath(organizerId, eventId));
    
    try {
      console.log('🔧 Ensuring event structure...');
      await this.ensureEventStructure(organizerId, eventId);
      console.log('✅ Event structure ensured');
      
      console.log('📝 Creating new item reference...');
      const newItemRef = push(ref(database, `${this.eventPath(organizerId, eventId)}/menuItems`));
      const newItemId = newItemRef.key!;
      console.log('🆔 Generated item ID:', newItemId);
      
      const updates: { [key: string]: any } = {};
      
      // הוספת הפריט
      const finalItemData: any = {
        ...itemData,
        id: newItemId
      };

      // אם יש שיבוץ, הוסף את פרטי השיבוץ לפריט
      if (assignToUserId) {
        console.log('👤 Adding assignment data to item...');
        finalItemData.assignedTo = assignToUserId;
        finalItemData.assignedToName = assignToUserName;
        finalItemData.assignedAt = Date.now();

        // יצירת שיבוץ נפרד
        console.log('📋 Creating separate assignment...');
        const newAssignmentRef = push(ref(database, `${this.eventPath(organizerId, eventId)}/assignments`));
        const assignmentData: Omit<Assignment, 'id'> = {
          menuItemId: newItemId,
          userId: assignToUserId,
          userName: assignToUserName,
          quantity: itemData.quantity,
          notes: '',
          status: 'confirmed',
          assignedAt: Date.now()
        };
        
        console.log('📋 Assignment data:', assignmentData);
        updates[`${this.eventPath(organizerId, eventId)}/assignments/${newAssignmentRef.key}`] = assignmentData;
      }
      
      updates[`${this.eventPath(organizerId, eventId)}/menuItems/${newItemId}`] = finalItemData;
      
      console.log('💾 Updates to apply:', updates);
      console.log('🚀 Applying updates to Firebase...');
      await update(ref(database), updates);
      console.log('✅ Menu item and assignment saved successfully!');
      console.groupEnd();
      
      return newItemId;
    } catch (error) {
      console.error('❌ Error in addMenuItemAndAssign:', error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * מעדכן פריט תפריט
   */
  static async updateMenuItem(
    organizerId: string,
    eventId: string,
    itemId: string,
    updates: Partial<MenuItem>
  ): Promise<void> {
    const itemRef = ref(database, `${this.eventPath(organizerId, eventId)}/menuItems/${itemId}`);
    await update(itemRef, updates);
  }

  /**
   * מוחק פריט תפריט
   */
  static async deleteMenuItem(organizerId: string, eventId: string, itemId: string): Promise<void> {
    const updates: { [key: string]: null } = {};
    
    // מחיקת הפריט
    updates[`${this.eventPath(organizerId, eventId)}/menuItems/${itemId}`] = null;
    
    // מחיקת כל השיבוצים הקשורים לפריט
    const assignmentsSnapshot = await get(ref(database, `${this.eventPath(organizerId, eventId)}/assignments`));
    if (assignmentsSnapshot.exists()) {
      const assignments = assignmentsSnapshot.val();
      Object.entries(assignments).forEach(([assignmentId, assignment]: [string, any]) => {
        if (assignment.menuItemId === itemId) {
          updates[`${this.eventPath(organizerId, eventId)}/assignments/${assignmentId}`] = null;
        }
      });
    }
    
    await update(ref(database), updates);
  }

  // ===============================
  // ניהול משתתפים (Participants)
  // ===============================

  /**
   * מצרף משתתף לאירוע
   */
  static async joinEvent(
    organizerId: string,
    eventId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    console.group('👥 FirebaseService.joinEvent');
    console.log('📥 Input parameters:', { organizerId, eventId, userId, userName });
    
    try {
      await this.ensureEventStructure(organizerId, eventId);
      
      const participantRef = ref(database, `${this.eventPath(organizerId, eventId)}/participants/${userId}`);
      const participantData = {
        name: userName,
        joinedAt: Date.now()
      };
      
      console.log('👤 Participant data:', participantData);
      console.log('💾 Saving participant to Firebase...');
      
      await set(participantRef, participantData);
      console.log('✅ Participant joined successfully!');
      console.groupEnd();
    } catch (error) {
      console.error('❌ Error in joinEvent:', error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * מסיר משתתף מהאירוע
   */
  static async leaveEvent(organizerId: string, eventId: string, userId: string): Promise<void> {
    const participantRef = ref(database, `${this.eventPath(organizerId, eventId)}/participants/${userId}`);
    await remove(participantRef);
  }

  // ===============================
  // ניהול שיבוצים (Assignments)
  // ===============================

  /**
   * יוצר שיבוץ חדש
   */
  static async createAssignment(
    organizerId: string,
    eventId: string,
    assignmentData: Omit<Assignment, 'id'>
  ): Promise<string> {
    await this.ensureEventStructure(organizerId, eventId);
    
    // בדיקה שהפריט לא כבר משובץ
    const menuItemRef = ref(database, `${this.eventPath(organizerId, eventId)}/menuItems/${assignmentData.menuItemId}`);
    const snapshot = await get(menuItemRef);
    
    if (snapshot.val()?.assignedTo) {
      throw new Error('מצטערים, מישהו אחר כבר הספיק לשבץ את הפריט הזה');
    }
    
    const newAssignmentRef = push(ref(database, `${this.eventPath(organizerId, eventId)}/assignments`));
    const updates: { [key: string]: any } = {};
    
    // הוספת השיבוץ
    updates[`${this.eventPath(organizerId, eventId)}/assignments/${newAssignmentRef.key}`] = assignmentData;
    
    // עדכון הפריט כמשובץ
    updates[`${this.eventPath(organizerId, eventId)}/menuItems/${assignmentData.menuItemId}/assignedTo`] = assignmentData.userId;
    updates[`${this.eventPath(organizerId, eventId)}/menuItems/${assignmentData.menuItemId}/assignedToName`] = assignmentData.userName;
    updates[`${this.eventPath(organizerId, eventId)}/menuItems/${assignmentData.menuItemId}/assignedAt`] = Date.now();
    
    await update(ref(database), updates);
    return newAssignmentRef.key!;
  }

  /**
   * מעדכן שיבוץ קיים
   */
  static async updateAssignment(
    organizerId: string,
    eventId: string,
    assignmentId: string,
    updates: { quantity: number; notes?: string }
  ): Promise<void> {
    const assignmentRef = ref(database, `${this.eventPath(organizerId, eventId)}/assignments/${assignmentId}`);
    await update(assignmentRef, {
      ...updates,
      updatedAt: Date.now()
    });
  }

  /**
   * מבטל שיבוץ
   */
  static async cancelAssignment(
    organizerId: string,
    eventId: string,
    assignmentId: string,
    menuItemId: string
  ): Promise<void> {
    const updates: { [key: string]: null } = {};
    
    // מחיקת השיבוץ
    updates[`${this.eventPath(organizerId, eventId)}/assignments/${assignmentId}`] = null;
    
    // הסרת השיבוץ מהפריט
    updates[`${this.eventPath(organizerId, eventId)}/menuItems/${menuItemId}/assignedTo`] = null;
    updates[`${this.eventPath(organizerId, eventId)}/menuItems/${menuItemId}/assignedToName`] = null;
    updates[`${this.eventPath(organizerId, eventId)}/menuItems/${menuItemId}/assignedAt`] = null;
    
    await update(ref(database), updates);
  }

  // ===============================
  // פונקציות תחזוקה ואבחון
  // ===============================

  /**
   * מוודא עקביות נתונים באירוע
   */
  static async validateEventData(organizerId: string, eventId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const eventSnapshot = await get(ref(database, this.eventPath(organizerId, eventId)));
      
      if (!eventSnapshot.exists()) {
        return { isValid: false, issues: ['האירוע לא קיים'] };
      }
      
      const eventData = eventSnapshot.val();
      
      // בדיקת מבנה בסיסי
      if (!eventData.details) issues.push('חסרים פרטי האירוע');
      if (!eventData.organizerId) issues.push('חסר מזהה מארגן');
      if (!eventData.organizerName) issues.push('חסר שם מארגן');
      
      // בדיקת עקביות שיבוצים
      const menuItems = eventData.menuItems || {};
      const assignments = eventData.assignments || {};
      
      Object.entries(assignments).forEach(([assignmentId, assignment]: [string, any]) => {
        const menuItem = menuItems[assignment.menuItemId];
        if (!menuItem) {
          issues.push(`שיבוץ ${assignmentId} מצביע על פריט שלא קיים`);
        } else if (menuItem.assignedTo !== assignment.userId) {
          issues.push(`אי-עקביות בשיבוץ ${assignmentId}`);
        }
      });
      
      return { isValid: issues.length === 0, issues };
    } catch (error) {
      console.error('Error validating event data:', error);
      return { isValid: false, issues: ['שגיאה בבדיקת הנתונים'] };
    }
  }
}