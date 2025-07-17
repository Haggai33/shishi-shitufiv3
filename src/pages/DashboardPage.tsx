// src/pages/DashboardPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { FirebaseService } from '../services/firebaseService';
import { ShishiEvent, EventDetails } from '../types';
import { toast } from 'react-hot-toast';
import { Plus, LogOut, Calendar, MapPin, Clock, Share2, Eye, Trash2, ChefHat, Home, Settings, Users } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminEventsPanel } from '../components/Admin/AdminEventsPanel';

// --- רכיב כרטיס אירוע ---
const EventCard: React.FC<{ event: ShishiEvent, onDelete: (eventId: string, title: string) => void }> = ({ event, onDelete }) => {
  const navigate = useNavigate();
  const eventUrl = `${window.location.origin}/event/${event.id}`;
  const isPast = new Date(event.details.date) < new Date();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success('הקישור הועתק!');
  };

  const menuItemsCount = event.menuItems ? Object.keys(event.menuItems).length : 0;

  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-col border-r-4 ${
      isPast 
        ? 'border-neutral-400 opacity-75' 
        : event.details.isActive 
          ? 'border-accent hover:scale-[1.02]' 
          : 'border-neutral-300'
    }`}>
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-neutral-900">{event.details.title}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isPast
              ? 'bg-neutral-100 text-neutral-600'
              : event.details.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}>
            {isPast ? 'הסתיים' : event.details.isActive ? 'פעיל' : 'לא פעיל'}
          </span>
        </div>
        <div className="space-y-2 text-sm text-neutral-600">
          <p className="flex items-center"><Calendar size={14} className="ml-2 text-accent" /> {new Date(event.details.date).toLocaleDateString('he-IL')}</p>
          <p className="flex items-center"><Clock size={14} className="ml-2 text-accent" /> {event.details.time}</p>
          <p className="flex items-center"><MapPin size={14} className="ml-2 text-accent" /> {event.details.location}</p>
          <p className="flex items-center"><ChefHat size={14} className="ml-2 text-accent" /> {menuItemsCount} פריטים בתפריט</p>
        </div>
      </div>
      <div className="bg-neutral-50 p-4 border-t flex justify-between items-center rounded-b-xl">
        <button onClick={copyToClipboard} className="flex items-center text-sm text-info hover:text-info/80 font-semibold">
          <Share2 size={16} className="ml-1" /> שתף
        </button>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <button onClick={() => navigate(`/event/${event.id}`)} className="p-2 text-neutral-500 hover:bg-neutral-200 rounded-full" title="צפה באירוע">
            <Eye size={18} />
          </button>
          <button onClick={() => onDelete(event.id, event.details.title)} className="p-2 text-neutral-500 hover:bg-error/10 hover:text-error rounded-full" title="מחק אירוע">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- רכיב טופס יצירת אירוע ---
const EventFormModal: React.FC<{ onClose: () => void, onEventCreated: () => void, editingEvent?: ShishiEvent }> = ({ onClose, onEventCreated, editingEvent }) => {
    const user = useStore(state => state.user);
    const [details, setDetails] = useState<EventDetails>({
        title: editingEvent?.details.title || '',
        date: editingEvent?.details.date || '',
        time: editingEvent?.details.time || '19:00',
        location: editingEvent?.details.location || '',
        description: editingEvent?.details.description || '',
        isActive: editingEvent?.details.isActive ?? true,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('🎯 EventFormModal.handleSubmit - Starting form submission');
        console.log('👤 Current user:', user);
        console.log('📋 Form details:', details);
        
        if (!user) {
            console.error('❌ No user found');
            toast.error("שגיאה: משתמש לא מחובר.");
            return;
        }
        if (!details.title || !details.date || !details.time || !details.location) {
            console.error('❌ Missing required fields');
            toast.error("יש למלא את כל שדות החובה.");
            return;
        }
        
        setIsLoading(true);
        try {
            if (editingEvent) {
                console.log('📝 Updating existing event...');
                await FirebaseService.updateEventDetails(editingEvent.id, details);
                toast.success("האירוע עודכן בהצלחה!");
            } else {
                console.log('📞 Calling FirebaseService.createEvent...');
                const eventId = await FirebaseService.createEvent(user.id, details);
                console.log('✅ Event created successfully with ID:', eventId);
                toast.success("האירוע נוצר בהצלחה!");
            }
            onEventCreated();
            onClose();
        } catch (error) {
            console.error("❌ Error saving event:", error);
            toast.error(editingEvent ? "שגיאה בעדכון האירוע." : "שגיאה ביצירת האירוע.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4">{editingEvent ? 'עריכת אירוע' : 'יצירת אירוע חדש'}</h2>
                        <div className="space-y-4">
                            <input type="text" placeholder="שם האירוע" value={details.title} onChange={e => setDetails({...details, title: e.target.value})} className="w-full p-2 border rounded-lg" required />
                            <div className="flex space-x-4">
                                <input type="date" value={details.date} onChange={e => setDetails({...details, date: e.target.value})} className="w-full p-2 border rounded-lg" required />
                                <input type="time" value={details.time} onChange={e => setDetails({...details, time: e.target.value})} className="w-full p-2 border rounded-lg" required />
                            </div>
                            <input type="text" placeholder="מיקום" value={details.location} onChange={e => setDetails({...details, location: e.target.value})} className="w-full p-2 border rounded-lg" required />
                            <textarea placeholder="תיאור (אופציונלי)" value={details.description} onChange={e => setDetails({...details, description: e.target.value})} className="w-full p-2 border rounded-lg" rows={3}></textarea>
                             <label className="flex items-center">
                                <input type="checkbox" checked={details.isActive} onChange={(e) => setDetails({...details, isActive: e.target.checked})} className="rounded" />
                                <span className="mr-2 text-sm text-gray-700">הפוך לאירוע פעיל</span>
                            </label>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">ביטול</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300">
                            {isLoading ? (editingEvent ? 'מעדכן...' : 'יוצר...') : (editingEvent ? 'עדכן אירוע' : 'צור אירוע')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- רכיב הדאשבורד הראשי ---
const DashboardPage: React.FC = () => {
  const { user } = useStore();
  
  // לוג מיידי כשהקומפוננטה נטענת
  console.log('🎯 DashboardPage LOADED - User:', user);
  
  const [currentView, setCurrentView] = useState<'regular' | 'admin'>('regular');
  const [adminView, setAdminView] = useState<'events' | 'users' | 'settings'>('events');
  const [events, setEvents] = useState<ShishiEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ShishiEvent | null>(null);

  console.log('🎯 DashboardPage RENDER - User exists:', !!user, 'User ID:', user?.id);

  const logout = async () => {
    console.log('🚪 LOGOUT CLICKED');
    try {
      await signOut(auth);
      toast.success('התנתקת בהצלחה');
    } catch (error) {
      console.error('❌ LOGOUT ERROR:', error);
      toast.error('שגיאה בעת ההתנתקות');
    }
  };

  const fetchEvents = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoadingEvents(true);
    
    try {
      const fetchedEvents = await FirebaseService.getEventsByOrganizer(user.id);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("שגיאה בטעינת האירועים.");
    } finally {
      setIsLoadingEvents(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('🎬 useEffect TRIGGERED - calling fetchEvents');
    fetchEvents();
  }, [fetchEvents]);

  const handleDeleteEvent = async (eventId: string, title: string) => {
    console.log('🗑️ DELETE EVENT CLICKED:', { eventId, title });
    if (!user) {
      console.error('❌ NO USER FOR DELETE');
      return;
    }
    
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את האירוע "${title}"? הפעולה אינה הפיכה.`)) {
        try {
            console.log('📞 CALLING deleteEvent...');
            await FirebaseService.deleteEvent(eventId);
            console.log('✅ DELETE SUCCESS');
            toast.success("האירוע נמחק בהצלחה");
            fetchEvents(); // רענון הרשימה המקומית
        } catch (error) {
            console.error('❌ DELETE ERROR:', error);
            toast.error("שגיאה במחיקת האירוע");
        }
    }
  };

  const handleImportItems = (event: ShishiEvent) => {
    toast(`ייבוא פריטים עבור ${event.details.title} - בקרוב!`);
  };

  const handleManageParticipants = (event: ShishiEvent) => {
    toast(`ניהול משתתפים עבור ${event.details.title} - בקרוב!`);
  };

  const handleEditEvent = (event: ShishiEvent) => {
    setEditingEvent(event);
    setShowCreateModal(true);
  };

  if (!user) {
    console.log('⏳ NO USER - SHOWING SPINNER');
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'admin' ? (
        // Admin Panel View
        <div className="min-h-screen bg-gray-50">
          <AdminHeader
            userName={user.name}
            onLogout={logout}
            currentView={adminView}
            onViewChange={setAdminView}
          />
          
          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {adminView === 'events' && (
              <AdminEventsPanel
                events={events}
                onCreateEvent={() => {
                  setEditingEvent(null);
                  setShowCreateModal(true);
                }}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
                onImportItems={handleImportItems}
                onManageParticipants={handleManageParticipants}
              />
            )}
            
            {adminView === 'users' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">ניהול משתמשים</h2>
                <p className="text-gray-600">פונקציונליות ניהול משתמשים תתווסף בקרוב...</p>
              </div>
            )}
            
            {adminView === 'settings' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">הגדרות מערכת</h2>
                <p className="text-gray-600">הגדרות מערכת יתווספו בקרוב...</p>
              </div>
            )}
          </main>
        </div>
      ) : (
        // Regular Dashboard View
        <>
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <div className="flex items-center">
                <ChefHat className="h-8 w-8 text-orange-500" />
                <h1 className="ml-3 text-2xl font-bold text-gray-900">הדאשבורד של {user?.name}</h1>
              </div>
              
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <button
                  onClick={() => setCurrentView('admin')}
                  className="flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  <Settings className="h-4 w-4 ml-1" />
                  פאנל ניהול
                </button>
                
                <button onClick={logout} className="text-sm font-medium text-gray-600 hover:text-red-500 flex items-center">
                  <LogOut size={16} className="ml-1" />
                  התנתק
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                <h2 className="text-xl font-semibold text-gray-700">האירועים שלי ({events.length})</h2>
                <button onClick={() => {
                  setEditingEvent(null);
                  setShowCreateModal(true);
                }} className="flex items-center bg-orange-500 text-white px-4 py-2 rounded-lg shadow hover:bg-orange-600 transition-colors">
                    <Plus size={20} className="ml-2" />
                    צור אירוע חדש
                </button>
            </div>

            {isLoadingEvents ? (
                 <div className="flex items-center justify-center h-64">
                   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                   <p className="ml-4 text-gray-600">טוען אירועים...</p>
                 </div>
            ) : events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <EventCard key={event.id} event={event} onDelete={handleDeleteEvent} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed">
                    <Home size={48} className="mx-auto text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">עדיין לא יצרת אירועים</h3>
                    <p className="mt-1 text-sm text-gray-500">לחץ על "צור אירוע חדש" כדי להתחיל.</p>
                </div>
            )}
          </main>
        </>
      )}

      {showCreateModal && (
        <EventFormModal 
          onClose={() => {
            setShowCreateModal(false);
            setEditingEvent(null);
          }} 
          onEventCreated={fetchEvents}
          editingEvent={editingEvent || undefined}
        />
      )}
    </div>
  );
};

export default DashboardPage;