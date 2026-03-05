import React, { useState, useEffect, useRef } from 'react';
import './KitchenDisplay.css';

interface OrderItem {
    id: string;
    name: string;
    notes?: string;
    quantity: number;
}

interface Order {
    id: string;
    table: number;
    items: OrderItem[];
    status: 'new' | 'preparing' | 'ready' | 'completed';
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    priority: 'normal' | 'high';
}

interface Props {
    data?: any;
}

const initialOrders: Order[] = [
    {
        id: 'ORD-001',
        table: 5,
        status: 'new',
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
        priority: 'high',
        items: [
            { id: '1', name: 'Burger Klasyczny', quantity: 2, notes: 'Bez cebuli' },
            { id: '2', name: 'Frytki XXL', quantity: 1 },
            { id: '3', name: 'Cola 0.5L', quantity: 2 },
        ],
    },
    {
        id: 'ORD-002',
        table: 12,
        status: 'preparing',
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
        startedAt: new Date(Date.now() - 1000 * 60 * 8),
        priority: 'normal',
        items: [
            { id: '4', name: 'Pizza Margherita', quantity: 1 },
            { id: '5', name: 'Sałatka Cezar', quantity: 2 },
            { id: '6', name: 'Wino czerwone', quantity: 1 },
        ],
    },
    {
        id: 'ORD-003',
        table: 3,
        status: 'ready',
        createdAt: new Date(Date.now() - 1000 * 60 * 25),
        startedAt: new Date(Date.now() - 1000 * 60 * 20),
        completedAt: new Date(Date.now() - 1000 * 60 * 5),
        priority: 'normal',
        items: [
            { id: '7', name: 'Stek Ribeye', quantity: 1, notes: 'Medium rare' },
            { id: '8', name: 'Pomidor grillowany', quantity: 1 },
            { id: '9', name: 'Woda mineralna', quantity: 2 },
        ],
    },
    {
        id: 'ORD-004',
        table: 8,
        status: 'new',
        createdAt: new Date(Date.now() - 1000 * 60 * 3),
        priority: 'normal',
        items: [
            { id: '10', name: 'Tacos Meksykańskie', quantity: 3 },
            { id: '11', name: 'Guacamole', quantity: 1 },
            { id: '12', name: 'Piwo lokalne', quantity: 2 },
        ],
    },
    {
        id: 'ORD-005',
        table: 15,
        status: 'preparing',
        createdAt: new Date(Date.now() - 1000 * 60 * 12),
        startedAt: new Date(Date.now() - 1000 * 60 * 6),
        priority: 'high',
        items: [
            { id: '13', name: 'Ramen Ziemniaczany', quantity: 2 },
            { id: '14', name: 'Gyoza', quantity: 1 },
            { id: '15', name: 'Sake', quantity: 1 },
        ],
    },
];

