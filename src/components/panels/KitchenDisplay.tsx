import React from 'react';

// Reusing types from kdsApi or defining compatible ones
interface OrderItem {
    name: string;
    quantity: number;
}
interface KDSOrder {
    id: string;
    status: string;
    items: OrderItem[];
    created_at?: string;
}

interface Props {
    data: {
        orders?: KDSOrder[];
    };
}

export default function KitchenDisplay({ data }: Props) {
    const orders = data.orders || [];

    if (orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                    <i className="fas fa-utensils text-4xl mb-4 opacity-50" />
                    <p>Brak aktywnych zamówień na kuchni.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {orders.map((order) => (
                <div key={order.id} className="bg-gray-800 border-l-4 border-amber-500 rounded p-4">
                    <div className="flex justify-between items-start mb-3">
                        <span className="font-mono text-xl font-bold text-white">#{order.id.slice(0, 4)}</span>
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs rounded uppercase">{order.status}</span>
                    </div>
                    <div className="space-y-2 mb-4">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-gray-300 border-b border-gray-700 pb-1 last:border-0">
                                <span>{item.name}</span>
                                <span className="font-bold">x{item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                        {order.created_at ? new Date(order.created_at).toLocaleTimeString() : 'Just now'}
                    </div>
                </div>
            ))}
        </div>
    );
}
