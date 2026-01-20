# 💡 CustomerPanel - Przykłady Użycia

## 🎯 Scenariusze Użycia

### 1. Nowy Użytkownik - Pierwsze Logowanie

**Krok po kroku:**
1. Użytkownik rejestruje się w aplikacji
2. Po zalogowaniu przechodzi do Panelu Klienta
3. Widzi zakładkę **Profil** z pustymi polami
4. Kliknie **"✏️ Edytuj profil"**
5. Wypełnia dane:
   - Imię: Jan
   - Nazwisko: Kowalski
   - Telefon: +48 123 456 789
   - Adres: ul. Przykładowa 123/45
   - Miasto: Warszawa
6. Kliknie **"💾 Zapisz"**
7. Widzi toast: "Profil zaktualizowany pomyślnie"
8. Avatar pokazuje inicjały "JK"

**Rezultat:**
- ✅ Profil uzupełniony
- ✅ Avatar z inicjałami
- ✅ Dane zapisane w Supabase Auth

---

### 2. Złożenie Pierwszego Zamówienia

**Krok po kroku:**
1. Użytkownik przechodzi do zakładki **Restauracje**
2. Widzi listę dostępnych restauracji
3. Kliknie na kartę "Pizza Palace"
4. Widzi menu z pozycjami:
   - Margherita - 25.00 zł
   - Pepperoni - 30.00 zł
   - Quattro Formaggi - 35.00 zł
5. Najeżdża na "Margherita"
6. Pojawia się przycisk **"🛒 Dodaj do koszyka"**
7. Kliknie przycisk (funkcja w przygotowaniu)
8. Przechodzi do koszyka i finalizuje zamówienie

**Rezultat:**
- ✅ Zamówienie złożone
- ✅ Status: "Oczekiwanie" (🟠)
- ✅ Widoczne w zakładce Zamówienia

---

### 3. Śledzenie Zamówienia

**Krok po kroku:**
1. Użytkownik przechodzi do zakładki **Zamówienia**
2. Widzi karty statystyk:
   - 📦 Wszystkich zamówień: 1
   - ✅ Ukończonych: 0
   - 💰 Łączna kwota: 25.00 zł
   - ⏳ W trakcie: 1
3. Widzi swoje zamówienie z statusem "Oczekiwanie"
4. Po chwili status zmienia się automatycznie na "W przygotowaniu" (🟡)
5. Następnie "Gotowe do odbioru" (🔵)
6. W końcu "Dostarczone" (🟢)

**Rezultat:**
- ✅ Realtime updates działają
- ✅ Statusy aktualizują się automatycznie
- ✅ Punkty lojalnościowe naliczone (2 pkt)

---

### 4. Anulowanie Zamówienia

**Krok po kroku:**
1. Użytkownik złożył zamówienie przez pomyłkę
2. Przechodzi do zakładki **Zamówienia**
3. Widzi zamówienie ze statusem "Oczekiwanie" (🟠)
4. Kliknie przycisk **"Anuluj"**
5. Pojawia się potwierdzenie
6. Kliknie **"Tak, anuluj"**
7. Status zmienia się na "Anulowane" (🔴)
8. Widzi toast: "Zamówienie anulowane"

**Rezultat:**
- ✅ Zamówienie anulowane
- ✅ Status zaktualizowany
- ✅ Nie można już anulować ponownie

---

### 5. Rezerwacja Stolika

**Krok po kroku:**
1. Użytkownik przechodzi do zakładki **Rezerwacje**
2. Kliknie **"➕ Nowa rezerwacja"** (w przygotowaniu)
3. Wypełnia formularz:
   - Restauracja: Pizza Palace
   - Data: 2025-10-20
   - Godzina: 19:00
   - Liczba osób: 4
4. Kliknie **"Zarezerwuj"**
5. Widzi nową rezerwację ze statusem "Oczekuje" (⏳)
6. Po chwili restauracja potwierdza
7. Status zmienia się na "Potwierdzona" (✅)
8. Widzi szczegóły:
   - 🏪 Pizza Palace
   - 📅 20.10.2025, 19:00
   - 👥 4 osoby
   - 🪑 Stolik nr 12

**Rezultat:**
- ✅ Rezerwacja złożona
- ✅ Status: Potwierdzona
- ✅ Szczegóły widoczne

---

### 6. Anulowanie Rezerwacji

**Krok po kroku:**
1. Użytkownik nie może przyjść na rezerwację
2. Przechodzi do zakładki **Rezerwacje**
3. Znajduje swoją rezerwację
4. Kliknie **"Anuluj rezerwację"**
5. Pojawia się potwierdzenie
6. Kliknie **"Tak, anuluj"**
7. Status zmienia się na "Anulowana" (❌)
8. Widzi toast: "Rezerwacja anulowana"

**Rezultat:**
- ✅ Rezerwacja anulowana
- ✅ Status zaktualizowany
- ✅ Restauracja powiadomiona

---

### 7. Zarządzanie Powiadomieniami

**Krok po kroku:**
1. Użytkownik przechodzi do zakładki **Ustawienia**
2. Przewija do sekcji **"🔔 Powiadomienia"**
3. Widzi toggle switches:
   - 📧 Email: ✅ Włączone
   - 🔔 Push: ❌ Wyłączone
   - 📱 SMS: ❌ Wyłączone
   - 📦 Aktualizacje zamówień: ✅ Włączone
   - 🎁 Promocje: ✅ Włączone
4. Kliknie toggle "Push"
5. Status zmienia się na ✅ Włączone
6. Widzi toast: "Ustawienia zapisane"

**Rezultat:**
- ✅ Powiadomienia push włączone
- ✅ Ustawienia zapisane
- ✅ Użytkownik będzie otrzymywał push notifications

---

