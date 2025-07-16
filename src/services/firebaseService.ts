// src/services/firebaseService.ts

import { ref, push, set, get, onValue, off, remove, update, serverTimestamp } from 'firebase/database';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { database, auth } from '../lib/firebase';
import { ShishiEvent, MenuItem, Assignment, User, EventDetails } from '../types';

const eventPath = (organizerId: string, eventId: string) => `organizerEvents/${organizerId}/events/${eventId}`;

export class FirebaseService {
  static async createOrganizer(email: string, password: string, displayName: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    await updateProfile(newUser, { displayName });
    const userObject: User = { id: newUser.uid, name: displayName, email: newUser.email || '', createdAt: Date.now() };
    await set(ref(database, `users/${newUser.uid}`), userObject);
    return userObject;
  }

  static async createEvent(organizerId: string, eventDetails: EventDetails): Promise<string> {
    const newEventRef = push(ref(database, `organizerEvents/${organizerId}/events`));
    const newEventId = newEventRef.key!;
    const organizerName = (await get(ref(database, `users/${organizerId}/name`))).val() || 'מארגן';
    const fullEventData = { organizerId, organizerName, createdAt: serverTimestamp(), details: eventDetails, menuItems: {}, assignments: {}, participants: {} };
    await set(newEventRef, fullEventData);
    return newEventId;
  }

  static async getEventsByOrganizer(organizerId: string): Promise<ShishiEvent[]> {
    const eventsRef = ref(database, `organizerEvents/${organizerId}/events`);
    const snapshot = await get(eventsRef);
    if (snapshot.exists()) {
      const eventsData = snapshot.val();
      return Object.entries(eventsData).map(([id, event]) => ({ id, ...(event as Omit<ShishiEvent, 'id'>) }));
    }
    return [];
  }

  static subscribeToEvent(organizerId: string, eventId: string, callback: (eventData: ShishiEvent | null) => void): () => void {
    const eventRef = ref(database, eventPath(organizerId, eventId));
    const onValueChange = (snapshot: any) => {
      if (snapshot.exists()) callback({ id: eventId, ...snapshot.val() });
      else callback(null);
    };
    onValue(eventRef, onValueChange, (error) => {
      console.error(`Error subscribing to event ${eventId}:`, error);
      callback(null);
    });
    return () => off(eventRef, 'value', onValueChange);
  }
  
  static async deleteEvent(organizerId: string, eventId: string) {
    await remove(ref(database, eventPath(organizerId, eventId)));
  }

  static async addMenuItemAndAssign(organizerId: string, eventId: string, itemData: Omit<MenuItem, 'id' | 'eventId'>, assignToUserId: string | null, assignToUserName: string) {
    const newItemRef = push(ref(database, `${eventPath(organizerId, eventId)}/menuItems`));
    const newItemId = newItemRef.key!;
    const updates: { [key: string]: any } = {};
    const finalItemData: any = { ...itemData, id: newItemId };

    if (assignToUserId) {
        finalItemData.assignedTo = assignToUserId;
        finalItemData.assignedToName = assignToUserName;
        finalItemData.assignedAt = Date.now();
        const newAssignmentRef = push(ref(database, `${eventPath(organizerId, eventId)}/assignments`));
        const assignmentData: Omit<Assignment, 'id'> = { menuItemId: newItemId, userId: assignToUserId, userName: assignToUserName, quantity: itemData.quantity, notes: '', status: 'confirmed', assignedAt: Date.now() };
        updates[`${eventPath(organizerId, eventId)}/assignments/${newAssignmentRef.key}`] = assignmentData;
    }
    updates[`${eventPath(organizerId, eventId)}/menuItems/${newItemId}`] = finalItemData;
    await update(ref(database), updates);
  }
  
  static async joinEvent(organizerId: string, eventId: string, userId: string, userName: string) {
    const participantRef = ref(database, `${eventPath(organizerId, eventId)}/participants/${userId}`);
    await set(participantRef, { name: userName, joinedAt: serverTimestamp() });
  }

  static async createAssignment(organizerId: string, eventId: string, assignmentData: Omit<Assignment, 'id'>) {
    const menuItemRef = ref(database, `${eventPath(organizerId, eventId)}/menuItems/${assignmentData.menuItemId}`);
    const snapshot = await get(menuItemRef);
    if (snapshot.val()?.assignedTo) throw new Error('מצטערים, מישהו אחר כבר הספיק לשבץ את הפריט הזה');
    
    const newAssignmentRef = push(ref(database, `${eventPath(organizerId, eventId)}/assignments`));
    const updates: { [key: string]: any } = {};
    updates[`${eventPath(organizerId, eventId)}/assignments/${newAssignmentRef.key}`] = assignmentData;
    updates[`${eventPath(organizerId, eventId)}/menuItems/${assignmentData.menuItemId}/assignedTo`] = assignmentData.userId;
    updates[`${eventPath(organizerId, eventId)}/menuItems/${assignmentData.menuItemId}/assignedToName`] = assignmentData.userName;
    await update(ref(database), updates);
    return newAssignmentRef.key;
  }

  static async updateAssignment(organizerId: string, eventId: string, assignmentId: string, updates: { quantity: number; notes?: string }) {
    const assignmentRef = ref(database, `${eventPath(organizerId, eventId)}/assignments/${assignmentId}`);
    await update(assignmentRef, { ...updates, updatedAt: Date.now() });
  }

  static async cancelAssignment(organizerId: string, eventId: string, assignmentId: string, menuItemId: string) {
    const updates: { [key: string]: null } = {};
    updates[`${eventPath(organizerId, eventId)}/assignments/${assignmentId}`] = null;
    updates[`${eventPath(organizerId, eventId)}/menuItems/${menuItemId}/assignedTo`] = null;
    updates[`${eventPath(organizerId, eventId)}/menuItems/${menuItemId}/assignedToName`] = null;
    await update(ref(database), updates);
  }
}
