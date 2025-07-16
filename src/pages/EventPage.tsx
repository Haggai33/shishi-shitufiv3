// src/pages/EventPage.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore, selectMenuItems, selectAssignments, selectParticipants } from '../store/useStore';
import { FirebaseService } from '../services/firebaseService';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { ShishiEvent, MenuItem as MenuItemType, Assignment as AssignmentType } from '../types';
import { Calendar, Clock, MapPin, ChefHat, User as UserIcon, AlertCircle, Plus, Search, ArrowRight } from 'lucide-react';

// --- נייבא את הרכיבים המודולריים שלנו (שניצור בשלבים הבאים) ---
import CategorySelector from '../components/Events/CategorySelector';
import MenuItemCard from '../components/Events/MenuItemCard';
import AssignmentModal from '../components/Events/AssignmentModal';
import UserMenuItemForm from '../components/Events/UserMenuItemForm';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const EventPage: React.FC = () => {
    const { organizerId, eventId } = useParams<{ organizerId: string; eventId: string }>();
    
    // State לניהול המשתמש המאומת (יכול להיות אורח אנונימי)
    const [localUser, setLocalUser] = useState<FirebaseUser | null>(auth.currentUser);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // State לניהול תצוגה ומודלים
    const [view, setView] = useState<'categories' | 'items' | 'my-assignments'>('categories');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalState, setModalState] = useState<{ type: 'assign' | 'edit' | 'add-user-item'; item?: MenuItemType; assignment?: AssignmentType } | null>(null);

    // שליפת נתונים מה-Store הגלובלי של Zustand
    const { currentEvent, setCurrentEvent, clearCurrentEvent } = useStore();
    const menuItems = useStore(selectMenuItems);
    const assignments = useStore(selectAssignments);
    const participants = useStore(selectParticipants);
    const loggedInOrganizer = useStore(state => state.user);
    
    const isOrganizer = loggedInOrganizer?.id === organizerId;

    // אפקט #1: ניהול מצב האימות
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            setLocalUser(user);
            setIsAuthLoading(false);
        });
        return () => unsubAuth();
    }, []);

    // אפקט #2: טעינת נתוני האירוע, רק לאחר שהאימות הסתיים ויש לנו את המזהים
    useEffect(() => {
        if (isAuthLoading || !organizerId || !eventId) return;

        const unsubEvent = FirebaseService.subscribeToEvent(organizerId, eventId, setCurrentEvent);
        
        // פונקציית ניקוי - תרוץ כשהרכיב יורד מהעץ
        return () => {
            unsubEvent();
            clearCurrentEvent();
        };
    }, [isAuthLoading, organizerId, eventId, setCurrentEvent, clearCurrentEvent]);

    // --- פונקציות ניהול (Handlers) ---
    const handleCategoryClick = (category: string) => {
        setSelectedCategory(category);
        setView('items');
        setSearchTerm('');
    };

    const handleBackToCategories = () => {
        setView('categories');
        setSelectedCategory(null);
        setSearchTerm('');
    };

    const handleMyAssignmentsClick = () => {
        if (view === 'my-assignments') {
            handleBackToCategories();
        } else {
            setView('my-assignments');
            setSelectedCategory(null);
            setSearchTerm('');
        }
    };
    
    const handleSearchChange = (term: string) => {
        setSearchTerm(term);
        setView('items');
        setSelectedCategory(null);
    }
    
    // --- חישובים ממורכבים (Memoized Calculations) ---
    const itemsToDisplay = useMemo(() => {
        if (!localUser) return [];
        if (searchTerm) return menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (view === 'my-assignments') return menuItems.filter(item => assignments.some(a => a.menuItemId === item.id && a.userId === localUser.uid));
        if (view === 'items' && selectedCategory) return menuItems.filter(item => item.category === selectedCategory);
        return [];
    }, [searchTerm, view, selectedCategory, localUser, menuItems, assignments]);

    // --- תצוגה ---
    if (isAuthLoading || !currentEvent) {
        return <LoadingSpinner />;
    }
    
    const { details, organizerName } = currentEvent;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm p-4 text-center sticky top-0 z-40">
                <Link to="/dashboard" className="text-orange-500 font-bold text-xl">שישי שיתופי</Link>
            </header>

            <main className="max-w-4xl mx-auto py-8 px-4">
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{details.title}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
                        <p className="flex items-center"><Calendar size={14} className="ml-1" /> {new Date(details.date).toLocaleDateString('he-IL')}</p>
                        <p className="flex items-center"><Clock size={14} className="ml-1" /> {details.time}</p>
                        <p className="flex items-center"><MapPin size={14} className="ml-1" /> {details.location}</p>
                        <p className="flex items-center"><UserIcon size={14} className="ml-1" /> מארגן: {organizerName}</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                        <div className="flex-grow relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="text" value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} placeholder="חפש פריט..." className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                        </div>
                        <button onClick={handleMyAssignmentsClick} className={`px-4 py-2 font-semibold rounded-lg shadow-sm transition-colors ${view === 'my-assignments' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white hover:bg-teal-600'}`}>השיבוצים שלי</button>
                    </div>
                </div>

                {view === 'categories' && (
                    <CategorySelector
                        menuItems={menuItems}
                        assignments={assignments}
                        onSelectCategory={handleCategoryClick}
                    />
                )}

                {(view === 'items' || view === 'my-assignments') && (
                    <div>
                        <button onClick={handleBackToCategories} className="flex items-center text-sm font-semibold text-orange-600 hover:underline mb-6">
                            <ArrowRight size={16} className="ml-1" />
                            חזור לקטגוריות
                        </button>
                        {/* כאן נציג את רשימת הפריטים */}
                    </div>
                )}
                
                <div className="mt-12 text-center">
                    <button onClick={() => setModalState({ type: 'add-user-item' })} className="bg-green-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-green-700 transition-colors font-semibold text-lg">
                        <Plus size={22} className="inline-block ml-2" />
                        הוסף פריט משלך
                    </button>
                </div>
            </main>
            
            {/* ניהול המודלים יתבצע כאן בהמשך */}
        </div>
    );
};

export default EventPage;
