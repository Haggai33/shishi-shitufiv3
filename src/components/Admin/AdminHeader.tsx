import React from 'react';
import { Calendar, Users, Settings, LogOut, ChefHat } from 'lucide-react';

interface AdminHeaderProps {
  userName: string;
  onLogout: () => void;
  currentView: 'events' | 'users' | 'settings';
  onViewChange: (view: 'events' | 'users' | 'settings') => void;
}

export function AdminHeader({ userName, onLogout, currentView, onViewChange }: AdminHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          
          {/* Left side - Logo and branding */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="bg-orange-500 rounded-lg p-2">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">שישי שיתופי</h1>
              <p className="text-sm text-gray-500">פאנל ניהול</p>
            </div>
          </div>

          {/* Center - Navigation */}
          <nav className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
            <button
              onClick={() => onViewChange('events')}
              className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'events'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>ניהול אירועים</span>
            </button>

            <button
              onClick={() => onViewChange('users')}
              className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'users'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>ניהול משתמשים</span>
            </button>

            <button
              onClick={() => onViewChange('settings')}
              className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'settings'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>הגדרות</span>
            </button>
          </nav>

          {/* Right side - User info and logout */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">מנהל מערכת</p>
            </div>
            
            <div className="bg-orange-500 rounded-lg p-2">
              <div className="h-6 w-6 bg-white rounded text-orange-500 flex items-center justify-center text-xs font-bold">
                {userName.charAt(0)}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>התנתק</span>
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden pb-4">
          <div className="flex space-x-1 rtl:space-x-reverse">
            <button
              onClick={() => onViewChange('events')}
              className={`flex-1 flex items-center justify-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'events'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>אירועים</span>
            </button>

            <button
              onClick={() => onViewChange('users')}
              className={`flex-1 flex items-center justify-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'users'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>משתמשים</span>
            </button>

            <button
              onClick={() => onViewChange('settings')}
              className={`flex-1 flex items-center justify-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'settings'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>הגדרות</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}