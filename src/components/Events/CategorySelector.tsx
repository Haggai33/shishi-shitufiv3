// src/components/Events/CategorySelector.tsx

import React from 'react';
import { MenuItem, Assignment } from '../../types';

// הגדרות עיצוב ושמות לקטגוריות
const categoryDetails: { [key: string]: { name: string; icon: string; color: string } } = {
  starter: { name: 'מנות ראשונות', icon: '/Icons/2.gif', color: '#3498db' },
  main: { name: 'מנות עיקריות', icon: '/Icons/1.gif', color: '#ff8a00' },
  dessert: { name: 'קינוחים', icon: '/Icons/3.gif', color: '#9b59b6' },
  drink: { name: 'משקאות', icon: '/Icons/4.gif', color: '#2ecc71' },
  other: { name: 'אחר', icon: '/Icons/5.gif', color: '#95a5a6' },
};

// הגדרת ה-Props שהרכיב מקבל מהרכיב האב (EventPage)
interface CategorySelectorProps {
  menuItems: MenuItem[];
  assignments: Assignment[];
  onSelectCategory: (category: string) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ menuItems, assignments, onSelectCategory }) => {
  
  // פונקציית עזר לחישוב ההתקדמות בכל קטגוריה
  const getCategoryProgress = (category: string) => {
    const itemsInCategory = menuItems.filter(item => item.category === category);
    const assignedItemsInCategory = itemsInCategory.filter(item =>
      assignments.some(a => a.menuItemId === item.id)
    );
    return {
      assigned: assignedItemsInCategory.length,
      total: itemsInCategory.length,
    };
  };

  const categoriesOrder = ['starter', 'main', 'dessert', 'drink', 'other'];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">מה בא לך להביא לארוחה?</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoriesOrder.map(categoryKey => {
          const progress = getCategoryProgress(categoryKey);
          const details = categoryDetails[categoryKey];

          // הצג את הקטגוריה רק אם יש בה פריטים
          if (progress.total === 0) {
            return null;
          }

          const percentage = progress.total > 0 ? (progress.assigned / progress.total) * 100 : 0;

          return (
            <button
              key={categoryKey}
              onClick={() => onSelectCategory(categoryKey)}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-transform transform hover:-translate-y-1 cursor-pointer text-center"
            >
              <img 
                src={details.icon} 
                alt={details.name} 
                className="w-20 h-20 mx-auto mb-3 object-contain" // שימוש ב-object-contain כדי למנוע עיוות
              />
              <h3 className="text-xl font-bold text-gray-800 mb-2">{details.name}</h3>
              <p className="text-center text-gray-500 text-sm mb-4">
                {progress.assigned} / {progress.total} שובצו
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full" 
                  style={{ width: `${percentage}%`, backgroundColor: details.color, transition: 'width 0.5s ease-in-out' }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategorySelector;
