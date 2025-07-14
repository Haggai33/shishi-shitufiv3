export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  isAdmin?: boolean;
  createdAt: number;
}

export interface ShishiEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string;
  hostId: string;
  hostName: string;
  maxParticipants?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MenuItem {
  id: string;
  eventId: string;
  name: string;
  category: 'starter' | 'main' | 'dessert' | 'drink' | 'other';
  quantity: number;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: number;
  notes?: string;
  isRequired: boolean;
  createdAt: number;
  creatorId?: string;      // שדה חדש: מזהה המשתמש שיצר את הפריט
  creatorName?: string;  // שדה חדש: שם המשתמש שיצר את הפריט
}

export interface Assignment {
  id: string;
  eventId: string;
  menuItemId: string;
  userId: string;
  userName: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'assigned';
  createdAt: number;
  updatedAt?: number;
}

export type MenuCategory = 'starter' | 'main' | 'dessert' | 'drink' | 'other';

export type Unsubscribe = () => void;

export interface AppState {
  user: User | null;
  users: User[];
  events: ShishiEvent[];
  menuItems: MenuItem[];
  assignments: Assignment[];
  isLoading: boolean;
  error: string | null;
  listenerUnsubscribers: Unsubscribe[];
}
