import React, { useState } from 'react';
import { X, ChefHat, Hash, FileText, AlertCircle, User } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { FirebaseService } from '../../services/firebaseService';
import { database } from '../../lib/firebase';
import { ref, push, update } from 'firebase/database';
import { ShishiEvent, MenuItem, MenuCategory } from '../../types';
import toast from 'react-hot-toast';
// 1. הסרת ייבוא מיותר
import { saveUserToLocalStorage } from '../../utils/userUtils';

interface UserMenuItemFormProps {
  event: ShishiEvent;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  quantity?: string;
  userName?: string;
}

export function UserMenuItemForm({ event, onClose }: UserMenuItemFormProps) {
  // 2. הסרת addMenuItem
  const { user, setUser, menuItems } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [newUserName, setNewUserName] = useState('');
  const isNameRequired = !user?.name;

  const [formData, setFormData] = useState({
    name: '',
    category: 'main' as MenuCategory,
    quantity: 1,
    notes: ''
  });

  const categoryOptions = [
    { value: 'starter', label: 'מנה ראשונה' },
    { value: 'main', label: 'מנה עיקרית' },
    { value: 'dessert', label: 'קינוח' },
    { value: 'drink', label: 'משקה' },
    { value: 'other', label: 'אחר' }
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (isNameRequired) {
        if (!newUserName.trim()) {
            newErrors.userName = 'כדי להוסיף פריט, יש להזין שם';
        } else if (newUserName.trim().length < 2) {
            newErrors.userName = 'השם חייב להכיל לפחות 2 תווים';
        }
    }

    if (!formData.name.trim()) {
      newErrors.name = 'שם הפריט הוא שדה חובה';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'שם הפריט חייב להכיל לפחות 2 תווים';
    }

    if (formData.quantity < 1) {
      newErrors.quantity = 'הכמות חייבת להיות לפחות 1';
    } else if (formData.quantity > 100) {
      newErrors.quantity = 'הכמות לא יכולה להיות יותר מ-100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent | null, assignToSelf: boolean = false) => {
    if (e) e.preventDefault();

    if (!user) {
      toast.error('שגיאת משתמש, נסה לרענן את הדף.');
      return;
    }

    if (!validateForm()) {
      toast.error('יש לתקן את השגיאות בטופס');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalUserName = user.name;

      if (isNameRequired) {
        const updatedUser = { ...user, name: newUserName.trim() };
        saveUserToLocalStorage(updatedUser);
        setUser(updatedUser);
        finalUserName = newUserName.trim();
      }

      const eventMenuItems = menuItems.filter(mi => mi.eventId === event.id);
      const isDuplicate = eventMenuItems.some(
        mi => mi.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
      );

      if (isDuplicate) {
        if (!confirm(`פריט בשם "${formData.name.trim()}" כבר קיים. להוסיף בכל זאת?`)) {
          setIsSubmitting(false);
          return;
        }
      }

      if (assignToSelf) {
        // Atomic write for both item and assignment
        const newItemRef = push(ref(database, 'menuItems'));
        const newItemId = newItemRef.key!;
        const newAssignmentRef = push(ref(database, 'assignments'));
        const newAssignmentId = newAssignmentRef.key!;

        const updates: Record<string, unknown> = {};
        const now = Date.now();

        const newItemData = {
          ...formData,
          id: newItemId,
          name: formData.name.trim(),
          notes: formData.notes.trim(),
          eventId: event.id,
          createdAt: now,
          creatorId: user.id,
          creatorName: finalUserName,
          isRequired: false,
          assignedTo: user.id,
          assignedToName: finalUserName,
          assignedAt: now
        };

        const newAssignmentData = {
          id: newAssignmentId,
          eventId: event.id,
          menuItemId: newItemId,
          userId: user.id,
          userName: finalUserName || '',
          quantity: newItemData.quantity,
          status: 'confirmed' as const,
          assignedAt: now,
          updatedAt: now
        };

        updates[`/menuItems/${newItemId}`] = newItemData;
        updates[`/assignments/${newAssignmentId}`] = newAssignmentData;

        await update(ref(database), updates);
        toast.success('הפריט נוסף ושובץ בהצלחה!');
      } else {
        // Original logic for just creating the item
        const newItemData: Omit<MenuItem, 'id'> = {
          ...formData,
          name: formData.name.trim(),
          notes: formData.notes.trim(),
          eventId: event.id,
          createdAt: Date.now(),
          creatorId: user.id,
          creatorName: finalUserName,
          isRequired: false
        };
        
        await FirebaseService.createMenuItem(newItemData, true);
        toast.success('הפריט נוסף בהצלחה!');
      }
      
      onClose();

    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('שגיאה בהוספת הפריט. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">הוספת פריט חדש</h2>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6">
          {isNameRequired && (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא (יוצג לכולם) *</label>
                <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="הזן את שמך"
                        className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${errors.userName ? 'border-red-500' : 'border-gray-300'}`}
                        disabled={isSubmitting}
                        required
                    />
                </div>
                {errors.userName && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="h-4 w-4 ml-1" />{errors.userName}</p>}
                <p className="text-xs text-gray-500 mt-1">
                    השם יישמר למכשיר זה ולא יידרש שוב
                </p>
                <hr className="my-4"/>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">שם הפריט *</label>
            <div className="relative">
              <ChefHat className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="למשל: סלט ירקות גדול" className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`} disabled={isSubmitting} required />
            </div>
            {errors.name && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="h-4 w-4 ml-1" />{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריה *</label>
            <select value={formData.category} onChange={(e) => handleInputChange('category', e.target.value as MenuCategory)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" disabled={isSubmitting} required>
              {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">כמות מוצעת *</label>
            <div className="relative">
              <Hash className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="number" min="1" max="100" value={formData.quantity} onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)} className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${errors.quantity ? 'border-red-500' : 'border-gray-300'}`} disabled={isSubmitting} required />
            </div>
            {errors.quantity && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="h-4 w-4 ml-1" />{errors.quantity}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">הערות (אופציונלי)</label>
            <div className="relative">
              <FileText className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <textarea value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="לדוגמה: ללא גלוטן, טבעוני..." rows={3} className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" disabled={isSubmitting} />
            </div>
          </div>

          <div className="space-y-3">
            <button type="button" onClick={() => handleSubmit(null, true)} disabled={isSubmitting} className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center">
              {isSubmitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>מוסיף...</>) : 'הוסף ושבץ עליי'}
            </button>
            <button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center">
              {isSubmitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>מוסיף...</>) : 'הוסף לרשימה הכללית'}
            </button>
            <button type="button" onClick={onClose} disabled={isSubmitting} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
