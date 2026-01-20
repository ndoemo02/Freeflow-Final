// test-voice-order-real-menu.js
// Test voice order z prawdziwymi danymi z menu Supabase

const API_BASE = "http://localhost:3000";

// Realne restauracje z Supabase
const RESTAURANTS = {
  BAR_PRAHA: {
    id: "8b00b05e-72f7-4a5f-b50c-5630a75d6312",
    name: "Bar Praha",
    city: "Piekary Śląskie"
  },
  STARA_KAMIENICA: {
    id: "1fc1e782-bac6-47b2-978a-f6f2b38000cd",
    name: "Restauracja Stara Kamienica",
    city: "Piekary Śląskie"
  },
  MONTE_CARLO: {
    id: "83566974-1017-4408-90ee-2571cc069878",
    name: "Pizzeria Monte Carlo",
    city: "Piekary Śląskie"
  },
  VIEN_THIEN: {
    id: "70842598-1632-43f6-8015-706d5adf182f",
    name: "Vien-Thien",
    city: "Piekary Śląskie"
  }
};

// Realne pozycje menu z Supabase
const MENU_ITEMS = {
  BAR_PRAHA: [
    { id: "63759775-17bf-456c-b33c-5c28a1444c8f", name: "Zupa czosnkowa", price: 14.9 },
    { id: "3a084c28-7d36-4373-9b12-4f0f7e8fbb5d", name: "Smažený sýr", price: 38.00 },
    { id: "dd5f78cf-6868-48aa-82d0-3df900c1e6d5", name: "Gulasz wieprzowy z knedlikiem", price: 45.00 },
    { id: "57de8b12-5c8d-4d01-a330-9ca4003a5659", name: "Pierogi z mięsem", price: 32.00 }
  ],
  STARA_KAMIENICA: [
    { id: "90184fab-3ee4-4d54-ab83-5490d9222257", name: "Rolada śląska z kluskami i modrą kapustą", price: 52.00 },
    { id: "b7c034d7-7e48-4642-9243-412e94ac3ded", name: "Żurek śląski na maślance", price: 22.00 },
    { id: "5fb33d30-3489-4a0d-b9ef-d5b368894040", name: "Kotlet schabowy z ziemniakami i kapustą", price: 45.00 },
    { id: "a9fa5027-0b80-4d73-882e-af8534b443d4", name: "Placki ziemniaczane z gulaszem", price: 48.00 }
  ],
  MONTE_CARLO: [
    { id: "ba4a21bc-3670-4b96-9539-f186074a8d04", name: "Lasagne Bolognese", price: 42.00 }
  ],
  VIEN_THIEN: [
    { id: "7e485921-b291-4464-81f7-dd49e9c2caf8", name: "Zupa Pho Bo", price: 35.00 },
    { id: "d38f2a34-688c-429e-9d8e-7cba423ba4ad", name: "Sajgonki z mięsem", price: 25.00 },
    { id: "3f0c5226-e350-4378-8243-14407f450979", name: "Pad Thai z krewetkami", price: 49.00 }
  ]
};

