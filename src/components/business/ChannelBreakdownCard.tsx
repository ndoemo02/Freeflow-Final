/**
 * ChannelBreakdownCard - Shows orders breakdown by channel
 * 
 * Displays:
 * - Progress bars for each channel
 * - Percentage and count
 * - Visual indicators with channel colors
 */

import React from 'react';
import { ChannelBreakdown, getChannelDisplay } from '../../lib/businessApi';
import './ChannelBreakdownCard.css';

export interface ChannelBreakdownCardProps {
    data: ChannelBreakdown;
}

export default function ChannelBreakdownCard({ data }: ChannelBreakdownCardProps) {
    const channels = [
        { key: 'restaurant' as const, ...data.restaurant, ...getChannelDisplay('restaurant') },
        { key: 'hotel' as const, ...data.hotel, ...getChannelDisplay('hotel') },
        { key: 'delivery' as const, ...data.delivery, ...getChannelDisplay('delivery') },
    ];

    return (
        <div className="channel-card glass">
            <h3 className="channel-card__title">Zamówienia wg kanału</h3>

            <div className="channel-card__bars">
                {channels.map(channel => (
                    <div key={channel.key} className="channel-bar">
                        <div className="channel-bar__header">
                            <span className="channel-bar__label">
                                <span className="channel-bar__icon">{channel.icon}</span>
                                {channel.label}
                            </span>
                            <span className="channel-bar__percentage">{channel.percentage}%</span>
                        </div>
                        <div className="channel-bar__track">
                            <div
                                className="channel-bar__fill"
                                style={{
                                    width: `${channel.percentage}%`,
                                    backgroundColor: channel.color
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="channel-card__counts">
                {channels.map(channel => (
                    <div key={channel.key} className="channel-count">
                        <p className="channel-count__value" style={{ color: channel.color }}>
                            {channel.count}
                        </p>
                        <p className="channel-count__label">{channel.label.substring(0, 4)}.</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
