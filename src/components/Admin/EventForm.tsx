import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, User, FileText, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { FirebaseService } from '../../services/firebaseService';
import { ShishiEvent } from '../../types';
import { getNextFriday } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

interface EventFormProps {
  event?: ShishiEvent;
  onClose: () => void;
}

interface FormErrors {
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  hostName?: string;
}

export function EventForm({ event, onClose }: EventFormProps) {
  const { user, addEvent, updateEvent } = useStore();
  const { isAdmin, user: authUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
    const [formData, setFormData] = useState({
    title: event?.title || '',
    date: event?.date || getNextFriday(),
    time: event?.time || '19:00',
    location: event?.location || 'שטרוק 21 תל אביב',
    description: event?.description || '',
    // השינוי כאן: החלפנו את user.name ב-authUser.displayName
    hostName: event?.hostName || authUser?.displayName || '', 
    maxParticipants: event?.maxParticipants || undefined,
    isActive: event?.isActive ?? true
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'שם האירוע הוא שדה חובה';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'שם האירוע חייב להכיל לפחות 3 תווים';
    }

    if (!formData.date) {
      newErrors.date = 'תאריך הוא שדה חובה';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'לא ניתן ליצור אירוע בתאריך שעבר';
      }
    }

    if (!formData.time) {
      newErrors.time = 'שעה היא שדה חובה';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'מיקום הוא שדה חובה';
    } else if (formData.location.trim().length < 3) {
      newErrors.location = 'המיקום חייב להכיל לפחות 3 תווים';
    }

    if (!formData.hostName.trim()) {
      newErrors.hostName = 'שם המארח הוא שדה חובה';
    } else if (formData.hostName.trim().length < 2) {
      newErrors.hostName = 'שם המארח חייב להכיל לפחות 2 תווים';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // בדיקת הרשאות מנהל
    if (!isAdmin || !authUser) {
      toast.error('רק מנהלים יכולים ליצור אירועים');
      return;
    }

    // אימות טופס
    if (!validateForm()) {
      toast.error('יש לתקן את השגיאות בטופס');
      return;
    }

    setIsSubmitting(true);

    try {
      const eventData = {
        ...formData,
        title: formData.title.trim(),
        location: formData.location.trim(),
        hostName: formData.hostName.trim(),
        description: formData.description.trim() || null,
        hostId: authUser.uid,
        updatedAt: Date.now()
      };

      if (event) {
        // Update existing event
        const success = await FirebaseService.updateEvent(event.id, eventData);
        if (success) {
          updateEvent(event.id, eventData);
          toast.success('האירוע עודכן בהצלחה!');
          onClose();
        } else {
          throw new Error('Failed to update event');
        }
      } else {
        // Create new event
        const newEvent = {
          ...eventData,
          createdAt: Date.now()
        };
        
        const eventId = await FirebaseService.createEvent(newEvent);
        if (eventId) {
          addEvent({ ...newEvent, id: eventId });
          toast.success('האירוע נוצר בהצלחה!');
          onClose();
        } else {
          throw new Error('Failed to create event');
        }
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(event ? 'שגיאה בעדכון האירוע. אנא נסה שוב.' : 'שגיאה ביצירת האירוע. אנא נסה שוב.');
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

  // אם המשתמש לא מנהל, הצג הודעה
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
          <div className="bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">גישה מוגבלת</h2>
          <p className="text-gray-600 mb-4">רק מנהלים יכולים ליצור ולערוך אירועים</p>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
          >
            סגור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {event ? 'עריכת אירוע' : 'אירוע חדש'}
          </h2>
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
          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              כותרת האירוע *
            </label>
            <div className="relative">
              <FileText className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="שישי שיתופי בקהילה"
                className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
                required
              />
            </div>
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 ml-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תאריך *
              </label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {errors.date && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 ml-1" />
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שעה *
              </label>
              <div className="relative">
                <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.time ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {errors.time && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 ml-1" />
                  {errors.time}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מיקום *
            </label>
            <div className="relative">
              <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="כתובת או שם המקום"
                className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.location ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
                required
              />
            </div>
            {errors.location && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 ml-1" />
                {errors.location}
              </p>
            )}
          </div>

          {/* Host Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם המארח *
            </label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.hostName}
                onChange={(e) => handleInputChange('hostName', e.target.value)}
                placeholder="שם המארח"
                className={`w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.hostName ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
                required
              />
            </div>
            {errors.hostName && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 ml-1" />
                {errors.hostName}
              </p>
            )}
          </div>

          {/* Max Participants */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מספר משתתפים מקסימלי (אופציונלי)
            </label>
            <input
              type="number"
              min="1"
              value={formData.maxParticipants || ''}
              onChange={(e) => handleInputChange('maxParticipants', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="ללא הגבלה"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תיאור (אופציונלי)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="פרטים נוספים על האירוע..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Active Status */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <span className="mr-2 text-sm text-gray-700">האירוע פעיל</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              רק אירועים פעילים מאפשרים שיבוצים חדשים
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 rtl:space-x-reverse">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  שומר...
                </>
              ) : (
                event ? 'עדכן אירוע' : 'צור אירוע'
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