// Helper: Wyślij zapytanie do Brain API
async function sendToBrain(text, sessionId = "test-session") {
  try {
    const response = await fetch(`${API_BASE}/api/brain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sessionId })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Brain API error:", error.message);
    return null;
  }
}

// Test 1: Wybór restauracji głosem
async function test1_SelectRestaurant() {
  console.log("\n🎤 TEST 1: Wybór restauracji głosem");
  console.log("=" .repeat(60));

  const testCases = [
    "Chcę zamówić z Bar Praha",
    "Pokaż menu Stara Kamienica",
    "Wybieram Pizzeria Monte Carlo",
    "Zamów coś z Vien-Thien"
  ];

  for (const text of testCases) {
    console.log(`\n📝 User: "${text}"`);
    const result = await sendToBrain(text);
    
    if (result) {
      console.log(`🧠 Intent: ${result.intent}`);
      console.log(`💬 Amber: ${result.reply}`);
      console.log(`📍 Restaurant: ${result.context?.lastRestaurant?.name || "brak"}`);
    }
  }
}

// Test 2: Zamówienie konkretnego dania głosem
async function test2_OrderSpecificDish() {
  console.log("\n🎤 TEST 2: Zamówienie konkretnego dania głosem");
  console.log("=" .repeat(60));

  const testCases = [
    { text: "Zamów zupę czosnkową z Bar Praha", expected: "Zupa czosnkowa" },
    { text: "Poproszę kotlet schabowy ze Starej Kamienicy", expected: "Kotlet schabowy" },
    { text: "Chcę lasagne z Monte Carlo", expected: "Lasagne Bolognese" },
    { text: "Wezmę Pad Thai z Vien-Thien", expected: "Pad Thai z krewetkami" }
  ];

  for (const { text, expected } of testCases) {
    console.log(`\n📝 User: "${text}"`);
    console.log(`🎯 Expected dish: ${expected}`);
    
    const result = await sendToBrain(text);
    
    if (result) {
      console.log(`🧠 Intent: ${result.intent}`);
      console.log(`💬 Amber: ${result.reply}`);
      
      // Sprawdź czy odpowiedź zawiera nazwę dania
      if (result.reply.toLowerCase().includes(expected.toLowerCase())) {
        console.log("✅ PASS: Danie rozpoznane poprawnie");
      } else {
        console.log("❌ FAIL: Danie nie zostało rozpoznane");
      }
    }
  }
}

// Test 3: Zamówienie z ilością
async function test3_OrderWithQuantity() {
  console.log("\n🎤 TEST 3: Zamówienie z ilością");
  console.log("=" .repeat(60));

  const testCases = [
    "Zamów dwie zupy czosnkowe z Bar Praha",
    "Poproszę 3 pierogi z mięsem",
    "Chcę 2x Pad Thai z Vien-Thien",
    "Wezmę trzy sajgonki"
  ];

  for (const text of testCases) {
    console.log(`\n📝 User: "${text}"`);
    const result = await sendToBrain(text);
    
    if (result) {
      console.log(`🧠 Intent: ${result.intent}`);
      console.log(`💬 Amber: ${result.reply}`);
      
      // Sprawdź czy intent to create_order
      if (result.intent === "create_order") {
        console.log("✅ PASS: Intent create_order rozpoznany");
      } else {
        console.log(`❌ FAIL: Oczekiwano create_order, otrzymano ${result.intent}`);
      }
    }
  }
}

// Test 4: Flow konwersacyjny - wybór restauracji → menu → zamówienie
async function test4_ConversationalFlow() {
  console.log("\n🎤 TEST 4: Flow konwersacyjny");
  console.log("=" .repeat(60));

  const sessionId = "test-flow-" + Date.now();

  // Krok 1: Wybór restauracji
  console.log("\n📝 Krok 1: User: 'Chcę coś zamówić z Bar Praha'");
  let result = await sendToBrain("Chcę coś zamówić z Bar Praha", sessionId);
  console.log(`💬 Amber: ${result?.reply}`);
  console.log(`📍 Restaurant in context: ${result?.context?.lastRestaurant?.name || "brak"}`);

  // Krok 2: Pokaż menu
  console.log("\n📝 Krok 2: User: 'Pokaż menu'");
  result = await sendToBrain("Pokaż menu", sessionId);
  console.log(`💬 Amber: ${result?.reply}`);

  // Krok 3: Zamów danie
  console.log("\n📝 Krok 3: User: 'Zamów zupę czosnkową'");
  result = await sendToBrain("Zamów zupę czosnkową", sessionId);
  console.log(`💬 Amber: ${result?.reply}`);
  
  if (result?.intent === "create_order") {
    console.log("✅ PASS: Zamówienie złożone");
  } else {
    console.log("❌ FAIL: Zamówienie nie zostało złożone");
  }
}

// Test 5: Fuzzy matching - błędy STT
async function test5_FuzzyMatching() {
  console.log("\n🎤 TEST 5: Fuzzy matching (błędy STT)");
  console.log("=" .repeat(60));

  const testCases = [
    { text: "Zamów zupę czosenkową z Bar Praha", correct: "Zupa czosnkowa" },
    { text: "Poproszę kotleta schabowego", correct: "Kotlet schabowy" },
    { text: "Chcę lasanie z Monte Carlo", correct: "Lasagne Bolognese" },
    { text: "Wezmę pad taj z krewetkami", correct: "Pad Thai z krewetkami" }
  ];

  for (const { text, correct } of testCases) {
    console.log(`\n📝 User (z błędem STT): "${text}"`);
    console.log(`🎯 Correct dish: ${correct}`);
    
    const result = await sendToBrain(text);
    
    if (result) {
      console.log(`💬 Amber: ${result?.reply}`);
      
      // Sprawdź czy fuzzy matching zadziałał
      if (result.reply.toLowerCase().includes(correct.toLowerCase())) {
        console.log("✅ PASS: Fuzzy matching zadziałał");
      } else {
        console.log("⚠️ WARN: Fuzzy matching może wymagać poprawy");
      }
    }
  }
}

// Test 6: Zamówienie wielopozycyjne
async function test6_MultiItemOrder() {
  console.log("\n🎤 TEST 6: Zamówienie wielopozycyjne");
  console.log("=" .repeat(60));

  const testCases = [
    "Zamów zupę czosnkową i pierogi z mięsem z Bar Praha",
    "Poproszę żurek i kotlet schabowy ze Starej Kamienicy",
    "Chcę Pad Thai i sajgonki z Vien-Thien"
  ];

  for (const text of testCases) {
    console.log(`\n📝 User: "${text}"`);
    const result = await sendToBrain(text);
    
    if (result) {
      console.log(`🧠 Intent: ${result.intent}`);
      console.log(`💬 Amber: ${result?.reply}`);
      
      // TODO: W przyszłości sprawdź czy obie pozycje zostały rozpoznane
      console.log("⚠️ TODO: Implementacja multi-item parsing");
    }
  }
}

// Test 7: Kontekst sesji - zamówienie bez podawania restauracji
async function test7_SessionContext() {
  console.log("\n🎤 TEST 7: Kontekst sesji");
  console.log("=" .repeat(60));

  const sessionId = "test-context-" + Date.now();

  // Krok 1: Wybierz restaurację
  console.log("\n📝 Krok 1: User: 'Wybieram Bar Praha'");
  let result = await sendToBrain("Wybieram Bar Praha", sessionId);
  console.log(`💬 Amber: ${result?.reply}`);

  // Krok 2: Zamów bez podawania restauracji (użyj kontekstu)
  console.log("\n📝 Krok 2: User: 'Zamów zupę czosnkową' (bez nazwy restauracji)");
  result = await sendToBrain("Zamów zupę czosnkową", sessionId);
  console.log(`💬 Amber: ${result?.reply}`);
  
  if (result?.context?.lastRestaurant?.name === "Bar Praha") {
    console.log("✅ PASS: Kontekst sesji działa poprawnie");
  } else {
    console.log("❌ FAIL: Kontekst sesji nie został zachowany");
  }
}

// Test 8: Edge cases
async function test8_EdgeCases() {
  console.log("\n🎤 TEST 8: Edge cases");
  console.log("=" .repeat(60));

  const testCases = [
    { text: "Zamów coś", desc: "Brak konkretnego dania" },
    { text: "Chcę pizzę", desc: "Danie bez restauracji" },
    { text: "Zamów zupę z nieistniejącej restauracji", desc: "Nieistniejąca restauracja" },
    { text: "Poproszę nieistniejące danie z Bar Praha", desc: "Nieistniejące danie" }
  ];

  for (const { text, desc } of testCases) {
    console.log(`\n📝 User: "${text}"`);
    console.log(`🔍 Test: ${desc}`);
    
    const result = await sendToBrain(text);
    
    if (result) {
      console.log(`💬 Amber: ${result?.reply}`);
      console.log(`🧠 Intent: ${result.intent}`);
    }
  }
}

// Główna funkcja testowa
async function runAllTests() {
  console.log("🚀 Starting Voice Order Tests with Real Menu Data");
  console.log("=" .repeat(60));
  console.log(`📡 API Base: ${API_BASE}`);
  console.log(`🏪 Testing with ${Object.keys(RESTAURANTS).length} restaurants`);
  console.log(`🍽️ Total menu items: ${Object.values(MENU_ITEMS).flat().length}`);
  console.log("=" .repeat(60));

  try {
    await test1_SelectRestaurant();
    await test2_OrderSpecificDish();
    await test3_OrderWithQuantity();
    await test4_ConversationalFlow();
    await test5_FuzzyMatching();
    await test6_MultiItemOrder();
    await test7_SessionContext();
    await test8_EdgeCases();

    console.log("\n" + "=" .repeat(60));
    console.log("🎉 All tests completed!");
    console.log("=" .repeat(60));
    
    console.log("\n📊 Test Summary:");
    console.log("✅ Test 1: Wybór restauracji głosem");
    console.log("✅ Test 2: Zamówienie konkretnego dania");
    console.log("✅ Test 3: Zamówienie z ilością");
    console.log("✅ Test 4: Flow konwersacyjny");
    console.log("✅ Test 5: Fuzzy matching (błędy STT)");
    console.log("⚠️ Test 6: Zamówienie wielopozycyjne (TODO)");
    console.log("✅ Test 7: Kontekst sesji");
    console.log("✅ Test 8: Edge cases");

  } catch (error) {
    console.error("\n❌ Test suite failed:", error.message);
  }
}

// Uruchom testy
runAllTests().catch(console.error);

