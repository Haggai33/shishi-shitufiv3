import React, { useState } from 'react';
import { Plus, Settings, Users, BarChart3, Shield } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { EventForm } from './EventForm';
import { EventsManagement } from './EventsManagement';
import { Statistics } from './Statistics';
import { AdminUsersManagement } from './AdminUsersManagement';

export function AdminPanel() {
  const { events, assignments } = useStore();
  const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'admins'>('events');
  const [showEventForm, setShowEventForm] = useState(false);

  const tabs = [
    { id: 'events', label: 'ניהול אירועים', icon: Settings },
    { id: 'stats', label: 'סטטיסטיקות', icon: BarChart3 },
    { id: 'admins', label: 'ניהול מנהלים', icon: Shield },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* שורת סטטיסטיקה קומפקטית */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-sm text-gray-600 mb-6">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <p>סך אירועים:</p>
          <strong className="text-gray-900">{events.length}</strong>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <p>פעילים:</p>
          <strong className="text-green-600">{events.filter(e => e.isActive).length}</strong>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <p>שיבוצים:</p>
          <strong className="text-blue-600">{assignments.length}</strong>
        </div>
      </div>

      {/* קונטיינר ראשי עם טאבים ותוכן */}
      <div className="bg-white rounded-lg shadow-md">
        {/* שורת כותרת וטאבים חדשה */}
        <div className="border-b border-gray-200 flex justify-between items-center px-4 py-3">
          <div className="flex items-center gap-x-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            {/* כפתור '+' מופיע רק בטאב הרלוונטי */}
            {activeTab === 'events' && (
              <button
                onClick={() => setShowEventForm(true)}
                title="אירוע חדש"
                className="bg-blue-500 text-white rounded-full p-1.5 hover:bg-blue-600 transition-colors shadow"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* כפתורי הטאבים */}
          <nav className="flex space-x-1 rtl:space-x-reverse bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  title={tab.label}
                  className={`p-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* אזור התוכן */}
        <div className="p-4 sm:p-6">
          {activeTab === 'events' && <EventsManagement />}
          {activeTab === 'stats' && <Statistics />}
          {activeTab === 'admins' && <AdminUsersManagement />}
        </div>
      </div>

      {/* מודל ליצירת אירוע */}
      {showEventForm && (
        <EventForm
          onClose={() => setShowEventForm(false)}
        />
      )}
    </div>
  );
}