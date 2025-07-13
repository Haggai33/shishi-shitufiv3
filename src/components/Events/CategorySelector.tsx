import React from 'react';
import { MenuItem, Assignment } from '../../types';
import { Plus } from 'lucide-react';

// A mapping from category keys to their display names in Hebrew.
const categoryNames: { [key: string]: string } = {
  starter: 'מנות ראשונות',
  main: 'מנות עיקריות',
  dessert: 'קינוחים',
  drink: 'משקאות',
  other: 'אחר'
};

// Defines the props for the CategorySelector component.
interface CategorySelectorProps {
  menuItems: MenuItem[];
  assignments: Assignment[];
  onSelectCategory: (category: string) => void;
  onAddItem: () => void;
  canAddMoreItems: boolean;
}

// This component displays a grid of category buttons.
export function CategorySelector({
  menuItems,
  assignments,
  onSelectCategory,
  onAddItem,
  canAddMoreItems,
}: CategorySelectorProps) {
  // An array of category keys.
  const categories = ['starter', 'main', 'dessert', 'drink', 'other'];

  // Calculates the number of assigned and total items for a given category.
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

  const categoryVisuals: { [key: string]: { icon: string; glowClass: string; color: string } } = {
    starter: { icon: '/Icons/2.gif', glowClass: 'glow-starter', color: '#3498db' },
    main: { icon: '/Icons/1.gif', glowClass: 'glow-main', color: '#ff8a00' },
    dessert: { icon: '/Icons/3.gif', glowClass: 'glow-dessert', color: '#9b59b6' },
    drink: { icon: '/Icons/4.gif', glowClass: 'glow-drink', color: '#2ecc71' },
    other: { icon: '/Icons/5.gif', glowClass: 'glow-other', color: '#95a5a6' },
  };

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">מה בא לך להביא לארוחה?</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(category => {
          const progress = getCategoryProgress(category);
          const visuals = categoryVisuals[category];
          if (progress.total === 0) return null;

          const percentage = progress.total > 0 ? (progress.assigned / progress.total) * 100 : 0;

          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className="category-card-2025 relative group overflow-hidden rounded-2xl p-4 text-gray-800 text-center transform transition-transform duration-300 hover:scale-105"
            >
              <div className={`aurora-glow ${visuals.glowClass}`}></div>
              <div className="relative z-10 flex flex-col items-center">
                <img src={visuals.icon} alt={categoryNames[category]} className="w-16 h-16 mb-2 transition-transform duration-300 group-hover:scale-110" />
                <h3 className="text-lg font-bold mb-1">{categoryNames[category]}</h3>
                <p className="text-xs opacity-80">{progress.assigned} / {progress.total} שובצו</p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${percentage}%`, backgroundColor: visuals.color, transition: 'width 0.5s ease-in-out' }}
                  ></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={onAddItem}
        disabled={!canAddMoreItems}
        title={canAddMoreItems ? "הוסף פריט חדש" : `הגעת למכסת הפריטים`}
        className="w-full mt-8 px-4 py-3 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        הוסף פריט משלך
      </button>
    </div>
  );
}
