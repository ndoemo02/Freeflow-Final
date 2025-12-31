import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Hook do real-time updates dla admin dashboard
 */
export function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    currentHourOrders: 0
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const WS_URL = process.env.REACT_APP_WS_URL || window.location.origin.replace('http', 'ws');
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join:admin-dashboard');
      console.log('✅ Connected to real-time dashboard');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from real-time dashboard');
    });

    socket.on('connect_error', (error) => {
      console.warn('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Aktualizacja metryk w czasie rzeczywistym
    socket.on('metrics:update', (data) => {
      setMetrics(prev => ({
        ...prev,
        ...data
      }));
    });

    // Nowe zamówienie
    socket.on('order:new', (order) => {
      setMetrics(prev => ({
        ...prev,
        totalOrders: prev.totalOrders + 1,
        totalRevenue: prev.totalRevenue + (order.total || order.total_price || 0),
        currentHourOrders: prev.currentHourOrders + 1
      }));
      
      // Opcjonalnie: pokaż notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nowe zamówienie!', {
          body: `Wartość: ${order.total || order.total_price || 0} zł`,
          icon: '/icon.png',
          tag: 'new-order'
        });
      }
    });

    // Aktualizacja aktywnych użytkowników
    socket.on('users:active', (count) => {
      setMetrics(prev => ({
        ...prev,
        activeUsers: count
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { metrics, isConnected };
}

/**
 * Komponent statusu połączenia
 */
export function ConnectionStatus({ isConnected }) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
      isConnected 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${
        isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
      }`} />
      <span>{isConnected ? 'Live' : 'Offline'}</span>
    </div>
  );
}

/**
 * Komponent live ticker dla przychodu
 */
export function LiveRevenueTicker({ revenue, isConnected }) {
  const [animatedValue, setAnimatedValue] = useState(revenue || 0);

  useEffect(() => {
    if (!isConnected || revenue === undefined) return;
    
    const diff = revenue - animatedValue;
    if (Math.abs(diff) < 0.01) {
      setAnimatedValue(revenue);
      return;
    }
    
    const steps = 20;
    const step = diff / steps;
    let current = animatedValue;
    
    const interval = setInterval(() => {
      current += step;
      if ((step > 0 && current >= revenue) || (step < 0 && current <= revenue)) {
        current = revenue;
        clearInterval(interval);
      }
      setAnimatedValue(current);
    }, 50);

    return () => clearInterval(interval);
  }, [revenue, isConnected, animatedValue]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-4xl font-extrabold text-cyan-400">
        {animatedValue.toLocaleString('pl-PL', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })} zł
      </span>
      {isConnected && (
        <span className="text-xs text-green-400 animate-pulse">LIVE</span>
      )}
    </div>
  );
}


