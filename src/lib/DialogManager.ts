// src/lib/DialogManager.ts

// ── Typy ───────────────────────────────────────────────────────────────────────
export type Slots = {
  item?: string;                // "pizza"
  size?: "S" | "M" | "L";
  spice?: "łagodna" | "ostra";
  toppings?: string[];
  crust?: string;
  dietary?: string;             // "wege" | "vegan" | "bez glutenu" | ...
  time?: string;                // "teraz" | "18:00"
  address?: string;

  // Integracja z bazą
  restaurant?: string;          // "Pizza Hut", "KFC"
  restaurantId?: string;        // UUID restauracji
  menuItem?: string;            // "Pizza Margherita"
  menuItemId?: string;          // UUID pozycji menu
  quantity?: number;            // ilość
  price?: number;               // cena pojedynczej sztuki lub ostatnio policzona

  // Taxi
  service?: string;             // "taxi", "bolt", "uber"
  pickupAddress?: string;       // adres odbioru
  destinationAddress?: string;  // adres docelowy
  estimatedPrice?: number;      // szacowana cena
};

export type TurnResponse = {
  speech: string;
  ui_suggestions?: string[];
  slots: Slots;
  readyToConfirm?: boolean;
  action?: "search_restaurants" | "search_restaurants_general" | "search_menu" | "add_to_cart" | "checkout" | "taxi_order";
  searchQuery?: string;
};

// ── Pomocnicze ────────────────────────────────────────────────────────────────
const DEFAULTS: Required<Pick<Slots, "size" | "spice">> = {
  size: "M",
  spice: "łagodna",
};

function norm(s: string) {
  return s.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // zdejmij akcenty/ogonki
    .toLowerCase();
}

export function mergeSlots(prev: Slots, next?: Partial<Slots>): Slots {
  return { ...prev, ...(next || {}) };
}
export function ensureDefaults(slots: Slots): Slots {
  return { ...slots, size: slots.size ?? DEFAULTS.size, spice: slots.spice ?? DEFAULTS.spice };
}
export function isReady(slots: Slots) {
  return Boolean(slots.item && slots.size && slots.spice);
}
function summary(slots: Slots) {
  const size = slots.size || DEFAULTS.size;
  const spice = slots.spice || DEFAULTS.spice;
  const item = slots.item || "pozycja";
  return `${item} ${size}, ${spice}`;
}

// ── Ekstrakcja brandu i miasta ────────────────────────────────────────────────
function extractBrandAndCity(text: string): { brand?: string; city?: string } {
  const norm = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = norm(text);

  const BRANDS: Array<[RegExp, string]> = [
    [/\bk\s*fc\b/, "kfc"],
    [/\bpizza\s*huts?\b/, "pizza hut"],
    [/\bmcdonald'?s?\b|\bmc\s*donald'?s?\b/, "mcdonald"],
    [/\bsubway\b/, "subway"],
    [/\bpraha\b/, "praha"],
    [/\bmonte\s*carlo\b/, "monte carlo"],
    [/\btaxi\b/, "taxi"],
    [/\bbolt\b/, "bolt"],
    [/\buber\b/, "uber"],
  ];

  let brand: string | undefined;
  for (const [re, name] of BRANDS) {
    if (re.test(q)) { brand = name; break; }
  }

  let city: string | undefined;
  const cityMatch = q.match(/\bw\s+([a-ząćęłńóśźż\s-]{3,})$/i);
  if (cityMatch) {
    const c = cityMatch[1].trim().replace(/\s+/g, " ");
    if (c !== brand) city = c;
  }

  return { brand, city };
}

// ── API ───────────────────────────────────────────────────────────────────────

async function searchMenuItems(restaurantId: string, q: string) {
  try {
    console.log("🔍 Searching menu for:", restaurantId, "query:", q);
    const url = `/api/menu?restaurant_id=${restaurantId}&q=${encodeURIComponent(q)}`;
    console.log("🌐 Menu API URL:", url);
    const res = await fetch(url);
    console.log("📡 Menu API response:", res.status, res.statusText);
    const data = await res.json();
    console.log("📊 Menu data:", data);
    console.log("📋 Results count:", data.results?.length || 0);
    return data.results || [];
  } catch (e) {
    console.error("❌ Error searching menu items:", e);
    return [];
  }
}

