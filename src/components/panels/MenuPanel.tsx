import React from 'react';

export interface MenuItemData {
    id: string;
    name: string;
    description?: string;
    price?: number;
    available?: boolean;
}

interface Props {
    data: MenuItemData[];
    restaurantName?: string;
}

export default function MenuPanel({ data, restaurantName }: Props) {
    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-gray-400">Menu niedostępne.</div>;
    }

    return (
        <div className="p-4">
            {restaurantName && <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">{restaurantName} - Menu</h2>}
            <div className="space-y-2">
                {data.map((item, i) => (
                    <div key={item.id || i} className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-lg hover:bg-white/10">
                        <div>
                            <h4 className="font-semibold text-white">{item.name}</h4>
                            {item.description && <p className="text-xs text-gray-400 max-w-md">{item.description}</p>}
                        </div>
                        <div className="text-right">
                            <span className="block font-mono text-amber-400 font-bold">{item.price ? `${item.price} zł` : '-'}</span>
                            {!item.available && <span className="text-xs text-red-400">Niedostępne</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
