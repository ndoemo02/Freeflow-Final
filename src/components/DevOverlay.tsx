import React, { useState } from 'react';
import { useConversationUIState } from '../hooks/useConversationUIState';
import { useConversationStore } from '../store/useConversationStore';

export default function DevOverlay() {
    const state = useConversationStore();
    const uiFlags = useConversationUIState();
    const [copied, setCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    if (process.env.NODE_ENV !== 'development' && !localStorage.getItem('SHOW_DEV_OVERLAY')) {
        return null;
    }

    const handleCopyFSM = () => {
        const fullState = {
            sessionId: state.sessionId,
            conversationPhase: state.conversationPhase,
            expectedContext: state.expectedContext,
            currentRestaurant: state.currentRestaurant,
            pendingOrder: state.pendingOrder,
            cart: state.cart,
            lastIntent: state.lastIntent,
            lastSource: state.lastSource,
            timestamp: new Date().toISOString()
        };
        navigator.clipboard.writeText(JSON.stringify(fullState, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleCopyDebugSnapshot = () => {
        const fullState = {
            snapshotTime: new Date().toISOString(),
            request: {
                lastUserMessage: state.conversationHistory.filter(h => h.role === 'user').pop()?.content || '',
                latestIntent: state.lastIntent,
                latestSource: state.lastSource,
            },
            response: state.lastFullResponse,
            storeSnapshot: {
                sessionId: state.sessionId,
                conversationPhase: state.conversationPhase,
                expectedContext: state.expectedContext,
                currentRestaurant: state.currentRestaurant,
                pendingOrder: state.pendingOrder,
                cart: state.cart
            }
        };
        navigator.clipboard.writeText(JSON.stringify(fullState, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-20 right-4 z-[9999] bg-black/80 backdrop-blur w-8 h-8 flex items-center justify-center border border-white/20 rounded-full text-green-400 hover:bg-black/90 transition-colors shadow-lg"
                title="Pokaż stan aplikacji (FSM)"
            >
                <i className="fas fa-bug text-sm"></i>
            </button>
        );
    }

    return (
        <div className="fixed top-20 right-4 z-[9999] bg-black/80 backdrop-blur border border-white/20 p-4 rounded-xl text-[10px] font-mono text-green-400 w-80 shadow-2xl">
            <div className="flex justify-between items-center mb-2 border-b border-white/20 pb-1">
                <h3 className="text-white font-bold flex items-center gap-2">
                    🧠 V2 FSM State
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopyDebugSnapshot}
                        className="bg-purple-800 hover:bg-purple-700 text-white/90 px-2 py-0.5 rounded text-[9px] border border-purple-600 transition-colors"
                    >
                        Copy debug snapshot
                    </button>
                    <button
                        onClick={handleCopyFSM}
                        className="bg-gray-800 hover:bg-gray-700 text-white/90 px-2 py-0.5 rounded text-[9px] border border-gray-600 transition-colors"
                    >
                        {copied ? 'Copied!' : 'Copy FSM JSON'}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <div className="space-y-1">
                <p><span className="text-gray-400">Phase:</span> {state.conversationPhase}</p>
                <p><span className="text-gray-400">Context:</span> {state.expectedContext || 'null'}</p>
                <p><span className="text-gray-400">Restaurant:</span> {uiFlags.restaurantName || 'null'}</p>
                <p><span className="text-gray-400">Cart Items:</span> {uiFlags.cartItemsCount}</p>
                <p><span className="text-gray-400">Pending Order:</span> {uiFlags.hasPendingOrder ? 'Yes' : 'No'}</p>
                <p><span className="text-gray-400">Closed:</span> {state.conversationClosed ? 'true' : 'false'}</p>
                <p className="pt-2 mt-2 border-t border-white/20"><span className="text-gray-400">Session:</span> {state.sessionId.slice(0, 12)}...</p>
            </div>

            <h3 className="text-white font-bold mb-1 mt-3 border-b border-white/20 pb-1">🖥️ UI Flags</h3>
            <div className="grid grid-cols-2 gap-1 mt-1 text-blue-300">
                <p>isIdle: <span className={uiFlags.isIdle ? 'text-green-400' : 'text-gray-600'}>{uiFlags.isIdle.toString()}</span></p>
                <p>isOrdering: <span className={uiFlags.isOrdering ? 'text-green-400' : 'text-gray-600'}>{uiFlags.isOrdering.toString()}</span></p>
                <p>isConfirming: <span className={uiFlags.isConfirmingOrder ? 'text-green-400' : 'text-gray-600'}>{uiFlags.isConfirmingOrder.toString()}</span></p>
            </div>
        </div>
    );
}
