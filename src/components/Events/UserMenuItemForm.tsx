import React, { useState, useEffect } from 'react';
import { X, ChefHat, Hash, MessageSquare, User as UserIcon, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { FirebaseService } from '../../services/firebaseService';
import { ShishiEvent, MenuItem, MenuCategory } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface UserMenuItemFormProps {
  event: ShishiEvent;
  onClose: () => void;
  availableCategories?: string[];
}

interface FormErrors {
  name?: string;
  quantity?: string;
}

export function UserMenuItemForm({ event, onClose, availableCategories }: UserMenuItemFormProps) {
  const { user: authUser } = useAuth();
  const { addMenuItem } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [participantName, setParticipantName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'main' as MenuCategory,
    quantity: 1,
    notes: '',
    assignToSelf: true
  });

  const categoryOptions = [
    { value: 'starter', label: 'מנה ראשונה' },
    { value: 'main', label: 'מנה עיקרית' },
    { value: 'dessert', label: 'קינוח' },
    { value: 'drink', label: 'משקה' },
    { value: 'other', label: 'אחר' }
  ];

  useEffect(() => {
    if (authUser?.isAnonymous) {
      const participants = event.participants || {};
      const isParticipant = !!participants[authUser.uid];
      if (!isParticipant) {
        setShowNameInput(true);
      }
    }
  }, [authUser, event.participants]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authUser) {
      toast.error('יש להתחבר כדי להוסיף פריט');
      return;
    }

    if (!validateForm()) {
      toast.error('יש לתקן את השגיאות בטופס');
      return;
    }

    if (showNameInput && !participantName.trim()) {
      toast.error('יש להזין שם כדי להוסיף פריט');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalUserName = participantName.trim();
      
      // אם המשתמש הזין שם, רשום אותו כמשתתף באירוע
      if (showNameInput && finalUserName) {
        await FirebaseService.joinEvent(event.organizerId, event.id, authUser.uid, finalUserName);
      } else {
        // אם הוא כבר משתתף, קח את השם הקיים שלו
        const existingParticipant = event.participants?.[authUser.uid];
        finalUserName = existingParticipant?.name || authUser.displayName || 'אורח';
      }

      const newItemData: Omit<MenuItem, 'id'> = {
        eventId: event.id,
        name: formData.name.trim(),
        category: formData.category,
        quantity: formData.quantity,
        notes: formData.notes.trim() || undefined,
        isRequired: false,
        createdAt: Date.now(),
        creatorId: authUser.uid,
        creatorName: finalUserName
      };

      if (formData.assignToSelf) {
        // הוספת פריט עם שיבוץ אוטומטי
        const itemId = await FirebaseService.addMenuItemAndAssign(
          event.organizerId,
          event.id,
          newItemData,
          authUser.uid,
          finalUserName
        );
        
        if (itemId) {
          // הוספה לסטור המקומי
          addMenuItem({ ...newItemData, id: itemId });
          toast.success('הפריט נוסף ושובץ בהצלחה!');
        }
      } else {
        // הוספת פריט בלבד
        const itemId = await FirebaseService.addMenuItem(event.organizerId, event.id, newItemData);
        
        if (itemId) {
          // הוספה לסטור המקומי
          addMenuItem({ ...newItemData, id: itemId });
          toast.success('הפריט נוסף בהצלחה!');
        }
      }

      onClose();
    } catch (error: any) {
      console.error('Error adding menu item:', error);
      toast.error(error.message || 'שגיאה בהוספת הפריט. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">הוסף פריט משלך</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Name Input for Anonymous Users */}
          {showNameInput && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם מלא *
              </label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="השם שיוצג לכולם"
                  className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">השם יישמר למכשיר זה עבור אירוע זה</p>
            </div>
          )}

          {/* Item Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם הפריט *
            </label>
            <div className="relative">
              <ChefHat className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="לדוגמה: עוגת גבינה"
                className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
                required
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 ml-1" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Category and Quantity */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                קטגוריה *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value as MenuCategory)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isSubmitting}
                required
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                כמות *
              </label>
              <div className="relative">
                <Hash className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                  className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 ml-1" />
                  {errors.quantity}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              הערות (אופציונלי)
            </label>
            <div className="relative">
              <MessageSquare className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="לדוגמה: כשר, ללא גלוטן, טבעוני..."
                rows={3}
                className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Assign to Self */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.assignToSelf}
                onChange={(e) => handleInputChange('assignToSelf', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                disabled={isSubmitting}
              />
              <span className="mr-2 text-sm text-gray-700">שבץ אותי לפריט זה אוטומטית</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              אם תבחר באפשרות זו, הפריט יתווסף לרשימה ותשובץ אליו מיד
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 rtl:space-x-reverse">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  מוסיף...
                </>
              ) : (
                'הוסף פריט'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
