import React, { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Edit, Trash2, Save, X, UserPlus } from 'lucide-react';
import { MenuItem } from '../../types';
import { useStore } from '../../store/useStore';
import { FirebaseService } from '../../services/firebaseService';
import toast from 'react-hot-toast';

interface MenuItemCardProps {
  item: MenuItem;
  canAssign: boolean;
  isLoading?: boolean;
  onAssign: () => void;
  onEdit?: () => void;
}

export function MenuItemCard({ item, canAssign, isLoading = false, onAssign, onEdit }: MenuItemCardProps) {
  const { user, menuItems, assignments, updateMenuItem, deleteAssignment, deleteMenuItem } = useStore();
  const isAdmin = user?.isAdmin || false;


  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedNotes, setEditedNotes] = useState(item.notes || '');
  const [editedQuantity, setEditedQuantity] = useState(item.quantity);
  const [editedRequired, setEditedRequired] = useState(item.isRequired);
  const [isSaving, setIsSaving] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const categoryColors = {
    starter: 'bg-blue-50 text-blue-700 border-blue-200',
    main: 'bg-red-50 text-red-700 border-red-200',
    dessert: 'bg-purple-50 text-purple-700 border-purple-200',
    drink: 'bg-green-50 text-green-700 border-green-200',
    other: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  const categoryNames = {
    starter: 'מנה ראשונה',
    main: 'מנה עיקרית',
    dessert: 'קינוח',
    drink: 'משקה',
    other: 'אחר'
  };

  const isAssigned = !!item.assignedTo;
  const isMyAssignment = isAssigned && item.assignedTo === user?.id;
  const isCreator = user?.id === item.creatorId;
  const canControlItem = isAdmin || (isCreator && !isAssigned);

  const itemAssignments = assignments.filter(a => a.menuItemId === item.id);
  const hasMultipleAssignments = itemAssignments.length > 1;

  const allEventMenuItems = menuItems.filter(mi => mi.eventId === item.eventId);
  const currentlyAssignedItems = allEventMenuItems.filter(mi => !!mi.assignedTo && !!mi.assignedToName);

  const allUsers = currentlyAssignedItems.reduce((users, assignedItem) => {
    const key = `${assignedItem.assignedTo!}|${assignedItem.assignedToName!}`;
    if (!users.some(u => `${u.userId}|${u.userName}` === key)) {
      users.push({
        userId: assignedItem.assignedTo!,
        userName: assignedItem.assignedToName!
      });
    }
    return users;
  }, [] as { userId: string; userName: string }[]);

  const handleSaveEdit = async () => {
    if (!editedName.trim()) {
      toast.error('שם הפריט לא יכול להיות ריק');
      return;
    }
    if (editedQuantity < 1 || editedQuantity > 100) {
      toast.error('הכמות חייבת להיות בין 1 ל-100');
      return;
    }
    setIsSaving(true);
    try {
      const updates = {
        name: editedName.trim(),
        notes: editedNotes.trim() || undefined,
        quantity: editedQuantity,
        isRequired: isAdmin ? editedRequired : item.isRequired,
      };
      const success = await FirebaseService.updateMenuItem(item.id, updates);
      if (success) {
        updateMenuItem(item.id, updates);
        toast.success('הפריט עודכן בהצלחה');
        setIsEditing(false);
      } else {
        throw new Error('Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('שגיאה בעדכון הפריט');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(item.name);
    setEditedNotes(item.notes || '');
    setEditedQuantity(item.quantity);
    setEditedRequired(item.isRequired);
    setIsEditing(false);
  };

  const handleDeleteItem = async () => {
    if (!canControlItem) {
      toast.error('אין לך הרשאה למחוק פריט זה.');
      return;
    }
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הפריט "${item.name}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await FirebaseService.deleteMenuItem(item.id);
      deleteMenuItem(item.id);

      toast.success('הפריט נמחק בהצלחה');
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("שגיאה במחיקת הפריט.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelAssignment = async () => {
    if (!user || !isMyAssignment) return;
    if (!confirm(`האם לבטל את השיבוץ של "${item.name}"?`)) return;
    setIsCanceling(true);
    try {
      const userAssignment = assignments.find(a => a.menuItemId === item.id && a.userId === user.id);
      if (!userAssignment) throw new Error('Assignment not found');
      await FirebaseService.deleteAssignment(userAssignment.id);
      deleteAssignment(userAssignment.id);
      const menuItemUpdates = { assignedTo: undefined, assignedToName: undefined, assignedAt: undefined };
      await FirebaseService.updateMenuItem(item.id, menuItemUpdates);
      updateMenuItem(item.id, menuItemUpdates);
      toast.success('השיבוץ בוטל בהצלחה!');
    } catch (error) {
      console.error('Error canceling assignment:', error);
      toast.error('שגיאה בביטול השיבוץ.');
    } finally {
      setIsCanceling(false);
    }
  };

  // *** התיקון נמצא כאן ***
  const handleAdminCancelAssignment = async () => {
    if (!isAdmin || !item.assignedTo) return;
    if (!confirm(`האם אתה בטוח שברצונך לבטל את השיבוץ של "${item.assignedToName}" מהפריט "${item.name}"?`)) {
      return;
    }
    setIsCanceling(true);
    try {
      // Find the corresponding assignment object
      const assignmentToCancel = assignments.find(a => a.menuItemId === item.id && a.userId === item.assignedTo);

      // If a separate assignment object exists, delete it first
      if (assignmentToCancel) {
        await FirebaseService.deleteAssignment(assignmentToCancel.id);
        deleteAssignment(assignmentToCancel.id); // Update local store
      }
      
      // The main goal is to clear the assignment from the MenuItem.
      // This runs regardless of whether the assignment object was found, ensuring the item is cleared.
      const menuItemUpdates = {
        assignedTo: undefined,
        assignedToName: undefined,
        assignedAt: undefined
      };
      
      await FirebaseService.updateMenuItem(item.id, menuItemUpdates, true); // skipAdminCheck = true
      updateMenuItem(item.id, menuItemUpdates); // Update local store

      // Only show ONE toast, and it's a success toast.
      toast.success('השיבוץ בוטל בהצלחה!');

    } catch (error) {
      console.error('Error canceling assignment as admin:', error);
      toast.error('שגיאה בביטול השיבוץ.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleReplaceUser = async (newUserId: string, newUserName: string) => {
    if (!isAdmin || !item.assignedTo) return;
    if (!confirm(`האם להחליף את ${item.assignedToName} ב-${newUserName}?`)) return;
    try {
      const currentAssignment = assignments.find(a => a.menuItemId === item.id && a.userId === item.assignedTo);
      if (currentAssignment) {
        const success = await FirebaseService.updateAssignment(currentAssignment.id, {
          userId: newUserId,
          userName: newUserName,
          updatedAt: Date.now()
        });
        if (success) {
          await FirebaseService.updateMenuItem(item.id, {
            assignedTo: newUserId,
            assignedToName: newUserName,
            assignedAt: Date.now()
          }, true);
          toast.success('המשתמש הוחלף בהצלחה');
        }
      }
    } catch (error) {
      console.error('Error replacing user:', error);
      toast.error('שגיאה בהחלפת המשתמש');
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 transition-all duration-200 ${isLoading || isCanceling || isDeleting ? 'opacity-50 pointer-events-none' : isAssigned ? (isMyAssignment ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200') : canAssign ? 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer' : 'bg-gray-50 border-gray-200'}`}
         onClick={canAssign && !isAssigned && !isLoading && !isEditing && !isCanceling ? onAssign : undefined}>
      
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 text-sm flex-1 ml-2" placeholder="שם הפריט" />
        ) : (
          <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
        )}
        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[item.category] || categoryColors.other}`}>{categoryNames[item.category] || categoryNames.other}</div>
      </div>
      
      <div className="flex items-center justify-between text-gray-600 mb-3">
        {isEditing ? (
          <div className="flex items-center space-x-2 rtl:space-x-reverse"><span className="text-sm">כמות:</span><input type="number" min="1" max="100" value={editedQuantity} onChange={(e) => setEditedQuantity(parseInt(e.target.value) || 1)} className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" /></div>
        ) : (
          <span className="text-sm">כמות: {item.quantity}</span>
        )}
        
        {isEditing ? (
          isAdmin && <label className="flex items-center"><input type="checkbox" checked={editedRequired} onChange={(e) => setEditedRequired(e.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500 ml-1" /><span className="text-xs text-red-600 font-medium">חובה</span></label>
        ) : (
          item.isRequired && <div className="flex items-center"><AlertCircle className="h-4 w-4 text-red-500 ml-1" /><span className="text-xs text-red-600 font-medium">חובה</span></div>
        )}
      </div>

      {isEditing && (
        <div className="mb-3"><textarea value={editedNotes} onChange={(e) => setEditedNotes(e.target.value)} placeholder="הערות (אופציונלי)" rows={2} className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none" /></div>
      )}
      
      {isAssigned ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${isMyAssignment ? 'text-blue-700' : 'text-green-700'}`}>
              <CheckCircle className="h-4 w-4 ml-2" /><span className="text-sm font-medium">{isMyAssignment ? 'השיבוץ שלי' : 'משובץ'}</span>
              {hasMultipleAssignments && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full mr-2">{itemAssignments.length} שיבוצים</span>}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{item.assignedToName}</p>
              {item.assignedAt && <p className="text-xs text-gray-600"><Clock className="h-3 w-3 inline ml-1" />{new Date(item.assignedAt).toLocaleDateString('he-IL')}</p>}
            </div>
          </div>
          {isAdmin && !isMyAssignment && allUsers.length > 1 && (
            <div className="pt-2 border-t border-gray-200">
              <select onChange={(e) => { const [userId, userName] = e.target.value.split('|'); if (userId && userName && userId !== item.assignedTo) { handleReplaceUser(userId, userName); } e.target.value = ''; }} className="w-full text-xs border border-gray-300 rounded px-2 py-1" defaultValue="">
                <option value="">החלף משתמש...</option>
                {allUsers.filter(u => u.userId !== item.assignedTo).map(u => (<option key={`${u.userId}|${u.userName}`} value={`${u.userId}|${u.userName}`}>{u.userName}</option>))}
              </select>
            </div>
          )}
          {isMyAssignment && canAssign && (
            <div className="flex space-x-2 rtl:space-x-reverse pt-2 border-t border-blue-200">
              <button onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(); }} disabled={isLoading || isCanceling} className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"><Edit className="h-3 w-3 ml-1" />ערוך שיבוץ</button>
              <button onClick={(e) => { e.stopPropagation(); handleCancelAssignment(); }} disabled={isLoading || isCanceling} className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center">{isCanceling ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <><Trash2 className="h-3 w-3 ml-1" />בטל שיבוץ</>}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
            {item.creatorId && <div className="flex items-center text-xs text-gray-500"><UserPlus className="h-3 w-3 ml-1" /><span>{item.creatorName === user?.name ? 'נוצר על ידי' : `נוצר ע"י ${item.creatorName}`}</span></div>}
            {canAssign && !isEditing && (<button onClick={(e) => { e.stopPropagation(); onAssign(); }} disabled={isLoading || isCanceling} className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors">שבץ אותי</button>)}
        </div>
      )}
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        {isEditing ? (
            <div className="flex space-x-2 rtl:space-x-reverse">
                <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center justify-center">{isSaving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <><Save className="h-3 w-3 ml-1" />שמור</>}</button>
                <button onClick={handleCancelEdit} disabled={isSaving} className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center justify-center"><X className="h-3 w-3 ml-1" />ביטול</button>
            </div>
        ) : (
          <div className="flex justify-between items-center">
            {item.creatorId && item.creatorName !== user?.name && <div className="flex items-center text-xs text-gray-500"></div>}
            {canControlItem && (
                <div className="flex space-x-2 rtl:space-x-reverse">
                    <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 text-gray-500 hover:text-blue-600" title="ערוך פריט"><Edit className="h-4 w-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(); }} disabled={isDeleting} className="p-1 text-gray-500 hover:text-red-600" title="מחק פריט">{isDeleting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div> : <Trash2 className="h-4 w-4" />}</button>
                </div>
            )}
          </div>
        )}
      </div>

      {isAdmin && isAssigned && !isMyAssignment && (
         <div className="mt-3 pt-3 border-t border-gray-200">
            <button onClick={handleAdminCancelAssignment} disabled={isCanceling} className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center">{isCanceling ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700"></div> : "בטל שיבוץ (מנהל)"}</button>
         </div>
      )}

      {!isEditing && item.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">{item.notes}</p>
        </div>
      )}
    </div>
  );
}