function formatTime(date: Date): string {
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getStatusColor(status: Order['status']): string {
    switch (status) {
        case 'new':
            return 'from-orange-500 to-orange-600';
        case 'preparing':
            return 'from-blue-500 to-blue-600';
        case 'ready':
            return 'from-green-500 to-green-600';
        case 'completed':
            return 'from-gray-500 to-gray-600';
    }
}

function getStatusLabel(status: Order['status']): string {
    switch (status) {
        case 'new':
            return 'NOWE';
        case 'preparing':
            return 'W PRZYGOTOWANIU';
        case 'ready':
            return 'GOTOWE';
        case 'completed':
            return 'WYKONANE';
    }
}

function StatusBadge({ status }: { status: Order['status'] }) {
    const colors = getStatusColor(status);
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${colors}`}>
            {getStatusLabel(status)}
        </span>
    );
}

function PriorityBadge({ priority }: { priority: Order['priority'] }) {
    if (priority === 'high') {
        return (
            <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-red-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                <span className="text-xs font-bold text-red-500">PRIORYTET</span>
            </div>
        );
    }
    return null;
}

function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: Order['status']) => void }) {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (order.status === 'new') {
                setElapsedTime(Date.now() - order.createdAt.getTime());
            } else if (order.status === 'preparing' && order.startedAt) {
                setElapsedTime(Date.now() - order.startedAt.getTime());
            } else if (order.status === 'ready' && order.completedAt) {
                setElapsedTime(Date.now() - order.completedAt.getTime());
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [order]);

    const nextStatus: Record<Order['status'], Order['status']> = {
        new: 'preparing',
        preparing: 'ready',
        ready: 'completed',
        completed: 'new',
    };

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 border border-slate-700 shadow-xl hover:shadow-2xl hover:border-slate-600 transition-all duration-300">
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-base shadow-lg">
                        {order.table}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs font-mono text-slate-400 truncate">{order.id}</span>
                            <span className="text-xs text-slate-500">{formatTime(order.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <StatusBadge status={order.status} />
                            <PriorityBadge priority={order.priority} />
                        </div>
                    </div>
                </div>
                <div className={`text-xl font-mono font-bold flex-shrink-0 ${order.status === 'new' ? 'text-orange-500' : order.status === 'ready' ? 'text-green-500' : 'text-blue-500'}`}>
                    {formatDuration(elapsedTime)}
                </div>
            </div>

            <div className="space-y-1 mb-3">
                {order.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-1 text-xs">
                        <span className="text-orange-400 font-bold flex-shrink-0">{item.quantity}x</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-200 truncate">{item.name}</p>
                            {item.notes && <p className="text-xs text-slate-500 italic truncate">{item.notes}</p>}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => onStatusChange(order.id, nextStatus[order.status])}
                className="kds-button w-full py-2 px-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs hover:from-orange-600 hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
            >
                {order.status === 'new' && 'PRZYJMIJ'}
                {order.status === 'preparing' && 'GOTOWE'}
                {order.status === 'ready' && 'WYŚLIJ'}
                {order.status === 'completed' && 'ARCHIW.'}
            </button>
        </div>
    );
}

function StatusColumn({
    title,
    orders,
    onStatusChange,
    color,
    isActive
}: {
    title: string;
    orders: Order[];
    onStatusChange: (id: string, status: Order['status']) => void;
    color: string;
    isActive?: boolean;
}) {
    return (
        <div className={`flex-1 min-w-0 w-full ${isActive ? 'opacity-100' : 'opacity-40'}`}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className={`h-1 flex-1 min-w-[60px] rounded-full bg-gradient-to-r ${color}`}></div>
                <h2 className="text-lg font-bold text-slate-200 whitespace-nowrap">{title}</h2>
                <div className="h-1 flex-1 min-w-[60px] rounded-full bg-slate-700"></div>
            </div>
            <div className="space-y-3">
                {orders.length === 0 ? (
                    <div className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-slate-700 text-slate-500">
                        <p className="text-sm">Brak zamówień</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <OrderCard key={order.id} order={order} onStatusChange={onStatusChange} />
                    ))
                )}
            </div>
        </div>
    );
}

export default function KitchenDisplay({ data }: Props) {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [activeColumn, setActiveColumn] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleStatusChange = (id: string, newStatus: Order['status']) => {
        setOrders((prev) =>
            prev.map((order) => {
                if (order.id === id) {
                    const updated: Order = { ...order, status: newStatus };
                    if (newStatus === 'preparing') {
                        updated.startedAt = new Date();
                    } else if (newStatus === 'ready') {
                        updated.completedAt = new Date();
                    }
                    return updated;
                }
                return order;
            })
        );
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!isMobile) return;

        const swipeThreshold = 50;
        const diff = touchStartX.current - touchEndX.current;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next column
                setActiveColumn((prev) => Math.min(prev + 1, 3));
            } else {
                // Swipe right - previous column
                setActiveColumn((prev) => Math.max(prev - 1, 0));
            }
        }
    };

    const newOrders = orders.filter((o) => o.status === 'new');
    const preparingOrders = orders.filter((o) => o.status === 'preparing');
    const readyOrders = orders.filter((o) => o.status === 'ready');
    const completedOrders = orders.filter((o) => o.status === 'completed');

    const columns = [
        { title: 'NOWE', orders: newOrders, color: 'from-orange-500 to-orange-600', icon: '🔔' },
        { title: 'W PRZYGOTOWANIU', orders: preparingOrders, color: 'from-blue-500 to-blue-600', icon: '👨🍳' },
        { title: 'GOTOWE', orders: readyOrders, color: 'from-green-500 to-green-600', icon: '✅' },
        { title: 'WYKONANE', orders: completedOrders, color: 'from-gray-500 to-gray-600', icon: '📦' },
    ];

    return (
        <div className="kds-min-h-screen bg-gradient-to-br w-full h-full from-slate-950 via-slate-900 to-slate-950 flex flex-col pt-[5rem] overflow-auto">
            {/* Header */}
            <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
                <div className="max-w-[1800px] w-full mx-auto px-3 md:px-6 py-3 md:py-4">
                    <div className="flex items-center justify-between gap-2 md:gap-4">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <svg className="w-5 h-5 md:w-7 md:h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                                    <path d="M7 2v20" />
                                    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-2xl font-bold text-white truncate">Free Flow</h1>
                                <p className="text-xs md:text-sm text-slate-400 truncate">Kitchen Display System</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                            <div className="flex items-center gap-1 md:gap-2 text-slate-400">
                                <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" />
                                </svg>
                                <span className="font-mono text-sm md:text-lg whitespace-nowrap">{new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="bg-slate-900/30 border-b border-slate-800">
                <div className="max-w-[1800px] mx-auto w-full px-3 md:px-6 py-2 md:py-3">
                    <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm overflow-x-auto">
                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-orange-500 animate-pulse"></div>
                            <span className="text-slate-400 hidden md:inline">Nowe:</span>
                            <span className="text-slate-400 md:hidden">N:</span>
                            <span className="font-bold text-white">{newOrders.length}</span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="text-slate-400 hidden md:inline">W przygotowaniu:</span>
                            <span className="text-slate-400 md:hidden">P:</span>
                            <span className="font-bold text-white">{preparingOrders.length}</span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-slate-400 hidden md:inline">Gotowe:</span>
                            <span className="text-slate-400 md:hidden">G:</span>
                            <span className="font-bold text-white">{readyOrders.length}</span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-500"></div>
                            <span className="text-slate-400 hidden md:inline">Wykonane:</span>
                            <span className="text-slate-400 md:hidden">W:</span>
                            <span className="font-bold text-white">{completedOrders.length}</span>
                        </div>
                        <div className="flex-1"></div>
                        <div className="text-slate-500 text-xs md:text-sm flex-shrink-0">
                            <span className="hidden md:inline">Łącznie zamówień: </span>
                            <span className="md:hidden">Ł: </span>
                            <span className="text-white font-bold">{orders.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main
                className="kds-main max-w-[1800px] w-full mx-auto px-3 md:px-6 py-4 md:py-6 flex-1 relative"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className={isMobile ? "overflow-hidden" : "flex flex-row gap-6 h-full"}>
                    {isMobile ? (
                        <div
                            className="flex transition-transform duration-300 ease-out h-full"
                            style={{ transform: `translateX(-${activeColumn * 100}%)` }}
                        >
                            {columns.map((col, index) => (
                                <div key={index} className="w-full flex-shrink-0 h-full">
                                    <StatusColumn
                                        title={col.title}
                                        orders={col.orders}
                                        onStatusChange={handleStatusChange}
                                        color={col.color}
                                        isActive={index === activeColumn}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        columns.map((col, index) => (
                            <StatusColumn
                                key={index}
                                title={col.title}
                                orders={col.orders}
                                onStatusChange={handleStatusChange}
                                color={col.color}
                                isActive={true}
                            />
                        ))
                    )}
                </div>

                {/* Mobile Indicators */}
                {isMobile && (
                    <div className="flex justify-center items-center gap-2 mt-4 pb-4">
                        {columns.map((col, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveColumn(index)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${index === activeColumn
                                        ? `bg-gradient-to-r ${col.color} w-8`
                                        : 'bg-slate-700 hover:bg-slate-600'
                                    }`}
                                aria-label={`Przejdź do ${col.title}`}
                            />
                        ))}
                    </div>
                )}

                {/* Mobile Swipe Hint */}
                {isMobile && (
                    <div className="text-center text-slate-500 text-xs mt-2 pb-4">
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                            <span>Swipe, aby przełączyć listy</span>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-slate-900/50 backdrop-blur-sm border-t border-slate-800 mt-auto">
                <div className="max-w-[1800px] w-full mx-auto px-3 md:px-6 py-3 md:py-4">
                    <div className="flex items-center justify-between gap-4 text-xs md:text-sm text-slate-500 flex-wrap">
                        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                            <span>Free Flow KDS v1.0</span>
                            <span className="hidden md:inline">•</span>
                            <span className="hidden md:inline">Server: Online</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                            <button className="kds-button flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-xs md:text-sm">
                                <svg className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <path d="M22 6l-10 7L2 6" />
                                </svg>
                                <span className="hidden md:inline">Filtruj</span>
                            </button>
                            <button className="kds-button flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-xs md:text-sm">
                                <svg className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                                <span className="hidden md:inline">Ustawienia</span>
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
