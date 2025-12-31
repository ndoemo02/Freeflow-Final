import React from 'react';

// RideTab Component
export default function RideTab({ rideForm, setRideForm, bookingRide, bookRide, calculatePrice, taxiCorporations, loadingCorporations }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">🚗 Zamów przejazd</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Miejsce odbioru *
            </label>
            <input
              type="text"
              value={rideForm.pickupAddress}
              onChange={(e) => setRideForm(prev => ({ ...prev, pickupAddress: e.target.value }))}
              placeholder="Wprowadź adres odbioru"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Miejsce docelowe *
            </label>
            <input
              type="text"
              value={rideForm.destinationAddress}
              onChange={(e) => setRideForm(prev => ({ ...prev, destinationAddress: e.target.value }))}
              placeholder="Wprowadź adres docelowy"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Korporacja Taxi *
            </label>
            {loadingCorporations ? (
              <div className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-slate-400">
                Ładowanie korporacji...
              </div>
            ) : (
              <select
                value={rideForm.taxiCorporation}
                onChange={(e) => setRideForm(prev => ({ ...prev, taxiCorporation: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Wybierz korporację taxi</option>
                {taxiCorporations.map(corp => (
                  <option 
                    key={corp.id} 
                    value={corp.id}
                    disabled={!corp.available}
                    className={!corp.available ? 'text-gray-500' : 'text-white'}
                  >
                    {corp.name} {!corp.available ? '(Niedostępna)' : `- ${corp.price} - ⭐${corp.rating}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Szacowana cena
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={rideForm.estimatedPrice}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                />
                <button
                  onClick={calculatePrice}
                  className="px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                >
                  Oblicz
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notatki (opcjonalnie)
              </label>
              <input
                type="text"
                value={rideForm.notes}
                onChange={(e) => setRideForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Dodatkowe informacje"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={bookRide}
              disabled={bookingRide || !rideForm.pickupAddress || !rideForm.destinationAddress || !rideForm.taxiCorporation}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {bookingRide ? 'Zamawianie...' : '🚗 Zamów przejazd'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
