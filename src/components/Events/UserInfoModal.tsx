import React, { useState } from 'react';
import { X, User, Phone, Mail, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { updateUserInLocalStorage } from '../../utils/userUtils';
import toast from 'react-hot-toast';

interface UserInfoModalProps {
  onClose: () => void;
  onComplete: () => void;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
}

export function UserInfoModal({ onClose, onComplete }: UserInfoModalProps) {
  const { user, setUser } = useStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'שם הוא שדה חובה';
    } else if (name.trim().length < 2) {
      newErrors.name = 'השם חייב להכיל לפחות 2 תווים';
    }

    if (phone.trim() && !/^[\d\-\s\+\(\)]+$/.test(phone.trim())) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('יש לתקן את השגיאות בטופס');
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedUser = {
        ...user!,
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined
      };

      updateUserInLocalStorage(updatedUser);
      setUser(updatedUser);
      
      toast.success('הפרטים נשמרו בהצלחה!');
      onComplete();
    } catch (error) {
      console.error('Error saving user info:', error);
      toast.error('שגיאה בשמירת הפרטים. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    switch (field) {
      case 'name':
        setName(value);
        break;
      case 'phone':
        setPhone(value);
        break;
      case 'email':
        setEmail(value);
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
          <h2 className="text-lg font-semibold text-gray-900">פרטים אישיים</h2>
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
          <div className="mb-6">
            <p className="text-gray-600 text-sm">
              כדי לשבץ פריטים, יש להזין פרטים אישיים. הפרטים נשמרים רק במכשיר שלך.
            </p>
          </div>

          {/* Name */}
          <div className="mb-4">
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
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              טלפון (אופציונלי)
            </label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="050-1234567"
                className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 ml-1" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              אימייל (אופציונלי)
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="example@email.com"
                className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 ml-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 rtl:space-x-reverse">
            <button
              onClick={handleSave}
              disabled={!name.trim() || isSubmitting}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  שומר...
                </>
              ) : (
                'שמור פרטים'
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
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