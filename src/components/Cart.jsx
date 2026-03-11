import React, { useState, Fragment, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/auth';
import { useConversationStore } from '../store/useConversationStore';

export default function Cart() {
  const { cart, restaurant: activeRestaurant, total, isOpen, isSubmitting, removeFromCart, updateQuantity, clearCart, submitOrder, setIsOpen } = useCart();

  const restaurantLabel = activeRestaurant
    ? (typeof activeRestaurant === 'object'
      ? (typeof activeRestaurant.name === 'string' ? activeRestaurant.name : JSON.stringify(activeRestaurant.name ?? activeRestaurant))
      : String(activeRestaurant))
    : null;

  const navigate = useNavigate();
  const { user } = useAuth();

  const closeButtonRef = useRef(null);

  const [deliveryInfo, setDeliveryInfo] = useState({
    name: user?.user_metadata?.first_name || '',
    phone: user?.user_metadata?.phone || '',
    address: user?.user_metadata?.address || '',
    notes: ''
  });

  const handleUpdateQuantity = (id, newQty) => {
    updateQuantity(id, newQty);
  };

  const handleRemoveFromCart = (id) => {
    removeFromCart(id);
  };

  const handleClearCart = () => {
    clearCart();
    setIsOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await submitOrder(deliveryInfo);
    if (result) {
      // Order submitted successfully
      useConversationStore.getState().handleOrderSuccess();
      setDeliveryInfo({ name: '', phone: '', address: '', notes: '' });
      // Przejdź do panelu klienta
      navigate('/panel/customer');
    }
  };

  const phase = useConversationStore(state => state.conversationPhase);

  // Zabezpieczenie przed "wiszacym" koszykiem - jeśli użytkownik w 'checkout' zamknie koszyk z palca, nie otwieraj go
  const [closedInCheckout, setClosedInCheckout] = useState(false);

  // Kiedy faza się zmienia na nową (np. wejdziemy w checkout), resetujemy tę blokadę
  React.useEffect(() => {
    if (phase !== 'checkout') {
      setClosedInCheckout(false);
    }
  }, [phase]);

  const isCartVisible = isOpen || (phase === 'checkout' && !closedInCheckout);

  const handleClose = () => {
    setIsOpen(false);
    if (phase === 'checkout') {
      setClosedInCheckout(true);
    }
  };

  return (
    <Transition appear show={isCartVisible} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose} initialFocus={closeButtonRef}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0c0f14]/95 backdrop-blur-xl shadow-[0_0_50px_rgba(0,234,255,0.2)] transition-all">
                {/* Header */}
                <div className="border-b border-white/10 p-6">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-2xl font-bold text-white flex items-center gap-2">
                      🛒 Koszyk
                      {cart.length > 0 && (
                        <span className="text-sm font-normal text-slate-400">
                          ({cart.reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0)} pozycji)
                        </span>
                      )}
                    </Dialog.Title>
                    <button
                      ref={closeButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClose();
                      }}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  {restaurantLabel && (
                    <p className="text-sm text-slate-400 mt-2">
                      🏪 {restaurantLabel}
                    </p>
                  )}
                </div>

                {/* Cart Items */}
                <div className="p-6 max-h-[400px] overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🛒</div>
                      <p className="text-slate-400 text-lg">Koszyk jest pusty</p>
                      <p className="text-slate-500 text-sm mt-2">Dodaj pozycje z menu restauracji</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {cart.map((rawItem, index) => {
                          const item = {
                            id: (rawItem?.id ?? String(index)).toString(),
                            name: typeof rawItem?.name === 'object' ? JSON.stringify(rawItem.name) : (rawItem?.name ?? 'pozycja'),
                            price: Number(rawItem?.price ?? rawItem?.price_pln ?? 0),
                            quantity: Number(rawItem?.quantity ?? rawItem?.qty ?? 1)
                          };
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.05 }}
                              className="rounded-xl border border-cyan-500/20 bg-black/40 p-4 backdrop-blur-xl"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-white font-semibold">{item.name}</h3>
                                  <p className="text-sm text-slate-400">{Number(item.price).toFixed(2)} zł</p>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 bg-black/40 rounded-lg px-2 py-1">
                                    <button
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                      className="text-slate-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
                                    >
                                      −
                                    </button>
                                    <span className="text-white font-semibold w-8 text-center">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                      className="text-slate-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <div className="text-white font-bold min-w-[80px] text-right">
                                    {(Number(item.price) * Number(item.quantity)).toFixed(2)} zł
                                  </div>

                                  <button
                                    onClick={() => handleRemoveFromCart(item.id)}
                                    className="text-red-400 hover:text-red-300 transition-colors ml-2"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Delivery Form & Total */}
                {cart.length > 0 && (
                  <form onSubmit={handleSubmit} className="border-t border-white/10 p-6 space-y-4">
                    {/* Delivery Info */}
                    <div className="space-y-3">
                      <h3 className="text-white font-semibold mb-3">📍 Dane dostawy</h3>

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Imię i nazwisko"
                          value={deliveryInfo.name}
                          onChange={(e) => setDeliveryInfo({ ...deliveryInfo, name: e.target.value })}
                          required
                          className="rounded-lg bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                        />
                        <input
                          type="tel"
                          placeholder="Telefon"
                          value={deliveryInfo.phone}
                          onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
                          required
                          className="rounded-lg bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                        />
                      </div>

                      <input
                        type="text"
                        placeholder="Adres dostawy"
                        value={deliveryInfo.address}
                        onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                        required
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                      />

                      <textarea
                        placeholder="Uwagi do zamówienia (opcjonalnie)"
                        value={deliveryInfo.notes}
                        onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none resize-none"
                      />
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <span className="text-lg text-slate-300">Łącznie:</span>
                      <span className="text-2xl font-bold text-white">{total.toFixed(2)} zł</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleClearCart}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-3 font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        🗑️ Wyczyść koszyk
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          if (!deliveryInfo.name || !deliveryInfo.phone || !deliveryInfo.address) {
                            alert("⚠️ Proszę uzupełnić dane dostawy:\n- Imię i nazwisko\n- Telefon\n- Adres");
                            return;
                          }
                          handleSubmit({ preventDefault: () => { } });
                        }}
                        className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-4 py-3 font-semibold hover:shadow-[0_0_30px_rgba(0,234,255,0.5)] transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? '⏳ Składanie...' : '✓ Złóż zamówienie'}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
