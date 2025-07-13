import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { User } from '../../types';
import { Trash2, Edit, UserX } from 'lucide-react';
import { FirebaseService } from '../../services/firebaseService';
import toast from 'react-hot-toast';

export function TemporaryUserManagement() {
  const { users, assignments, menuItems, events, setUsers, setAssignments } = useStore();
  const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const filteredUsers = useMemo(() => {
    let tempUsers = users.filter(u => !u.isAdmin);

    if (filter === 'assigned') {
      tempUsers = tempUsers.filter(u => assignments.some(a => a.userId === u.id));
    } else if (filter === 'unassigned') {
      tempUsers = tempUsers.filter(u => !assignments.some(a => a.userId === u.id));
    }

    if (eventFilter !== 'all') {
      const userIdsInEvent = new Set(assignments.filter(a => a.eventId === eventFilter).map(a => a.userId));
      tempUsers = tempUsers.filter(u => userIdsInEvent.has(u.id));
    }

    return tempUsers;
  }, [users, assignments, filter, eventFilter]);

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(filteredUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        // This is a placeholder for the actual delete logic, which would typically be a server-side function.
        // For now, we'll just remove the user from the local state.
        setUsers(users.filter(u => u.id !== userId));
        toast.success('User deleted successfully.');
      } catch (error) {
        toast.error('Failed to delete user.');
        console.error(error);
      }
    }
  };

  const handleEditUserName = async (userId: string, currentName: string) => {
    const newName = window.prompt('Enter new name:', currentName);
    if (newName && newName.trim() !== '') {
      try {
        // This is a placeholder for the actual update logic.
        setUsers(users.map(u => (u.id === userId ? { ...u, name: newName.trim() } : u)));
        toast.success('User name updated successfully.');
      } catch (error) {
        toast.error('Failed to update user name.');
        console.error(error);
      }
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    if (window.confirm('Are you sure you want to remove all assignments for this user?')) {
      try {
        // This is a placeholder for the actual update logic.
        setAssignments(assignments.filter(a => a.userId !== userId));
        toast.success('Assignments removed successfully.');
      } catch (error) {
        toast.error('Failed to remove assignments.');
        console.error(error);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">ניהול משתמשים זמניים</h2>

      <div className="flex items-center space-x-4 rtl:space-x-reverse mb-4">
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
            סנן לפי סטטוס
          </label>
          <select
            id="status-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">הכל</option>
            <option value="assigned">משובצים</option>
            <option value="unassigned">לא משובצים</option>
          </select>
        </div>
        <div>
          <label htmlFor="event-filter" className="block text-sm font-medium text-gray-700">
            סנן לפי אירוע
          </label>
          <select
            id="event-filter"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">כל האירועים</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="p-4 text-right"><input type="checkbox" onChange={handleSelectAll} /></th>
              <th className="p-4 text-right font-semibold text-gray-600">שם</th>
              <th className="p-4 text-right font-semibold text-gray-600">סטטוס</th>
              <th className="p-4 text-right font-semibold text-gray-600">שיבוצים</th>
              <th className="p-4 text-right font-semibold text-gray-600">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b">
                <td className="p-4"><input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleSelectUser(user.id)} /></td>
                <td className="p-4">{user.name || 'אנונימי'}</td>
                <td className="p-4">{assignments.some(a => a.userId === user.id) ? 'משובץ' : 'לא משובץ'}</td>
                <td className="p-4">{assignments.filter(a => a.userId === user.id).length}</td>
                <td className="p-4 flex space-x-2 rtl:space-x-reverse">
                  <button onClick={() => handleEditUserName(user.id, user.name || '')} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
                  <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                  <button onClick={() => handleRemoveAssignment(user.id)} className="text-yellow-500 hover:text-yellow-700"><UserX size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
