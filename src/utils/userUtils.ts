import { User } from '../types';

const USER_STORAGE_KEY = 'shishi_shitufi_user';

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function saveUserToLocalStorage(user: User): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user to localStorage:', error);
  }
}

export function getUserFromLocalStorage(): User | null {
  try {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting user from localStorage:', error);
    return null;
  }
}

export function updateUserInLocalStorage(updates: Partial<User>): void {
  try {
    const currentUser = getUserFromLocalStorage();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      saveUserToLocalStorage(updatedUser);
    }
  } catch (error) {
    console.error('Error updating user in localStorage:', error);
  }
}