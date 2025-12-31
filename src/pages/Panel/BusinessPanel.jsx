import React, { useEffect, useMemo, useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/auth'
import { supabase } from '../../lib/supabase'
import { Dialog, Transition } from '@headlessui/react'
import PanelHeader from '../../components/PanelHeader'

export default function BusinessPanel(){
  const { user } = useAuth()
  const navigate = useNavigate()

  const [restaurants, setRestaurants] = useState([])
  const [restaurantId, setRestaurantId] = useState('')
  const [loadingRests, setLoadingRests] = useState(false)

  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [busyAdd, setBusyAdd] = useState(false)
  const [err, setErr] = useState('')

  // create restaurant modal
  const [createOpen, setCreateOpen] = useState(false)
  const [restName, setRestName] = useState('')
  const [restCity, setRestCity] = useState('')
  const [busyCreate, setBusyCreate] = useState(false)

  // delete restaurant modal
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [restaurantToDelete, setRestaurantToDelete] = useState(null)
  const [busyDelete, setBusyDelete] = useState(false)

  // order details modal
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!user?.id) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Load restaurants (temporarily show all restaurants for testing)
  useEffect(() => {
    if (!user?.id) { setRestaurants([]); setRestaurantId(''); return }
    let alive = true
    const load = async () => {
      setLoadingRests(true)
      
      // For now, get all restaurants since we don't have owner_id column
      // TODO: Add owner_id column to restaurants table or implement proper ownership
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('id,name')
        .order('name')
        .limit(10) // Limit to first 10 restaurants for testing
      
      if (!alive) return
      if (restaurantsError) {
        console.error('Restaurants error:', restaurantsError)
        setRestaurants([])
      } else {
        setRestaurants(restaurants || [])
        if ((restaurants?.length || 0) > 0 && !restaurantId) setRestaurantId(restaurants[0].id)
      }
      
      setLoadingRests(false)
    }
    load()
    return () => { alive = false }
  }, [user?.id])

  // Handle Escape key to close panel
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        sessionStorage.setItem('skipIntro', 'true');
        navigate('/')
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [navigate])

  // Load menu items for restaurant
  useEffect(() => {
    if (!restaurantId) { setItems([]); return }
    let alive = true
    const load = async () => {
      setLoadingItems(true)
      const { data, error } = await supabase
        .from('menu_items')
        .select('id,name,price')
        .eq('restaurant_id', restaurantId)
        .order('name')
      if (!alive) return
      setItems(error ? [] : (data || []))
      setLoadingItems(false)
    }
    load()
    return () => { alive = false }
  }, [restaurantId])

  // Load orders via backend API
  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!restaurantId) { setOrders([]); return }
      setLoadingOrders(true)
      
      try {
        const response = await fetch(`/api/orders?restaurant_id=${restaurantId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!alive) return
        setOrders(data.orders || [])
      } catch (error) {
        console.error('Error loading orders:', error);
        if (!alive) return
        setOrders([])
      } finally {
        setLoadingOrders(false)
      }
    }
    load()
    
    // Polling every 5 seconds for real-time updates
    const interval = setInterval(load, 5000)
    
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [restaurantId])

  const addItem = async () => {
    try {
      setBusyAdd(true); setErr('')
      const price = parseFloat(String(newPrice).replace(',', '.'))
      if (!newName || isNaN(price)) throw new Error('Podaj nazwę i cenę')
      const { error } = await supabase.from('menu_items').insert({ 
        restaurant_id: restaurantId, 
        name: newName, 
        price: price,
        description: 'Dodane przez właściciela'
      })
      if (error) throw error
      setNewName(''); setNewPrice(''); setAddOpen(false)
      // refresh
      const { data } = await supabase
        .from('menu_items')
        .select('id,name,price')
        .eq('restaurant_id', restaurantId)
        .order('name')
      setItems(data || [])
    } catch(e) { setErr(e.message || 'Błąd dodawania') } finally { setBusyAdd(false) }
  }

  const deleteRestaurant = async () => {
    if (!restaurantToDelete) return
    try {
      setBusyDelete(true); setErr('')
      // Delete menu items first (cascade should handle this, but let's be safe)
      await supabase.from('menu_items').delete().eq('restaurant_id', restaurantToDelete.id)
      // Delete restaurant
      const { error } = await supabase.from('restaurants').delete().eq('id', restaurantToDelete.id)
      if (error) throw error
      
      // Refresh restaurants list
      const { data: restaurantsData } = await supabase
        .from('restaurants')
        .select('id,name')
        .eq('owner_id', user.id)
        .order('name')
      setRestaurants(restaurantsData || [])
      
      // Select first restaurant or clear selection
      if (restaurantsData?.length > 0) {
        setRestaurantId(restaurantsData[0].id)
      } else {
        setRestaurantId('')
      }
      
      setDeleteOpen(false)
      setRestaurantToDelete(null)
    } catch(e) { setErr(e.message) }
    finally { setBusyDelete(false) }
  }

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Use backend API to update order status
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh orders via backend API
      const ordersResponse = await fetch(`/api/orders?restaurant_id=${restaurantId}`);
      if (ordersResponse.ok) {
        const data = await ordersResponse.json();
        setOrders(data.orders || []);
      }
      
    } catch(e) {
      console.error('Error updating order status:', e)
    }
  }

	// derived quick stats
	const stats = useMemo(() => ({
		restaurants: restaurants.length,
		items: items.length,
		openOrders: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
		totalOrders: orders.length, // Dodaj łączną liczbę zamówień
	}), [restaurants, items, orders])

	return (
		<Fragment>
			<div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] px-4 py-8">
				<div className="mx-auto max-w-6xl">
				<PanelHeader 
					title="Panel Biznesowy" 
					subtitle="Zarządzaj lokalem, menu i zamówieniami"
				/>

				{/* Quick stats */}
				<div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div className="rounded-xl border border-brand-500/30 bg-gradient-to-br from-brand-500/25 to-brand-500/10 backdrop-blur-xs p-6">
						<div className="text-sm text-slate-300">Restauracje</div>
						<div className="text-2xl font-bold text-white">{stats.restaurants}</div>
					</div>
					<div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/25 to-emerald-500/10 backdrop-blur-xs p-6">
						<div className="text-sm text-slate-300">Pozycje w menu</div>
						<div className="text-2xl font-bold text-white">{stats.items}</div>
					</div>
					<div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/25 to-purple-500/10 backdrop-blur-xs p-6">
						<div className="text-sm text-slate-300">Wszystkich zamówień</div>
						<div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
					</div>
				</div>

				{/* Restaurants select */}
				<div className="mb-6 rounded-2xl border border-white/10 bg-glass p-6">
					<label className="block text-sm text-gray-300 mb-2">Restauracja</label>
					<select className="w-full rounded-xl bg-gray-800 text-white border border-white/10 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={restaurantId} onChange={(e)=>setRestaurantId(e.target.value)}>
						{loadingRests && <option className="bg-gray-800 text-white">Ładowanie…</option>}
						{!loadingRests && restaurants.length === 0 && <option value="" className="bg-gray-800 text-white">(brak restauracji)</option>}
						{restaurants.map(r => <option key={r.id} value={r.id} className="bg-gray-800 text-white">{r.name}</option>)}
					</select>
					<div className="mt-3 flex gap-2">
						<button className="px-3 py-2 rounded-md bg-white/10 text-white border border-white/10" onClick={()=>setCreateOpen(true)}>+ Dodaj restaurację</button>
						{restaurantId && (
							<button 
								className="px-3 py-2 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" 
								onClick={() => {
									const restaurant = restaurants.find(r => r.id === restaurantId)
									if (restaurant) {
										setRestaurantToDelete(restaurant)
										setDeleteOpen(true)
									}
								}}
							>
								🗑️ Usuń restaurację
							</button>
						)}
					</div>
				</div>

				{/* Menu items */}
				<div className="rounded-2xl border border-white/10 bg-glass p-6 mb-6">
					<div className="flex items-center justify-between mb-3">
						<div className="text-white font-semibold">Twoje menu</div>
						<button className="px-3 py-2 rounded-md bg-brand-500 text-white" onClick={()=>setAddOpen(true)} disabled={!restaurantId}>Dodaj pozycję</button>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm text-gray-200">
							<thead className="text-left text-gray-300">
								<tr>
									<th className="py-2">Nazwa</th>
									<th className="py-2">Cena</th>
								</tr>
							</thead>
							<tbody>
								{loadingItems && <tr><td className="py-2" colSpan={2}>Ładowanie…</td></tr>}
								{!loadingItems && items.length === 0 && <tr><td className="py-2" colSpan={2}>Brak pozycji.</td></tr>}
								{!loadingItems && items.map(it => (
									<tr key={it.id} className="border-t border-white/10">
										<td className="py-2">{it.name}</td>
										<td className="py-2">{Number(it.price).toFixed(2)} zł</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Orders */}
				<div className="rounded-2xl border border-white/10 bg-glass p-6">
					<div className="text-white font-semibold mb-3">Zamówienia klientów</div>
					{loadingOrders && <div className="text-gray-300">Ładowanie…</div>}
					{!loadingOrders && orders.length === 0 && <div className="text-gray-300">Brak zamówień.</div>}
					<ul className="space-y-2">
						{orders.map(o => (
							<li key={o.id} className="rounded-lg border border-white/10 p-3">
								<div className="flex items-center justify-between mb-2">
									<div
										className="flex-1 cursor-pointer hover:bg-white/5 transition-colors rounded p-1"
										onClick={() => {
											setSelectedOrder(o)
											setOrderDetailsOpen(true)
										}}
									>
										<div className="text-white font-medium">
											{o.customer_name || `Klient #${o.user_id?.substring(0, 8)}` || 'Nieznany'}
										</div>
										<div className="text-gray-300 text-sm">
											<span className="text-blue-400 font-medium">📍 Zamówienie #{o.id.substring(0, 8)}</span>
											<span className="ml-2">{o.status} • {((o.total_price ?? 0) / 100).toFixed(2)} zł</span>
										</div>
										{o.items && Array.isArray(o.items) && o.items.length > 0 && (
											<div className="text-xs text-slate-400 mt-1">
												{o.items.map((item, idx) => (
													<span key={idx}>
														{item.quantity}x {item.name}
														{idx < o.items.length - 1 ? ', ' : ''}
													</span>
												))}
											</div>
										)}
									</div>
									<div className="text-gray-300 text-xs">{new Date(o.created_at).toLocaleString()}</div>
								</div>
								
								{/* Action buttons based on status */}
								<div className="flex gap-2">
									{o.status === 'pending' && (
										<>
											<button
												onClick={() => updateOrderStatus(o.id, 'preparing')}
												className="px-3 py-1 rounded-md bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 text-sm"
											>
												✓ Zatwierdź zamówienie
											</button>
											<button
												onClick={() => updateOrderStatus(o.id, 'cancelled')}
												className="px-3 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-sm"
											>
												✗ Odrzuć
											</button>
										</>
									)}
									{o.status === 'preparing' && (
										<button
											onClick={() => updateOrderStatus(o.id, 'completed')}
											className="px-3 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 text-sm"
										>
											✓ Przyjmij do realizacji
										</button>
									)}
									{o.status === 'completed' && (
										<button
											onClick={() => updateOrderStatus(o.id, 'delivered')}
											className="px-3 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 text-sm"
										>
											🚚 Gotowe do odbioru
										</button>
									)}
									{(o.status === 'cancelled' || o.status === 'delivered') && (
										<span className="px-3 py-1 rounded-md bg-gray-500/20 text-gray-400 border border-gray-500/30 text-sm">
											{o.status === 'cancelled' ? 'Anulowane' : 'Dostarczone'}
										</span>
									)}
								</div>
							</li>
						))}
					</ul>
				</div>

				</div>
			</div>

			{/* Add item modal (rendered outside main layout) */}
	      <Transition appear show={addOpen} as={Fragment}>
	        <Dialog as="div" className="relative z-[60]" onClose={()=>setAddOpen(false)}>
	          <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
	            <div className="fixed inset-0 bg-black/60" />
	          </Transition.Child>
	          <div className="fixed inset-0 overflow-y-auto">
	            <div className="flex min-h-full items-center justify-center p-4 text-center">
	              <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
	                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f14]/90 p-6 text-left align-middle shadow-soft-3xl backdrop-blur-xs">
	                  <Dialog.Title className="text-lg font-bold text-white mb-3">Dodaj pozycję</Dialog.Title>
	                  {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
	                  <label className="block text-sm text-gray-300">Nazwa</label>
	                  <input className="w-full p-3 mb-3 rounded-md bg-white/5 text-white border border-white/10" value={newName} onChange={(e)=>setNewName(e.target.value)} />
	                  <label className="block text-sm text-gray-300">Cena (PLN)</label>
	                  <input className="w-full p-3 mb-4 rounded-md bg-white/5 text-white border border-white/10" value={newPrice} onChange={(e)=>setNewPrice(e.target.value)} />
	                  <div className="flex gap-2 justify-end">
	                    <button className="px-3 py-2 rounded-md bg-white/10" onClick={()=>setAddOpen(false)}>Anuluj</button>
	                    <button disabled={busyAdd} className="px-3 py-2 rounded-md bg-brand-500 text-white" onClick={addItem}>{busyAdd ? '...' : 'Dodaj'}</button>
	                  </div>
	                </Dialog.Panel>
	              </Transition.Child>
	            </div>
	          </div>
	        </Dialog>
	      </Transition>

	      {/* Create restaurant modal */}
	      <Transition appear show={createOpen} as={Fragment}>
	        <Dialog as="div" className="relative z-[60]" onClose={()=>setCreateOpen(false)}>
	          <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
	            <div className="fixed inset-0 bg-black/60" />
	          </Transition.Child>
	          <div className="fixed inset-0 overflow-y-auto">
	            <div className="flex min-h-full items-center justify-center p-4 text-center">
	              <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
	                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f14]/90 p-6 text-left align-middle shadow-soft-3xl backdrop-blur-xs">
	                  <Dialog.Title className="text-lg font-bold text-white mb-3">Nowa restauracja</Dialog.Title>
	                  <label className="block text-sm text-gray-300">Nazwa</label>
	                  <input className="w-full p-3 mb-3 rounded-md bg-white/5 text-white border border-white/10" value={restName} onChange={(e)=>setRestName(e.target.value)} />
	                  <label className="block text-sm text-gray-300">Miasto</label>
	                  <input className="w-full p-3 mb-4 rounded-md bg-white/5 text-white border border-white/10" value={restCity} onChange={(e)=>setRestCity(e.target.value)} />
	                  <div className="flex gap-2 justify-end">
	                    <button className="px-3 py-2 rounded-md bg-white/10" onClick={()=>setCreateOpen(false)}>Anuluj</button>
                    <button disabled={busyCreate} className="px-3 py-2 rounded-md bg-brand-500 text-white" onClick={async()=>{
	                      if(!restName){ return }
	                      try{
	                        setBusyCreate(true)
                        let data = null; let error = null
                        // try old schema (owner)
                        {
                          const res = await supabase
                            .from('restaurants')
                            .insert({ name: restName, city: restCity || null, owner: user?.id })
                            .select('id,name')
                          data = res.data; error = res.error
                        }
                        if(error){
                          // fallback: owner_id
                          const res2 = await supabase
                            .from('restaurants')
                            .insert({ name: restName, city: restCity || null, owner_id: user?.id })
                            .select('id,name')
                          data = res2.data; error = res2.error
                          if(error) throw error
                        }
	                        // refresh list & select new
                        const { data: list } = await supabase
	                          .from('restaurants')
                          .select('id,name')
                          .or(`owner.eq.${user?.id},owner_id.eq.${user?.id}`)
	                          .order('name')
	                        setRestaurants(list || [])
	                        const createdId = data?.[0]?.id
	                        if(createdId) setRestaurantId(createdId)
	                        setCreateOpen(false)
	                        setRestName(''); setRestCity('')
	                      } finally { setBusyCreate(false) }
	                    }}>{busyCreate ? '...' : 'Utwórz'}</button>
	                  </div>
	                </Dialog.Panel>
	              </Transition.Child>
	            </div>
	          </div>
	        </Dialog>
	      </Transition>

	      {/* Delete restaurant modal */}
	      <Transition appear show={deleteOpen} as={Fragment}>
	        <Dialog as="div" className="relative z-[60]" onClose={()=>setDeleteOpen(false)}>
	          <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
	            <div className="fixed inset-0 bg-black/60" />
	          </Transition.Child>
	          <div className="fixed inset-0 overflow-y-auto">
	            <div className="flex min-h-full items-center justify-center p-4 text-center">
	              <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
	                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f14]/90 p-6 text-left align-middle shadow-soft-3xl backdrop-blur-xs">
	                  <Dialog.Title className="text-lg font-bold text-white mb-3">Usuń restaurację</Dialog.Title>
	                  {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
	                  <p className="text-gray-300 mb-4">
	                    Czy na pewno chcesz usunąć restaurację <strong className="text-white">{restaurantToDelete?.name}</strong>?
	                    <br />
	                    <span className="text-red-400 text-sm">Ta operacja usunie również wszystkie pozycje menu i nie może być cofnięta.</span>
	                  </p>
	                  <div className="flex gap-2 justify-end">
	                    <button className="px-3 py-2 rounded-md bg-white/10" onClick={()=>setDeleteOpen(false)}>Anuluj</button>
	                    <button disabled={busyDelete} className="px-3 py-2 rounded-md bg-red-500 text-white" onClick={deleteRestaurant}>
	                      {busyDelete ? '...' : 'Usuń'}
	                    </button>
	                  </div>
	                </Dialog.Panel>
	              </Transition.Child>
	            </div>
	          </div>
	        </Dialog>
	      </Transition>

	      {/* Order Details Modal */}
	      <Transition appear show={orderDetailsOpen} as={Fragment}>
	        <Dialog as="div" className="relative z-[60]" onClose={()=>setOrderDetailsOpen(false)}>
	          <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
	            <div className="fixed inset-0 bg-black/60" />
	          </Transition.Child>
	          <div className="fixed inset-0 overflow-y-auto">
	            <div className="flex min-h-full items-center justify-center p-4 text-center">
	              <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
	                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f14]/90 p-6 text-left align-middle shadow-soft-3xl backdrop-blur-xs">
	                  <Dialog.Title className="text-lg font-bold text-white mb-3">Szczegóły zamówienia</Dialog.Title>
	                  {selectedOrder && (
	                    <div className="space-y-4">
	                      <div>
	                        <label className="text-sm text-gray-300">ID Zamówienia:</label>
	                        <p className="text-white font-mono text-sm bg-gray-800 px-2 py-1 rounded">{selectedOrder.id}</p>
	                      </div>
	                      <div>
	                        <label className="text-sm text-gray-300">Klient:</label>
	                        <p className="text-white font-semibold">
							{selectedOrder.customer_name || 'Klient'}
						</p>
						<div className="mt-2 space-y-1 text-sm">
							{selectedOrder.customer_phone && (
								<p className="text-gray-300">📞 {selectedOrder.customer_phone}</p>
							)}
							{selectedOrder.delivery_address && (
								<p className="text-gray-300">📍 {selectedOrder.delivery_address}</p>
							)}
							{selectedOrder.notes && (
								<p className="text-gray-300">💬 {selectedOrder.notes}</p>
							)}
						</div>
	                      </div>
	                      {selectedOrder.restaurants?.name && (
	                        <div>
	                          <label className="text-sm text-gray-300">Restauracja:</label>
	                          <p className="text-white">📍 {selectedOrder.restaurants.name} {selectedOrder.restaurants.city && `(${selectedOrder.restaurants.city})`}</p>
	                        </div>
	                      )}
                      <div>
                        <label className="text-sm text-gray-300">Status:</label>
                        <p className="text-white">
                          {selectedOrder.status === 'pending' && 'Oczekiwanie na zatwierdzenie'}
                          {selectedOrder.status === 'preparing' && 'W realizacji'}
                          {selectedOrder.status === 'completed' && 'Ukończone'}
                          {selectedOrder.status === 'delivered' && 'Zamówienie zrealizowane'}
                          {selectedOrder.status === 'cancelled' && 'Anulowane'}
                          {!['pending', 'preparing', 'completed', 'delivered', 'cancelled'].includes(selectedOrder.status) && selectedOrder.status}
                        </p>
                      </div>
	                      <div>
	                        <label className="text-sm text-gray-300">Data:</label>
	                        <p className="text-white">{new Date(selectedOrder.created_at).toLocaleString('pl-PL')}</p>
	                      </div>
	                      <div>
	                        <label className="text-sm text-gray-300">Kwota:</label>
	                        <p className="text-white">{((selectedOrder.total_price ?? 0) / 100).toFixed(2)} zł</p>
	                      </div>
	                      {selectedOrder.items && (
	                        <div>
	                          <label className="text-sm text-gray-300">Pozycje:</label>
	                          <div className="mt-2 space-y-2">
	                            {typeof selectedOrder.items === 'string' 
								? JSON.parse(selectedOrder.items).map((item, index) => (
									<div key={index} className="flex justify-between text-sm">
										<span className="text-white">{item.name} (x{item.quantity})</span>
										<span className="text-gray-300">{((item.price * item.quantity) / 100).toFixed(2)} zł</span>
									</div>
								))
								: selectedOrder.items.map((item, index) => (
									<div key={index} className="flex justify-between text-sm">
										<span className="text-white">{item.name} (x{item.quantity})</span>
										<span className="text-gray-300">{((item.price * item.quantity) / 100).toFixed(2)} zł</span>
									</div>
								))
							}
	                          </div>
	                        </div>
	                      )}
	                    </div>
	                  )}
	                  <div className="flex gap-2 justify-end mt-6">
	                    <button className="px-3 py-2 rounded-md bg-white/10" onClick={()=>setOrderDetailsOpen(false)}>Zamknij</button>
	                  </div>
	                </Dialog.Panel>
	              </Transition.Child>
	            </div>
	          </div>
	        </Dialog>
	      </Transition>
		</Fragment>
	)
}


