import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LogoFreeFlow from "../components/LogoFreeFlow.jsx";

type RestaurantItem = {
  id: string;
  name: string;
  city: string;
  cuisine_type: string;
  address: string;
  rating: number;
  distance: number;
  image?: string;
  color: string;
  gradient: [string, string];
};

const mockRestaurants: RestaurantItem[] = [
  {
    id: "rest-1",
    name: "Restauracja Stara Kamienica",
    city: "Piekary Slaskie",
    cuisine_type: "Polska",
    address: "Polska / Piekary Slaskie",
    rating: 4.5,
    distance: 1.3,
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=280&fit=crop",
    color: "#38bdf8",
    gradient: ["#15324f", "#0b1523"],
  },
  {
    id: "rest-2",
    name: "Rezydencja Luxury Hotel",
    city: "Piekary Slaskie",
    cuisine_type: "Miedzynarodowa",
    address: "Miedzynarodowa / Piekary Slaskie",
    rating: 4.7,
    distance: 0.8,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=280&fit=crop",
    color: "#f59e0b",
    gradient: ["#4f3215", "#23180b"],
  },
  {
    id: "rest-3",
    name: "Klaps Burgers",
    city: "Piekary Slaskie",
    cuisine_type: "Amerykanska",
    address: "Amerykanska / Piekary Slaskie",
    rating: 4.6,
    distance: 1.0,
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=280&fit=crop",
    color: "#fb7185",
    gradient: ["#4a1f28", "#211015"],
  },
  {
    id: "rest-4",
    name: "Callzone",
    city: "Piekary Slaskie",
    cuisine_type: "Pizzeria",
    address: "Pizzeria / Piekary Slaskie",
    rating: 4.4,
    distance: 1.1,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=280&fit=crop",
    color: "#22c55e",
    gradient: ["#173b23", "#0b1c11"],
  },
  {
    id: "rest-5",
    name: "Dwor Hubertus",
    city: "Piekary Slaskie",
    cuisine_type: "Slaska / Europejska",
    address: "Slaska / Europejska / Piekary Slaskie",
    rating: 4.8,
    distance: 1.4,
    image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&h=280&fit=crop",
    color: "#a78bfa",
    gradient: ["#30214d", "#181225"],
  },
  {
    id: "rest-6",
    name: "Vien-Thien",
    city: "Piekary Slaskie",
    cuisine_type: "Wietnamska",
    address: "Wietnamska / Piekary Slaskie",
    rating: 4.3,
    distance: 1.2,
    image: "https://images.unsplash.com/photo-1515669097368-22e68427d265?w=400&h=280&fit=crop",
    color: "#2dd4bf",
    gradient: ["#113d39", "#0a1f1d"],
  },
];

