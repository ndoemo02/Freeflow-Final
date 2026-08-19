// Deprecated: use src/lib/supabase.ts singleton instead
export { supabase } from './supabase';

/**
 * Logger konsolowy. Zapis do tabeli `system_logs` zostal usuniety 2026-08-19 —
 * tabela nie istnieje w zadnej z baz, a zakomentowany kod udawal sciezke, ktorej
 * nie ma. Telemetria jakosci ma wlasny model server-side (Quality Lab, pakiet P2:
 * `quality_sessions`, `quality_turns`, `quality_steps`) i nie karmi sie stad.
 */
export const AmberLogger = {
  log: (...args) => {
    console.log("%c[AmberLog]", "color:#f97316;font-weight:bold;", ...args);
  },
  error: (err) => {
    console.error("%c[AmberError]", "color:red;font-weight:bold;", err);
  },
};

/**
 * Tracker kontekstu uzytkownika — dzis wylacznie konsolowy. Zapis do `user_activity`
 * usuniety 2026-08-19 z tego samego powodu co wyzej: tabeli nie ma, a Quality Lab
 * zbiera po swojemu, przez `service_role`, po zgodzie (`user_analysis_consents`).
 */
export const AmberBrain = {
  async track(event, payload = {}) {
    AmberLogger.log("BrainTrack:", event, payload);
  },
};
