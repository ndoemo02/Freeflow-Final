import React, { createContext, useContext, useCallback, useState, useMemo } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((msg, variant = "info", timeout = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, variant }]);
    if (timeout) setTimeout(() => remove(id), timeout);
  }, [remove]);

  const value = useMemo(() => ({ push, remove }), [push, remove]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto rounded-lg px-4 py-3 text-sm shadow-xl ring-1 ring-white/20 backdrop-blur",
              t.variant === "success" && "bg-emerald-500/20 text-emerald-100",
              t.variant === "error" && "bg-red-500/20 text-red-100",
              t.variant === "info" && "bg-slate-500/20 text-slate-100",
            ].filter(Boolean).join(" ")}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}


