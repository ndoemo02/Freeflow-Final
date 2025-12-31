import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/auth';
import { useToast } from '../../components/Toast';
import PanelHeader from '../../components/PanelHeader';

export default function TaxiPanel() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  
  const [driverStatus, setDriverStatus] = useState('offline'); // offline, available, busy, break
  const [bookings, setBookings] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [stats, setStats] = useState({
    totalRides: 0,
    todayRides: 0,
    totalEarnings: 0,
    rating: 0
  });
  const [breakTime, setBreakTime] = useState(0); // break time in minutes
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [totalKm, setTotalKm] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // Redirect if not logged in
  useEffect(() => {
    if (!user?.id) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Load driver data
  useEffect(() => {
    if (!user?.id) return;
    loadDriverData();
    loadBookings();
    loadStats();
  }, [user]);

  // Real-time location tracking
  useEffect(() => {
    if (driverStatus === 'available' || driverStatus === 'busy') {
      startLocationTracking();
    }
    return () => stopLocationTracking();
  }, [driverStatus]);

  const loadDriverData = async () => {
    try {
      const { data, error } = await supabase
        .from('taxi_drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setDriverStatus(data.status);
        setCurrentLocation({ lat: data.lat, lng: data.lng });
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!customer_id(
            first_name,
            last_name,
            phone
          )
        `)
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status, actual_price, created_at')
        .eq('driver_id', user.id);
      
      if (data) {
        const totalRides = data.filter(b => b.status === 'completed').length;
        const todayRides = data.filter(b => 
          b.status === 'completed' && 
          new Date(b.created_at).toDateString() === new Date().toDateString()
        ).length;
        const totalEarnings = data
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (b.actual_price || 0), 0);
        
        setStats({ totalRides, todayRides, totalEarnings, rating: 4.8 });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const updateDriverStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('taxi_drivers')
        .upsert({
          user_id: user.id,
          status: newStatus,
          lat: currentLocation?.lat,
          lng: currentLocation?.lng,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setDriverStatus(newStatus);
      push(`Status zmieniony na: ${getStatusText(newStatus)}`, 'success');
    } catch (error) {
      push('Błąd aktualizacji statusu', 'error');
    }
  };

  const acceptBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      setDriverStatus('busy');
      await updateDriverStatus('busy');
      loadBookings();
      push('Kurs zaakceptowany!', 'success');
    } catch (error) {
      push('Błąd akceptacji kursu', 'error');
    }
  };

  const completeBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      setDriverStatus('available');
      await updateDriverStatus('available');
      loadBookings();
      loadStats();
      push('Kurs ukończony!', 'success');
    } catch (error) {
      push('Błąd ukończenia kursu', 'error');
    }
  };

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          
          // Update location in database
          supabase
            .from('taxi_drivers')
            .upsert({
              user_id: user.id,
              lat: latitude,
              lng: longitude,
              updated_at: new Date().toISOString()
            });
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
      );
    }
  };

  const stopLocationTracking = () => {
    // Stop geolocation tracking
  };

  // Break management functions
  const startBreak = () => {
    setIsOnBreak(true);
    setDriverStatus('break');
    setBreakTime(0);
    push('Przerwa rozpoczęta', 'success');
  };

  const endBreak = () => {
    setIsOnBreak(false);
    setDriverStatus('available');
    setBreakTime(0);
    push('Przerwa zakończona', 'success');
  };

  // Break timer effect
  useEffect(() => {
    let interval;
    if (isOnBreak) {
      interval = setInterval(() => {
        setBreakTime(prev => prev + 1);
      }, 60000); // Update every minute
    }
    return () => clearInterval(interval);
  }, [isOnBreak]);

  // Format break time
  const formatBreakTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Format time
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getStatusText = (status) => {
    const statusMap = {
      offline: 'Offline',
      available: 'Dostępny',
      busy: 'Na kursie',
      break: 'Przerwa'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      offline: 'bg-gray-500',
      available: 'bg-green-500',
      busy: 'bg-red-500',
      break: 'bg-yellow-500'
    };
    return colorMap[status] || 'bg-gray-500';
  };

  const getStatusNeonColor = (status) => {
    const colorMap = {
      offline: 'text-gray-400',
      available: 'text-green-400',
      busy: 'text-red-400',
      break: 'text-yellow-400'
    };
    return colorMap[status] || 'text-gray-400';
  };

  // Order management functions
  const acceptOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'accepted',
          driver_id: user.id,
          accepted_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      setDriverStatus('busy');
      await updateDriverStatus('busy');
      loadBookings();
      push('Zamówienie zaakceptowane!', 'success');
    } catch (error) {
      push('Błąd akceptacji zamówienia', 'error');
    }
  };

  const rejectOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      loadBookings();
      push('Zamówienie odrzucone', 'info');
    } catch (error) {
      push('Błąd odrzucania zamówienia', 'error');
    }
  };

  const getBookingStatusColor = (status) => {
    const colorMap = {
      pending: 'bg-yellow-500',
      accepted: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    return colorMap[status] || 'bg-gray-500';
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <PanelHeader 
          title="🚗 Driver Control Panel" 
          subtitle="Neural interface for ride management"
        />

        {/* Status Control Panel - Glassmorphism */}
        <motion.div 
          className="bg-black/20 backdrop-blur-xl rounded-2xl p-8 mb-8 shadow-2xl border border-cyan-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">⚡ Driver Status</h2>
              <p className="text-gray-400">Neural interface control</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(driverStatus)} animate-pulse shadow-lg shadow-${getStatusColor(driverStatus).split('-')[1]}-500/50`}></div>
              <span className={`text-lg font-semibold ${getStatusNeonColor(driverStatus)}`}>{getStatusText(driverStatus)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.button
              onClick={() => updateDriverStatus('available')}
              disabled={driverStatus === 'available'}
              className={`p-4 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm ${
                driverStatus === 'available' 
                  ? 'bg-green-500/20 text-green-400 border-2 border-green-400/50 shadow-lg shadow-green-500/25' 
                  : 'bg-white/5 text-gray-400 border-2 border-white/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-400/30'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center border border-green-400/30">
                  <span className="text-green-400 text-sm">✓</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold">Available</div>
                  <div className="text-sm opacity-75">Ready for rides</div>
                </div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => updateDriverStatus('busy')}
              disabled={driverStatus === 'busy'}
              className={`p-4 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm ${
                driverStatus === 'busy' 
                  ? 'bg-red-500/20 text-red-400 border-2 border-red-400/50 shadow-lg shadow-red-500/25' 
                  : 'bg-white/5 text-gray-400 border-2 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center border border-red-400/30">
                  <span className="text-red-400 text-sm">●</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold">On Ride</div>
                  <div className="text-sm opacity-75">Currently driving</div>
                </div>
              </div>
            </motion.button>

            <motion.button
              onClick={isOnBreak ? endBreak : startBreak}
              className={`p-4 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm ${
                isOnBreak 
                  ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/25' 
                  : 'bg-white/5 text-gray-400 border-2 border-white/10 hover:bg-yellow-500/10 hover:text-yellow-400 hover:border-yellow-400/30'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-400/30">
                  <span className="text-yellow-400 text-sm">{isOnBreak ? '⏸' : '⏸'}</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold">{isOnBreak ? 'End Break' : 'Break'}</div>
                  <div className="text-sm opacity-75">{isOnBreak ? formatBreakTime(breakTime) : 'Take a break'}</div>
                </div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => updateDriverStatus('offline')}
              disabled={driverStatus === 'offline'}
              className={`p-4 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm ${
                driverStatus === 'offline' 
                  ? 'bg-gray-500/20 text-gray-400 border-2 border-gray-400/50 shadow-lg shadow-gray-500/25' 
                  : 'bg-white/5 text-gray-400 border-2 border-white/10 hover:bg-gray-500/10 hover:text-gray-400 hover:border-gray-400/30'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-500/20 rounded-full flex items-center justify-center border border-gray-400/30">
                  <span className="text-gray-400 text-sm">○</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold">Offline</div>
                  <div className="text-sm opacity-75">Not available</div>
                </div>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Driver Stats - Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div 
            className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-cyan-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-400/30">
                <span className="text-2xl text-cyan-400">📊</span>
              </div>
              <span className="text-sm text-green-400 font-semibold">+12%</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Today's Rides</h3>
            <p className="text-3xl font-bold text-white">{stats.todayRides}</p>
            <p className="text-gray-500 text-sm">vs yesterday</p>
          </motion.div>

          <motion.div 
            className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-green-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center border border-green-400/30">
                <span className="text-2xl text-green-400">🚗</span>
              </div>
              <span className="text-sm text-blue-400 font-semibold">Total</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">All Time Rides</h3>
            <p className="text-3xl font-bold text-white">{stats.totalRides}</p>
            <p className="text-gray-500 text-sm">completed rides</p>
          </motion.div>

          <motion.div 
            className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-yellow-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center border border-yellow-400/30">
                <span className="text-2xl text-yellow-400">💰</span>
              </div>
              <span className="text-sm text-green-400 font-semibold">+8%</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Total Earnings</h3>
            <p className="text-3xl font-bold text-white">{stats.totalEarnings.toFixed(2)} zł</p>
            <p className="text-gray-500 text-sm">this month</p>
          </motion.div>

          <motion.div 
            className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-purple-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-400/30">
                <span className="text-2xl text-purple-400">⭐</span>
              </div>
              <span className="text-sm text-yellow-400 font-semibold">Excellent</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Rating</h3>
            <p className="text-3xl font-bold text-white">{stats.rating}</p>
            <p className="text-gray-500 text-sm">customer rating</p>
          </motion.div>
        </div>

        {/* Driver Summary - Right Corner Stack */}
        <motion.div 
          className="fixed top-20 right-4 bg-black/30 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-cyan-500/30 z-10"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-center mb-3">
            <h3 className="text-cyan-400 font-bold text-sm">DRIVER SUMMARY</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Distance:</span>
              <span className="text-white font-semibold">{totalKm} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Time:</span>
              <span className="text-white font-semibold">{formatTime(totalTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Break:</span>
              <span className="text-yellow-400 font-semibold">{formatBreakTime(breakTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`font-semibold ${getStatusNeonColor(driverStatus)}`}>{getStatusText(driverStatus)}</span>
            </div>
          </div>
        </motion.div>

        {/* Orders Management - Glassmorphism */}
        <motion.div 
          className="bg-black/20 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-cyan-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">⚡ Order Management</h2>
              <p className="text-gray-400">Neural ride processing interface</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
              <span className="text-sm text-gray-400">Live updates</span>
            </div>
          </div>

          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-400/30">
                  <span className="text-3xl text-cyan-400">🚗</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No active orders</h3>
                <p className="text-gray-400">New ride requests will appear here</p>
              </div>
            ) : (
              <AnimatePresence>
                {bookings.map((booking, index) => (
                  <motion.div 
                    key={booking.id} 
                    className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-400/30">
                          <span className="text-xl text-cyan-400">👤</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-lg">
                            {booking.customer?.first_name} {booking.customer?.last_name}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            📞 {booking.customer?.phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30' :
                          booking.status === 'accepted' ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30' :
                          booking.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-400/30' :
                          'bg-red-500/20 text-red-400 border border-red-400/30'
                        }`}>
                          {booking.status.toUpperCase()}
                        </span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">
                            {booking.actual_price || booking.estimated_price} zł
                          </div>
                          <div className="text-sm text-gray-500">estimated</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mt-1 border border-green-400/30">
                          <span className="text-green-400 text-sm">📍</span>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm font-medium">Pickup Location</p>
                          <p className="text-white font-semibold">{booking.pickup_address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center mt-1 border border-red-400/30">
                          <span className="text-red-400 text-sm">🎯</span>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm font-medium">Destination</p>
                          <p className="text-white font-semibold">{booking.destination_address}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      {booking.status === 'pending' && (
                        <>
                          <motion.button
                            onClick={() => acceptOrder(booking.id)}
                            className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-semibold transition-all duration-200 border border-green-400/30 hover:border-green-400/50 shadow-lg hover:shadow-green-500/25"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            ✅ POTWIERDŹ
                          </motion.button>
                          <motion.button
                            onClick={() => rejectOrder(booking.id)}
                            className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-semibold transition-all duration-200 border border-red-400/30 hover:border-red-400/50 shadow-lg hover:shadow-red-500/25"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            ❌ ODRZUĆ
                          </motion.button>
                        </>
                      )}
                      {booking.status === 'accepted' && (
                        <motion.button
                          onClick={() => completeBooking(booking.id)}
                          className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl font-semibold transition-all duration-200 border border-blue-400/30 hover:border-blue-400/50 shadow-lg hover:shadow-blue-500/25"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          🏁 UKOŃCZ KURS
                        </motion.button>
                      )}
                      <motion.button
                        onClick={() => {/* Show details */}}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-semibold transition-all duration-200 border border-white/10 hover:border-white/20"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        📋 SZCZEGÓŁY
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
