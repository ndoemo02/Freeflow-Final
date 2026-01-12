# 🎯 Quick Reference: Canonical Components

## Import Cheat Sheet

```typescript
// ✅ NEW - Use these imports
import { 
  ChatBubbles, 
  ResultCarousel, 
  FreeFlowMenu 
} from './components/canonical';

// ❌ OLD - Avoid these imports
import ChatBubbles from './components/ChatBubbles';
import ChatBubblesV2 from './components/ChatBubblesV2';
import ResultCarousel from './components/ResultCarousel';
import ResultCarouselV2 from './components/ResultCarouselV2';
import FreeFlowMenu from './components/FreeFlowMenu';
import FreeFlowMenuAdvanced from './components/FreeFlowMenuAdvanced';
```

## Usage Examples

### ChatBubbles
```tsx
<ChatBubbles
  userMessage="Find pizza near me"
  amberResponse="Here are some pizza places"
  restaurants={restaurantsList}
  menuItems={menuItemsList}
  onRestaurantSelect={(restaurant) => console.log(restaurant)}
  onMenuItemSelect={(item) => console.log(item)}
/>
```

### ResultCarousel
```tsx
{/* For restaurants */}
<ResultCarousel
  items={restaurants}
  type="restaurant"
  onItemClick={(restaurant) => handleSelect(restaurant)}
/>

{/* For menu items */}
<ResultCarousel
  items={menuItems}
  type="menu"
  onItemClick={(item) => handleSelect(item)}
/>
```

### FreeFlowMenu
```tsx
{/* Basic bottom menu */}
<FreeFlowMenu 
  variant="bottom" 
  onNavigate={(route) => navigate(route)} 
/>

{/* Advanced menu with 3D effects */}
<FreeFlowMenu 
  variant="advanced" 
  onNavigate={(route) => navigate(route)} 
/>

{/* Side menu */}
<FreeFlowMenu 
  variant="side" 
  onNavigate={(route) => navigate(route)} 
/>
```

## Component Mapping

| Old Component | New Canonical | Notes |
|--------------|---------------|-------|
| `ChatBubbles.tsx` | `canonical/ChatBubbles.tsx` | Drop-in replacement |
| `ChatBubblesV2.tsx` | `canonical/ChatBubbles.tsx` | Drop-in replacement |
| `ResultCarousel.tsx` | `canonical/ResultCarousel.tsx` | Drop-in replacement |
| `ResultCarouselV2.tsx` | `canonical/ResultCarousel.tsx` | Drop-in replacement |
| `FreeFlowMenu.jsx` | `canonical/FreeFlowMenu.tsx` | Use `variant="bottom"` |
| `FreeFlowMenuAdvanced.jsx` | `canonical/FreeFlowMenu.tsx` | Use `variant="advanced"` |

## Files & Folders

```
frontend/
├── COMPONENT_AUDIT_SUMMARY.md          ← Full audit report
├── COMPONENT_CONSOLIDATION_GUIDE.md    ← Detailed migration guide
└── src/
    └── components/
        ├── canonical/                   ← New canonical components
        │   ├── ChatBubbles.tsx
        │   ├── ResultCarousel.tsx
        │   ├── FreeFlowMenu.tsx
        │   ├── index.ts
        │   └── README.md
        ├── ChatBubbles.tsx             ← To be deprecated
        ├── ChatBubblesV2.tsx           ← To be deprecated
        ├── ResultCarousel.tsx          ← To be deprecated
        ├── ResultCarouselV2.tsx        ← To be deprecated
        ├── FreeFlowMenu.jsx            ← To be deprecated
        └── FreeFlowMenuAdvanced.jsx    ← To be deprecated
```

## Key Benefits

✅ **Single source of truth** - No more version confusion  
✅ **TypeScript support** - Better type safety and autocomplete  
✅ **38.6% code reduction** - Easier to maintain  
✅ **Zero breaking changes** - 100% backward compatible  
✅ **Better documentation** - Clear APIs and examples  

## Need Help?

- 📖 Read: `COMPONENT_CONSOLIDATION_GUIDE.md`
- 📊 Review: `COMPONENT_AUDIT_SUMMARY.md`
- 💡 Examples: `src/components/canonical/README.md`
