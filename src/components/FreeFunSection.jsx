import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getApiUrl } from "../lib/config"

export default function FreeFunSection() {
  const [city, setCity] = useState("")
  const [category, setCategory] = useState("Wszystkie")
  const [allEvents, setAllEvents] = useState([]) // Wszystkie pobrane wydarzenia
  const [events, setEvents] = useState([]) // Filtrowane wydarzenia
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Funkcja filtrowania po kategorii
  const applyCategoryFilter = (eventsToFilter, selectedCategory) => {
    if (selectedCategory === "Wszystkie") {
      setEvents(eventsToFilter)
      return
    }
    
    const filtered = eventsToFilter.filter((ev) => {
      const titleLower = (ev.title || "").toLowerCase()
      const descLower = (ev.description || "").toLowerCase()
      const categoryLower = selectedCategory.toLowerCase()
      
      // Mapowanie kategorii na słowa kluczowe
      const categoryKeywords = {
        muzyka: ["muzyka", "koncert", "koncerty", "live", "dj", "festival"],
        kino: ["kino", "film", "seans", "premiera", "kino"],
        sport: ["sport", "bieg", "maraton", "zawody", "turniej", "trening"],
        rodzinne: ["rodzinne", "dzieci", "dziecko", "rodzina", "warsztaty"],
        spotkania: ["spotkanie", "spotkania", "meetup", "networking", "dyskusja"],
        inne: []
      }
      
      const keywords = categoryKeywords[categoryLower] || []
      if (keywords.length === 0) return true // "Inne" - wszystkie pozostałe
      
      return keywords.some(keyword => 
        titleLower.includes(keyword) || descLower.includes(keyword)
      )
    })
    
    setEvents(filtered)
  }

  const fetchEvents = async () => {
    setLoading(true)
    setError("")
    try {
      const query = new URLSearchParams()
      if (city) query.append("city", city)
      
      const apiUrl = getApiUrl(`/api/freefun/list?${query.toString()}`)
      const res = await fetch(apiUrl)
      const data = await res.json()
      
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      
      const fetchedEvents = data.data || []
      setAllEvents(fetchedEvents)
      
      // Zastosuj filtrowanie kategorii
      applyCategoryFilter(fetchedEvents, category)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd podczas pobierania wydarzeń")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // Automatyczne filtrowanie przy zmianie kategorii
  useEffect(() => {
    if (allEvents.length > 0) {
      applyCategoryFilter(allEvents, category)
    }
  }, [category])

  const categories = ["Wszystkie", "Muzyka", "Kino", "Sport", "Rodzinne", "Spotkania", "Inne"]

  return (
    <div className="w-full max-w-5xl mx-auto p-6 text-white">
      <h2 className="text-2xl font-bold mb-4 text-indigo-400 flex items-center gap-2">
        🌆 FreeFun — Darmowe wydarzenia w okolicy
      </h2>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Miasto..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && fetchEvents()}
          className="bg-neutral-900 border border-neutral-700 p-2 rounded-lg text-sm flex-1 min-w-[160px] text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 p-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {loading ? "Ładowanie..." : "Szukaj"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      <AnimatePresence>
        {loading ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-neutral-400 animate-pulse"
          >
            Amber szuka wydarzeń...
          </motion.p>
        ) : events.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-neutral-500 italic"
          >
            Brak wydarzeń w tej lokalizacji.
          </motion.p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 hover:border-indigo-500 transition-all duration-300 hover:shadow-[0_0_10px_rgba(99,102,241,0.5)] rounded-lg overflow-hidden">
                  <div className="p-4 space-y-2">
                    <h3 className="text-lg font-semibold text-indigo-300">{ev.title}</h3>
                    <p className="text-sm text-neutral-300 line-clamp-3">{ev.description}</p>
                    <p className="text-xs text-neutral-500">
                      🗓️ {new Date(ev.date).toLocaleString("pl-PL", {
                        weekday: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                    <p className="text-xs text-neutral-400">
                      📍 {ev.city} {ev.location ? `• ${ev.location}` : ""}
                    </p>
                    {ev.link && (
                      <a
                        href={ev.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-indigo-400 hover:underline"
                      >
                        🔗 Zobacz szczegóły
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

