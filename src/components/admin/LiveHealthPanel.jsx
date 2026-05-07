import React, { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '../../lib/config';

function cardStyle(warn) {
  return {
    padding: '14px 16px',
    borderRadius: 12,
    background: warn ? 'rgba(255,70,70,0.08)' : 'rgba(255,255,255,0.04)',
    border: warn ? '1px solid rgba(255,70,70,0.3)' : '1px solid var(--border)',
    minWidth: 140,
  };
}

function labelStyle(warn) {
  return { fontSize: 11, color: warn ? '#ff6b6b' : 'var(--fg2)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' };
}

function valueStyle(warn) {
  return { fontSize: 22, fontWeight: 700, color: warn ? '#ff6b6b' : 'var(--fg0)' };
}

function subStyle() {
  return { fontSize: 11, color: 'var(--fg2)', marginTop: 3 };
}

function readLocalCognitiveLoad() {
  try {
    const lastPrompt = parseInt(localStorage.getItem('ff_cognitive_load_prompt_last') || '0', 10);
    const lastPayload = parseInt(localStorage.getItem('ff_cognitive_load_payload_last') || '0', 10);
    const promptHistory = JSON.parse(localStorage.getItem('ff_cognitive_load_prompt') || '[]');
    const payloadHistory = JSON.parse(localStorage.getItem('ff_cognitive_load_payload') || '[]');
    return { lastPromptSize: lastPrompt, lastCompactPayloadSize: lastPayload, promptSizeHistory: promptHistory, payloadSizeHistory: payloadHistory };
  } catch {
    return { lastPromptSize: 0, lastCompactPayloadSize: 0, promptSizeHistory: [], payloadSizeHistory: [] };
  }
}

export default function LiveHealthPanel({ adminToken }) {
  const [health, setHealth] = useState(null);
  const [cognitiveLoad, setCognitiveLoad] = useState(() => readLocalCognitiveLoad());
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetchHealth = async () => {
    try {
      const url = getApiUrl(`/admin/live/health?token=${encodeURIComponent(adminToken)}`);
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) setHealth(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    // Cognitive load z localStorage (aktualizowane przez useGeminiLiveSession w tej samej przeglądarce)
    setCognitiveLoad(readLocalCognitiveLoad());
  };

  useEffect(() => {
    if (!adminToken) return;
    fetchHealth();
    timerRef.current = setInterval(fetchHealth, 10_000);
    return () => clearInterval(timerRef.current);
  }, [adminToken]);

  if (!adminToken) return <div className="text-[var(--fg2)] text-sm p-4">Brak tokena admina.</div>;
  if (error) return <div className="text-red-400 text-sm p-4">Błąd: {error}</div>;
  if (!health) return <div className="text-[var(--fg2)] text-sm p-4">Ładowanie metryk health...</div>;

  const tc = health.truthConsistency || {};
  const cl = cognitiveLoad;
  const meta = health.meta || {};

  const toolSuccessWarn = tc.toolTotalCount > 5 && tc.toolSuccessRate < 90;
  const ivlWarn = tc.ivlTotalCount > 5 && tc.ivlBlockRate > 15;
  const gpsWarn = tc.gpsLocationDropCount > 3;
  const cuisineWarn = tc.cuisineHallucinationCount > 3;
  const cartWarn = tc.cartDesyncCount > 0;
  const promptWarn = cl.lastPromptSize > 4000;
  const payloadWarn = cl.lastCompactPayloadSize > 6000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sekcja 1: Cognitive Load */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg1)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Obciążenie poznawcze (Cognitive Load)
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={cardStyle(promptWarn)}>
            <div style={labelStyle(promptWarn)}>Prompt Size</div>
            <div style={valueStyle(promptWarn)}>
              {cl.lastPromptSize > 0 ? `${(cl.lastPromptSize / 1024).toFixed(1)} KB` : '—'}
            </div>
            <div style={subStyle()}>
              ~{(cl.lastPromptSize / 4).toFixed(0)} tokenów
            </div>
          </div>
          <div style={cardStyle(payloadWarn)}>
            <div style={labelStyle(payloadWarn)}>Compact Payload</div>
            <div style={valueStyle(payloadWarn)}>
              {cl.lastCompactPayloadSize > 0 ? `${(cl.lastCompactPayloadSize / 1024).toFixed(1)} KB` : '—'}
            </div>
            <div style={subStyle()}>ostatni tool response</div>
          </div>
          <div style={cardStyle(false)}>
            <div style={labelStyle(false)}>Historia promptów</div>
            <div style={{ ...valueStyle(false), fontSize: 14 }}>
              {cl.promptSizeHistory?.length || 0} próbek
            </div>
            <div style={subStyle()}>max {Math.max(0, ...(cl.promptSizeHistory || []).map(p => p.size || 0)) > 0 ? `${(Math.max(0, ...(cl.promptSizeHistory || []).map(p => p.size || 0)) / 1024).toFixed(1)} KB` : '—'}</div>
          </div>
          <div style={cardStyle(false)}>
            <div style={labelStyle(false)}>Historia payloadów</div>
            <div style={{ ...valueStyle(false), fontSize: 14 }}>
              {cl.payloadSizeHistory?.length || 0} próbek
            </div>
            <div style={subStyle()}>max {Math.max(0, ...(cl.payloadSizeHistory || []).map(p => p.size || 0)) > 0 ? `${(Math.max(0, ...(cl.payloadSizeHistory || []).map(p => p.size || 0)) / 1024).toFixed(1)} KB` : '—'}</div>
          </div>
        </div>
      </div>

      {/* Sekcja 2: Truth Consistency */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg1)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Spójność prawdy (Truth Consistency)
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={cardStyle(gpsWarn)}>
            <div style={labelStyle(gpsWarn)}>GPS Dropy</div>
            <div style={valueStyle(gpsWarn)}>{tc.gpsLocationDropCount}</div>
            <div style={subStyle()}>halucynowane lokacje odrzucone</div>
          </div>
          <div style={cardStyle(cuisineWarn)}>
            <div style={labelStyle(cuisineWarn)}>Kuchnie Halucynowane</div>
            <div style={valueStyle(cuisineWarn)}>{tc.cuisineHallucinationCount}</div>
            <div style={subStyle()}>kuchnie spoza transkrypcji</div>
          </div>
          <div style={cardStyle(cartWarn)}>
            <div style={labelStyle(cartWarn)}>Desynce Koszyka</div>
            <div style={valueStyle(cartWarn)}>{tc.cartDesyncCount}</div>
            <div style={subStyle()}>{tc.cartSuccessDowngradeCount} success-downgrade</div>
          </div>
          <div style={cardStyle(ivlWarn)}>
            <div style={labelStyle(ivlWarn)}>IVL Block Rate</div>
            <div style={valueStyle(ivlWarn)}>{tc.ivlBlockRate}%</div>
            <div style={subStyle()}>{tc.ivlBlockCount} / {tc.ivlTotalCount} blokad</div>
          </div>
          <div style={cardStyle(toolSuccessWarn)}>
            <div style={labelStyle(toolSuccessWarn)}>Tool Success Rate</div>
            <div style={valueStyle(toolSuccessWarn)}>{tc.toolSuccessRate}%</div>
            <div style={subStyle()}>{tc.toolSuccessCount} / {tc.toolTotalCount} udanych</div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ fontSize: 11, color: 'var(--fg2)', textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        Ostatnia aktualizacja: {meta.lastUpdatedAt ? new Date(meta.lastUpdatedAt).toLocaleTimeString('pl-PL') : '—'}
        {meta.lastSessionId ? ` · sesja: ${meta.lastSessionId.slice(-12)}` : ''}
      </div>
    </div>
  );
}