// ── Flow „jedno pytanie naraz” ───────────────────────────────────────────────
function nextStep(slots: Slots): TurnResponse {
  const s = ensureDefaults(slots);
  if (isReady(s)) {
    return {
      speech: `Proponuję ${summary(s)}. Potwierdzasz?`,
      ui_suggestions: [s.size!, s.spice!, "Potwierdź"],
      slots: s,
      readyToConfirm: true,
    };
  }
  if (!s.item) {
    return { speech: "Co podać?", ui_suggestions: ["pizza", "burger"], slots: s };
  }
  if (!s.size) {
    return { speech: "Jaki rozmiar?", ui_suggestions: ["S", "M", "L"], slots: s };
  }
  return { speech: "Łagodna czy ostra?", ui_suggestions: ["Łagodna", "Ostra"], slots: s };
}

export async function manageTurn(userText: string, prev: Slots): Promise<TurnResponse> {
  const normalized = (userText || "").toLowerCase().trim();
  console.log("🎯 manageTurn called with:", { userText, normalized, prev });

  // szybkie odpowiedzi (chipsy)
  if (["s", "m", "l"].includes(normalized)) {
    const s = normalized.toUpperCase() as "S" | "M" | "L";
    return nextStep(ensureDefaults(mergeSlots(prev, { size: s })));
  }
  if (normalized.includes("łagod")) {
    return nextStep(ensureDefaults(mergeSlots(prev, { spice: "łagodna" })));
  }
  if (normalized.includes("ostr")) {
    return nextStep(ensureDefaults(mergeSlots(prev, { spice: "ostra" })));
  }
  if (normalized.includes("potwierdź") || normalized.includes("zatwierdź")) {
    const slots = ensureDefaults(prev);
    return { speech: `Potwierdzam: ${summary(slots)}. Składam zamówienie.`, ui_suggestions: [], slots, readyToConfirm: true };
  }

  // --- intencje: potwierdzenie / suma / zakończenie ---
  const CONFIRM_RE = /\b(potwierdz(am|ę)|zamawiam|bior[ęe]|bierzemy|akceptuj|finalizuj|lecimy|to (wszystko|tyle)|zamów|dodaj do koszyka|koszyk|finalizuj|zakończ|gotowe|wystarczy|wystarczy mi|to tyle)\b/i;
  const TOTAL_RE   = /\b(ile (to )?kosztuje|ile płac[ęeisz]|jaka cena|podsumuj|suma|ile razem|razem)\b/i;

  // 1) Prośba o podsumowanie ceny / "ile płacę?"
  if (TOTAL_RE.test(userText)) {
    const qty = prev.quantity ?? 1;
    const unit = prev.price ?? 0;            // uwaga: u Ciebie price to cena pozycji — jeśli już przemnożona, to zamień linijkę niżej
    const total = prev.menuItemId ? unit * qty : 0;

    if (prev.menuItemId && unit > 0) {
      return {
        speech: `Masz ${qty}× ${prev.menuItem} — razem ${total.toFixed(2)} zł. Potwierdzasz?`,
        ui_suggestions: ['Potwierdź', 'Zmień ilość', 'Coś jeszcze'],
        slots: { ...prev, quantity: qty, price: unit }, // price zostawiamy jako cenę jednostkową
        readyToConfirm: true
      };
    } else {
      return {
        speech: 'Na razie nie mam w koszyku pozycji z ceną. Wybierz coś z menu.',
        ui_suggestions: ['Zinger Box', 'Hot Wings', 'Popcorn Chicken'],
        slots: prev
      };
    }
  }

  // 2) Potwierdzenie / "to wszystko"
  if (CONFIRM_RE.test(userText)) {
    console.log("🔔 CONFIRM_RE matched:", userText);
    // jeżeli nie ma ilości, domyślnie 1
    const qty = prev.quantity ?? 1;

    // jeśli mamy pozycję menu i cenę jednostkową → licz sumę
    if (prev.menuItemId && (prev.price ?? 0) > 0) {
      const total = (prev.price as number) * qty;
      return {
        speech: `Potwierdzam: ${qty}× ${prev.menuItem}. Razem ${total.toFixed(2)} zł. Finalizuję zamówienie.`,
        ui_suggestions: ['OK', 'Anuluj', 'Paragon'],
        slots: { ...prev, quantity: qty, price: prev.price },
        action: 'checkout',
        readyToConfirm: true
      };
    }

    // mamy wybrany item, ale nie znamy ceny → dodaj do koszyka jako 1 szt. i dopytaj
    if (prev.menuItemId && !(prev.price && prev.price > 0)) {
      return {
        speech: `Potwierdzam ${qty}× ${prev.menuItem}. Nie mam ceny — dodać do koszyka i kontynuować?`,
        ui_suggestions: ['Tak', 'Nie'],
        slots: { ...prev, quantity: qty },
        action: 'add_to_cart'
      };
    }

    // brak itemu → poproś o wybór
    console.log("❌ No menuItemId for confirmation, prev:", prev);
    return {
      speech: 'Żeby potwierdzić, muszę wiedzieć co dokładnie zamówić. Wybierz pozycję z menu.',
      ui_suggestions: ['Zinger Box', 'Hot Wings', 'Popcorn Chicken'],
      slots: prev
    };
  }

  // Sprawdź czy użytkownik chce coś zjeść/popić (bez konkretnej restauracji)
  if (normalized.includes("chciałbym") || normalized.includes("chcę") || normalized.includes("chciałabym")) {
    if (normalized.includes("coś") || normalized.includes("zjeść") || normalized.includes("pić") || 
        normalized.includes("cola") || normalized.includes("jedzenie") || normalized.includes("restauracja")) {
      console.log("🍽️ User wants to eat/drink something - showing restaurants");
      return {
        speech: "Pokażę Ci restauracje w okolicy gdzie możesz coś zjeść i napić się!",
        ui_suggestions: ['McDonald\'s', 'KFC', 'Pizza Hut', 'Burger King'],
        slots: { ...prev, service: "food" },
        action: "search_restaurants_general"
      };
    }
  }

  // Sprawdź czy użytkownik szuka restauracji w konkretnym mieście
  if (normalized.includes("restauracje") || normalized.includes("restauracja")) {
    if (normalized.includes("piekary") || normalized.includes("śląskie")) {
      console.log("🏪 User searching for restaurants in Piekary Śląskie");
      return {
        speech: "Pokażę Ci restauracje w Piekarach Śląskich!",
        ui_suggestions: ['McDonald\'s', 'KFC', 'Pizza Hut', 'Burger King'],
        slots: { ...prev, service: "food" },
        action: "search_restaurants_general"
      };
    }
  }

  // Szukanie restauracji (brand + opcjonalne miasto) - tylko jeśli nie mamy już restauracji
  if (!prev.restaurantId) {
    const { brand, city } = extractBrandAndCity(userText);

    // zbuduj query „brand [miasto]"
    let q = brand || "";
    if (city && city !== brand) q += " " + city;
    q = q.trim();

    console.log("🔎 /api/restaurants?q=", q);
    const resp = await fetch(`/api/restaurants?q=${encodeURIComponent(q)}`);
    const json = await resp.json();
    const restaurants = Array.isArray(json?.results) ? json.results : [];

    if (brand) {
      console.log("🎯 Restaurant search triggered for:", { brand, city });
      console.log("🏪 Found restaurants:", restaurants);

      if (restaurants.length > 0) {
        const r = restaurants[0];
        return {
          speech: `Znalazłem ${r.name}${r.city ? ` w ${r.city}` : ""}. Co chciałbyś zamówić?`,
          ui_suggestions: ["Pizza", "Burger", "Frytki"],
          slots: { ...prev, restaurant: r.name, restaurantId: r.id },
          action: "search_menu",
          searchQuery: brand,
        };
      } else {
        return {
          speech: "Nie znalazłem tej restauracji. Spróbuj 'Pizza Hut', 'KFC' albo 'McDonald's'.",
          ui_suggestions: ["Pizza Hut", "KFC", "McDonald's"],
          slots: prev,
        };
      }
    }
  }

  // Obsługa taxi - znacznie prostsza!
  if (normalized.includes("taxi") || normalized.includes("bolt") || normalized.includes("uber")) {
    console.log("🚕 Taxi request detected:", userText);
    
    // Wyciągnij adresy z tekstu
    const addressMatch = userText.match(/(?:z|od)\s+([^,]+?)(?:\s+do\s+|\s+na\s+)(.+)/i);
    const pickupAddress = addressMatch ? addressMatch[1].trim() : null;
    const destinationAddress = addressMatch ? addressMatch[2].trim() : null;
    
    if (pickupAddress && destinationAddress) {
      return {
        speech: `Zamawiam taxi z ${pickupAddress} do ${destinationAddress}. Szukam najbliższego kierowcy...`,
        ui_suggestions: ["Potwierdź", "Zmień adres", "Anuluj"],
        slots: { 
          ...prev, 
          service: "taxi",
          pickupAddress,
          destinationAddress,
          estimatedPrice: Math.floor(Math.random() * 30) + 15 // 15-45 zł
        },
        action: "taxi_order",
        readyToConfirm: true
      };
    } else {
      return {
        speech: "Gdzie chcesz zamówić taxi? Powiedz 'z [adres] do [adres]'",
        ui_suggestions: ["Z domu do centrum", "Z lotniska do hotelu", "Z pracy do domu"],
        slots: { ...prev, service: "taxi" }
      };
    }
  }

// Jeśli nie ma restauracji, ale użytkownik mówi nazwę dania - wyszukaj w dostępnych restauracjach
if (!prev.restaurantId && isFoodItem) {
  console.log("🔍 No restaurant selected, searching for dish in available restaurants:", normalized);
  
  // Wyszukaj w dostępnych restauracjach
  const resp = await fetch(`/api/restaurants?q=`);
  const json = await resp.json();
  const restaurants = Array.isArray(json?.results) ? json.results : [];
  
  if (restaurants.length > 0) {
    // Sprawdź pierwszą restaurację (można rozszerzyć o wyszukiwanie we wszystkich)
    const restaurant = restaurants[0];
    const items = await searchMenuItems(restaurant.id, normalized);
    
    if (items.length > 0) {
      const bestMatch = items[0];
      return {
        speech: `Znalazłem ${bestMatch.name} w ${restaurant.name} za ${bestMatch.price} zł. Dodaję do koszyka?`,
        ui_suggestions: ["Tak", "Nie", "Pokaż inne"],
        slots: { 
          ...prev, 
          restaurant: restaurant.name, 
          restaurantId: restaurant.id,
          menuItem: bestMatch.name, 
          menuItemId: bestMatch.id, 
          quantity: 1, 
          price: bestMatch.price 
        },
        action: "add_to_cart"
      };
    }
  }
  
  return {
    speech: `Nie znalazłem "${normalized}" w dostępnych restauracjach. Wybierz restaurację z listy.`,
    ui_suggestions: ["Pokaż restauracje", "KFC", "Pizza Hut"],
    slots: prev,
    action: "search_restaurants_general"
  };
}

// Wyszukiwanie pozycji menu - sprawdź czy mamy restaurację lub czy to może być nazwa dania
if (prev.restaurantId || isFoodItem) {
  const wantsMenuList =
    normalized.includes("menu") ||
    normalized.includes("co jest w menu") ||
    normalized.includes("co macie") ||
    normalized.includes("jakie macie");

  // jeśli user pyta ogólnie o menu — pokaż listę top pozycji
  if (wantsMenuList) {
    const items = await searchMenuItems(prev.restaurantId, "");
    if (items.length > 0) {
      // weź top 3–5 i zbuduj podpowiedzi
      const top = items.slice(0, 5);
      const names = top.map((i: any) => i.name).join(", ");
      const chips = top.slice(0, 3).map((i: any) => i.name);

      return {
        speech: `W menu mamy m.in.: ${names}. Co wybierasz?`,
        ui_suggestions: chips.length ? chips : ["Pizza", "Burger", "Frytki"],
        slots: { ...prev },
        action: "search_menu",
      };
    } else {
      return {
        speech: "Nie znalazłem pozycji w menu. Spróbuj powiedzieć, na co masz ochotę – np. pizza, burger, frytki.",
        ui_suggestions: ["Pizza", "Burger", "Frytki"],
        slots: { ...prev },
      };
    }
  }

// jeśli user mówi konkretnie o produkcie – szukamy itemu i od razu proponujemy
// Rozszerzone rozpoznawanie - sprawdź czy to może być nazwa dania
const isFoodItem = 
  normalized.includes("pizza") ||
  normalized.includes("burger") ||
  normalized.includes("frytki") ||
  normalized.includes("cola") ||
  normalized.includes("margherita") ||
  normalized.includes("pepperoni") ||
  normalized.includes("popcorn") ||
  normalized.includes("chicken") ||
  normalized.includes("zinger") ||
  normalized.includes("wings") ||
  normalized.includes("gulasz") ||
  normalized.includes("pierogi") ||
  normalized.includes("sýr") ||
  normalized.includes("zupa") ||
  normalized.includes("czosnkowa") ||
  normalized.includes("wieprzowy") ||
  normalized.includes("knedlik") ||
  normalized.includes("mięsem") ||
  normalized.includes("smažený") ||
  // Sprawdź czy tekst zawiera więcej niż 2 słowa (może być pełna nazwa dania)
  (normalized.split(' ').length >= 2 && !normalized.includes("chcę") && !normalized.includes("pokaż"));

if (isFoodItem) {
  console.log("🔍 Searching menu for:", normalized, "in restaurant:", prev.restaurantId);
  const items = await searchMenuItems(prev.restaurantId, normalized);
  console.log("📋 Menu search results:", items);
  if (items.length > 0) {
    // Znajdź najlepsze dopasowanie zamiast brać pierwszą pozycję
    let bestMatch = items[0];
    const searchWords = normalized.split(/\s+/);
    
    for (const item of items) {
      const itemName = item.name.toLowerCase();
      let matchScore = 0;
      
      for (const word of searchWords) {
        if (itemName.includes(word)) {
          matchScore++;
        }
      }
      
      if (matchScore > 0) {
        bestMatch = item;
        break; // Znaleziono dopasowanie
      }
    }
    
    console.log("🎯 Best match found:", bestMatch);
    return {
      speech: `Mamy ${bestMatch.name} za ${bestMatch.price} zł. Ile sztuk?`,
      ui_suggestions: ["1", "2", "3"],
      slots: { ...prev, menuItem: bestMatch.name, menuItemId: bestMatch.id, quantity: 1, price: bestMatch.price },
      // Nie dodawaj automatycznie - czekaj na potwierdzenie użytkownika
    };
  } else {
    return {
      speech: `Nie znalazłem "${normalized}" w menu. Spróbuj powiedzieć "pizza" lub "burger".`,
      ui_suggestions: ["Pizza", "Burger", "Frytki"],
      slots: { ...prev },
    };
  }
}
}

  // Ilość
  if (prev.menuItemId && /\d+/.test(normalized)) {
    const qty = parseInt(normalized.match(/\d+/)![0] || "1", 10);
    const total = (prev.price || 0) * qty;
    return {
      speech: `Dodałem ${qty}× ${prev.menuItem} za ${total} zł. Chcesz coś jeszcze?`,
      ui_suggestions: ["Tak", "Nie", "Koszyk", "Finalizuj", "Zamów"],
      slots: { ...prev, quantity: qty, price: prev.price }, // zachowaj cenę jednostkową
      action: "add_to_cart",
    };
  }

  // Prosta heurystyka „pizza”
  let slots: Slots = { ...prev };
  if (!slots.item && normalized.includes("pizza")) slots.item = "pizza";

  // Fallback - jeśli nic nie pasuje, spróbuj wyszukać w menu
  console.log("🔍 No pattern matched, trying menu search for:", normalized);
  
  // Jeśli nie ma restauracji, pokaż dostępne
  if (!prev.restaurantId) {
    return {
      speech: "Nie rozumiem. Wybierz restaurację z listy lub powiedz 'pokaż restauracje'.",
      ui_suggestions: ["Pokaż restauracje", "KFC", "Pizza Hut"],
      slots: prev,
      action: "search_restaurants_general"
    };
  }
  
  // Jeśli ma restaurację, spróbuj wyszukać w menu
  const items = await searchMenuItems(prev.restaurantId, normalized);
  if (items.length > 0) {
    const bestMatch = items[0];
    return {
      speech: `Znalazłem ${bestMatch.name} za ${bestMatch.price} zł. Dodaję do koszyka?`,
      ui_suggestions: ["Tak", "Nie", "Pokaż inne"],
      slots: { 
        ...prev, 
        menuItem: bestMatch.name, 
        menuItemId: bestMatch.id, 
        quantity: 1, 
        price: bestMatch.price 
      },
      action: "add_to_cart"
    };
  }
  
  // Ostateczny fallback
  return { 
    speech: "Nie rozumiem. Spróbuj powiedzieć nazwę dania lub 'pokaż menu'.", 
    ui_suggestions: ["Pokaż menu", "Pizza", "Burger"], 
    slots: prev 
  };
}
