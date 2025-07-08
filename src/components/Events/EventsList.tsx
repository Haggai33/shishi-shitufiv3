import React, { useState, useMemo } from 'react';
import { Plus, Calendar, Clock, MapPin, Users, ChefHat } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { EventDetails } from './EventDetails';
import { AssignmentModal } from './AssignmentModal';
import { EditAssignmentModal } from './EditAssignmentModal';
import { MenuItemCard } from './MenuItemCard';
import { ShishiEvent } from '../../types';
import { formatDate, formatTime, isEventPast, isEventFinished } from '../../utils/dateUtils';
import { BulkItemsManager } from '../Admin/BulkItemsManager'; // שלב 1: ייבוא הקומפוננטה

// קומפוננטה לכפתורי הסינון
const FilterButton = ({ label, count, isActive, onClick }: { label: string, count: number, isActive: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-orange-500 text-white shadow'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {label} ({count})
  </button>
);


export function EventsList({ onCreateEvent }: EventsListProps) {
  const { events, menuItems, assignments, isLoading, user } = useStore();
  const { isAdmin } = useAuth();
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [editingAssignment, setEditingAssignment] = useState<{ item: any; assignment: any } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'available' | 'my-assignments' | 'assigned' | 'all'>('available');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // שלב 2: הוספת משתנה State חדש
  const [showBulkManager, setShowBulkManager] = useState(false);

  // ... (שאר הקוד של הלוגיקה נשאר זהה) ...
  const activeEvent = useMemo(() => {
    const activeEvents = events.filter(event => {
      const isPastEvent = isEventPast(event.date, event.time);
      return event.isActive && !isPastEvent;
    });
    return activeEvents.length > 0 ? activeEvents[0] : null;
  }, [events]);

  const eventMenuItems = useMemo(() => {
    if (!activeEvent) return [];
    
    return menuItems.filter(item => {
      if (item.eventId !== activeEvent.id) return false;
      
      if (!isAdmin && item.category === 'other' && 
          (item.name.includes('שולחן') || item.name.includes('כיסא') || 
           item.name.includes('צלחת') || item.name.includes('כוס') || 
           item.name.includes('סכו"ם') || item.name.includes('מגש') ||
           item.name.includes('מפית') || item.name.includes('מפה'))) {
        return false;
      }
      
      return true;
    });
  }, [menuItems, activeEvent, isAdmin]);

  const eventAssignments = useMemo(() => 
    activeEvent ? assignments.filter(assignment => assignment.eventId === activeEvent.id) : [],
    [assignments, activeEvent]
  );

  const assignedItems = useMemo(() => 
    eventMenuItems.filter(item => {
      return assignments.some(a => a.menuItemId === item.id);
    }),
    [eventMenuItems, assignments]
  );

  const categoryNames = {
    starter: 'מנות ראשונות',
    main: 'מנות עיקריות', 
    dessert: 'קינוחים',
    drink: 'משקאות',
    other: 'אחר'
  };

  const filteredItems = useMemo(() => {
    let items = eventMenuItems;

    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }

    switch (statusFilter) {
      case 'available':
        items = items.filter(item => !assignments.some(a => a.menuItemId === item.id));
        break;
      case 'assigned':
        items = items.filter(item => assignments.some(a => a.menuItemId === item.id));
        break;
      case 'my-assignments':
        items = items.filter(item => assignments.some(a => a.menuItemId === item.id && a.userId === user?.id));
        break;
      case 'all':
      default:
        break;
    }

    return items;
  }, [eventMenuItems, categoryFilter, statusFilter, user?.id, assignments]);

  const filterCounts = useMemo(() => {
    const assignedItemIds = new Set(assignments.map(a => a.menuItemId));
    const myAssignedItemIds = new Set(assignments.filter(a => a.userId === user?.id).map(a => a.menuItemId));

    const status = {
      available: eventMenuItems.filter(item => !assignedItemIds.has(item.id)).length,
      myAssignments: eventMenuItems.filter(item => myAssignedItemIds.has(item.id)).length,
      assigned: eventMenuItems.filter(item => assignedItemIds.has(item.id)).length,
      all: eventMenuItems.length,
    };

    const categories = {
      all: eventMenuItems.length,
      starter: eventMenuItems.filter(item => item.category === 'starter').length,
      main: eventMenuItems.filter(item => item.category === 'main').length,
      dessert: eventMenuItems.filter(item => item.category === 'dessert').length,
      drink: eventMenuItems.filter(item => item.category === 'drink').length,
      other: eventMenuItems.filter(item => item.category === 'other').length
    };

    return { status, categories };
  }, [eventMenuItems, assignments, user?.id]);
  
  const statusOptions = [
      { value: 'available', label: 'זמינים' },
      { value: 'my-assignments', label: 'שלי' },
      { value: 'assigned', label: 'משובצים' },
      { value: 'all', label: 'הכל' }
  ];
  
  const categoryOptions = [
      { value: 'all', label: 'כל הקטגוריות' },
      ...Object.entries(categoryNames).map(([key, name]) => ({ value: key, label: name }))
  ];

  const canAssign = activeEvent && !isEventPast(activeEvent.date, activeEvent.time) && activeEvent.isActive;
  const isEventCurrentlyFinished = activeEvent && isEventFinished(activeEvent.date, activeEvent.time);

  const handleAssignItem = (item: any) => {
    if (!canAssign) return;
    setSelectedMenuItem(item);
  };

  const handleEditAssignment = async (item: any) => {
    if (!user || !canAssign) return;
    const assignment = eventAssignments.find(a => a.menuItemId === item.id && a.userId === user.id);
    if (assignment) {
      setEditingAssignment({ item, assignment });
    }
  };
  
  // שלב 4: הוספת תנאי הצגה
  if (showBulkManager) {
    return <BulkItemsManager onBack={() => setShowBulkManager(false)} />;
  }
  
  if (showEventDetails && activeEvent) {
    return <EventDetails event={activeEvent} onBack={() => setShowEventDetails(false)} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* ... (קוד הטעינה ואין אירוע פעיל נשאר זהה) ... */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">טוען אירוע...</p>
        </div>
      )}

      {!isLoading && !activeEvent && (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין אירוע פעיל כרגע</h3>
          <p className="text-gray-500 mb-4">
            {isAdmin ? 'עבור למסך הניהול כדי ליצור או להפעיל אירוע' : 'אירוע חדש יפורסם בקרוב'}
          </p>
        </div>
      )}

      {!isLoading && activeEvent && (
        <>
          {/* ... (קוד הצגת הסטטוס והפרטים הקומפקטיים נשאר זהה) ... */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-900 truncate">{activeEvent.title}</h1>
                {isAdmin && (
                  // שלב 3: שינוי הכפתור
                  <button
                    onClick={() => setShowBulkManager(true)} // שינוי הפעולה
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-md transition-colors"
                  >
                    BULK EDIT {/* שינוי הטקסט */}
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                <div className="flex items-center"><Calendar className="h-3 w-3 ml-1" /><span>{formatDate(activeEvent.date)}</span></div>
                <div className="flex items-center"><Clock className="h-3 w-3 ml-1" /><span>{formatTime(activeEvent.time)}</span></div>
                <div className="flex items-center"><MapPin className="h-3 w-3 ml-1" /><span className="truncate max-w-24">{activeEvent.location}</span></div>
                {eventMenuItems.length > 0 && (
                  <div className="flex items-center"><ChefHat className="h-3 w-3 ml-1" /><span className="font-medium text-green-600">{assignedItems.length}/{eventMenuItems.length} שובצו</span></div>
                )}
              </div>
            </div>
          </div>
          
          {/* ... (כל שאר הקוד של הפילטרים ורשימת הפריטים נשאר זהה) ... */}
          {eventMenuItems.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4 space-y-3">
              {/* Status Filter Buttons */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  סינון לפי סטטוס
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {statusOptions.map(option => (
                    <FilterButton
                      key={option.value}
                      label={option.label}
                      count={filterCounts.status[option.value as keyof typeof filterCounts.status]}
                      isActive={statusFilter === option.value}
                      onClick={() => setStatusFilter(option.value as any)}
                    />
                  ))}
                </div>
              </div>

              {/* Category Filter Buttons */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  סינון לפי קטגוריה
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categoryOptions.map(option => {
                    const count = filterCounts.categories[option.value as keyof typeof filterCounts.categories];
                    if (count === 0 && option.value !== 'all') return null;
                    
                    return (
                      <FilterButton
                        key={option.value}
                        label={option.label}
                        count={count}
                        isActive={categoryFilter === option.value}
                        onClick={() => setCategoryFilter(option.value)}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center mb-4">
              <ChefHat className="h-5 w-5 ml-2 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                פריטים לשיבוץ
                {filteredItems.length > 0 && (
                  <span className="text-gray-500 text-sm mr-2">
                    ({assignments.filter(a => filteredItems.some(fi => fi.id === a.menuItemId)).length}/{filteredItems.length} משובצים)
                  </span>
                )}
              </h2>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-gray-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4"><ChefHat className="h-6 w-6 text-gray-400" /></div>
                <h3 className="text-base font-medium text-gray-900 mb-2">אין פריטים התואמים לסינון</h3>
                <p className="text-sm text-gray-500">נסה לשנות את אפשרויות הסינון</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    canAssign={!!canAssign}
                    onAssign={() => handleAssignItem(item)}
                    onEdit={() => handleEditAssignment(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {selectedMenuItem && activeEvent && (
        <AssignmentModal menuItem={selectedMenuItem} event={activeEvent} onClose={() => setSelectedMenuItem(null)} />
      )}

      {editingAssignment && activeEvent && (
        <EditAssignmentModal menuItem={editingAssignment.item} event={activeEvent} assignment={editingAssignment.assignment} onClose={() => setEditingAssignment(null)} />
      )}
    </div>
  );
}