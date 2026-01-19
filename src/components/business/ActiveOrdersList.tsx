/**
 * ActiveOrdersList - Displays list of active orders with status
 * 
 * Read-only display - no mutations
 * Status = backend truth
 */

import React from 'react';
import { ActiveOrder, getStatusDisplay, getChannelDisplay } from '../../lib/businessApi';
import './ActiveOrdersList.css';

export interface ActiveOrdersListProps {
    orders: ActiveOrder[];
    onViewAll?: () => void;
}

export default function ActiveOrdersList({ orders, onViewAll }: ActiveOrdersListProps) {
    if (orders.length === 0) {
        return (
            <div className="orders-list glass">
                <div className="orders-list__header">
                    <h3 className="orders-list__title">Aktywne zamówienia</h3>
                </div>
                <div className="orders-list__empty">
                    <span className="orders-list__empty-icon">📭</span>
                    <p>Brak aktywnych zamówień</p>
                </div>
            </div>
        );
    }

    return (
        <div className="orders-list glass">
            <div className="orders-list__header">
                <h3 className="orders-list__title">Aktywne zamówienia</h3>
                {onViewAll && (
                    <button onClick={onViewAll} className="orders-list__view-all">
                        Zobacz wszystkie
                    </button>
                )}
            </div>

            <div className="orders-list__items">
                {orders.map(order => {
                    const status = getStatusDisplay(order.status);
                    const channel = getChannelDisplay(order.channel);

                    return (
                        <div key={order.id} className="order-item">
                            <div className="order-item__main">
                                <div className="order-item__left">
                                    <span className="order-item__number">{order.orderNumber}</span>
                                    <span
                                        className="order-item__channel"
                                        style={{ color: channel.color }}
                                    >
                                        {channel.icon} {channel.label}
                                    </span>
                                </div>
                                <div className="order-item__right">
                                    <span
                                        className="order-item__status"
                                        style={{
                                            backgroundColor: status.bgColor,
                                            color: status.color
                                        }}
                                    >
                                        {status.label}
                                    </span>
                                    <span className="order-item__time">
                                        {order.elapsedMinutes} min
                                    </span>
                                </div>
                            </div>

                            <div className="order-item__details">
                                <span className="order-item__location">📍 {order.location}</span>
                                <span className="order-item__items">
                                    {order.items.slice(0, 2).join(', ')}
                                    {order.items.length > 2 && ` +${order.items.length - 2}`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
