import React from 'react';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

interface StatusBadgeProps {
    status: OrderStatus;
    className?: string;
}

const statusConfig: Record<OrderStatus, { bg: string; text: string; label: string }> = {
    pending: {
        bg: 'bg-yellow-400',
        text: 'text-yellow-900',
        label: 'Pending',
    },
    preparing: {
        bg: 'bg-blue-400',
        text: 'text-blue-900',
        label: 'Preparing',
    },
    ready: {
        bg: 'bg-green-400',
        text: 'text-green-900',
        label: 'Ready',
    },
    delivered: {
        bg: 'bg-slate-400',
        text: 'text-slate-900',
        label: 'Delivered',
    },
    cancelled: {
        bg: 'bg-red-600',
        text: 'text-red-100',
        label: 'Cancelled',
    },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.pending;

    return (
        <span
            className={`
        inline-flex items-center px-3 py-1.5
        rounded-full font-bold text-sm uppercase tracking-wide
        ${config.bg} ${config.text}
        ${className}
      `}
        >
            {config.label}
        </span>
    );
}

export default StatusBadge;
