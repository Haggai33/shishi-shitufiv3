// src/components/Events/UserMenuItemForm.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { FirebaseService } from '../../services/firebaseService';
import { MenuCategory, MenuItem } from '../../types';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { X, ChefHat, Hash, FileText, User as UserIcon } from 'lucide-react';

interface UserMenuItemFormProps {
  organizerId: string;
  eventId: string;
  user: FirebaseUser;
  onClose: () => void;
}

const UserMenuItemFormModal: React.FC<UserMenuItemFormProps> = ({ organizerId, eventId, user, onClose }) => {
  const [item, setItem] = useState({ name: '', category: 'main' as MenuCategory, quantity: 1, notes: '' });
  const [assignToSelf, setAssignToSelf] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    const participants = useStore.getState().currentEvent?.participants || {};
    const isParticipant = !!participants[user.uid];
    if (user.isAnonymous && !isParticipant) {
      setShowNameInput(true);
    }
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.name.trim() || item.quantity <= 0) {
      toast.error("יש למלא שם וכמות תקינה.");
      return;
    }
    if (showNameInput && !participantName.trim()) {
      toast.error("כדי להוסיף פריט, יש להזין שם מלא.");
      return;
    }
    setIsLoading(true);
    try {
      let finalUserName = participantName.trim();
      if (showNameInput) {
        await FirebaseService.joinEvent(organizerId, eventId, user.uid, finalUserName);
      } else {
        const existingParticipant = useStore.getState().currentEvent?.participants[user.uid];
        finalUserName = existingParticipant?.name || user.displayName || 'אורח';
      }

      const newItemData: Omit<MenuItem, 'id' | 'eventId'> = {
        ...item,
        creatorId: user.uid,
        creatorName: finalUserName,
        createdAt: Date.now(),
        isRequired: false,
      };

      await FirebaseService.addMenuItemAndAssign(
        organizerId,
        eventId,
        newItemData,
        assignToSelf ? user.uid : null,
        finalUserName
      );

      toast.success("הפריט נוסף בהצלחה!");
      onClose();
    } catch (error) {
      console.error("Error adding menu item:", error);
      toast.error("שגיאה בהוספת הפריט.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">הוסף פריט משלך</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>
          
          <div className="space-y-4">
            {showNameInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא*</label>
                <div className="relative">
                    <UserIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" value={participantName} onChange={e => setParticipantName(e.target.value)} placeholder="השם שיוצג לכולם" className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-lg" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם הפריט*</label>
              <div className="relative">
                <ChefHat className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="למשל: עוגת גבינה" value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-lg" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה*</label>
                    <select value={item.category} onChange={e => setItem({ ...item, category: e.target.value as MenuCategory })} className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="starter">מנה ראשונה</option>
                        <option value="main">מנה עיקרית</option>
                        <option value="dessert">קינוח</option>
                        <option value="drink">משקה</option>
                        <option value="other">אחר</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">כמות*</label>
                     <div className="relative">
                        <Hash className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type="number" placeholder="1" value={item.quantity} onChange={e => setItem({ ...item, quantity: parseInt(e.target.value) || 1 })} className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-lg" required min="1" />
                    </div>
                </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">הערות (אופציונלי)</label>
              <div className="relative">
                <MessageSquare className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <textarea placeholder="לדוגמה: כשר, ללא בוטנים..." value={item.notes} onChange={e => setItem({ ...item, notes: e.target.value })} className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-lg" rows={2} />
              </div>
            </div>
            <label className="flex items-center pt-2">
              <input type="checkbox" checked={assignToSelf} onChange={e => setAssignToSelf(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
              <span className="mr-2 text-sm text-gray-700">שבץ אותי לפריט זה באופן אוטומטי</span>
            </label>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rtl:space-x-reverse rounded-b-xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium">ביטול</button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300 font-medium">
            {isLoading ? 'מוסיף...' : 'הוסף פריט לרשימה'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserMenuItemFormModal;
