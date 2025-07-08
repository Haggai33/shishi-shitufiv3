import React, { useState } from 'react';
import { User, Clock, CheckCircle, AlertCircle, Edit, Trash2, Users, RefreshCw, Save, X } from 'lucide-react';
import { MenuItem } from '../../types';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { FirebaseService } from '../../services/firebaseService';
import toast from 'react-hot-toast';

interface MenuItemCardProps {
  item: MenuItem;
  canAssign: boolean;
  isLoading?: boolean;
  onAssign: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
}

export function MenuItemCard({ item, canAssign, isLoading = false, onAssign, onEdit, onCancel }: MenuItemCardProps) {
  const { user, assignments, updateMenuItem, deleteAssignment } = useStore();
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedNotes, setEditedNotes] = useState(item.notes || '');
  const [editedQuantity, setEditedQuantity] = useState(item.quantity);
  const [editedRequired, setEditedRequired] = useState(item.isRequired);
  const [isSaving, setIsSaving] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  
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

  // Get all assignments for this item
  const itemAssignments = assignments.filter(a => a.menuItemId === item.id);
  const hasMultipleAssignments = itemAssignments.length > 1;

  // Get unique users from current event assignments only for replacement dropdown
  const eventAssignments = assignments.filter(a => a.eventId === item.eventId);
  const allUsers = eventAssignments.reduce((users, assignment) => {
    const key = `${assignment.userId}|${assignment.userName}`;
    if (!users.some(u => `${u.userId}|${u.userName}` === key)) {
      users.push({
        userId: assignment.userId,
        userName: assignment.userName
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
        isRequired: editedRequired
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

  const handleCancelAssignment = async () => {
    if (!user) {
      console.log('Cannot cancel - no user');
      return;
    }

    if (!isMyAssignment) {
      console.log('Cannot cancel - not user assignment');
      toast.error('ניתן לבטל רק שיבוצים שלך');
      return;
    }

    if (!confirm(`האם אתה בטוח שברצונך לבטל את השיבוץ של "${item.name}"?`)) {
      return;
    }

    setIsCanceling(true);

    try {
      console.log('Starting assignment cancellation for item:', item.id);
      
      // Find user's assignment for this item from all assignments
      const userAssignment = assignments.find(a => 
        a.menuItemId === item.id && a.userId === user.id
      );

      if (!userAssignment) {
        console.log('No assignment found for user');
        toast.error('לא נמצא שיבוץ לביטול');
        return;
      }

      console.log('Found assignment to cancel:', userAssignment.id);

      // Step 1: Delete the assignment from Firebase
      console.log('Deleting assignment...');
      const deleteSuccess = await FirebaseService.deleteAssignment(userAssignment.id);
      
      if (!deleteSuccess) {
        throw new Error('Failed to delete assignment');
      }

      // Step 2: Update local state immediately
      deleteAssignment(userAssignment.id);
      console.log('Assignment deleted successfully');

      // Step 3: Clear menu item assignment
      const menuItemUpdates = {
        assignedTo: undefined,
        assignedToName: undefined,
        assignedAt: undefined
      };

      console.log('Clearing menu item assignment...');
      const menuUpdateSuccess = await FirebaseService.updateMenuItem(item.id, menuItemUpdates);
      
      if (menuUpdateSuccess) {
        updateMenuItem(item.id, menuItemUpdates);
        console.log('Menu item cleared successfully');
      } else {
        console.warn('Menu item update failed, but assignment was deleted');
        // Update local state anyway since assignment was deleted
        updateMenuItem(item.id, menuItemUpdates);
      }
      
      toast.success('השיבוץ בוטל בהצלחה!');
      
    } catch (error) {
      console.error('Error canceling assignment:', error);
      toast.error('שגיאה בביטול השיבוץ. אנא נסה שוב.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleAdminCancelAssignment = async () => {
    // ודא שהפריט אכן משובץ לפני שממשיכים
    if (!item.assignedTo) {
      toast.error('הפריט אינו משובץ.');
      return;
    }

    if (!confirm(`האם אתה בטוח שברצונך לבטל את השיבוץ של "${item.assignedToName}" מהפריט "${item.name}"?`)) {
      return;
    }

    setIsCanceling(true);

    try {
      // שלב 1: מצא את רשומת השיבוץ המקורית כדי למחוק אותה
      const assignmentToCancel = assignments.find(a => a.menuItemId === item.id && a.userId === item.assignedTo);

      if (assignmentToCancel) {
        const deleteSuccess = await FirebaseService.deleteAssignment(assignmentToCancel.id);
        if (deleteSuccess) {
          deleteAssignment(assignmentToCancel.id); // עדכון הסטייט המקומי
        } else {
          throw new Error('מחיקת השיבוץ מהמאגר נכשלה.');
        }
      } else {
        // אם לא נמצא שיבוץ תואם, עדיין נאפשר למנהל "לאפס" את הפריט
        toast.error('לא נמצאה רשומת שיבוץ תואמת, הפריט יאופס.');
      }

      // שלב 2: אפס את פרטי השיבוץ מפריט התפריט
      const menuItemUpdates = {
        assignedTo: undefined,
        assignedToName: undefined,
        assignedAt: undefined
      };
      
      const menuUpdateSuccess = await FirebaseService.updateMenuItem(item.id, menuItemUpdates);
      
      if (menuUpdateSuccess) {
        updateMenuItem(item.id, menuItemUpdates); // עדכון הסטייט המקומי
        toast.success('השיבוץ בוטל בהצלחה!');
      } else {
        throw new Error('איפוס פריט התפריט נכשל.');
      }

    } catch (error) {
      console.error('Error canceling assignment as admin:', error);
      toast.error('שגיאה בביטול השיבוץ. אנא נסה שוב.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleReplaceUser = async (newUserId: string, newUserName: string) => {
    if (!isAdmin || !item.assignedTo) return;

    if (!confirm(`האם להחליף את ${item.assignedToName} ב-${newUserName}?`)) {
      return;
    }

    try {
      // Find the current assignment
      const currentAssignment = assignments.find(a => 
        a.menuItemId === item.id && a.userId === item.assignedTo
      );

      if (currentAssignment) {
        // Update the assignment
        const success = await FirebaseService.updateAssignment(currentAssignment.id, {
          userId: newUserId,
          userName: newUserName,
          updatedAt: Date.now()
        });

        if (success) {
          // Update menu item (use skipAdminCheck = true for assignment-related updates)
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
    <div className={`rounded-lg border-2 p-4 transition-all duration-200 ${
      isLoading || isCanceling
        ? 'opacity-50 pointer-events-none'
        : isAssigned 
          ? isMyAssignment
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-green-50 border-green-200'
          : canAssign 
            ? 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer' 
            : 'bg-gray-50 border-gray-200'
    }`}
    onClick={canAssign && !isAssigned && !isLoading && !isEditing && !isCanceling ? onAssign : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 text-sm flex-1 ml-2"
            placeholder="שם הפריט"
          />
        ) : (
          <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
        )}
        
        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
          categoryColors[item.category] || categoryColors.other
        }`}>
          {categoryNames[item.category] || categoryNames.other}
        </div>
      </div>

      {/* Quantity and Required indicator */}
      <div className="flex items-center justify-between text-gray-600 mb-3">
        {isEditing ? (
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-sm">כמות:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={editedQuantity}
              onChange={(e) => setEditedQuantity(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        ) : (
          <span className="text-sm">כמות: {item.quantity}</span>
        )}
        
        {isEditing ? (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={editedRequired}
              onChange={(e) => setEditedRequired(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500 ml-1"
            />
            <span className="text-xs text-red-600 font-medium">חובה</span>
          </label>
        ) : (
          item.isRequired && (
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-500 ml-1" />
              <span className="text-xs text-red-600 font-medium">חובה</span>
            </div>
          )
        )}
      </div>

      {/* Notes editing */}
      {isEditing && (
        <div className="mb-3">
          <textarea
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            placeholder="הערות (אופציונלי)"
            rows={2}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
          />
        </div>
      )}

      {/* Assignment Status */}
      {isAssigned ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${isMyAssignment ? 'text-blue-700' : 'text-green-700'}`}>
              <CheckCircle className="h-4 w-4 ml-2" />
              <span className="text-sm font-medium">
                {isMyAssignment ? 'השיבוץ שלי' : 'משובץ'}
              </span>
              {hasMultipleAssignments && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full mr-2">
                  {itemAssignments.length} שיבוצים
                </span>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{item.assignedToName}</p>
              {item.assignedAt && (
                <p className="text-xs text-gray-600">
                  <Clock className="h-3 w-3 inline ml-1" />
                  {new Date(item.assignedAt).toLocaleDateString('he-IL')}
                </p>
              )}
            </div>
          </div>

          {/* Admin replacement dropdown */}
          {isAdmin && !isMyAssignment && allUsers.length > 1 && (
            <div className="pt-2 border-t border-gray-200">
              <select
                onChange={(e) => {
                  const [userId, userName] = e.target.value.split('|');
                  if (userId && userName && userId !== item.assignedTo) {
                    handleReplaceUser(userId, userName);
                  }
                  e.target.value = '';
                }}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                defaultValue=""
              >
                <option value="">החלף משתמש...</option>
                {allUsers
                  .filter(u => u.userId !== item.assignedTo)
                  .map(u => (
                    <option key={`${u.userId}|${u.userName}`} value={`${u.userId}|${u.userName}`}>
                      {u.userName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Action buttons for user's own assignment */}
          {isMyAssignment && canAssign && (
            <div className="flex space-x-2 rtl:space-x-reverse pt-2 border-t border-blue-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) onEdit();
                }}
                disabled={isLoading || isCanceling}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
              >
                <Edit className="h-3 w-3 ml-1" />
                ערוך
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelAssignment();
                }}
                disabled={isLoading || isCanceling}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
              >
                {isCanceling ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3 ml-1" />
                    בטל
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-500">
            <User className="h-4 w-4 ml-2" />
            <span className="text-sm">זמין לשיבוץ</span>
          </div>
          {canAssign && !isEditing && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAssign();
              }}
              disabled={isLoading || isCanceling}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              שבץ אותי
            </button>
          )}
        </div>
      )}

      {/* Admin controls for items not assigned to the admin themselves */}
{isAdmin && !isMyAssignment && (
  <div className="mt-3 pt-3 border-t border-gray-200">
    {isEditing ? (
      <div className="flex space-x-2 rtl:space-x-reverse">
        <button
          onClick={handleSaveEdit}
          disabled={isSaving}
          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center justify-center"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          ) : (
            <>
              <Save className="h-3 w-3 ml-1" />
              שמור
            </>
          )}
        </button>
        <button
          onClick={handleCancelEdit}
          disabled={isSaving}
          className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center justify-center"
        >
          <X className="h-3 w-3 ml-1" />
          ביטול
        </button>
      </div>
    ) : (
      <div className="flex space-x-2 rtl:space-x-reverse">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center justify-center"
        >
          <Edit className="h-3 w-3 ml-1" />
          ערוך פריט
        </button>

        {/* --- הכפתור החדש --- */}
        {isAssigned && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAdminCancelAssignment();
            }}
            disabled={isCanceling}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center justify-center"
          >
            {isCanceling ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              <>
                <Trash2 className="h-3 w-3 ml-1" />
                בטל שיבוץ
              </>
            )}
          </button>
        )}
      </div>
    )}
  </div>
)}


      {/* Notes display */}
      {!isEditing && item.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">{item.notes}</p>
        </div>
      )}
    </div>
  );
}