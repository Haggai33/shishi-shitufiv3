// src/pages/DashboardPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { FirebaseService } from '../services/firebaseService';
import { ShishiEvent, EventDetails } from '../types';
import { toast } from 'react-hot-toast';
import { Plus, LogOut, Calendar, MapPin, Clock, Share2, Eye, Trash2, ChefHat, Home } from 'lucide-react';

// --- רכיב כרטיס אירוע (ללא שינוי) ---
const EventCard: React.FC<{ event: ShishiEvent, onDelete: (eventId: string, title: string) => void }> = ({ event, onDelete }) => {
  const navigate = useNavigate();
  const eventUrl = `${window.location.origin}/event/${event.organizerId}/${event.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success('הקישור הועתק!');
  };

  const menuItemsCount = event.menuItems ? Object.keys(event.menuItems).length : 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300 flex flex-col">
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-gray-800">{event.details.title}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${event.details.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {event.details.isActive ? 'פעיל' : 'לא פעיל'}
          </span>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p className="flex items-center"><Calendar size={14} className="ml-2" /> {new Date(event.details.date).toLocaleDateString('he-IL')}</p>
          <p className="flex items-center"><Clock size={14} className="ml-2" /> {event.details.time}</p>
          <p className="flex items-center"><MapPin size={14} className="ml-2" /> {event.details.location}</p>
          <p className="flex items-center"><ChefHat size={14} className="ml-2" /> {menuItemsCount} פריטים בתפריט</p>
        </div>
      </div>
      <div className="bg-gray-50 p-4 border-t flex justify-between items-center rounded-b-xl">
        <button onClick={copyToClipboard} className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-semibold">
          <Share2 size={16} className="ml-1" /> שתף
        </button>
        <div className="flex items-center space-x-2">
          <button onClick={() => navigate(`/event/${event.organizerId}/${event.id}`)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full" title="צפה באירוע">
            <Eye size={18} />
          </button>
          <button onClick={() => onDelete(event.id, event.details.title)} className="p-2 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-full" title="מחק אירוע">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- רכיב טופס יצירת אירוע (ללא שינוי) ---
const EventFormModal: React.FC<{ onClose: () => void, onEventCreated: () => void }> = ({ onClose, onEventCreated }) => {
    const user = useStore(state => state.user);
    const [details, setDetails] = useState<EventDetails>({
        title: '',
        date: '',
        time: '19:00',
        location: '',
        description: '',
        isActive: true,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error("שגיאה: משתמש לא מחובר.");
            return;
        }
        if (!details.title || !details.date || !details.time || !details.location) {
            toast.error("יש למלא את כל שדות החובה.");
            return;
        }
        setIsLoading(true);
        try {
            await FirebaseService.createEvent(user.id, details);
            toast.success("האירוע נוצר בהצלחה!");
            onEventCreated();
            onClose();
        } catch (error) {
            console.error("Error creating event:", error);
            toast.error("שגיאה ביצירת האירוע.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4">יצירת אירוע חדש</h2>
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
                            {isLoading ? 'יוצר...' : 'צור אירוע'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- רכיב הדאשבורד הראשי (לאחר שכתוב) ---
const DashboardPage: React.FC = () => {
  const { logout } = useAuth(); // <<< שינוי: מספיק לקבל רק את פונקציית ההתנתקות
  const user = useStore(state => state.user); // <<< שינוי: אנחנו צריכים רק את המשתמש מה-store

  // <<< שינוי: ניהול מצב האירועים הופך למקומי בקומפוננטה
  const [events, setEvents] = useState<ShishiEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (user) {
      setIsLoadingEvents(true);
      try {
        const fetchedEvents = await FirebaseService.getEventsByOrganizer(user.id);
        setEvents(fetchedEvents); // <<< שינוי: מעדכנים את המצב המקומי
      } catch (error) {
        console.error("Failed to fetch events:", error);
        toast.error("שגיאה בטעינת האירועים.");
      } finally {
        setIsLoadingEvents(false);
      }
    }
  }, [user]); // <<< שינוי: תלות ב-user בלבד

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!user) return;
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את האירוע "${title}"? הפעולה אינה הפיכה.`)) {
        try {
            await FirebaseService.deleteEvent(user.id, eventId);
            toast.success("האירוע נמחק בהצלחה");
            fetchEvents(); // רענון הרשימה המקומית
        } catch (error) {
            toast.error("שגיאה במחיקת האירוע");
            console.error(error);
        }
    }
  };

  // if (isAuthLoading) ... אין צורך בבדיקה זו יותר, App.tsx מטפל בה.

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <ChefHat className="h-8 w-8 text-orange-500" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">הדאשבורד של {user?.name}</h1>
          </div>
          <button onClick={logout} className="text-sm font-medium text-gray-600 hover:text-red-500 flex items-center">
            <LogOut size={16} className="ml-1" />
            התנתק
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
            <h2 className="text-xl font-semibold text-gray-700">האירועים שלי ({events.length})</h2> {/* <<< שינוי: שימוש ב-events המקומי */}
            <button onClick={() => setShowCreateModal(true)} className="flex items-center bg-orange-500 text-white px-4 py-2 rounded-lg shadow hover:bg-orange-600 transition-colors">
                <Plus size={20} className="ml-2" />
                צור אירוע חדש
            </button>
        </div>

        {isLoadingEvents ? (
             <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>
        ) : events.length > 0 ? ( // <<< שינוי: שימוש ב-events המקומי
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => ( // <<< שינוי: שימוש ב-events המקומי
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

      {showCreateModal && <EventFormModal onClose={() => setShowCreateModal(false)} onEventCreated={fetchEvents} />}
    </div>
  );
};

export default DashboardPage;