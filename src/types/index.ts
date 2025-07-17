// src/types/index.ts

/**
 * מייצג משתמש רשום במערכת (מארגן אירועים).
 */
export interface User {
  id: string; // Firebase Auth UID
  name: string;
  email?: string;
  createdAt: number;
}

/**
 * מייצג את פרטי הליבה של אירוע, כפי שהם נשמרים תחת event.details.
 */
export interface EventDetails {
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string;
  isActive: boolean;
}

/**
 * מייצג פריט בתפריט של אירוע ספציפי.
 * שימו לב שכבר אין צורך בשדה eventId, כי הפריט מקונן תחת האירוע.
 */
export interface MenuItem {
  id: string;
  name: string;
  category: 'starter' | 'main' | 'dessert' | 'drink' | 'other';
  quantity: number;
  notes?: string;
  isRequired: boolean;
  creatorId: string;
  creatorName: string;
  createdAt: number;
  // שדות השיבוץ נשמרים ישירות על הפריט לגישה נוחה
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: number;
}

/**
 * מייצג שיבוץ של משתמש לפריט.
 */
export interface Assignment {
  id: string;
  menuItemId: string;
  userId: string;
  userName: string;
  quantity: number;
  notes?: string;
  status: 'confirmed' | 'pending' | 'completed';
  assignedAt: number;
}

/**
 * מייצג משתתף שנרשם לאירוע.
 */
export interface Participant {
    id: string; // Firebase Auth UID (יכול להיות גם של משתמש אנונימי)
    name: string;
    joinedAt: number;
}

/**
 * מייצג את האובייקט המלא של אירוע, כפי שהוא מאוחסן בבסיס הנתונים.
 * זהו האובייקט הראשי שיכיל את כל המידע על אירוע בודד במודל השטוח.
 */
export interface ShishiEvent {
  id: string; // המזהה הייחודי של האירוע
  organizerId: string;
  organizerName: string;
  createdAt: number;
  updatedAt?: number;
  details: EventDetails;
  menuItems: { [key: string]: Omit<MenuItem, 'id'> };
  assignments: { [key: string]: Omit<Assignment, 'id'> };
  participants: { [key: string]: Omit<Participant, 'id'> };
}

// טיפוסים עבור ה-Store הגלובלי (Zustand)
export interface AppState {
  user: User | null; // המשתמש המחובר (תמיד יהיה מארגן)
  organizerEvents: ShishiEvent[]; // רשימת האירועים של המארגן (עבור הדאשבורד)
  currentEvent: ShishiEvent | null; // האירוע הספציפי שבו המשתמש צופה כרגע
  isLoading: boolean;
}