const CARD_HEIGHT = 72;
const CARD_GAP = 10;
const STRIDE = CARD_HEIGHT + CARD_GAP;
const SPRING_STIFFNESS = 0.13;
const SPRING_DAMPING = 0.8;
const EXPAND_DISTANCE_THRESHOLD = 86;
const EXPAND_VELOCITY_THRESHOLD = 0.62;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function CompactFocusCard({
  item,
  offsetFromCenter,
  stride,
  onClick,
}: {
  item: RestaurantItem;
  offsetFromCenter: number;
  stride: number;
  onClick: () => void;
}) {
  const normalizedDistance = Math.min(Math.abs(offsetFromCenter) / (stride * 1.8), 1);
  const eased = normalizedDistance * normalizedDistance;
  const scale = 1.02 - 0.18 * eased;
  const blur = 3.6 * eased;
  const opacity = 1 - 0.62 * eased;
  const focused = normalizedDistance < 0.12;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-0 right-0 mx-auto will-change-transform text-left"
      style={{
        height: `${CARD_HEIGHT}px`,
        top: `calc(50% + ${offsetFromCenter}px - ${CARD_HEIGHT / 2}px)`,
        transform: `translate3d(0,0,0) scale(${scale.toFixed(4)})`,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none",
        opacity,
        zIndex: focused ? 20 : 10 - Math.min(Math.abs(Math.round(offsetFromCenter / stride)), 8),
        transition: "transform 180ms ease, opacity 180ms ease, filter 180ms ease",
      }}
      aria-label={item.name}
    >
      <div
        className="relative h-full overflow-hidden rounded-[18px]"
        style={{
          background: focused
            ? `linear-gradient(135deg, ${item.gradient[0]}E6 0%, ${item.gradient[1]}F2 100%)`
            : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(10,14,24,0.54))",
          boxShadow: focused ? `0 0 24px ${item.color}18, 0 14px 28px rgba(0,0,0,0.28)` : "0 10px 20px rgba(0,0,0,0.14)",
          backdropFilter: "blur(16px) saturate(1.2)",
          WebkitBackdropFilter: "blur(16px) saturate(1.2)",
        }}
      >
        {focused ? (
          <div
            className="absolute inset-x-5 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${item.color}88, transparent)` }}
          />
        ) : null}

        <div className="flex h-full items-center gap-3 px-3.5">
          <div
            className="h-11 w-11 shrink-0 overflow-hidden rounded-[12px]"
            style={{ boxShadow: focused ? `0 0 14px ${item.color}20` : "none" }}
          >
            {item.image ? (
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black/20 text-xs text-white/60">?</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div
                className="truncate text-[13px] font-semibold leading-tight"
                style={{ color: focused ? "#ffffff" : "rgba(255,255,255,0.72)" }}
              >
                {item.name}
              </div>
              <div
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  color: focused ? item.color : "rgba(255,255,255,0.58)",
                  background: focused ? `${item.color}1A` : "rgba(255,255,255,0.06)",
                }}
              >
                {item.distance.toFixed(1)} km
              </div>
            </div>

            <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-white/36">
              {item.cuisine_type}
            </div>
            <div className="mt-1 truncate text-[11px] text-white/62">{item.address}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/55">
              <span className="font-semibold text-amber-300">{item.rating.toFixed(1)}</span>
              <span className="text-white/18">|</span>
              <span>{item.city}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function CompactFocusIsland({
  items,
  activeId,
  setActiveId,
}: {
  items: RestaurantItem[];
  activeId: string;
  setActiveId: (id: string) => void;
}) {
  const frameRef = useRef<number>(0);
  const positionRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const lastPointerYRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const targetIndexRef = useRef(0);
  const [scrollY, setScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const maxScroll = (items.length - 1) * STRIDE;
  const focusedIndex = clamp(Math.round(scrollY / STRIDE), 0, items.length - 1);
  const viewportHeight = isExpanded ? 384 : 152;

  useEffect(() => {
    const idx = items.findIndex((item) => item.id === activeId);
    const safeIndex = idx >= 0 ? idx : 0;
    targetIndexRef.current = safeIndex;
    positionRef.current = safeIndex * STRIDE;
    setScrollY(positionRef.current);
  }, [activeId, items]);

  const startAnimation = useCallback(() => {
    if (frameRef.current) return;

    const tick = () => {
      if (!draggingRef.current) {
        const target = targetIndexRef.current * STRIDE;
        const distance = target - positionRef.current;
        velocityRef.current += distance * SPRING_STIFFNESS;
        velocityRef.current *= SPRING_DAMPING;
        positionRef.current += velocityRef.current;

        if (Math.abs(distance) < 0.35 && Math.abs(velocityRef.current) < 0.04) {
          positionRef.current = target;
          velocityRef.current = 0;
          setScrollY(positionRef.current);
          frameRef.current = 0;
          return;
        }
      }

      setScrollY(positionRef.current);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const goToIndex = useCallback(
    (index: number) => {
      targetIndexRef.current = clamp(index, 0, items.length - 1);
      setActiveId(items[targetIndexRef.current].id);
      startAnimation();
    },
    [items, setActiveId, startAnimation]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? 1 : -1;
      goToIndex(focusedIndex + direction);
    },
    [focusedIndex, goToIndex]
  );

  const handlePointerDown = useCallback((clientY: number) => {
    draggingRef.current = true;
    lastPointerYRef.current = clientY;
    dragStartYRef.current = clientY;
    dragStartTimeRef.current = performance.now();
    accumulatedDeltaRef.current = 0;
    velocityRef.current = 0;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  }, []);

  const handlePointerMove = useCallback(
    (clientY: number) => {
      if (!draggingRef.current) return;
      const delta = lastPointerYRef.current - clientY;
      lastPointerYRef.current = clientY;
      accumulatedDeltaRef.current += delta;
      positionRef.current = clamp(positionRef.current + delta, 0, maxScroll);
      setScrollY(positionRef.current);
    },
    [maxScroll]
  );

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const elapsed = Math.max(performance.now() - dragStartTimeRef.current, 16);
    const totalTravel = dragStartYRef.current - lastPointerYRef.current;
    const gestureTravel = Math.abs(accumulatedDeltaRef.current) > Math.abs(totalTravel)
      ? accumulatedDeltaRef.current
      : totalTravel;
    const velocity = gestureTravel / elapsed;
    const isFlick =
      Math.abs(gestureTravel) >= EXPAND_DISTANCE_THRESHOLD &&
      Math.abs(velocity) >= EXPAND_VELOCITY_THRESHOLD;

    if (isFlick) {
      if (gestureTravel > 0) {
        setIsExpanded(true);
      } else {
        setIsExpanded(false);
      }
    }

    const nextIndex = clamp(Math.round(positionRef.current / STRIDE), 0, items.length - 1);
    targetIndexRef.current = nextIndex;
    setActiveId(items[nextIndex].id);
    startAnimation();
  }, [items, setActiveId, startAnimation]);

  useEffect(() => {
    const moveHandler = (event: PointerEvent) => handlePointerMove(event.clientY);
    const upHandler = () => handlePointerUp();

    window.addEventListener("pointermove", moveHandler);
    window.addEventListener("pointerup", upHandler);

    return () => {
      window.removeEventListener("pointermove", moveHandler);
      window.removeEventListener("pointerup", upHandler);
    };
  }, [handlePointerMove, handlePointerUp]);

  const focusedItem = items[focusedIndex];

  return (
    <div className="relative w-[min(70vw,16rem)]">
      <div className="mb-2 px-2">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/85">W poblizu</div>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="text-[14px] font-semibold tracking-tight text-white">Polecane miejsca</div>
          <div className="text-[10px] text-white/46">{isExpanded ? "Rozwiniete" : `${items.length} opcji`}</div>
        </div>
      </div>

      <div
        className="relative cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={(event) => handlePointerDown(event.clientY)}
        style={{
          height: `${viewportHeight}px`,
          touchAction: "none",
          transition: "height 260ms ease",
          WebkitMaskImage: isExpanded
            ? "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 8%, rgba(0,0,0,1) 92%, rgba(0,0,0,0) 100%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)",
          maskImage: isExpanded
            ? "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 8%, rgba(0,0,0,1) 92%, rgba(0,0,0,0) 100%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)",
        }}
      >
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            background: `radial-gradient(circle at 50% 48%, ${focusedItem.color}18 0%, transparent 64%)`,
          }}
        />

        {items.map((item, index) => {
          const offsetFromCenter = index * STRIDE - scrollY;
          if (Math.abs(offsetFromCenter) > STRIDE * 3.2) {
            return null;
          }

          return (
            <CompactFocusCard
              key={item.id}
              item={item}
              offsetFromCenter={offsetFromCenter}
              stride={STRIDE}
              onClick={() => goToIndex(index)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function UiLab() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(mockRestaurants[0].id);

  const selectedRestaurant = useMemo(
    () => mockRestaurants.find((item) => item.id === selectedRestaurantId) ?? mockRestaurants[0],
    [selectedRestaurantId]
  );

  return (
    <div className="relative min-h-screen overflow-hidden font-sans text-slate-100 sm:bg-[url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      <header className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex items-start justify-between px-5 py-4">
        <div className="pointer-events-auto mt-2 flex flex-col gap-3">
          <LogoFreeFlow />
          <div className="ml-1 inline-flex w-fit rounded-full border border-white/12 bg-black/30 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-xl">
            UI Lab
          </div>
        </div>
        <div className="pointer-events-auto mt-2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-mono text-white/65 backdrop-blur-xl shadow-lg">
          /ui-lab
        </div>
      </header>

      <main className="relative min-h-screen">
        <div className="pointer-events-none absolute left-3 bottom-[110px] z-30 sm:left-4 sm:bottom-[118px]">
          <div className="pointer-events-auto">
            <CompactFocusIsland
              items={mockRestaurants}
              activeId={selectedRestaurantId}
              setActiveId={setSelectedRestaurantId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}












