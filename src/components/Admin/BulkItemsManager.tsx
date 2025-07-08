import React, { useState, useMemo } from 'react';
import { ArrowRight, Edit, Trash2, Save, X, CheckSquare, Square, Search, Filter, AlertCircle, CheckCircle, RefreshCw, Slash } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { FirebaseService } from '../../services/firebaseService';
import { MenuItem, MenuCategory, ShishiEvent } from '../../types';
import toast from 'react-hot-toast';

interface BulkItemsManagerProps {
  onBack: () => void;
}

interface EditableItem extends MenuItem {
  isEditing: boolean;
  isSelected: boolean;
  hasChanges: boolean;
  originalData: MenuItem;
}

// קומפוננטת עזר לכפתורי הסינון
const FilterButton = ({ label, isActive, onClick }: { label: string, isActive: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-blue-600 text-white shadow'
        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
    }`}
  >
    {label}
  </button>
);

export function BulkItemsManager({ onBack }: BulkItemsManagerProps) {
  const { menuItems, events, assignments, updateMenuItem, deleteMenuItem, deleteAssignment } = useStore();
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState<'delete' | 'category' | 'required' | 'cancel_assignments' | null>(null);
  const [bulkCategory, setBulkCategory] = useState<MenuCategory>('main');
  const [bulkRequired, setBulkRequired] = useState(false);

  // כל הלוגיקה הקיימת נשמרת במלואה, אנחנו רק משנים את תצוגת הסינון
  React.useEffect(() => {
    const items: EditableItem[] = menuItems.map(item => ({
      ...item,
      isEditing: false, isSelected: false, hasChanges: false, originalData: { ...item }
    }));
    setEditableItems(items);
  }, [menuItems]);

  const categoryOptions = [
    { value: 'starter', label: 'מנה ראשונה' },
    { value: 'main', label: 'מנה עיקרית' },
    { value: 'dessert', label: 'קינוח' },
    { value: 'drink', label: 'משקה' },
    { value: 'other', label: 'אחר' }
  ];
  
  const assignedOptions = [
      { value: 'all', label: 'כל הפריטים'},
      { value: 'assigned', label: 'משובצים'},
      { value: 'unassigned', label: 'לא משובצים'},
  ];

  const filteredItems = useMemo(() => {
    return editableItems.filter(item => {
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterEvent !== 'all' && item.eventId !== filterEvent) return false;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      
      const isItemAssigned = assignments.some(a => a.menuItemId === item.id);
      
      if (filterAssigned === 'assigned' && !isItemAssigned) return false;
      if (filterAssigned === 'unassigned' && isItemAssigned) return false;

      return true;
    });
  }, [editableItems, searchTerm, filterEvent, filterCategory, filterAssigned, assignments]);

  const selectedCount = filteredItems.filter(item => item.isSelected).length;
  const changedCount = editableItems.filter(item => item.hasChanges).length;
  
  // ... (כל שאר הפונקציות כמו save, delete, bulk actions וכו' נשארות זהות) ...
  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      await FirebaseService.forceDataConsistencyCheck();
      toast.success('הנתונים רועננו בהצלחה');
      
      const refreshedItems: EditableItem[] = menuItems.map(item => ({
        ...item,
        isEditing: false, isSelected: false, hasChanges: false, originalData: { ...item }
      }));
      setEditableItems(refreshedItems);
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('שגיאה ברענון הנתונים');
    } finally {
      setIsLoading(false);
    }
  };
  const toggleItemSelection = (itemId: string) => { setEditableItems(prev => prev.map(item => item.id === itemId ? { ...item, isSelected: !item.isSelected } : item)); };
  const toggleSelectAll = () => { const allSelected = filteredItems.every(item => item.isSelected); const filteredIds = filteredItems.map(item => item.id); setEditableItems(prev => prev.map(item => filteredIds.includes(item.id) ? { ...item, isSelected: !allSelected } : item)); };
  const startEditing = (itemId: string) => { setEditableItems(prev => prev.map(item => item.id === itemId ? { ...item, isEditing: true } : item)); };
  const cancelEditing = (itemId: string) => { setEditableItems(prev => prev.map(item => item.id === itemId ? { ...item.originalData, isEditing: false, isSelected: item.isSelected, hasChanges: false, originalData: item.originalData } : item)); };
  const updateItemField = (itemId: string, field: keyof MenuItem, value: any) => { setEditableItems(prev => prev.map(item => { if (item.id === itemId) { const updatedItem = { ...item, [field]: value }; const originalForComparison = { ...item.originalData }; const currentForComparison = { ...updatedItem, isEditing: false, isSelected: false, hasChanges: false, originalData: undefined }; delete (currentForComparison as any).isEditing; delete (currentForComparison as any).isSelected; delete (currentForComparison as any).hasChanges; delete (currentForComparison as any).originalData; const hasChanges = JSON.stringify(originalForComparison) !== JSON.stringify(currentForComparison); return { ...updatedItem, hasChanges }; } return item; })); };
  const saveItem = async (itemId: string) => { const item = editableItems.find(i => i.id === itemId); if (!item || !item.hasChanges) return; setIsLoading(true); try { const updates = { name: item.name, category: item.category, quantity: item.quantity, notes: item.notes, isRequired: item.isRequired }; const success = await FirebaseService.updateMenuItem(itemId, updates); if (success) { updateMenuItem(itemId, updates); setEditableItems(prev => prev.map(i => i.id === itemId ? { ...i, isEditing: false, hasChanges: false, originalData: { ...i, isEditing: false, isSelected: false, hasChanges: false, originalData: i.originalData } } : i)); toast.success('הפריט עודכן בהצלחה'); } else { throw new Error('Failed to update item'); } } catch (error) { console.error('Error saving item:', error); toast.error('שגיאה בשמירת הפריט'); } finally { setIsLoading(false); } };
  const saveAllChanges = async () => { const changedItems = editableItems.filter(item => item.hasChanges); if (changedItems.length === 0) return; setIsLoading(true); let successCount = 0; let errorCount = 0; try { for (const item of changedItems) { try { const updates = { name: item.name, category: item.category, quantity: item.quantity, notes: item.notes, isRequired: item.isRequired }; const success = await FirebaseService.updateMenuItem(item.id, updates); if (success) { updateMenuItem(item.id, updates); successCount++; } else { errorCount++; } } catch (error) { console.error(`Error updating item ${item.name}:`, error); errorCount++; } } if (successCount > 0) { setEditableItems(prev => prev.map(item => { const wasChanged = changedItems.some(changed => changed.id === item.id); if (wasChanged && successCount > 0) { return { ...item, isEditing: false, hasChanges: false, originalData: { ...item, isEditing: false, isSelected: false, hasChanges: false, originalData: item.originalData } }; } return item; })); toast.success(`${successCount} פריטים עודכנו בהצלחה`); } if (errorCount > 0) toast.error(`${errorCount} פריטים נכשלו בעדכון`); } catch (error) { console.error('Error saving all changes:', error); toast.error('שגיאה בשמירת השינויים'); } finally { setIsLoading(false); } };
  const executeBulkAction = async () => { const selectedItems = filteredItems.filter(item => item.isSelected); if (selectedItems.length === 0) { toast.error('יש לבחור פריטים לפעולה'); return; } if (bulkAction === 'cancel_assignments') { const assignedItemsToCancel = selectedItems.filter(item => assignments.some(a => a.menuItemId === item.id)); if (assignedItemsToCancel.length === 0) { toast.error('לא נבחרו פריטים משובצים לביטול.'); setBulkAction(null); return; } if (!confirm(`האם אתה בטוח שברצונך לבטל ${assignedItemsToCancel.length} שיבוצים?`)) return; setIsLoading(true); let successCount = 0; let errorCount = 0; try { const allAssignments = [...assignments]; for (const item of assignedItemsToCancel) { try { const assignmentsToCancel = allAssignments.filter(a => a.menuItemId === item.id); for (const assignment of assignmentsToCancel) { await FirebaseService.deleteAssignment(assignment.id); deleteAssignment(assignment.id); } const menuItemUpdates = { assignedTo: undefined, assignedToName: undefined, assignedAt: undefined }; const updateSuccess = await FirebaseService.updateMenuItem(item.id, menuItemUpdates, true); if (updateSuccess) { updateMenuItem(item.id, menuItemUpdates); successCount++; } else { errorCount++; } } catch (error) { console.error(`Error canceling assignment for item ${item.name}:`, error); errorCount++; } } if (successCount > 0) toast.success(`בוטלו ${successCount} שיבוצים`); if (errorCount > 0) toast.error(`ביטול נכשל עבור ${errorCount} שיבוצים`); } finally { setIsLoading(false); setBulkAction(null); } return; } if (bulkAction === 'delete') { if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedItems.length} פריטים?`)) return; setIsLoading(true); let successCount = 0; let errorCount = 0; try { for (const item of selectedItems) { try { const success = await FirebaseService.deleteMenuItem(item.id); if (success) { deleteMenuItem(item.id); successCount++; } else { errorCount++; } } catch (error) { console.error(`Error deleting item ${item.name}:`, error); errorCount++; } } if (successCount > 0) toast.success(`${successCount} פריטים נמחקו בהצלחה`); if (errorCount > 0) toast.error(`${errorCount} פריטים נכשלו במחיקה`); } catch (error) { console.error('Error in bulk delete:', error); toast.error('שגיאה במחיקת הפריטים'); } finally { setIsLoading(false); setBulkAction(null); } } else if (bulkAction === 'category') { setIsLoading(true); let successCount = 0; let errorCount = 0; try { for (const item of selectedItems) { try { const success = await FirebaseService.updateMenuItem(item.id, { category: bulkCategory }); if (success) { updateMenuItem(item.id, { category: bulkCategory }); successCount++; } else { errorCount++; } } catch (error) { console.error(`Error updating category for item ${item.name}:`, error); errorCount++; } } if (successCount > 0) toast.success(`קטגוריה עודכנה עבור ${successCount} פריטים`); if (errorCount > 0) toast.error(`${errorCount} פריטים נכשלו בעדכון`); } catch (error) { console.error('Error in bulk category update:', error); toast.error('שגיאה בעדכון הקטגוריה'); } finally { setIsLoading(false); setBulkAction(null); } } else if (bulkAction === 'required') { setIsLoading(true); let successCount = 0; let errorCount = 0; try { for (const item of selectedItems) { try { const success = await FirebaseService.updateMenuItem(item.id, { isRequired: bulkRequired }); if (success) { updateMenuItem(item.id, { isRequired: bulkRequired }); successCount++; } else { errorCount++; } } catch (error) { console.error(`Error updating required status for item ${item.name}:`, error); errorCount++; } } if (successCount > 0) toast.success(`סטטוס חובה עודכן עבור ${successCount} פריטים`); if (errorCount > 0) toast.error(`${errorCount} פריטים נכשלו בעדכון`); } catch (error) { console.error('Error in bulk required update:', error); toast.error('שגיאה בעדכון סטטוס החובה'); } finally { setIsLoading(false); setBulkAction(null); } } };
  const getEventName = (eventId: string) => { const event = events.find(e => e.id === eventId); return event ? event.title : 'אירוע לא ידוע'; };
  const getItemAssignment = (itemId: string) => { return assignments.find(a => a.menuItemId === itemId); };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button onClick={onBack} className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowRight className="h-4 w-4" />
            <span>חזור</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניהול כל הפריטים</h1>
            <p className="text-gray-600">עריכה מהירה ופעולות bulk על פריטי התפריט</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button onClick={handleRefreshData} disabled={isLoading} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>רענן</span>
          </button>
          {changedCount > 0 && (
            <button onClick={saveAllChanges} disabled={isLoading} className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors">
              <Save className="h-4 w-4" />
              <span>שמור הכל ({changedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* --- סרגל סינון חדש ודביק --- */}
      <div className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur-sm py-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input type="text" placeholder="חפש פריטים..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              
              <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">סנן לפי אירוע:</label>
                  <div className="flex flex-wrap gap-2">
                      <FilterButton label="כל האירועים" isActive={filterEvent === 'all'} onClick={() => setFilterEvent('all')} />
                      {events.map(event => (
                          <FilterButton key={event.id} label={event.title} isActive={filterEvent === event.id} onClick={() => setFilterEvent(event.id)} />
                      ))}
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">סנן לפי קטגוריה:</label>
                  <div className="flex flex-wrap gap-2">
                      <FilterButton label="הכל" isActive={filterCategory === 'all'} onClick={() => setFilterCategory('all')} />
                      {categoryOptions.map(option => (
                          <FilterButton key={option.value} label={option.label} isActive={filterCategory === option.value} onClick={() => setFilterCategory(option.value)} />
                      ))}
                  </div>
              </div>
              
              <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">סנן לפי שיבוץ:</label>
                  <div className="flex flex-wrap gap-2">
                      {assignedOptions.map(option => (
                          <FilterButton key={option.value} label={option.label} isActive={filterAssigned === option.value} onClick={() => setFilterAssigned(option.value)} />
                      ))}
                  </div>
              </div>
          </div>
      </div>
      
      {/* ... (כל שאר הקוד של טבלת הפריטים ופעולות ה-Bulk נשאר זהה) ... */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800 font-medium">{selectedCount} פריטים נבחרו</span>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              {!bulkAction ? (
                <>
                    <button 
    onClick={() => setBulkAction('cancel_assignments')} 
    className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-0.5 rounded-md text-xs"
  >
    בטל שיבוצים
  </button>
  <button 
    onClick={() => setBulkAction('category')} 
    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-0.5 rounded-md text-xs"
  >
    שנה קטגוריה
  </button>
  <button 
    onClick={() => setBulkAction('required')} 
    className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-0.5 rounded-md text-xs"
  >
    שנה חובה
  </button>
  <button 
    onClick={() => setBulkAction('delete')} 
    className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded-md text-xs"
  >
    מחק
  </button>
                </>
              ) : (
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  {bulkAction === 'category' && (<select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value as MenuCategory)} className="px-3 py-1 border border-gray-300 rounded text-sm"><option value="starter">מנה ראשונה</option><option value="main">מנה עיקרית</option><option value="dessert">קינוח</option><option value="drink">משקה</option><option value="other">אחר</option></select>)}
                  {bulkAction === 'required' && (<select value={bulkRequired.toString()} onChange={(e) => setBulkRequired(e.target.value === 'true')} className="px-3 py-1 border border-gray-300 rounded text-sm"><option value="true">חובה</option><option value="false">לא חובה</option></select>)}
                  <button onClick={executeBulkAction} disabled={isLoading} className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-3 py-1 rounded-md text-sm">{isLoading ? 'מבצע...' : 'בצע'}</button>
                  <button onClick={() => setBulkAction(null)} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-sm">ביטול</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right"><button onClick={toggleSelectAll} className="flex items-center space-x-2 rtl:space-x-reverse">{filteredItems.length > 0 && filteredItems.every(item => item.isSelected) ? (<CheckSquare className="h-4 w-4 text-blue-600" />) : (<Square className="h-4 w-4 text-gray-400" />)}<span className="text-xs font-medium text-gray-500 uppercase">בחר</span></button></th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם פריט</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">אירוע</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">קטגוריה</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">כמות</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">הערות</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">חובה</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">שיבוץ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">פעולות</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => {
                const assignment = getItemAssignment(item.id);
                return (
                <tr key={item.id} className={`${item.hasChanges ? 'bg-yellow-50' : ''} ${item.isSelected ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3"><button onClick={() => toggleItemSelection(item.id)} className="flex items-center">{item.isSelected ? (<CheckSquare className="h-4 w-4 text-blue-600" />) : (<Square className="h-4 w-4 text-gray-400" />)}</button></td>
                  <td className="px-4 py-3">{item.isEditing ? (<input type="text" value={item.name} onChange={(e) => updateItemField(item.id, 'name', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />) : (<span className="font-medium text-gray-900">{item.name}</span>)}</td>
                  <td className="px-4 py-3"><span className="text-sm text-gray-600">{getEventName(item.eventId)}</span></td>
                  <td className="px-4 py-3">{item.isEditing ? (<select value={item.category} onChange={(e) => updateItemField(item.id, 'category', e.target.value as MenuCategory)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm">{categoryOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}</select>) : (<span className="text-sm text-gray-600">{categoryOptions.find(opt => opt.value === item.category)?.label}</span>)}</td>
                  <td className="px-4 py-3">{item.isEditing ? (<input type="number" min="1" max="100" value={item.quantity} onChange={(e) => updateItemField(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />) : (<span className="text-sm text-gray-600">{item.quantity}</span>)}</td>
                  <td className="px-4 py-3">{item.isEditing ? (<input type="text" value={item.notes || ''} onChange={(e) => updateItemField(item.id, 'notes', e.target.value || undefined)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />) : (<span className="text-sm text-gray-600">{item.notes || '-'}</span>)}</td>
                  <td className="px-4 py-3">{item.isEditing ? (<input type="checkbox" checked={item.isRequired} onChange={(e) => updateItemField(item.id, 'isRequired', e.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />) : (<span className={`px-2 py-1 rounded-full text-xs ${item.isRequired ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{item.isRequired ? 'חובה' : 'רגיל'}</span>)}</td>
                  <td className="px-4 py-3">{assignment ? (<div><span className="text-sm font-medium text-green-700">{assignment.userName}</span><div className="text-xs text-gray-500">משובץ</div></div>) : (<span className="text-sm text-gray-500">זמין</span>)}</td>
                  <td className="px-4 py-3"><div className="flex items-center space-x-2 rtl:space-x-reverse">{item.isEditing ? (<><button onClick={() => saveItem(item.id)} disabled={!item.hasChanges || isLoading} className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-400" title="שמור"><Save className="h-4 w-4" /></button><button onClick={() => cancelEditing(item.id)} className="p-1 text-gray-600 hover:text-gray-700" title="ביטול"><X className="h-4 w-4" /></button></>) : (<button onClick={() => startEditing(item.id)} className="p-1 text-blue-600 hover:text-blue-700" title="ערוך"><Edit className="h-4 w-4" /></button>)}</div></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו פריטים</h3>
            <p className="text-gray-500">נסה לשנות את הפילטרים או מונחי החיפוש</p>
          </div>
        )}
      </div>
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div><p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p><p className="text-sm text-gray-600">פריטים מוצגים</p></div>
          <div><p className="text-2xl font-bold text-blue-600">{selectedCount}</p><p className="text-sm text-gray-600">נבחרו</p></div>
          <div><p className="text-2xl font-bold text-yellow-600">{changedCount}</p><p className="text-sm text-gray-600">עם שינויים</p></div>
          <div><p className="text-2xl font-bold text-green-600">{filteredItems.filter(item => assignments.some(a => a.menuItemId === item.id)).length}</p><p className="text-sm text-gray-600">משובצים</p></div>
        </div>
      </div>
    </div>
  );
}