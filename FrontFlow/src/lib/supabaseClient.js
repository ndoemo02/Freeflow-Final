// Deprecated: use src/lib/supabase.ts singleton instead
export { supabase } from './supabase';

export const AmberLogger = {
  log: (...args) => {
    console.log("%c[AmberLog]", "color:#f97316;font-weight:bold;", ...args);
    // Wyłączone zapisywanie do bazy - tabela system_logs nie istnieje
    // try {
    //   supabase.from("system_logs").insert({
    //     level: "info",
    //     message: JSON.stringify(args),
    //     created_at: new Date().toISOString(),
    //   });
    // } catch (err) {
    //   console.warn("AmberLogger insert error:", err.message);
    // }
  },
  error: (err) => {
    console.error("%c[AmberError]", "color:red;font-weight:bold;", err);
    // Wyłączone zapisywanie do bazy - tabela system_logs nie istnieje
    // try {
    //   supabase.from("system_logs").insert({
    //     level: "error",
    //     message: err?.message || JSON.stringify(err),
    //     created_at: new Date().toISOString(),
    //   });
    // } catch (e) {
    //   console.warn("AmberLogger failed:", e.message);
    // }
  },
};

// 🧠 AmberBrain — prosty tracker kontekstu użytkownika (frontendowy)
export const AmberBrain = {
  async track(event, payload = {}) {
    // Wyłączone zapisywanie do bazy - tabela user_activity nie istnieje
    AmberLogger.log("BrainTrack:", event, payload);
    // try {
    //   await supabase.from("user_activity").insert({
    //     event,
    //     payload,
    //     created_at: new Date().toISOString(),
    //   });
    //   AmberLogger.log("BrainTrack:", event, payload);
    // } catch (err) {
    //   AmberLogger.error(err);
    // }
  },
};
