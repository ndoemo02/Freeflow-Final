export default function HeroRibbon() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 w-fit rounded-xl bg-black/20 backdrop-blur
                        px-3 py-2 ring-1 ring-white/10 shadow-sm">
          <h1 className="text-[22px] sm:text-2xl font-extrabold leading-tight tracking-tight">
            <span className="text-orange-500">Free</span>
            <span className="text-purple-400">Flow</span>
          </h1>
          <p className="text-slate-100/95 text-[13px]">
            Voice to order — <span className="font-medium">Złóż zamówienie</span>
          </p>
          <p className="text-slate-300/85 text-xs">Restauracja, taxi albo hotel?</p>
        </div>
      </div>
    </div>
  );
}
