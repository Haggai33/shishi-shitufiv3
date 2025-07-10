import React, { useState } from 'react';
import { Calendar, Users, Settings, LogIn, LogOut } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { AdminLogin } from '../Auth/AdminLogin';

interface HeaderProps {
  currentView: 'events' | 'admin';
  onViewChange: (view: 'events' | 'admin') => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  const { user, isAdmin } = useStore(); // קורא מה-store
  const { logout } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const handleAdminLogin = () => {
    setShowAdminLogin(true);
  };

  const handleLoginSuccess = () => {
    // Login success is handled automatically
  };

  const hasUserName = user?.name && user.name.trim().length > 0;

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex justify-between items-start sm:items-center py-3">
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="bg-orange-500 rounded-lg p-2 flex-shrink-0">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-sm font-bold text-gray-900">שישי שיתופי</h1>
                <p className="text-sm sm:text-xs text-gray-500">ניהול ארוחות קהילתיות</p>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              <a 
                href="https://www.linkedin.com/in/chagai-yechiel/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
              Developed by <br />   Chagai Yechiel
              </a>

              <nav className="flex items-center space-x-2 rtl:space-x-reverse">
                  <button
                    onClick={() => onViewChange('events')}
                    title="אירועים"
                    className={`p-2 rounded-md transition-colors ${
                      currentView === 'events'
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => onViewChange('admin')}
                      title="ניהול"
                      className={`p-2 rounded-md transition-colors ${
                        currentView === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                  
                  <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1"></div>

                  <div className="flex items-center space-x-2 rtl:space-x-reverse" title={hasUserName ? user.name : 'משתמש אנונימי'}>
                    <div className={`rounded-full p-2 ${hasUserName ? 'bg-orange-100' : 'bg-gray-100'}`}>
                      <Users className={`h-4 w-4 ${hasUserName ? 'text-orange-600' : 'text-gray-600'}`} />
                    </div>
                  </div>

                  {isAdmin ? (
                    <button
                      onClick={logout}
                      title="התנתק"
                      className="p-2 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleAdminLogin}
                      title="התחבר כמנהל"
                      className="p-2 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      <LogIn className="h-4 w-4" />
                    </button>
                  )}
              </nav>
            </div>

          </div>
        </div>
      </header>

      {showAdminLogin && (
        <AdminLogin
          onClose={() => setShowAdminLogin(false)}
          onSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}