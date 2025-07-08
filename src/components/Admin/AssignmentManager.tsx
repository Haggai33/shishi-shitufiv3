import React, { useState } from 'react';
import { X, Users, Edit, Trash2, RefreshCw, Hash, MessageSquare, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { FirebaseService } from '../../services/firebaseService';
import { MenuItem, Assignment } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

interface AssignmentManagerProps {
  menuItem: MenuItem;
  onClose: () => void;
}

interface EditingAssignment {
  assignment: Assignment;
  quantity: number;
  notes: string;
}

export function AssignmentManager({ menuItem, onClose }: AssignmentManagerProps) {
  const { assignments, updateAssignment, deleteAssignment } = useStore();
  const [editingAssignment, setEditingAssignment] = useState<EditingAssignment | null>(null);
  const [replacingAssignment, setReplacingAssignment] = useState<Assignment | null>(null);
  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get assignments for this menu item
  const itemAssignments = assignments.filter(a => a.menuItemId === menuItem.id);

  // Get unique users from current event assignments only for replacement dropdown
  const eventAssignments = assignments.filter(a => a.eventId === menuItem.eventId);
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

  const handleEditAssignment = async () => {
    if (!editingAssignment) return;

    if (editingAssignment.quantity <= 0 || editingAssignment.quantity > 100) {
      toast.error('הכמות חייבת להיות בין 1 ל-100');
      return;
    }

    setIsSubmitting(true);

    try {
      const updates = {
        quantity: editingAssignment.quantity,
        notes: editingAssignment.notes.trim() || undefined,
        updatedAt: Date.now()
      };

      const success = await FirebaseService.updateAssignment(editingAssignment.assignment.id, updates);
      
      if (success) {
        updateAssignment(editingAssignment.assignment.id, updates);
        toast.success('השיבוץ עודכן בהצלחה!');
        setEditingAssignment(null);
      } else {
        throw new Error('Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('שגיאה בעדכון השיבוץ. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את השיבוץ של ${assignment.userName}?`)) {
      return;
    }

    setDeletingId(assignment.id);

    try {
      // Delete assignment
      const deleteSuccess = await FirebaseService.deleteAssignment(assignment.id);
      
      if (deleteSuccess) {
        // Update menu item to remove assignment
        const menuItemUpdates = {
          assignedTo: undefined,
          assignedToName: undefined,
          assignedAt: undefined
        };
        
        const updateSuccess = await FirebaseService.updateMenuItem(menuItem.id, menuItemUpdates);
        
        if (updateSuccess) {
          // Update local state
          deleteAssignment(assignment.id);
          
          toast.success('השיבוץ נמחק בהצלחה!');
        } else {
          throw new Error('Failed to update menu item');
        }
      } else {
        throw new Error('Failed to delete assignment');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('שגיאה במחיקת השיבוץ. אנא נסה שוב.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReplaceUser = async () => {
    if (!replacingAssignment || !newUserId.trim() || !newUserName.trim()) {
      toast.error('יש לבחור משתמש חדש');
      return;
    }

    // Check if the new user already has an assignment for this item
    const existingAssignment = itemAssignments.find(a => 
      a.userId === newUserId.trim() && a.id !== replacingAssignment.id
    );

    if (existingAssignment) {
      toast.error('המשתמש הנבחר כבר משובץ לפריט זה');
      return;
    }

    setIsSubmitting(true);

    try {
      const updates = {
        userId: newUserId.trim(),
        userName: newUserName.trim(),
        updatedAt: Date.now()
      };

      const success = await FirebaseService.updateAssignment(replacingAssignment.id, updates);
      
      if (success) {
        // Also update the menu item assignment info
        const menuItemUpdates = {
          assignedTo: newUserId.trim(),
          assignedToName: newUserName.trim(),
          assignedAt: Date.now()
        };
        
        await FirebaseService.updateMenuItem(menuItem.id, menuItemUpdates);
        
        updateAssignment(replacingAssignment.id, updates);
        toast.success('המשתמש הוחלף בהצלחה!');
        setReplacingAssignment(null);
        setNewUserId('');
        setNewUserName('');
      } else {
        throw new Error('Failed to update assignment');
      }
    } catch (error) {
      console.error('Error replacing user:', error);
      toast.error('שגיאה בהחלפת המשתמש. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">ניהול שיבוצים</h2>
            <p className="text-sm text-gray-600">{menuItem.name}</p>
          </div>
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
          {itemAssignments.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">אין שיבוצים</h3>
              <p className="text-gray-500">עדיין לא נוצרו שיבוצים לפריט זה</p>
            </div>
          ) : (
            <div className="space-y-4">
              {itemAssignments.map((assignment) => {
                const isDeleting = deletingId === assignment.id;
                
                return (
                  <div key={assignment.id} className={`bg-gray-50 rounded-lg p-4 ${isDeleting ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{assignment.userName}</h4>
                        <p className="text-sm text-gray-600">
                          כמות: {assignment.quantity} • 
                          נוצר: {formatDate(new Date(assignment.assignedAt).toISOString().split('T')[0])}
                        </p>
                        {assignment.notes && (
                          <p className="text-sm text-gray-600 mt-1">הערה: {assignment.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => setEditingAssignment({
                            assignment,
                            quantity: assignment.quantity,
                            notes: assignment.notes || ''
                          })}
                          disabled={isDeleting || isSubmitting}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                          title="ערוך שיבוץ"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => setReplacingAssignment(assignment)}
                          disabled={isDeleting || isSubmitting}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                          title="החלף משתמש"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteAssignment(assignment)}
                          disabled={isDeleting || isSubmitting}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                          title="מחק שיבוץ"
                        >
                          {isDeleting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Assignment Modal */}
        {editingAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">עריכת שיבוץ</h3>
                <button
                  onClick={() => setEditingAssignment(null)}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    עריכת שיבוץ עבור: <strong>{editingAssignment.assignment.userName}</strong>
                  </p>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      כמות *
                    </label>
                    <div className="relative">
                      <Hash className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editingAssignment.quantity}
                        onChange={(e) => setEditingAssignment(prev => prev ? {
                          ...prev,
                          quantity: parseInt(e.target.value) || 1
                        } : null)}
                        className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      הערות
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      <textarea
                        value={editingAssignment.notes}
                        onChange={(e) => setEditingAssignment(prev => prev ? {
                          ...prev,
                          notes: e.target.value
                        } : null)}
                        placeholder="הערות נוספות..."
                        rows={3}
                        className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 rtl:space-x-reverse">
                    <button
                      onClick={handleEditAssignment}
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                          מעדכן...
                        </>
                      ) : (
                        'עדכן שיבוץ'
                      )}
                    </button>
                    <button
                      onClick={() => setEditingAssignment(null)}
                      disabled={isSubmitting}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Replace User Modal */}
        {replacingAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">החלפת משתמש</h3>
                <button
                  onClick={() => {
                    setReplacingAssignment(null);
                    setNewUserId('');
                    setNewUserName('');
                  }}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    החלפת משתמש עבור: <strong>{replacingAssignment.userName}</strong>
                  </p>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      בחר משתמש חדש *
                    </label>
                    <select
                      value={`${newUserId}|${newUserName}`}
                      onChange={(e) => {
                        const [userId, userName] = e.target.value.split('|');
                        setNewUserId(userId || '');
                        setNewUserName(userName || '');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={isSubmitting}
                    >
                      <option value="">בחר משתמש...</option>
                      {allUsers
                        .filter(user => user.userId !== replacingAssignment.userId)
                        .map((user) => (
                          <option key={`${user.userId}|${user.userName}`} value={`${user.userId}|${user.userName}`}>
                            {user.userName}
                          </option>
                        ))}
                    </select>
                    {allUsers.filter(user => user.userId !== replacingAssignment.userId).length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        אין משתמשים זמינים להחלפה
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-3 rtl:space-x-reverse">
                    <button
                      onClick={handleReplaceUser}
                      disabled={isSubmitting || !newUserId.trim() || !newUserName.trim()}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                          מחליף...
                        </>
                      ) : (
                        'החלף משתמש'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setReplacingAssignment(null);
                        setNewUserId('');
                        setNewUserName('');
                      }}
                      disabled={isSubmitting}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}