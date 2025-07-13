import React, { useState } from 'react';
import { X, User, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { FirebaseService } from '../../services/firebaseService';
import { MenuItem, ShishiEvent, Assignment } from '../../types';
import { saveUserToLocalStorage, updateUserInLocalStorage } from '../../utils/userUtils';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import toast from 'react-hot-toast';

interface AssignmentModalProps {
  menuItem: MenuItem;
  event: ShishiEvent;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  quantity?: string;
}

export function AssignmentModal({ menuItem, event, onClose }: AssignmentModalProps) {
  const { user, setUser, addAssignment, updateMenuItem } = useStore();
  const [name, setName] = useState(user?.name || '');
  const [quantity, setQuantity] = useState(menuItem.quantity);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Check if user already has a name (not first assignment)
  const hasUserName = user?.name && user.name.trim().length > 0;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Only validate name if user doesn't have one yet
    if (!hasUserName) {
      if (!name.trim()) {
        newErrors.name = 'שם הוא שדה חובה';
      } else if (name.trim().length < 2) {
        newErrors.name = 'השם חייב להכיל לפחות 2 תווים';
      }
    }

    if (quantity <= 0) {
      newErrors.quantity = 'הכמות חייבת להיות לפחות 1';
    } else if (quantity > 100) {
      newErrors.quantity = 'הכמות לא יכולה להיות יותר מ-100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAssign = async () => {
    if (!user) {
      toast.error('שגיאה במערכת המשתמש');
      return;
    }

    if (!validateForm()) {
      toast.error('יש לתקן את השגיאות בטופס');
      return;
    }

    // Disable button to prevent double clicks
    setIsButtonDisabled(true);
    setIsSubmitting(true);

    try {
      let finalUserName = user.name;

      if (!hasUserName && name.trim()) {
        finalUserName = name.trim();
        const userRef = ref(database, `users/${user.id}`);
        await update(userRef, { name: finalUserName });

        const updatedUser = { ...user, name: finalUserName };
        saveUserToLocalStorage(updatedUser);
        setUser(updatedUser);
      }

      console.log('Creating assignment with data:', {
        eventId: event.id,
        menuItemId: menuItem.id,
        userId: user.id,
        userName: finalUserName,
        quantity,
        notes: notes.trim() || undefined
      });

      // Create assignment with all required fields
      const assignmentData = {
        eventId: event.id,
        menuItemId: menuItem.id,
        userId: user.id,
        userName: finalUserName,
        quantity,
        status: 'confirmed',
        assignedAt: Date.now()
      } as any;

      // Add optional fields
      if (user.phone?.trim()) {
        assignmentData.userPhone = user.phone.trim();
      }
      if (notes.trim()) {
        assignmentData.notes = notes.trim();
      }

      // First create the assignment
      const assignmentId = await FirebaseService.createAssignment(assignmentData);
      console.log('Assignment created with ID:', assignmentId);
      
      // Update local state with the assignment immediately
      addAssignment({ ...assignmentData, id: assignmentId });
      
      // Update local menu item state (Firebase update is handled in createAssignment)
      const menuItemUpdates = {
        assignedTo: user.id,
        assignedToName: finalUserName,
        assignedAt: Date.now()
      };
      
      // Update local state to reflect the assignment
      updateMenuItem(menuItem.id, menuItemUpdates);
      
      toast.success('השיבוץ בוצע בהצלחה!');
      onClose();
      
    } catch (error) {
      console.error('Error creating assignment:', error);
      
      // Handle specific error messages
      if (error instanceof Error) {
        if (error.message.includes('מצטערים, מישהו אחר') || 
            error.message.includes('כבר יש לך שיבוץ')) {
          toast.error(error.message);
          // Close modal on conflict to force refresh
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          toast.error('שגיאה ביצירת השיבוץ. אנא נסה שוב.');
        }
      } else {
        toast.error('שגיאה ביצירת השיבוץ. אנא נסה שוב.');
      }
    } finally {
      setIsSubmitting(false);
      // Re-enable button after a short delay to prevent rapid clicking
      setTimeout(() => {
        setIsButtonDisabled(false);
      }, 2000);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    switch (field) {
      case 'name':
        setName(value);
        break;
      case 'quantity':
        setQuantity(value);
        break;
    }
    
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
          <h2 className="text-lg font-semibold text-gray-900">שיבוץ פריט</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Item Details */}
          <div className="bg-orange-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{menuItem.name}</h3>
            <p className="text-sm text-gray-600">עבור: {event.title}</p>
            <p className="text-sm text-gray-600">כמות מוצעת: {menuItem.quantity}</p>
            {menuItem.isRequired && (
              <div className="flex items-center mt-2">
                <AlertCircle className="h-4 w-4 text-red-500 ml-1" />
                <span className="text-sm text-red-600 font-medium">פריט חובה</span>
              </div>
            )}
          </div>

          {/* Name Input - Only show if user doesn't have a name yet */}
          {!hasUserName && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם מלא *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="הזן שם מלא"
                  className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
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
              <p className="text-xs text-gray-500 mt-1">
                השם יישמר למכשיר זה ולא יידרש שוב בשיבוצים הבאים
              </p>
            </div>
          )}

          {/* User Info - Show if user already has a name */}
          {hasUserName && (
            <div className="mb-6">
              <div className="flex items-center text-gray-700 mb-2">
                <User className="h-4 w-4 ml-2" />
                <span className="font-medium">{user.name}</span>
              </div>
              {user.phone && (
                <div className="flex items-center text-gray-700">
                  <Phone className="h-4 w-4 ml-2" />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Quantity Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              כמות שאביא *
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
              required
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 ml-1" />
                {errors.quantity}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              הערות (אופציונלי)
            </label>
            <div className="relative">
              <MessageSquare className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות נוספות..."
                rows={3}
                className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 rtl:space-x-reverse">
            <button
              onClick={handleAssign}
              disabled={isSubmitting || isButtonDisabled || (!hasUserName && !name.trim())}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  משבץ...
                </>
              ) : (
                'שבץ אותי'
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting || isButtonDisabled}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
