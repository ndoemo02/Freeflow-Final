# Graph Report - C:\Firerfox Portable\Freeflow brain\frontend\src  (2026-04-15)

## Corpus Check
- 233 files · ~374,893 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 701 nodes · 872 edges · 87 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `VoiceStateManager` - 12 edges
2. `TTSManager` - 10 edges
3. `Logger` - 9 edges
4. `normalizeLoopbackUrlForClient()` - 7 edges
5. `manageTurn()` - 7 edges
6. `api()` - 6 edges
7. `AudioPlayer` - 6 edges
8. `shouldUseDevProxy()` - 6 edges
9. `mapLiveToolResultToUiState()` - 6 edges
10. `AppErrorBoundary` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (2): StatusBadge(), statusMeta()

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (5): normalizeId(), normalizeText(), pickRecommendedRestaurantId(), normalizeText(), pickRecommendedMenuId()

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (5): canAccessWorkspacePanels(), hasWorkspaceAccessFlag(), isObjectRecord(), normalizeEmail(), readFlagCandidate()

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (2): resolveByDistance(), resolveSheetSnap()

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (12): AmberControlDeck(), readLiveModelOverride(), detectBackend(), getApiUrl(), isAbsoluteNetworkUrl(), isLoopbackHost(), isPrivateIpv4Host(), isTunnelHost() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (5): fetchActiveOrders(), fetchBusinessDashboard(), fetchKPIs(), getAdminToken(), getHeaders()

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (11): AudioPlayer, getRelayGPSCoords(), normalizeLoose(), readPersistedGps(), transcriptSuggestsNearbyWithoutExplicitLocation(), buildMenuCategoryIndex(), buildMenuSpeechHints(), compactToolResponse() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (6): Logger, speakTts(), speakWithGender(), speakWithGoogleTTS(), speakWithVoice(), speakWithWebSpeechAPI()

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (8): compactText(), mapLiveToolResultToUiState(), normalizeIntent(), readCartSummary(), readItemSummary(), readRestaurantName(), handleKeyDown(), submit()

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (6): api(), createOrder(), getRestaurantMenu(), getRestaurants(), getUserOrders(), tts()

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (7): bumpOrder(), fetchKDSOrders(), getElapsedMinutes(), getElapsedSeconds(), getHeaders(), getMockKDSData(), markOrderReady()

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (7): base64ToArrayBuffer(), generateTts(), handlePlay(), pcmToWav(), playWithGoogleTTS(), playWithWebSpeechAPI(), writeString()

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (8): addToCart(), clearCart(), getCart(), setCart(), total(), decodeLatin1AsUtf8(), repairMojibakeText(), scoreTextQuality()

### Community 13 - "Community 13"
Cohesion: 0.2
Nodes (1): VoiceStateManager

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (2): getUserRoleInOrg(), hasAccessToOrg()

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (2): KPICard(), toKebabCase()

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (2): getStatusColor(), StatusBadge()

### Community 17 - "Community 17"
Cohesion: 0.26
Nodes (8): extractCartItems(), extractMentionOrderedRestaurantIds(), findRestaurantIdByReference(), getGPSCoords(), normalizeLooseText(), readPersistedGps(), resolveFocusedRestaurantPreviewId(), summarizeCartItems()

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (10): getAnalyticsKPI(), getHourlyDistribution(), getMockAnalyticsKPI(), getMockHourlyDistribution(), getMockOrdersChartData(), getMockTopDishes(), getMockTopRestaurants(), getOrdersChartData() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.36
Nodes (1): TTSManager

### Community 20 - "Community 20"
Cohesion: 0.42
Nodes (9): ensureDefaults(), extractBrandAndCity(), isReady(), manageTurn(), mergeSlots(), nextStep(), norm(), searchMenuItems() (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (2): convertToCSV(), exportMultipleFormats()

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (2): getStableViewportHeight(), syncViewport()

### Community 23 - "Community 23"
Cohesion: 0.32
Nodes (4): createStar(), handleResize(), initStars(), resize()

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (1): AppErrorBoundary

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 0.83
Nodes (3): enrichGoogle(), enrichRestaurant(), geocodeOSM()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 38`** (2 nodes): `HeroRibbon.tsx`, `HeroRibbon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `LogoAnimated.jsx`, `LogoAnimated()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `ActionTiles.jsx`, `ActionTiles()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `AmberCore.tsx`, `AmberCore()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `AmberStatus.jsx`, `AmberStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `ConversationPanel.jsx`, `ConversationPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `DynamicPopups.jsx`, `DynamicPopups()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `FAQAccordion.jsx`, `FAQAccordion()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `FreeFlowFAB.jsx`, `FreeFlowFAB()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `FreeFlowLogo.jsx`, `FreeFlowLogo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `FreeFlowMenu.tsx`, `FreeFlowMenu()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `FreeFlowMenuAdvanced.jsx`, `FreeFlowMenuAdvanced()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `Hero.jsx`, `Hero()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `HeroLogo.jsx`, `HeroLogo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `IslandWrapper.tsx`, `IslandWrapper()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `LiveSessionPopup.jsx`, `LiveSessionPopup()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `LoadingScreen.jsx`, `LoadingScreen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `LogoFreeFlow.jsx`, `LogoFreeFlow()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `MiniCartBoard.jsx`, `MiniCartBoard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (2 nodes): `MotionBackground.tsx`, `MotionBackground()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (2 nodes): `MotionPreview.tsx`, `MotionPreview()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (2 nodes): `PstrykPanel.tsx`, `PstrykPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (2 nodes): `ResultsList.jsx`, `ResultsList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (2 nodes): `RideTab.jsx`, `RideTab()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (2 nodes): `TTSSwitcher.jsx`, `TTSSwitcher()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (2 nodes): `VoiceBar.jsx`, `VoiceBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (2 nodes): `VoiceInputBar.tsx`, `VoiceInputBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (2 nodes): `AdvancedFilters.jsx`, `AdvancedFilters()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (2 nodes): `GalaxyBackground.jsx`, `GalaxyBackground()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (2 nodes): `GalaxyChart.jsx`, `GalaxyChart()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (2 nodes): `PanelLayout.jsx`, `PanelLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (2 nodes): `mic.ts`, `recordOnce()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (2 nodes): `AuthCallback.jsx`, `AuthCallback()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (2 nodes): `CartBoard.jsx`, `CartBoard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (2 nodes): `ChatHistory.tsx`, `ChatHistory()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (2 nodes): `AppLayout.jsx`, `AppLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `setupTests.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `ElectricPanelTest.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `LogoFreeFlow.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `TableReservations.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `StatsWidget.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `MenuView.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `useTypingEffect.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `amber.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `components-modules.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `jsx-modules.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `legacy-components.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TTSManager` connect `Community 19` to `Community 7`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._