import React, { useEffect, useState } from "react";

export default function LiveSessionPopup({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/debug/session");
        if (res.ok) {
          const sessionData = await res.json();
          setData(sessionData);
        }
      } catch (error) {
        console.warn("Failed to load session data:", error);
      }
    };

    // Initial load
    load();
    
    // Auto-refresh every 1 second
    const timer = setInterval(load, 1000);
    return () => clearInterval(timer);
  }, []);

  const logToServer = async () => {
    if (!data) return;
    
    setLoading(true);
    try {
      await fetch("/api/debug/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      });
      console.log("✅ Session logged to server");
    } catch (error) {
      console.error("❌ Failed to log session:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="absolute left-2 bottom-24 bg-black/60 text-white p-3 rounded-lg text-xs shadow-lg">
        <p>🔄 Ładowanie sesji...</p>
      </div>
    );
  }

  return (
    <div className="absolute left-2 bottom-24 bg-black/60 text-white p-3 rounded-lg text-xs shadow-lg backdrop-blur-sm border border-white/20">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-1 right-1 text-gray-300 hover:text-white text-lg"
          title="Zamknij"
        >
          ×
        </button>
      )}
      
      <div className="space-y-1">
        <p><span className="text-blue-300">🧠</span> Intent: <span className="font-mono">{data.intent || "none"}</span></p>
        <p><span className="text-green-300">🍽️</span> Restaurant: <span className="font-mono">{data.restaurant || "brak"}</span></p>
        <p><span className="text-purple-300">🧩</span> Session: <span className="font-mono">{data.sessionId || "brak"}</span></p>
        <p><span className="text-yellow-300">💬</span> Confidence: <span className="font-mono">{data.confidence || "0.00"}</span></p>
      </div>
      
      <button
        onClick={logToServer}
        disabled={loading}
        className="mt-2 px-2 py-1 text-[10px] bg-white/20 rounded hover:bg-white/30 disabled:opacity-50 transition-colors"
      >
        {loading ? "⏳" : "📋"} Log to Server
      </button>
      
      <div className="mt-1 text-[10px] text-gray-300">
        Auto-refresh: 1s
      </div>
    </div>
  );
}
