# 📦 INSTALACJA ULEPSZEŃ ADMIN PANELU

## Krok 1: Zainstaluj zależności

```bash
cd freeflow-frontend-main
npm install jspdf jspdf-autotable xlsx html2canvas socket.io-client
```

## Krok 2: Sprawdź strukturę plików

Upewnij się, że masz:
```
src/
  components/
    admin/
      AdvancedFilters.jsx ✅
      ComparisonMode.jsx ✅
      ExportButton.jsx ✅
  hooks/
    useRealtimeMetrics.js ✅
  utils/
    exportData.js ✅
```

## Krok 3: Integracja z AdminPanel.jsx

Zobacz szczegółowe instrukcje w `ADMIN_PANEL_INTEGRATION.md`

## Krok 4: (Opcjonalnie) WebSocket Backend

Jeśli chcesz real-time updates, dodaj WebSocket support do backendu.
Zobacz przykład w `ADMIN_PANEL_INTEGRATION.md`

## Krok 5: Testowanie

1. Uruchom frontend: `npm run dev`
2. Przejdź do Admin Panel
3. Przetestuj:
   - ✅ Filtry (kliknij "🔍 Filtry")
   - ✅ Eksport (kliknij "📥 Eksport")
   - ✅ Comparison Mode (jeśli dodany)
   - ✅ Real-time (jeśli WebSocket skonfigurowany)

## 🐛 Rozwiązywanie problemów

### Błąd: "Cannot find module 'jspdf'"
```bash
npm install jspdf jspdf-autotable
```

### Błąd: "Cannot find module 'xlsx'"
```bash
npm install xlsx
```

### Błąd: "Cannot find module 'html2canvas'"
```bash
npm install html2canvas
```

### Błąd: "Cannot find module 'socket.io-client'"
```bash
npm install socket.io-client
```

### Błąd: "Module not found: '../hooks/useRealtimeMetrics'"
Upewnij się, że plik istnieje w `src/hooks/useRealtimeMetrics.js`

---

**Gotowe!** 🎉 Panel jest teraz uzbrojony!


