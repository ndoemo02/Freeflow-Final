# Frontend Smoke Test Proposal

**Role**: Frontend QA Agent  
**Context**: UI Stabilization Completed  
**Scope**: Minimal smoke tests (no E2E, no backend mocking)  
**Focus**: Highest risk components that could break user experience  

---

## 🎯 Proposed Smoke Tests (5-8 Tests)

### 1. **ChatBubbles: Message Rendering & Scroll Behavior**
**File**: `ChatBubbles.smoke.test.tsx`  
**What it verifies**:
- Messages array renders correctly (user + assistant bubbles)
- Auto-scroll triggers when new messages are added
- Duplicate message prevention logic works
- Message updates (restaurants/menu enrichment) don't duplicate bubbles

**Why critical**: Core conversation UI - if this breaks, users can't see responses

**Test approach**:
```typescript
// Render with initial messages → verify count
// Add message → verify scroll ref called
// Add duplicate message → verify count unchanged
// Update last message with restaurants → verify enriched, not duplicated
```

---

### 2. **ResultCarousel: Item Rendering & Click Handling**
**File**: `ResultCarousel.smoke.test.tsx`  
**What it verifies**:
- Renders restaurant/menu items as cards
- Displays correct item data (name, price, category)
- onClick handler fires when card is clicked
- Empty array doesn't crash (returns null)

**Why critical**: Primary discovery/selection interface for restaurants and menu items

**Test approach**:
```typescript
// Render with restaurant items → verify card count & names
// Render with menu items → verify prices formatted
// Click a card → verify onItemClick called with correct item
// Render with empty items → verify no crash
```

---

### 3. **VoiceCommandCenterV2: Status Transitions & Input Handling**
**File**: `VoiceCommandCenterV2.smoke.test.tsx`  
**What it verifies**:
- AmberIndicator status changes correctly (idle → listening → thinking → ok)
- Text input accepts value and triggers onSubmit on Enter
- Mic button triggers onMicClick when no input present
- Send button appears when text is entered
- Response display mode shows amber response and clears on click

**Why critical**: Primary user input interface - if broken, users can't interact

**Test approach**:
```typescript
// Render with recording=true → verify AmberIndicator has 'listening' status
// Type text + press Enter → verify onTextSubmit called
// Click mic with empty input → verify onMicClick called
// Type text → verify send button appears (not mic)
// Render with amberResponse → verify response shown, click clears it
```

---

### 4. **CartContext: Add/Update/Sync Logic**
**File**: `CartContext.smoke.test.tsx`  
**What it verifies**:
- addToCart adds new items correctly
- addToCart increments quantity for existing items
- Cart cross-restaurant validation prompts confirmation
- syncCart updates cart state from backend data
- localStorage persistence works

**Why critical**: Core ordering functionality - data loss or duplication breaks orders

**Test approach**:
```typescript
// Render CartProvider → add item → verify cart state updated
// Add same item again → verify quantity increased (not duplicated)
// Add item from different restaurant → verify window.confirm called
// Call syncCart with backend items → verify cart matches backend state
// Reload component → verify cart persisted from localStorage
```

---

### 5. **FreeFlowMenu: Navigation & Rendering Stability**
**File**: `FreeFlowMenu.smoke.test.tsx`  
**What it verifies**:
- Menu renders without crashing
- All menu items/sections are present in DOM
- Click handlers don't throw errors
- Menu state (open/closed) toggles correctly

**Why critical**: Navigation hub - if broken, users can't access key features

**Test approach**:
```typescript
// Render menu → verify no crash
// Verify key menu items exist (by test id or role)
// Simulate menu toggle → verify state changes
// Click menu item → verify onClick handler called
```

---

### 6. **MotionBackground: No Render Errors**
**File**: `MotionBackground.smoke.test.tsx`  
**What it verifies**:
- Component renders without throwing
- Canvas/SVG elements are created (if applicable)
- No runtime errors in animation logic

