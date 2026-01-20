import React, { useState, useEffect } from 'react';
import { StatusBadge, OrderStatus } from './StatusBadge';

export interface OrderItem {
    name: string;
    quantity: number;
    price: number;
    notes?: string;
}

export interface Order {
    id: string;
    created_at: string;
    status: OrderStatus;
    total: number;
    items: OrderItem[];
    customer_name?: string;
    restaurant_id?: string;
    table_number?: string;
}

interface OrderCardProps {
    order: Order;
    onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
    className?: string;
}

// Calculate time elapsed since order creation
function getTimeElapsed(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

// Get action button config based on status
function getActionConfig(status: OrderStatus): { label: string; nextStatus: OrderStatus; color: string } | null {
    switch (status) {
        case 'pending':
            return { label: 'Start Preparing', nextStatus: 'preparing', color: 'bg-blue-500 hover:bg-blue-600' };
        case 'preparing':
            return { label: 'Mark Ready', nextStatus: 'ready', color: 'bg-green-500 hover:bg-green-600' };
        case 'ready':
            return { label: 'Complete Order', nextStatus: 'delivered', color: 'bg-slate-500 hover:bg-slate-600' };
        default:
            return null;
    }
}

export function OrderCard({ order, onStatusChange, className = '' }: OrderCardProps) {
    const [timeElapsed, setTimeElapsed] = useState(getTimeElapsed(order.created_at));

    // Update time elapsed every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeElapsed(getTimeElapsed(order.created_at));
        }, 60000);

        return () => clearInterval(interval);
    }, [order.created_at]);

    const actionConfig = getActionConfig(order.status);

    // Format order ID for display
    const displayId = order.id.length > 8 ? `#${order.id.slice(-6).toUpperCase()}` : `#${order.id}`;

    // Urgency indicator (orders older than 10 min get highlighted)
    const diffMins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
    const isUrgent = order.status === 'pending' && diffMins > 10;
    const isVeryUrgent = order.status === 'pending' && diffMins > 20;

    return (
        <div
            className={`
        bg-slate-800 border-2 rounded-2xl overflow-hidden
        transition-all duration-300 hover:scale-[1.02]
        ${isVeryUrgent ? 'border-red-500 shadow-lg shadow-red-500/20' :
                    isUrgent ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' :
                        'border-slate-700 hover:border-slate-600'}
        ${className}
      `}
        >
            {/* Header */}
            <div className="bg-slate-850 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-white">{displayId}</span>
                    {order.table_number && (
                        <span className="text-slate-400 text-lg">Table {order.table_number}</span>
                    )}
                </div>
                <StatusBadge status={order.status} />
            </div>

            {/* Time & Customer */}
            <div className="px-5 py-3 bg-slate-800/50 flex items-center justify-between text-sm">
                <span className={`font-medium ${isVeryUrgent ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-slate-400'}`}>
                    ⏱ {timeElapsed}
                </span>
                {order.customer_name && (
                    <span className="text-slate-400">
                        👤 {order.customer_name}
                    </span>
                )}
            </div>

            {/* Items List */}
            <div className="px-5 py-4 space-y-3">
                <h4 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3">
                    Items ({order.items?.length || 0})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="bg-slate-700 text-white text-lg font-bold px-2.5 py-0.5 rounded">
                                        {item.quantity}×
                                    </span>
                                    <span className="text-white text-lg font-medium">{item.name}</span>
                                </div>
                                {item.notes && (
                                    <p className="text-slate-400 text-sm mt-1 ml-10">📝 {item.notes}</p>
                                )}
                            </div>
                            <span className="text-slate-400 text-lg">
                                ${(item.price * item.quantity).toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer with Total & Action */}
            <div className="px-5 py-4 bg-slate-900 border-t border-slate-700">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-sm">Total</span>
                        <div className="text-3xl font-bold text-white">
                            ${order.total?.toFixed(2) || '0.00'}
                        </div>
                    </div>

                    {actionConfig && onStatusChange && (
                        <button
                            onClick={() => onStatusChange(order.id, actionConfig.nextStatus)}
                            className={`
                ${actionConfig.color}
                text-white font-bold text-lg
                px-6 py-3 rounded-xl
                transition-all duration-200
                active:scale-95
              `}
                        >
                            {actionConfig.label}
                        </button>
                    )}

                    {order.status === 'cancelled' && (
                        <span className="text-red-400 font-medium text-lg">Order Cancelled</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OrderCard;
