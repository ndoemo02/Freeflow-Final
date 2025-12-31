import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Utensils, ShoppingBag, CheckCircle, Trash2 } from 'lucide-react';
import { getApiUrl } from '../../lib/config';

// Konfiguracja etapów rozmowy
const STAGES_CONFIG = [
    { id: 1, label: 'Znajdź restaurację', icon: Search, steps: ['find_nearby', 'show_city_results'] },
    { id: 2, label: 'Pokaż menu', icon: Utensils, steps: ['show_menu'] },
    { id: 3, label: 'Twórz zamówienie', icon: ShoppingBag, steps: ['create_order'] },
    { id: 4, label: 'Potwierdzenie', icon: CheckCircle, steps: ['confirm_order'] }
];

/**
 * Komponent wyświetlający wizualną oś etapów rozmowy
 */
function ConversationStageTimeline({ stage }) {
    return (
        <div className="flex items-center justify-between px-8 py-5 bg-[rgba(255,255,255,0.01)] border-b border-[var(--border)] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--neon)]/5 to-transparent opacity-20 pointer-events-none"></div>
            {STAGES_CONFIG.map((s, i) => {
                const Icon = s.icon;
                const isCompleted = stage >= s.id;
                const isCurrent = stage === s.id;

                return (
                    <React.Fragment key={s.id}>
                        {/* Krok - Kontener */}
                        <div className="flex flex-col items-center gap-2 relative z-10 group">
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.15 : 1,
                                    borderColor: isCompleted ? 'var(--neon)' : 'rgba(255,255,255,0.1)',
                                    backgroundColor: isCompleted ? 'rgba(34, 211, 238, 0.1)' : 'rgba(0,0,0,0.2)'
                                }}
                                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500 shadow-lg ${isCompleted ? 'shadow-[var(--neon)]/10' : ''}`}
                            >
                                <Icon size={18} className={isCompleted ? 'text-[var(--neon)]' : 'text-[var(--muted)]'} />
                            </motion.div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest text-center max-w-[90px] leading-tight transition-colors duration-500 ${isCompleted ? 'text-[var(--fg0)]' : 'text-[var(--muted)]'}`}>
                                {s.label}
                            </span>
                        </div>

                        {/* Łącznik (Linia postępu) */}
                        {i < STAGES_CONFIG.length - 1 && (
                            <div className="flex-1 h-[2px] bg-white/5 mx-2 mb-6 relative overflow-hidden rounded-full">
                                <motion.div
                                    initial={{ x: '-100%' }}
                                    animate={{ x: isCompleted ? '0%' : '-100%' }}
                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-[var(--neon)] shadow-[0_0_8px_var(--neon)] opacity-80"
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default function ConversationViewer({ adminToken }) {
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showTimeline, setShowTimeline] = useState(true);

    const getModel = (c) => {
        let color = 'bg-blue-500';
        if (c.status === 'closed') color = 'bg-green-500';
        else if (c.status === 'error') color = 'bg-red-500';
        else if (c.status === 'timeout') color = 'bg-orange-500';
        else color = 'bg-blue-500'; // active

        let stage = c.calculated_stage || 1;
        // Fallback local heuristic
        if (!c.calculated_stage) {
            if (c.metadata?.lastRestaurant) stage = 2;
            if (c.metadata?.pendingOrder) stage = 3;
            if (c.status === 'closed') stage = 4;
        }

        return { color, stage };
    };

    // ... (rest of logic) ...

    // Load List
    useEffect(() => {
        fetch(getApiUrl('/api/admin/conversations?limit=50'), {
            headers: { 'x-admin-token': adminToken }
        })
            .then(r => r.json())
            .then(json => {
                if (json.ok) setConversations(json.data || []);
            })
            .catch(e => console.error(e));
    }, [adminToken]);

    // Load Details
    useEffect(() => {
        if (!selectedId) return;
        setLoading(true);
        fetch(getApiUrl(`/api/admin/conversation?id=${selectedId}`), {
            headers: { 'x-admin-token': adminToken }
        })
            .then(r => r.json())
            .then(json => {
                if (json.ok) setTimeline(json.data.timeline || []);
                setLoading(false);
            })
            .catch(e => setLoading(false));
    }, [selectedId, adminToken]);

    const refreshList = () => {
        fetch(getApiUrl('/api/admin/conversations?limit=50'), {
            headers: { 'x-admin-token': adminToken }
        })
            .then(r => r.json())
            .then(json => {
                if (json.ok) setConversations(json.data || []);
            });
    }

    const clearLogs = async () => {
        if (!window.confirm('Czy na pewno chcesz usunąć całą historię rozmów? Ta operacja jest nieodwracalna.')) return;

        try {
            setLoading(true);
            const res = await fetch(getApiUrl('/api/admin/conversations'), {
                method: 'DELETE',
                headers: { 'x-admin-token': adminToken }
            });
            const json = await res.json();
            if (json.ok) {
                setConversations([]);
                setSelectedId(null);
                setTimeline([]);
            } else {
                alert('Błąd: ' + json.error);
            }
        } catch (e) {
            console.error(e);
            alert('Wystąpił błąd podczas usuwania.');
        } finally {
            setLoading(false);
        }
    };

    // Znajdź wybraną rozmowę i jej etap
    const selectedConv = useMemo(() => conversations.find(c => c.id === selectedId), [conversations, selectedId]);

    const currentStageValue = useMemo(() => {
        if (!selectedId) return 0;
        // 1. Priorytet: calculated_stage z backendu
        if (selectedConv?.calculated_stage) return selectedConv.calculated_stage;

        // 2. Fallback: spróbuj wyliczyć z timeline (jeśli mamy go wczytanego)
        if (timeline && timeline.length > 0) {
            let max = 0;
            const mapping = { 'find_nearby': 1, 'show_city_results': 1, 'show_menu': 2, 'create_order': 3, 'confirm_order': 4 };
            timeline.forEach(e => {
                const s = mapping[e.workflow_step];
                if (s && s > max) max = s;
            });
            if (max > 0) return max;
        }

        // 3. Ostatni fallback: status rozmowy
        if (selectedConv) {
            if (selectedConv.status === 'closed') return 4;
            if (selectedConv.metadata?.pendingOrder) return 3;
            if (selectedConv.metadata?.lastRestaurant) return 2;
        }

        return 0;
    }, [selectedId, selectedConv, timeline]);

    return (
        <div className="flex flex-col gap-4 fade-in">
            {/* 🕒 TIMELINE TOGGLE & VIEW */}
            <div className="flex justify-end items-center mb-1">
                <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer hover:text-[var(--fg0)]">
                    <input type="checkbox" checked={showTimeline} onChange={(e) => setShowTimeline(e.target.checked)} className="accent-[var(--neon)]" />
                    Show Timeline
                </label>
            </div>

            {showTimeline && (
                <div className="w-full overflow-x-auto pb-4 mb-2 tiny-scroll">
                    <div className="flex items-center gap-6 min-w-max px-2">
                        {conversations.slice(0, 15).map((c, idx) => {
                            const { color, stage } = getModel(c);
                            const isSelected = selectedId === c.id;
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => setSelectedId(c.id)}
                                    className={`relative group cursor-pointer flex flex-col items-center gap-2 transition-all duration-300 ${isSelected ? 'scale-110 opacity-100' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                                >
                                    {/* Line Connector */}
                                    {idx < conversations.slice(0, 15).length - 1 && (
                                        <div className="absolute top-[14px] left-[50%] w-[calc(100%+24px)] h-[2px] bg-[var(--border)] -z-10 opacity-30"></div>
                                    )}

                                    {/* Dot / Status Node */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-colors ${isSelected ? 'border-white' : 'border-transparent'} ${color}`}>
                                        <span className="text-[10px] font-bold text-white">{stage}</span>
                                    </div>

                                    {/* Label */}
                                    <div className="text-center">
                                        <div className="text-[10px] font-mono text-[var(--muted)] font-bold">{new Date(c.created_at || c.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div className="text-[10px] text-[var(--fg0)] max-w-[80px] truncate">{c.metadata?.lastRestaurant?.name || c.id.substring(0, 6)}</div>
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 whitespace-nowrap bg-black/90 text-white text-[10px] px-2 py-1 rounded border border-white/10 pointer-events-none">
                                        Status: {c.status} <br />
                                        ID: {c.id}
                                    </div>
                                </div>
                            )
                        })}
                        {conversations.length === 0 && <div className="text-xs text-[var(--muted)]">Brak historii do wyświetlenia na osi.</div>}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
                {/* List of Conversations */}
                <div className="md:col-span-1 glass border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-[var(--border)] bg-[rgba(255,255,255,0.02)] backdrop-blur-md sticky top-0 font-bold text-sm text-[var(--fg0)] flex justify-between items-center">
                        <span>Ostatnie rozmowy</span>
                        <div className="flex items-center gap-3">
                            <button onClick={clearLogs} className="group flex items-center gap-1 text-[10px] text-red-500 hover:text-red-400 transition-colors">
                                <Trash2 size={12} className="group-hover:scale-110 transition-transform" />
                                <span>Wyczyść</span>
                            </button>
                            <button onClick={refreshList} className="text-[10px] text-[var(--neon)] hover:underline">Odśwież</button>
                        </div>
                    </div>
                    <div className="overflow-auto flex-1 tiny-scroll p-2 space-y-2">
                        {conversations.length === 0 && <div className="text-[var(--muted)] text-center p-4 text-xs">Brak zarejestrowanych rozmów (V2).</div>}
                        {conversations.map(c => (
                            <div key={c.id} onClick={() => setSelectedId(c.id)} className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedId === c.id ? 'bg-[rgba(91,124,255,0.1)] border-[var(--neon)]' : 'border-transparent hover:bg-white/5'}`}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-mono text-[var(--muted)] font-bold" title={c.id}>{c.id.substring(0, 8)}...</span>
                                    <span className="text-[var(--muted)]">{new Date(c.created_at || c.started_at).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className={`text-xs px-2 py-0.5 rounded-full border ${c.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-gray-700 text-gray-500 bg-gray-800'}`}>
                                        {c.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conversation Details Timeline */}
                <div className="md:col-span-2 glass border border-[var(--border)] rounded-xl overflow-hidden flex flex-col relative">
                    <div className="p-3 border-b border-[var(--border)] bg-[rgba(255,255,255,0.02)] backdrop-blur-md sticky top-0 font-bold text-sm text-[var(--fg0)] flex justify-between items-center">
                        {selectedId ? <span className="font-mono text-xs">{selectedId}</span> : <span>Szczegóły rozmowy</span>}
                        {selectedConv?.status && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${selectedConv.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-white/10 text-[var(--muted)]'}`}>
                                {selectedConv.status.toUpperCase()}
                            </span>
                        )}
                    </div>

                    {/* Wizualna oś etapów */}
                    <AnimatePresence mode="wait">
                        {selectedId && (
                            <motion.div
                                key={selectedId}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ConversationStageTimeline stage={currentStageValue} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="overflow-auto flex-1 tiny-scroll p-4 space-y-0 relative">
                        {!selectedId && <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)] text-sm">Wybierz rozmowę z listy po lewej</div>}

                        {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm"><div className="text-[var(--neon)] animate-pulse font-bold">Ładowanie zdarzeń...</div></div>}

                        {selectedId && timeline.map((evt, i) => (
                            <div key={i} className="flex gap-4 relative group">
                                {/* Vertical Line */}
                                <div className="absolute left-[9px] top-3 bottom-0 w-[2px] bg-[var(--border)] group-last:hidden opacity-30"></div>

                                {/* Dot */}
                                <div className={`relative z-10 w-5 h-5 rounded-full border-2 border-[#121214] flex-shrink-0 mt-0.5 shadow-lg
                      ${evt.event_type.includes('request') || evt.event_type.includes('voice') ? 'bg-blue-500' :
                                        evt.event_type.includes('intent') ? 'bg-purple-500' :
                                            evt.event_type.includes('reply') ? 'bg-green-500' : 'bg-gray-500'}`}
                                ></div>

                                <div className="pb-6 flex-1 min-w-0">
                                    <div className="text-xs text-[var(--muted)] mb-1 flex items-center gap-2">
                                        <span className={`uppercase tracking-wider font-bold 
                            ${evt.event_type.includes('intent') ? 'text-purple-400' : 'text-[var(--fg0)]'}
                         `}>{evt.event_type}</span>
                                        <span className="opacity-30">•</span>
                                        <span className="font-mono opacity-50">{new Date(evt.created_at).toLocaleTimeString() + '.' + String(new Date(evt.created_at).getMilliseconds()).padStart(3, '0')}</span>
                                    </div>

                                    {/* Payload Viewer */}
                                    {evt.payload && Object.keys(evt.payload).length > 0 && (
                                        <div className="glass-strong p-3 rounded-lg text-xs font-mono text-[var(--fg0)] border border-[var(--border)] overflow-x-auto shadow-inner bg-black/20">
                                            {evt.event_type === 'intent_processed' ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-purple-300 font-bold border-b border-white/5 pb-1 mb-1">INTENCJA: {evt.payload.intent}</div>
                                                    <div className="text-gray-400">Confidence: <span className="text-white">{evt.payload.confidence}</span></div>
                                                    <div className="text-gray-400">Fallback used: {evt.payload.fallback ? 'YES' : 'NO'}</div>
                                                    <div className="text-green-300 mt-2 border-l-2 border-green-500/50 pl-2 italic">"{evt.payload.reply}"</div>
                                                </div>
                                            ) : evt.event_type === 'request_received' ? (
                                                <div className="text-blue-300">Input: <span className="text-white">"{evt.payload.text}"</span></div>
                                            ) : (
                                                <pre className="whitespace-pre-wrap text-[var(--muted)]">{JSON.stringify(evt.payload, null, 2)}</pre>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {selectedId && timeline.length === 0 && !loading && (
                            <div className="text-center text-[var(--muted)] mt-10">Brak zarejestrowanych zdarzeń w tej sesji.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
