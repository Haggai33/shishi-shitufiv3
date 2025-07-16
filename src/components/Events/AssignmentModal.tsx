// src/components/Events/AssignmentModal.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { FirebaseService } from '../../services/firebaseService';
import { MenuItem, Assignment } from '../../types';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { X, Hash, MessageSquare, User as UserIcon } from 'lucide-react';

interface AssignmentModalProps {
  item: MenuItem;
  organizerId: string;
  eventId: string;
  user: FirebaseUser;
  onClose: () => void;
  isEdit?: boolean;
  existingAssignment?: Assignment;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  item,
  organizerId,
  eventId,
  user,
  onClose,
  isEdit = false,
  existingAssignment,
}) => {
  const [quantity, setQuantity] = useState(existingAssignment?.quantity || item.quantity);
  const [notes, setNotes] = useState(existingAssignment?.notes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // בודק אם המשתמש כבר רשום כמשתתף באירוע
  useEffect(() => {
    const participants = useStore.getState().currentEvent?.participants || {};
    const isParticipant = !!participants[user.uid];
    
    // הצג שדה שם רק אם זה משתמש אנונימי שעדיין לא הצטרף
    if (user.isAnonymous && !isParticipant) {
      setShowNameInput(true);
    }
  }, [user.uid]);

  const handleSubmit = async () => {
    // ולידציה
    if (showNameInput && !participantName.trim()) {
      toast.error("כדי להשתבץ, יש להזין שם מלא.");
      return;
    }
    if (quantity <= 0) {
      toast.error("הכמות חייבת להיות גדולה מ-0.");
      return;
    }
    
    setIsLoading(true);

    try {
      let finalUserName = participantName.trim();
      
      // אם המשתמש הזין שם, רשום אותו כמשתתף באירוע
      if (showNameInput) {
        await FirebaseService.joinEvent(organizerId, eventId, user.uid, finalUserName);
      } else {
        // אם הוא כבר משתתף, קח את השם הקיים שלו
        finalUserName = useStore.getState().currentEvent?.participants[user.uid]?.name || 'אורח';
      }

      if (isEdit && existingAssignment) {
        // --- לוגיקת עריכה ---
        await FirebaseService.updateAssignment(organizerId, eventId, existingAssignment.id, {
          quantity,
          notes: notes.trim(),
        });
        toast.success("השיבוץ עודכן בהצלחה!");
      } else {
        // --- לוגיקת יצירת שיבוץ חדש ---
        const assignmentData: Omit<Assignment, 'id'> = {
          menuItemId: item.id,
          userId: user.uid,
          userName: finalUserName,
          quantity,
          notes: notes.trim(),
          status: 'confirmed',
          assignedAt: Date.now(),
        };
        await FirebaseService.createAssignment(organizerId, eventId, assignmentData);
        toast.success(`שובצת בהצלחה לפריט: ${item.name}`);
      }
      onClose();
    } catch (error: any) {
      console.error("Error in assignment modal:", error);
      toast.error(error.message || "אירעה שגיאה.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'עריכת שיבוץ' : 'שיבוץ פריט'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-lg mb-6 text-center">
            <p className="font-bold text-orange-800">{item.name}</p>
            <p className="text-sm text-orange-700">כמות מוצעת: {item.quantity}</p>
          </div>

          <div className="space-y-4">
            {showNameInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא*</label>
                <div className="relative">
                    <UserIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" value={participantName} onChange={e => setParticipantName(e.target.value)} placeholder="השם שיוצג לכולם" className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-lg" />
                </div>
                <p className="text-xs text-gray-500 mt-1">השם יישמר למכשיר זה עבור אירוע זה.</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כמות שאביא*</label>
              <div className="relative">
                <Hash className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)} className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-lg" min="1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">הערות (אופציונלי)</label>
              <div className="relative">
                <MessageSquare className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-lg" rows={3} placeholder="לדוגמה: ללא גלוטן, טבעוני..." />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rtl:space-x-reverse rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium">ביטול</button>
          <button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 font-medium">
            {isLoading ? 'מעדכן...' : isEdit ? 'שמור שינויים' : 'אשר שיבוץ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentModal;
