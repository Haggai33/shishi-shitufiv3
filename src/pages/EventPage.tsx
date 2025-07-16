// src/pages/EventPage.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore, selectMenuItems, selectAssignments, selectParticipants } from '../store/useStore';
import { FirebaseService } from '../services/firebaseService';
import { auth } from '../lib/firebase';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { ShishiEvent, MenuItem as MenuItemType, Assignment as AssignmentType, Participant, MenuCategory } from '../types';
import { Calendar, Clock, MapPin, ChefHat, User as UserIcon, AlertCircle, CheckCircle, X, Hash, MessageSquare, Plus, Search, ArrowRight, Edit, Trash2 } from 'lucide-react';

// --- רכיבי עזר ---

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
    </div>
);

// רכיב כרטיס פריט משודרג
const MenuItemCard: React.FC<{
    item: MenuItemType;
    assignment: AssignmentType | undefined;
    onAssign: () => void;
    onEdit: () => void;
    onCancel: () => void;
    isMyAssignment: boolean;
    isEventActive: boolean;
}> = ({ item, assignment, onAssign, onEdit, onCancel, isMyAssignment, isEventActive }) => {
    const categoryNames: { [key: string]: string } = { starter: 'מנה ראשונה', main: 'מנה עיקרית', dessert: 'קינוחים', drink: 'משקאות', other: 'אחר' };
    const tagColor = isMyAssignment ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-gray-50 text-gray-600';

    return (
        <div className={`bg-white rounded-lg border-2 flex flex-col ${isMyAssignment ? 'border-blue-400' : 'border-gray-200'}`}>
            <div className="p-4 flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 text-base">{item.name}</h4>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tagColor}`}>{categoryNames[item.category]}</span>
                </div>
                <p className="text-sm text-gray-500">כמות נדרשת: {item.quantity}</p>
                {item.creatorName && <p className="text-xs text-gray-400 mt-1">נוצר ע"י: {item.creatorName}</p>}
                {item.notes && <p className="text-xs text-gray-500 mt-2 italic">הערות: {item.notes}</p>}
            </div>
            <div className="border-t p-3">
                {assignment ? (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className={`font-semibold ${isMyAssignment ? 'text-blue-700' : 'text-green-700'}`}>
                                {isMyAssignment ? 'השיבוץ שלי' : `שובץ ל: ${assignment.userName}`}
                            </span>
                            <span className="font-bold">{assignment.quantity}</span>
                        </div>
                        {assignment.notes && <p className="text-xs text-gray-600 bg-gray-100 p-2 rounded">הערה: {assignment.notes}</p>}
                        {isMyAssignment && isEventActive && (
                            <div className="flex space-x-2 rtl:space-x-reverse">
                                <button onClick={onEdit} className="flex-1 text-xs bg-gray-200 hover:bg-gray-300 py-1 rounded">ערוך</button>
                                <button onClick={onCancel} className="flex-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 py-1 rounded">בטל שיבוץ</button>
                            </div>
                        )}
                    </div>
                ) : (
                    isEventActive ? (
                        <button onClick={onAssign} className="w-full bg-orange-500 text-white py-2 text-sm rounded-lg hover:bg-orange-600 font-semibold">שבץ אותי</button>
                    ) : (
                        <p className="text-sm text-center text-gray-500">האירוע אינו פעיל</p>
                    )
                )}
            </div>
        </div>
    );
};

// מודלים (נשארו דומים, עם שינויים קטנים)
const AssignmentModal: React.FC<{ item: MenuItemType; organizerId: string; eventId: string; user: FirebaseUser; participantName: string; onClose: () => void; isEdit?: boolean; existingAssignment?: AssignmentType; }> = 
({ item, organizerId, eventId, user, participantName, onClose, isEdit = false, existingAssignment }) => {
    const [quantity, setQuantity] = useState(existingAssignment?.quantity || item.quantity);
    const [notes, setNotes] = useState(existingAssignment?.notes || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (quantity <= 0) {
            toast.error("הכמות חייבת להיות גדולה מ-0.");
            return;
        }
        setIsLoading(true);
        try {
            if (isEdit && existingAssignment) {
                // לוגיקת עריכה
                await FirebaseService.updateAssignment(organizerId, eventId, existingAssignment.id, { quantity, notes });
                toast.success("השיבוץ עודכן!");
            } else {
                // לוגיקת יצירה
                const assignmentData: Omit<AssignmentType, 'id'> = { menuItemId: item.id, userId: user.uid, userName: participantName, quantity, notes: notes.trim(), status: 'confirmed', assignedAt: Date.now() };
                await FirebaseService.createAssignment(organizerId, eventId, assignmentData);
                toast.success(`שובצת בהצלחה לפריט: ${item.name}`);
            }
            onClose();
        } catch (error: any) {
            toast.error(error.message || "אירעה שגיאה.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{isEdit ? 'עריכת' : 'שיבוץ'} פריט: {item.name}</h2><button onClick={onClose}><X size={24} /></button></div>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700">כמות שאביא</label><input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value, 10))} className="w-full p-2 border rounded-lg mt-1" min="1" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">הערות (אופציונלי)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded-lg mt-1" rows={3} placeholder="לדוגמה: ללא גלוטן, טבעוני..." /></div>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">ביטול</button><button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300">{isLoading ? 'מעדכן...' : isEdit ? 'שמור שינויים' : 'אשר שיבוץ'}</button></div>
            </div>
        </div>
    );
};

const UserMenuItemFormModal: React.FC<{ organizerId: string; eventId: string; user: FirebaseUser; onClose: () => void; }> = ({ organizerId, eventId, user, onClose }) => {
    const [item, setItem] = useState({ name: '', category: 'main' as MenuCategory, quantity: 1, notes: '' });
    const [assignToSelf, setAssignToSelf] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const participantName = useStore(state => state.currentEvent?.participants[user.uid]?.name || 'אורח');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!item.name.trim() || item.quantity <= 0) {
            toast.error("יש למלא שם וכמות תקינה.");
            return;
        }
        setIsLoading(true);
        try {
            const newItemData: Omit<MenuItemType, 'id' | 'eventId'> = { ...item, creatorId: user.uid, creatorName: participantName, createdAt: Date.now(), isRequired: false };
            await FirebaseService.addMenuItemAndAssign(organizerId, eventId, newItemData, assignToSelf ? user.uid : null, participantName);
            toast.success("הפריט נוסף בהצלחה!");
            onClose();
        } catch (error) {
            toast.error("שגיאה בהוספת הפריט.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                <div className="p-6"><h2 className="text-xl font-bold mb-4">הוסף פריט משלך</h2><div className="space-y-4"><input type="text" placeholder="שם הפריט" value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} className="w-full p-2 border rounded-lg" required /><select value={item.category} onChange={e => setItem({ ...item, category: e.target.value as MenuCategory })} className="w-full p-2 border rounded-lg"><option value="starter">מנה ראשונה</option><option value="main">מנה עיקרית</option><option value="dessert">קינוח</option><option value="drink">משקה</option><option value="other">אחר</option></select><input type="number" placeholder="כמות" value={item.quantity} onChange={e => setItem({ ...item, quantity: parseInt(e.target.value) || 1 })} className="w-full p-2 border rounded-lg" required min="1" /><textarea placeholder="הערות (אופציונלי)" value={item.notes} onChange={e => setItem({ ...item, notes: e.target.value })} className="w-full p-2 border rounded-lg" rows={2} /><label className="flex items-center"><input type="checkbox" checked={assignToSelf} onChange={e => setAssignToSelf(e.target.checked)} className="rounded" /><span className="mr-2 text-sm text-gray-700">שבץ אותי לפריט זה</span></label></div></div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">ביטול</button><button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300">{isLoading ? 'מוסיף...' : 'הוסף פריט'}</button></div>
            </form>
        </div>
    );
};

// --- רכיב עמוד האירוע הראשי ---
const EventPage: React.FC = () => {
    const { organizerId, eventId } = useParams<{ organizerId: string; eventId: string }>();
    const [localUser, setLocalUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showNameModal, setShowNameModal] = useState(false);
    const [participantName, setParticipantName] = useState('');
    const [modalState, setModalState] = useState<{ type: 'assign' | 'edit' | 'add-user-item'; item?: MenuItemType; assignment?: AssignmentType } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'categories' | 'items' | 'my-assignments'>('categories');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const { currentEvent, setCurrentEvent, clearCurrentEvent } = useStore();
    const menuItems = useStore(selectMenuItems);
    const assignments = useStore(selectAssignments);
    const participants = useStore(selectParticipants);
    const loggedInOrganizer = useStore(state => state.user);

    const isOrganizer = loggedInOrganizer?.id === organizerId;

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (user) setLocalUser(user);
            else signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed:", err));
        });
        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (!localUser || !organizerId || !eventId) return;
        setIsLoading(true);
        const unsubEvent = FirebaseService.subscribeToEvent(organizerId, eventId, (eventData) => {
            setCurrentEvent(eventData);
            setIsLoading(false);
        });
        return () => {
            unsubEvent();
            clearCurrentEvent();
        };
    }, [localUser, organizerId, eventId, setCurrentEvent, clearCurrentEvent]);

    const handleJoinEvent = async () => {
        if (!organizerId || !eventId || !localUser || !participantName.trim()) { toast.error("יש להזין שם כדי להצטרף."); return; }
        try {
            await FirebaseService.joinEvent(organizerId, eventId, localUser.uid, participantName.trim());
            toast.success(`ברוך הבא, ${participantName.trim()}!`);
            setShowNameModal(false);
            if (modalState?.type === 'assign') {
                // The modal will now open since the user is a participant
            }
        } catch (error) { toast.error("שגיאה בהצטרפות לאירוע."); }
    };

    const handleAssignClick = (item: MenuItemType) => {
        if (!localUser) { toast.error("יש להתחבר כדי לשבץ פריטים."); return; }
        const isParticipant = participants.some(p => p.id === localUser.uid);
        if (localUser.isAnonymous && !isParticipant) {
            setModalState({ type: 'assign', item });
            setShowNameModal(true);
        } else {
            setModalState({ type: 'assign', item });
        }
    };
    
    const handleEditClick = (item: MenuItemType, assignment: AssignmentType) => setModalState({ type: 'edit', item, assignment });
    const handleCancelClick = async (assignment: AssignmentType) => {
        if (!organizerId || !eventId) return;
        if (window.confirm("האם לבטל את השיבוץ?")) {
            try {
                await FirebaseService.cancelAssignment(organizerId, eventId, assignment.id, assignment.menuItemId);
                toast.success("השיבוץ בוטל");
            } catch (error) { toast.error("שגיאה בביטול השיבוץ"); }
        }
    };

    const handleMyAssignmentsClick = () => {
        if (view === 'my-assignments') {
            setView('categories');
        } else {
            setView('my-assignments');
            setSelectedCategory(null);
            setSearchTerm('');
        }
    };

    const categorizedItems = useMemo(() => {
        const categories: { [key: string]: MenuItemType[] } = { starter: [], main: [], dessert: [], drink: [], other: [] };
        menuItems.forEach(item => {
            if (categories[item.category]) categories[item.category].push(item);
        });
        return categories;
    }, [menuItems]);
    
    const categoryNames: { [key: string]: string } = { starter: 'מנות ראשונות', main: 'מנות עיקריות', dessert: 'קינוחים', drink: 'משקאות', other: 'אחר' };
    const categoryIcons: { [key: string]: string } = { main: '/1.gif', starter: '/2.gif', dessert: '/3.gif', drink: '/4.gif', other: '/5.gif' };

    const itemsToDisplay = useMemo(() => {
        if (searchTerm) return menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (view === 'my-assignments' && localUser) return menuItems.filter(item => assignments.some(a => a.menuItemId === item.id && a.userId === localUser.uid));
        if (view === 'items' && selectedCategory) return categorizedItems[selectedCategory];
        return [];
    }, [searchTerm, view, selectedCategory, localUser, menuItems, assignments, categorizedItems]);

    if (isLoading) return <LoadingSpinner />;
    if (!currentEvent) return <div className="text-center p-8"><AlertCircle size={48} className="mx-auto text-red-500" /><h1 className="mt-4 text-2xl font-bold">אירוע לא נמצא</h1></div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm p-4 text-center sticky top-0 z-40"><Link to="/" className="text-orange-500 font-bold text-xl">שישי שיתופי</Link></header>
            <main className="max-w-4xl mx-auto py-8 px-4">
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentEvent.details.title}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
                        <p className="flex items-center"><Calendar size={14} className="ml-1" /> {new Date(currentEvent.details.date).toLocaleDateString('he-IL')}</p>
                        <p className="flex items-center"><Clock size={14} className="ml-1" /> {currentEvent.details.time}</p>
                        <p className="flex items-center"><MapPin size={14} className="ml-1" /> {currentEvent.details.location}</p>
                        <p className="flex items-center"><UserIcon size={14} className="ml-1" /> מארגן: {currentEvent.organizerName}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                        <div className="flex-grow relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setView('items'); setSelectedCategory(null); }} placeholder="חפש פריט..." className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                        </div>
                        <button onClick={handleMyAssignmentsClick} className={`px-4 py-2 font-semibold rounded-lg shadow-sm transition-colors ${view === 'my-assignments' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white hover:bg-teal-600'}`}>השיבוצים שלי</button>
                    </div>
                </div>

                {view === 'categories' && (
                    <>
                        <div className="text-center mb-8"><h2 className="text-3xl font-bold text-gray-800">מה בא לך להביא לארוחה?</h2></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(categorizedItems).filter(([, items]) => items.length > 0).map(([category, items]) => {
                                const assignedCount = items.filter(item => assignments.some(a => a.menuItemId === item.id)).length;
                                return (
                                    <div key={category} onClick={() => handleCategoryClick(category)} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-transform transform hover:-translate-y-1 cursor-pointer">
                                        <img src={categoryIcons[category]} alt={categoryNames[category]} className="w-16 h-16 mx-auto mb-2" />
                                        <h3 className="text-xl font-bold text-center mb-2">{categoryNames[category]}</h3>
                                        <p className="text-center text-gray-500 text-sm mb-4">{assignedCount} / {items.length} שובצו</p>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-teal-500 h-2.5 rounded-full" style={{ width: `${items.length > 0 ? (assignedCount / items.length) * 100 : 0}%` }}></div></div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {(view === 'items' || view === 'my-assignments') && (
                    <div>
                        <button onClick={handleBackToCategories} className="flex items-center text-sm font-semibold text-orange-600 hover:underline mb-6"><ArrowRight size={16} className="ml-1" />חזור לקטגוריות</button>
                        <h2 className="text-2xl font-bold mb-6">{searchTerm ? 'תוצאות חיפוש' : view === 'my-assignments' ? 'השיבוצים שלי' : categoryNames[selectedCategory!]}</h2>
                        {itemsToDisplay.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {itemsToDisplay.map(item => {
                                    const assignment = assignments.find(a => a.menuItemId === item.id);
                                    return <MenuItemCard key={item.id} item={item} assignment={assignment} onAssign={() => handleAssignClick(item)} onEdit={() => handleEditClick(item, assignment!)} onCancel={() => handleCancelClick(assignment!)} isMyAssignment={localUser?.uid === assignment?.userId} isEventActive={currentEvent.details.isActive} />
                                })}
                            </div>
                        ) : <p className="text-center text-gray-500 py-8">לא נמצאו פריטים.</p>}
                    </div>
                )}
                
                <div className="mt-12 text-center">
                    <button onClick={() => setModalState({ type: 'add-user-item' })} className="bg-green-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-green-700 transition-colors font-semibold text-lg">
                        <Plus size={22} className="inline-block ml-2" />הוסף פריט משלך
                    </button>
                </div>
            </main>

            {showNameModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
                        <h2 className="text-xl font-bold mb-2">ברוכים הבאים!</h2><p className="text-gray-600 mb-4">כדי להשתתף באירוע, אנא הזן את שמך.</p>
                        <input type="text" value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder="השם שלך" className="w-full p-2 border rounded-lg mb-4" />
                        <button onClick={handleJoinEvent} className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600">הצטרף לאירוע</button>
                    </div>
                </div>
            )}

            {localUser && modalState?.item && (modalState.type === 'assign' || modalState.type === 'edit') && (
                <AssignmentModal item={modalState.item} organizerId={organizerId!} eventId={eventId!} user={localUser} participantName={participants.find(p=>p.id === localUser.uid)?.name || 'אורח'} onClose={() => setModalState(null)} isEdit={modalState.type === 'edit'} existingAssignment={modalState.assignment} />
            )}

            {localUser && modalState?.type === 'add-user-item' && (
                <UserMenuItemFormModal organizerId={organizerId!} eventId={eventId!} user={localUser} onClose={() => setModalState(null)} />
            )}
        </div>
    );
};

export default EventPage;
