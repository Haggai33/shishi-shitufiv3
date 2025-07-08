import React, { useMemo } from 'react';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function Statistics() {
  const { events, menuItems, assignments } = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const activeEvents = events.filter(e => e.isActive);
    const pastEvents = events.filter(e => {
      const eventDate = new Date(`${e.date}T${e.time}`);
      return eventDate < now;
    });
    const upcomingEvents = events.filter(e => {
      const eventDate = new Date(`${e.date}T${e.time}`);
      return eventDate >= now && e.isActive;
    });

    const totalAssignments = assignments.length;
    const confirmedAssignments = assignments.filter(a => a.status === 'confirmed').length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;

    const assignmentsByCategory = menuItems.reduce((acc, item) => {
      if (item.assignedTo) {
        acc[item.category] = (acc[item.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const uniqueParticipants = new Set(assignments.map(a => a.userId)).size;

    return {
      totalEvents: events.length,
      activeEvents: activeEvents.length,
      pastEvents: pastEvents.length,
      upcomingEvents: upcomingEvents.length,
      totalMenuItems: menuItems.length,
      assignedMenuItems: menuItems.filter(item => item.assignedTo).length,
      totalAssignments,
      confirmedAssignments,
      completedAssignments,
      assignmentsByCategory,
      uniqueParticipants
    };
  }, [events, menuItems, assignments]);

  const categoryNames = {
    starter: 'מנות ראשונות',
    main: 'מנות עיקריות',
    dessert: 'קינוחים',
    drink: 'משקאות',
    other: 'אחר'
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">סך אירועים</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalEvents}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">אירועים פעילים</p>
              <p className="text-2xl font-bold text-green-900">{stats.activeEvents}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600">שיבוצים פעילים</p>
              <p className="text-2xl font-bold text-orange-900">{stats.totalAssignments}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">משתתפים יחודיים</p>
              <p className="text-2xl font-bold text-purple-900">{stats.uniqueParticipants}</p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Events Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">פילוח אירועים</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</p>
            <p className="text-sm text-gray-600">אירועים קרובים</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.activeEvents}</p>
            <p className="text-sm text-gray-600">פעילים כרגע</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.pastEvents}</p>
            <p className="text-sm text-gray-600">הסתיימו</p>
          </div>
        </div>
      </div>

      {/* Menu Items Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">פריטי תפריט</h3>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">התקדמות שיבוצים</span>
            <span className="text-sm text-gray-900">
              {stats.assignedMenuItems}/{stats.totalMenuItems}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${stats.totalMenuItems > 0 ? (stats.assignedMenuItems / stats.totalMenuItems) * 100 : 0}%` 
              }}
            />
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="space-y-3">
          {Object.entries(stats.assignmentsByCategory).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {categoryNames[category as keyof typeof categoryNames] || category}
              </span>
              <span className="text-sm font-medium text-gray-900">{count} שיבוצים</span>
            </div>
          ))}
        </div>
      </div>

      {/* Assignments Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">סטטוס שיבוצים</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.totalAssignments - stats.confirmedAssignments}</p>
            <p className="text-sm text-gray-600">ממתינים לאישור</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.confirmedAssignments}</p>
            <p className="text-sm text-gray-600">מאושרים</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completedAssignments}</p>
            <p className="text-sm text-gray-600">הושלמו</p>
          </div>
        </div>
      </div>
    </div>
  );
}