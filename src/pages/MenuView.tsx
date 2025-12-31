import React from 'react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

interface MenuViewProps {
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
}

export default function MenuView({ menuItems, onAddToCart }: MenuViewProps) {
  if (!menuItems || menuItems.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl p-4 rounded-xl bg-slate-800/30 backdrop-blur-sm border border-slate-600/30 mb-4">
      <h3 className="text-orange-400 text-lg font-semibold mb-3 flex items-center">
        📋 Menu restauracji
      </h3>
      <div className="space-y-2">
        {menuItems.map((item) => (
          <div
            key={item.id || item.name}
            className="p-3 rounded-lg bg-slate-700/50 border border-slate-600/30"
          >
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h4 className="text-white font-medium text-sm">{item.name}</h4>
                {item.category && (
                  <p className="text-slate-400 text-xs mt-1">{item.category}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-orange-400 text-sm font-semibold">
                  {item.price ? `${item.price.toFixed(2)} zł` : 'Brak ceny'}
                </div>
                <button onClick={() => onAddToCart(item)} className="px-3 py-1 text-xs rounded-md bg-orange-500 text-white hover:bg-orange-400 transition-colors">Dodaj</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}