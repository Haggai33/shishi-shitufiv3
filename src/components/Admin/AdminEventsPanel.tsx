import React, { useState } from 'react';
import { Plus, Edit, Trash2, Upload, ChefHat, Users, Calendar, Clock, MapPin } from 'lucide-react';
import { ShishiEvent } from '../../types';
import { formatDate, formatTime } from '../../utils/dateUtils';

interface AdminEventsPanelProps {
  events: ShishiEvent[];
  onCreateEvent: () => void;
  onEditEvent: (event: ShishiEvent) => void;
  onDeleteEvent: (eventId: string, title: string) => void;
  onImportItems: (event: ShishiEvent) => void;
  onManageParticipants: (event: ShishiEvent) => void;
}

export function AdminEventsPanel({ 
  events, 
  onCreateEvent, 
  onEditEvent, 
  onDeleteEvent, 
  onImportItems, 
  onManageParticipants 
}: AdminEventsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredEvents = events.filter(event => {
    if (filter === 'active') return event.details.isActive;
    if (filter === 'inactive') return !event.details.isActive;
    return true;
  });

  const getEventStats = (event: ShishiEvent) => {
    const menuItemsCount = event.menuItems ? Object.keys(event.menuItems).length : 0;
    const assignmentsCount = event.assignments ? Object.keys(event.assignments).length : 0;
    const participantsCount = event.participants ? Object.keys(event.participants).length : 0;
    
    return { menuItemsCount, assignmentsCount, participantsCount };
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ניהול אירועים</h2>
          <p className="text-gray-600">נהל את כל האירועים שלך במקום אחד</p>
        </div>
        
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          {/* Filter buttons */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === 'all' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              הכל ({events.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === 'active' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              פעילים ({events.filter(e => e.details.isActive).length})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === 'inactive' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              לא פעילים ({events.filter(e => !e.details.isActive).length})
            </button>
          </div>

          <button
            onClick={onCreateEvent}
            className="flex items-center space-x-2 rtl:space-x-reverse bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>אירוע חדש</span>
          </button>
        </div>
      </div>

      {/* Events grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {filter === 'all' ? 'אין אירועים' : `אין אירועים ${filter === 'active' ? 'פעילים' : 'לא פעילים'}`}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' ? 'התחל על ידי יצירת האירוע הראשון שלך' : 'נסה לשנות את הפילטר'}
          </p>
          {filter === 'all' && (
            <div className="mt-6">
              <button
                onClick={onCreateEvent}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 ml-2" />
                צור אירוע חדש
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const stats = getEventStats(event);
            const isPast = new Date(event.details.date) < new Date();
            
            return (
              <div
                key={event.id}
                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-r-4 ${
                  isPast 
                    ? 'border-gray-400 opacity-75' 
                    : event.details.isActive 
                      ? 'border-orange-500' 
                      : 'border-gray-300'
                }`}
              >
                {/* Event header */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {event.details.title}
                    </h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isPast 
                        ? 'bg-gray-100 text-gray-600' 
                        : event.details.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {isPast ? 'הסתיים' : event.details.isActive ? 'פעיל' : 'לא פעיל'}
                    </div>
                  </div>

                  {/* Event details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 ml-2 text-orange-500" />
                      <span className="text-sm">{formatDate(event.details.date)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 ml-2 text-orange-500" />
                      <span className="text-sm">{formatTime(event.details.time)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 ml-2 text-orange-500" />
                      <span className="text-sm truncate">{event.details.location}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{stats.menuItemsCount}</div>
                      <div className="text-xs text-gray-500">פריטים</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">{stats.assignmentsCount}</div>
                      <div className="text-xs text-gray-500">שיבוצים</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{stats.participantsCount}</div>
                      <div className="text-xs text-gray-500">משתתפים</div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="bg-gray-50 px-6 py-4 border-t flex flex-wrap gap-2">
                  <button
                    onClick={() => onImportItems(event)}
                    className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors"
                  >
                    <Upload className="h-3 w-3" />
                    <span>ייבא פריטים</span>
                  </button>
                  
                  <button
                    onClick={() => onManageParticipants(event)}
                    className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors"
                  >
                    <Users className="h-3 w-3" />
                    <span>נהל משתתפים</span>
                  </button>
                  
                  <button
                    onClick={() => onEditEvent(event)}
                    className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded-md transition-colors"
                  >
                    <Edit className="h-3 w-3" />
                    <span>ערוך</span>
                  </button>
                  
                  <button
                    onClick={() => onDeleteEvent(event.id, event.details.title)}
                    className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>מחק</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}