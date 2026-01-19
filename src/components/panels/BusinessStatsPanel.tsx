import React from 'react';

interface Props {
    data: any;
}

export default function BusinessStatsPanel({ data }: Props) {
    // Extract stats and orders from payload, with fallbacks
    const stats = data.businessStats || data.stats || {};
    const orders = data.orders || [];

    const StatCard = ({ title, value, icon, color = 'blue' }: any) => (
        <div className={`p-4 rounded-xl bg-gray-800/60 border border-white/10 text-white backdrop-blur-md`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">{title}</p>
                    <p className="text-2xl font-bold mt-1 text-white">{value !== undefined ? value : '-'}</p>
                </div>
                <span className="text-3xl opacity-80">{icon}</span>
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto p-4 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-2xl font-bold text-white">Business Overview</h2>
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">Read Only</span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Orders" value={stats.totalOrders} icon="📋" color="blue" />
                <StatCard title="Revenue" value={stats.revenue ? `${stats.revenue}` : '-'} icon="💰" color="green" />
                <StatCard title="Active Rest." value={stats.activeRestaurants} icon="🍽️" color="purple" />
                <StatCard title="Avg Rating" value={stats.avgRating} icon="⭐" color="yellow" />
            </div>

            {/* Orders List */}
            <div className="bg-gray-800/40 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
                {(!orders || orders.length === 0) ? (
                    <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-inbox text-4xl mb-2 opacity-50"></i>
                        <p>No recent orders available from brain.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.slice(0, 5).map((order: any, i: number) => (
                            <div key={order.id || i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">{order.restaurant || order.restaurantName || 'Restaurant'}</span>
                                        <span className="text-xs text-gray-500">#{order.id?.slice(0, 4)}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{order.customer || 'Customer'} • {order.items ? `${order.items.length} items` : 'Order'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-400 font-bold font-mono">{order.amount ? `${order.amount} zł` : ''}</p>
                                    <span className={`px-2 py-0.5 text-xs rounded ${order.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {order.status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