### 8. Program Lojalnościowy

**Krok po kroku:**
1. Użytkownik złożył 5 zamówień o łącznej wartości 250 zł
2. Przechodzi do zakładki **Ustawienia**
3. Widzi sekcję **"🎁 Program Lojalnościowy"**
4. Widzi:
   - **Twoje punkty**: 25 pkt
   - **Progress bar**: 25/100 (25%)
   - **Do następnej nagrody**: 75 pkt
5. Po kolejnym zamówieniu za 50 zł:
   - Punkty: 30 pkt
   - Progress bar: 30/100 (30%)

**Zasady:**
- 1 punkt = 10 zł wydanych
- 100 punktów = nagroda
- Punkty naliczane automatycznie

**Rezultat:**
- ✅ Punkty naliczone automatycznie
- ✅ Progress bar aktualizowany
- ✅ Motywacja do kolejnych zamówień

---

### 9. Filtrowanie Zamówień

**Krok po kroku:**
1. Użytkownik ma 10 zamówień:
   - 3 w trakcie
   - 6 zakończonych
   - 1 anulowane
2. Przechodzi do zakładki **Zamówienia**
3. Widzi wszystkie 10 zamówień
4. Kliknie filtr **"⏳ W trakcie (3)"**
5. Widzi tylko 3 zamówienia w trakcie
6. Kliknie filtr **"✅ Zakończone (7)"**
7. Widzi 6 zakończonych + 1 anulowane

**Rezultat:**
- ✅ Filtry działają
- ✅ Liczniki aktualizowane
- ✅ Łatwe zarządzanie zamówieniami

---

### 10. Responsywność - Mobile

**Krok po kroku:**
1. Użytkownik otwiera aplikację na telefonie
2. Przechodzi do Panelu Klienta
3. Widzi:
   - Karty statystyk w 1 kolumnie
   - Zakładki w poziomym scrollu
   - Zamówienia w 1 kolumnie
   - Restauracje w 1 kolumnie
4. Wszystkie przyciski są touch-friendly
5. Animacje działają płynnie
6. Nawigacja intuicyjna

**Rezultat:**
- ✅ Mobile-first design
- ✅ Touch-friendly UI
- ✅ Płynne animacje
- ✅ Pełna funkcjonalność

---

## 🎨 Przykłady Wizualne

### Karty Statystyk
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ 📦              │ │ ✅              │ │ 💰              │ │ ⏳              │
│ Wszystkich      │ │ Ukończonych     │ │ Łączna kwota    │ │ W trakcie       │
│ zamówień        │ │                 │ │                 │ │                 │
│                 │ │                 │ │                 │ │                 │
│ 15              │ │ 12              │ │ 450.00 zł       │ │ 3               │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Karta Zamówienia
```
┌────────────────────────────────────────────────────────┐
│ 🆔 #ORD-12345                          🟢 Dostarczone  │
│ 📅 2025-10-16, 14:30                                   │
│ 🏪 Pizza Palace                                        │
│ 🍽️ Margherita                                          │
│ 💰 25.00 zł                                            │
└────────────────────────────────────────────────────────┘
```

### Karta Restauracji
```
┌────────────────────────────────────────┐
│ 🏪                                  →  │
│                                        │
│ Pizza Palace                           │
│ 📍 Warszawa                            │
│                                        │
│ Zobacz menu →                          │
└────────────────────────────────────────┘
```

### Karta Rezerwacji
```
┌────────────────────────────────────────────────────────┐
│ 🏪 Pizza Palace                        ✅ Potwierdzona │
│ 📅 20.10.2025, 19:00                                   │
│ 👥 4 osoby                                             │
│ 🪑 Stolik nr 12                                        │
│                                                        │
│ [Anuluj rezerwację]                                   │
└────────────────────────────────────────────────────────┘
```

---

## 🔧 Przykłady Kodu

### Dodanie nowego zamówienia (backend)
```javascript
const { data, error } = await supabase
  .from('orders')
  .insert({
    user_id: user.id,
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    dish_name: 'Margherita',
    total_price: 25.00,
    status: 'pending'
  });
```

### Anulowanie zamówienia
```javascript
const cancelOrder = async (orderId) => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    push('Zamówienie anulowane', 'success');
  } catch (e) {
    push('Błąd anulowania', 'error');
  }
};
```

### Dodanie rezerwacji
```javascript
const { data, error } = await supabase
  .from('table_reservations')
  .insert({
    user_id: user.id,
    restaurant_id: restaurant.id,
    reservation_date: '2025-10-20 19:00:00',
    party_size: 4,
    status: 'pending'
  });
```

---

## 📊 Przykładowe Dane

### Użytkownik
```json
{
  "id": "uuid-123",
  "email": "jan.kowalski@example.com",
  "user_metadata": {
    "first_name": "Jan",
    "last_name": "Kowalski",
    "phone": "+48 123 456 789",
    "address": "ul. Przykładowa 123/45",
    "city": "Warszawa"
  }
}
```

### Zamówienie
```json
{
  "id": "uuid-456",
  "user_id": "uuid-123",
  "restaurant_id": "uuid-789",
  "restaurant_name": "Pizza Palace",
  "dish_name": "Margherita",
  "total_price": 25.00,
  "status": "delivered",
  "created_at": "2025-10-16T14:30:00Z"
}
```

### Rezerwacja
```json
{
  "id": "uuid-789",
  "user_id": "uuid-123",
  "restaurant_id": "uuid-789",
  "reservation_date": "2025-10-20T19:00:00Z",
  "party_size": 4,
  "table_number": 12,
  "status": "confirmed",
  "created_at": "2025-10-16T15:00:00Z"
}
```

---

**Masz więcej pytań? Sprawdź inne pliki dokumentacji!** 📚

