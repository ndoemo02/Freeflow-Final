import React, { useState } from 'react';

/**
 * ConversationDebugView
 * 
 * Displays the voice dialog pipeline for debugging:
 * Raw Input → Normalized → Intent → FSM State → Surface → Phrase → TTS Chunks
 * 
 * Read-only, no mutations.
 */
export default function ConversationDebugView({ event, expanded = false }) {
    const [isExpanded, setIsExpanded] = useState(expanded);

    if (!event) return null;

    // Extract pipeline data from event
    const {
        raw_input,
        normalized_input,
        intent,
        intent_confidence,
        intent_source,
        fsm_state,
        fsm_transition,
        surface_key,
        surface_facts,
        phrase_output,
        phrase_from_llm,
        tts_chunks,
        response_text,
        timestamp,
        timings
    } = event;

    // Format timestamp
    const formattedTime = timestamp
        ? new Date(timestamp).toLocaleTimeString('pl-PL')
        : '—';

    // Confidence badge color
    const confidenceColor = !intent_confidence
        ? 'bg-gray-600'
        : intent_confidence >= 0.8
            ? 'bg-green-600'
            : intent_confidence >= 0.5
                ? 'bg-yellow-600'
                : 'bg-red-600';

    // Pipeline stages
    const stages = [
        {
            label: 'Raw Input',
            value: raw_input || '—',
            icon: '🎤'
        },
        {
            label: 'Normalized',
            value: normalized_input || raw_input || '—',
            icon: '📝',
            show: normalized_input && normalized_input !== raw_input
        },
        {
            label: 'Intent',
            value: intent || 'unknown',
            badge: intent_confidence ? `${(intent_confidence * 100).toFixed(0)}%` : null,
            badgeColor: confidenceColor,
            subtext: intent_source ? `source: ${intent_source}` : null,
            icon: '🧠'
        },
        {
            label: 'FSM State',
            value: fsm_state || '—',
            subtext: fsm_transition ? `→ ${fsm_transition}` : null,
            icon: '⚙️'
        },
        {
            label: 'Surface',
            value: surface_key || '—',
            icon: '📋'
        },
        {
            label: 'Phrase',
            value: phrase_output || response_text || '—',
            badge: phrase_from_llm ? 'LLM' : 'Template',
            badgeColor: phrase_from_llm ? 'bg-purple-600' : 'bg-blue-600',
            icon: '💬'
        }
    ];

    // TTS chunks display
    const chunks = tts_chunks || [];

    return (
        <div className="border border-[var(--ff-stroke)] rounded-lg overflow-hidden bg-[rgba(0,0,0,0.2)]">
            {/* Header - always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-[var(--ff-text-2)] text-xs">{formattedTime}</span>
                    <span className="font-mono text-sm text-[var(--ff-text-1)]">{intent || 'unknown'}</span>
                    {intent_confidence && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceColor} text-white`}>
                            {(intent_confidence * 100).toFixed(0)}%
                        </span>
                    )}
                    {surface_key && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[rgba(255,255,255,0.1)] text-[var(--ff-text-2)]">
                            {surface_key}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {timings?.durationMs && (
                        <span className="text-xs text-[var(--ff-text-2)]">
                            {timings.durationMs}ms
                        </span>
                    )}
                    <span className="text-[var(--ff-text-2)]">
                        {isExpanded ? '▼' : '▶'}
                    </span>
                </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                    {/* Pipeline visualization */}
                    <div className="grid gap-2">
                        {stages
                            .filter(s => s.show !== false)
                            .map((stage, idx) => (
                                <div
                                    key={stage.label}
                                    className="flex items-start gap-3 p-2 rounded bg-[rgba(255,255,255,0.03)]"
                                >
                                    <span className="w-6 text-center">{stage.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-[var(--ff-text-2)] uppercase tracking-wider">
                                                {stage.label}
                                            </span>
                                            {stage.badge && (
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${stage.badgeColor} text-white`}>
                                                    {stage.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--ff-text-1)] break-words mt-0.5">
                                            {stage.value}
                                        </p>
                                        {stage.subtext && (
                                            <p className="text-xs text-[var(--ff-text-2)] mt-0.5">
                                                {stage.subtext}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Surface facts */}
                    {surface_facts && Object.keys(surface_facts).length > 0 && (
                        <div className="p-2 rounded bg-[rgba(255,255,255,0.03)]">
                            <span className="text-xs text-[var(--ff-text-2)] uppercase tracking-wider">
                                Surface Facts
                            </span>
                            <pre className="text-xs text-[var(--ff-text-1)] mt-1 overflow-x-auto">
                                {JSON.stringify(surface_facts, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* TTS Chunks */}
                    {chunks.length > 0 && (
                        <div className="p-2 rounded bg-[rgba(255,255,255,0.03)]">
                            <span className="text-xs text-[var(--ff-text-2)] uppercase tracking-wider">
                                TTS Chunks ({chunks.length})
                            </span>
                            <div className="mt-2 space-y-1">
                                {chunks.map((chunk, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 text-xs"
                                    >
                                        <span className="text-[var(--ff-text-2)] w-6 text-right">{idx + 1}.</span>
                                        <span className="text-[var(--ff-text-1)] flex-1">{chunk.text || chunk}</span>
                                        {chunk.pauseAfter > 0 && (
                                            <span className="text-[var(--ff-text-2)]">+{chunk.pauseAfter}ms</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timings breakdown */}
                    {timings && (
                        <div className="flex gap-4 text-xs text-[var(--ff-text-2)]">
                            {timings.nluMs && <span>NLU: {timings.nluMs}ms</span>}
                            {timings.dbMs && <span>DB: {timings.dbMs}ms</span>}
                            {timings.fsmMs && <span>FSM: {timings.fsmMs}ms</span>}
                            {timings.ttsMs && <span>TTS: {timings.ttsMs}ms</span>}
                            {timings.durationMs && <span className="font-medium">Total: {timings.durationMs}ms</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * ConversationDebugList
 * 
 * Renders a list of conversation events with debug view
 */
export function ConversationDebugList({ events = [], title = "Pipeline Debug" }) {
    if (!events || events.length === 0) {
        return (
            <div className="text-center py-8 text-[var(--ff-text-2)]">
                Brak danych do wyświetlenia
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {title && (
                <h3 className="text-sm font-medium text-[var(--ff-text-1)] mb-3">{title}</h3>
            )}
            {events.map((event, idx) => (
                <ConversationDebugView
                    key={event.id || idx}
                    event={event}
                    expanded={idx === 0} // Expand first by default
                />
            ))}
        </div>
    );
}
