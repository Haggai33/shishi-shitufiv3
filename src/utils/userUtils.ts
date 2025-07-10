import { User } from '../types';

// שינוי: הוספת קידומת כדי למנוע התנגשות עם מפתחות אחרים
const USER_STORAGE_KEY_PREFIX = 'shishi_shitufi_user_';

// פונקציית עזר פנימית ליצירת המפתח
function getUserStorageKey(uid: string): string {
  return `${USER_STORAGE_KEY_PREFIX}${uid}`;
}

export function saveUserToLocalStorage(user: User): void {
  try {
    // שמירה תחת מפתח ייחודי למשתמש
    if (!user.id) {
        console.error("Attempted to save user without ID.");
        return;
    }
    localStorage.setItem(getUserStorageKey(user.id), JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user to localStorage:', error);
  }
}

// שינוי: הפונקציה מקבלת uid כדי לדעת איזה משתמש לשלוף
export function getUserFromLocalStorage(uid: string): User | null {
  try {
    const userStr = localStorage.getItem(getUserStorageKey(uid));
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting user from localStorage:', error);
    return null;
  }
}

// שינוי: הפונקציה צריכה לדעת את ה-ID של המשתמש שמעדכנים
export function updateUserInLocalStorage(updates: Partial<User>): void {
  if (!updates.id) {
      console.error("Cannot update user in localStorage without a user ID.");
      return;
  }
  try {
    const currentUser = getUserFromLocalStorage(updates.id);
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      saveUserToLocalStorage(updatedUser);
    }
  } catch (error) {
    console.error('Error updating user in localStorage:', error);
  }
}