import React, { useState } from 'react';
import { ArrowRight, Plus, Edit, Trash2, ChefHat, Users, Upload } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { MenuItemForm } from './MenuItemForm';
import { AssignmentManager } from './AssignmentManager';
import { ImportItemsModal } from './ImportItemsModal';
import { FirebaseService } from '../../services/firebaseService';
import { ShishiEvent, MenuItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface MenuManagementProps {
  event: ShishiEvent;
  onBack: () => void;
}

export function MenuManagement({ event, onBack }: MenuManagementProps) {
  const { menuItems, assignments, deleteMenuItem, isAdmin } = useStore();

 
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [managingAssignments, setManagingAssignments] = useState<MenuItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const eventMenuItems = menuItems.filter(item => item.eventId === event.id);

  const categorizedItems = {
    starter: eventMenuItems.filter(item => item.category === 'starter'),
    main: eventMenuItems.filter(item => item.category === 'main'),
    dessert: eventMenuItems.filter(item => item.category === 'dessert'),
    drink: eventMenuItems.filter(item => item.category === 'drink'),
    other: eventMenuItems.filter(item => item.category === 'other')
  };

  const categoryNames = {
    starter: 'מנות ראשונות',
    main: 'מנות עיקריות',
    dessert: 'קינוחים',
    drink: 'משקאות',
    other: 'אחר'
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את "${item.name}"?\n\nאם הפריט משובץ, השיבוץ יבוטל.`)) {
      return;
    }

    setDeletingItemId(item.id);

    try {
      const success = await FirebaseService.deleteMenuItem(item.id);
      if (success) {
        deleteMenuItem(item.id);
        toast.success('הפריט נמחק בהצלחה!');
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('שגיאה במחיקת הפריט. אנא נסה שוב.');
    } finally {
      setDeletingItemId(null);
    }
  };

  const getItemAssignmentCount = (itemId: string): number => {
    return assignments.filter(assignment => assignment.menuItemId === itemId).length;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>חזור</span>
          </button>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ניהול תפריט</h3>
            <p className="text-sm text-gray-600">{event.title}</p>
          </div>
        </div>
        
        <div className="flex space-x-3 rtl:space-x-reverse">
          {/* Import Button - Only for admins */}
          {isAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>ייבוא פריטים</span>
            </button>
          )}
          
          <button
            onClick={() => setShowItemForm(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>פריט חדש</span>
          </button>
        </div>
      </div>

      {/* Menu Items by Category */}
      <div className="space-y-6">
        {eventMenuItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
              <ChefHat className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין פריטים בתפריט</h3>
            <p className="text-gray-500 mb-4">התחל על ידי הוספת הפריט הראשון או ייבוא רשימת פריטים</p>
            <div className="flex justify-center space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setShowItemForm(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                הוסף פריט ראשון
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  ייבוא פריטים
                </button>
              )}
            </div>
          </div>
        ) : (
          Object.entries(categorizedItems).map(([category, items]) => (
            items.length > 0 && (
              <div key={category} className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  {categoryNames[category as keyof typeof categoryNames]} ({items.length})
                </h4>
                
                <div className="space-y-3">
                  {items.map((item) => {
                    const isDeleting = deletingItemId === item.id;
                    const assignmentCount = getItemAssignmentCount(item.id);
                    
                    return (
                      <div key={item.id} className={`bg-white rounded-lg p-4 flex items-center justify-between ${isDeleting ? 'opacity-50' : ''}`}>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                            <h5 className="font-medium text-gray-900">{item.name}</h5>
                            {item.isRequired && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">חובה</span>
                            )}
                            {item.assignedTo && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">משובץ</span>
                            )}
                            {assignmentCount > 0 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {assignmentCount} שיבוצים
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-600">
                            <span>כמות: {item.quantity}</span>
                            {item.assignedToName && (
                              <span>משובץ ל: {item.assignedToName}</span>
                            )}
                          </div>
                          
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-2">{item.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          {/* Assignment Management Button */}
                          <button
                            onClick={() => setManagingAssignments(item)}
                            disabled={isDeleting}
                            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                            title="ניהול שיבוצים"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowItemForm(true);
                            }}
                            disabled={isDeleting}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="ערוך"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteItem(item)}
                            disabled={isDeleting}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                            title="מחק"
                          >
                            {isDeleting ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))
        )}
      </div>

      {/* Menu Item Form Modal */}
      {showItemForm && (
        <MenuItemForm
          event={event}
          item={editingItem || undefined}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Import Items Modal */}
      {showImportModal && isAdmin && (
        <ImportItemsModal
          event={event}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Assignment Manager Modal */}
      {managingAssignments && (
        <AssignmentManager
          menuItem={managingAssignments}
          onClose={() => setManagingAssignments(null)}
        />
      )}
    </div>
  );
}