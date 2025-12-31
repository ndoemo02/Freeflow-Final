import { useState } from 'react';
import GlassCard from './GlassCard';

export default function TopList({ dishes = [], restaurants = [] }) {
  const [type, setType] = useState('dishes');

  const defaultDishes = [
    { name: "Cosmic Burger", count: "1.2k", change: "+12%" },
    { name: "Nebula Noodles", count: "980", change: "+8%" },
    { name: "Star Sushi", count: "850", change: "-3%" },
    { name: "Void Pizza", count: "720", change: "+15%" },
  ];

  const defaultRestaurants = [
    { name: "Galactic Grill", count: "5.4k", change: "+22%" },
    { name: "Lunar Lounge", count: "3.1k", change: "+5%" },
    { name: "Orbit Cafe", count: "2.8k", change: "-1%" },
    { name: "Astro Bistro", count: "1.9k", change: "+9%" },
  ];

  const displayDishes = dishes.length > 0 
    ? dishes.map((d, i) => ({ name: d.name, count: String(d.orders || d.count || 0), change: "+0%" }))
    : defaultDishes;
  
  const displayRestaurants = restaurants.length > 0
    ? restaurants.map((r, i) => ({ name: r.name, count: String(r.revenue || r.count || 0), change: "+0%" }))
    : defaultRestaurants;

  const items = type === 'dishes' ? displayDishes : displayRestaurants;

  return (
    <GlassCard glowColor="purple">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-300 font-medium">Top {type === 'dishes' ? 'Dishes' : 'Restaurants'}</h3>
        <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/10">
          <button
            onClick={() => setType('dishes')}
            className={`px-2 py-1 text-[10px] rounded-md transition-all ${
              type === 'dishes'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Dishes
          </button>
          <button
            onClick={() => setType('restaurants')}
            className={`px-2 py-1 text-[10px] rounded-md transition-all ${
              type === 'restaurants'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Rest.
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {items.slice(0, 4).map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group border border-transparent hover:border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-xs font-bold text-gray-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                {i + 1}
              </div>
              <span className="text-sm text-gray-300 font-medium">{item.name}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">{item.count}</div>
              <div className={`text-xs ${item.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                {item.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}