**Why critical**: Background visual component - errors can crash entire app due to global scope

**Test approach**:
```typescript
// Render component → verify no crash
// Verify container element exists
// Mock animation frame → verify no errors on updates
```

---

### 7. **Auth Modal: Login/Signup Form Rendering**
**File**: `AuthModal.smoke.test.tsx`  
**What it verifies**:
- Modal renders when `isOpen={true}`
- Login and signup forms render correctly
- Form inputs are present and functional
- Modal close handler works

**Why critical**: Auth gate - if broken, users can't log in and access core features

**Test approach**:
```typescript
// Render with isOpen=false → verify not in document
// Render with isOpen=true → verify modal visible
// Verify email/password inputs exist
// Switch to signup → verify signup form shown
// Click close → verify onClose called
```

---

### 8. **AmberIndicator: Visual State Mapping**
**File**: `AmberIndicator.smoke.test.tsx`  
**What it verifies**:
- Component renders for all status states (idle, listening, thinking, ok, error)
- CSS classes/data attributes match status
- No runtime errors on rapid status changes

**Why critical**: Primary visual feedback for system state - users rely on this to know system is working

**Test approach**:
```typescript
// Render with status='idle' → verify idle class/attribute
// Render with status='listening' → verify listening animation/class
// Rapid status changes → verify no crashes
// Verify animation elements (orbs/circles) are present
```

---

## 🛠️ Testing Stack

- **Framework**: Vitest (already configured in package.json)
- **Testing Library**: `@testing-library/react` (already installed)
- **Mocking**: 
  - `localStorage` → mock in test setup
  - `window.confirm` → `vi.spyOn(window, 'confirm')`
  - `framer-motion` → mock if animations cause issues
  - `supabase` → use existing module mock pattern

---

## 📂 Directory Structure

```
frontend/
  tests/
    smoke/
      SMOKE_TEST_PROPOSAL.md          ← this file
      ChatBubbles.smoke.test.tsx
      ResultCarousel.smoke.test.tsx
      VoiceCommandCenterV2.smoke.test.tsx
      CartContext.smoke.test.tsx
      FreeFlowMenu.smoke.test.tsx
      MotionBackground.smoke.test.tsx
      AuthModal.smoke.test.tsx
      AmberIndicator.smoke.test.tsx
```

---

## 🚀 Running Tests

```bash
npm run test smoke
```

Or add to `package.json`:
```json
"scripts": {
  "test:smoke": "vitest run tests/smoke"
}
```

---

## 🔒 Safety Constraints Met

✅ **No E2E**: All tests are component-level unit/integration tests  
✅ **No Backend Mocking**: CartContext test uses local state, no API calls required  
✅ **Highest Risk Focus**: Selected components based on:
- User-facing critical path (chat, cart, voice input)
- Global error risk (auth, navigation, background)
- Data integrity (cart sync, message deduplication)

---

## 📊 Coverage Rationale

| Component | Risk Level | User Impact | Test Priority |
|-----------|-----------|-------------|---------------|
| ChatBubbles | 🔴 High | Can't see responses | P0 |
| VoiceCommandCenter | 🔴 High | Can't interact | P0 |
| CartContext | 🔴 High | Order data loss | P0 |
| ResultCarousel | 🟡 Medium | Can't select items | P1 |
| AuthModal | 🟡 Medium | Can't log in | P1 |
| AmberIndicator | 🟡 Medium | No feedback | P1 |
| FreeFlowMenu | 🟢 Low | Navigation | P2 |
| MotionBackground | 🟢 Low | Visual polish | P2 |

---

## 📝 Next Steps

1. **Approve this proposal** → Proceed to implementation
2. **Adjust scope** → Add/remove tests based on feedback
3. **Prioritize** → Implement P0 tests first (ChatBubbles, Voice, Cart)

---

**Estimated Implementation Time**: 2-3 hours for all 8 tests  
**Estimated Run Time**: < 5 seconds for full suite
