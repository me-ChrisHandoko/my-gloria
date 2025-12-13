# Prioritas 3 Testing Guide - Optimizations & Enhancements

**Test Coverage:** Progressive Loading, Skeleton Loaders, Multi-Tab Sync
**Last Updated:** December 10, 2025

---

## 📋 Overview

This guide covers testing for Prioritas 3 enhancements:
1. **Progressive Loading States** - Multi-stage loading with progress indicators
2. **Skeleton Loaders** - Content-aware loading placeholders
3. **Multi-Tab Synchronization** - Cross-tab auth state sync

---

## 🧪 Test Suite 1: Progressive Loading

### Test 1.1: Loading Stage Progression

**Objective:** Verify loading stages progress correctly

**Steps:**
1. Clear browser cache
2. Open `http://localhost:3000`
3. Monitor loading screen during login

**Expected Result:**
```
Stage 1: "Authenticating..." (25% progress)
  ↓ (automatically after Clerk loads)
Stage 2: "Loading profile..." (50% progress)
  ↓ (automatically when backend call starts)
Stage 3: "Processing permissions..." (75% progress)
  ↓ (automatically when data received)
Stage 4: "Almost ready..." (90% progress)
  ↓ (0.3s delay for UX)
Dashboard renders
```

**Verification Checklist:**
- [ ] Progress bar animates smoothly
- [ ] Stage text updates match progress
- [ ] Icons change appropriately (Shield/User)
- [ ] Progress percentage matches stage
- [ ] Total time < 3 seconds (normal network)
- [ ] No flash of unstyled content (FOUC)

**Screenshots Required:**
- Each loading stage (4 screenshots)
- Progress bar animation
- Final dashboard render

---

### Test 1.2: Loading Stage Timing

**Objective:** Verify timing between stages is appropriate

**Setup:**
```typescript
// In browser console during login:
const stages = [];
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.name.includes('auth')) {
      stages.push({ name: entry.name, duration: entry.duration });
    }
  });
});
observer.observe({ entryTypes: ['measure'] });
```

**Expected Timing:**
```
Authenticating → Fetching: ~500-1000ms (Clerk init)
Fetching → Processing: ~200-500ms (backend call)
Processing → Finalizing: ~300ms (hardcoded delay)
Finalizing → Dashboard: ~100ms (React render)

Total: 1.1-1.9 seconds (optimal)
```

**Failure Thresholds:**
- ⚠️ Warning: > 3 seconds total
- ❌ Failure: > 5 seconds total
- 🚨 Critical: > 10 seconds total

---

### Test 1.3: Error During Loading

**Objective:** Verify proper error handling during progressive loading

**Test Cases:**

**Case A: Backend Returns 401**
```
1. Start login
2. Backend returns 401 (mock or real expired token)
3. Expected: Token auto-refreshes, loading continues
4. Verify: No error shown, seamless retry
```

**Case B: Backend Returns 404**
```
1. Login with new Clerk user (not in backend)
2. Stage 2 "Loading profile..." → 404 error
3. Expected: UserNotFoundError screen appears
4. Verify: User has 3 action buttons (Retry, Sign Out, Contact)
```

**Case C: Network Error**
```
1. Start login
2. Disconnect network during fetch
3. Expected: Error message appears
4. Verify: Error boundary catches error gracefully
```

---

## 🧪 Test Suite 2: Skeleton Loaders

### Test 2.1: Full Page Skeleton

**Objective:** Verify skeleton loaders match final layout

**Steps:**
1. Clear cache
2. Open `http://localhost:3000`
3. Compare skeleton layout with final dashboard

**Visual Comparison:**
```
Skeleton Layout:
┌──────────────────────────────────────┐
│ [Sidebar]  │ [Header]                │
│            │ ─────────────────────────│
│ [Menu]     │ [Content Grid]          │
│ [Menu]     │ [□□□]                   │
│ [Menu]     │                         │
│            │ [Table]                 │
│ [Footer]   │ [═══════════]          │
└──────────────────────────────────────┘

Final Layout:
┌──────────────────────────────────────┐
│ [Sidebar]  │ [Header]                │
│            │ ─────────────────────────│
│ [Menu]     │ [Stats Cards]           │
│ [Menu]     │ [Card] [Card] [Card]   │
│ [Menu]     │                         │
│            │ [Data Table]            │
│ [User]     │ [Row] [Row] [Row]      │
└──────────────────────────────────────┘
```

**Verification Checklist:**
- [ ] Skeleton matches final layout structure
- [ ] Animation is smooth (60fps)
- [ ] No layout shift (CLS < 0.1)
- [ ] Skeleton disappears when data loads
- [ ] Transition is smooth (no flicker)

---

### Test 2.2: Individual Skeleton Components

**Test Each Component:**

**A. AuthSidebarSkeleton**
```
Location: Left sidebar
Elements: Header, Menu items (6), Footer
Animation: Staggered (50ms delay per item)
Verify: Matches app-sidebar.tsx layout
```

**B. AuthUserProfileSkeleton**
```
Location: User profile page
Elements: Avatar, Name, Email, Badges, Info rows
Animation: Fade-in
Verify: No content jump when real data loads
```

**C. AuthTableSkeleton**
```
Location: Data tables
Elements: Header row, 5-8 data rows, 4-5 columns
Animation: Pulse
Verify: Column widths match final table
```

**D. AuthModulesSkeleton**
```
Location: Module cards grid
Elements: 4 cards in grid layout
Animation: Staggered by 100ms
Verify: Card sizes match final modules
```

**Verification for Each:**
- [ ] Layout matches final component
- [ ] Animation performs smoothly
- [ ] No flicker during transition
- [ ] Accessible (screen reader announces "Loading")

---

### Test 2.3: Performance Metrics

**Objective:** Verify skeleton loaders improve perceived performance

**Metrics to Measure:**
```javascript
// In browser console:
const perfObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'first-contentful-paint') {
      console.log('FCP:', entry.startTime);
    }
    if (entry.name === 'largest-contentful-paint') {
      console.log('LCP:', entry.startTime);
    }
  }
});
perfObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
```

**Target Metrics:**
```
Without Skeletons (Before):
  FCP: ~2000ms
  LCP: ~3500ms
  User perception: "Slow"

With Skeletons (After):
  FCP: ~300ms  (skeleton renders)
  LCP: ~3500ms (same as before)
  User perception: "Fast" (content visible immediately)
```

**Success Criteria:**
- ✅ FCP < 500ms with skeletons
- ✅ LCP unchanged (< 3.5s)
- ✅ CLS < 0.1 (no layout shift)
- ✅ User perception improves (subjective test)

---

## 🧪 Test Suite 3: Multi-Tab Synchronization

### Test 3.1: Logout Synchronization

**Objective:** Verify logout in one tab logs out all tabs

**Setup:**
1. Open 3 browser tabs: Tab A, Tab B, Tab C
2. Login in all tabs
3. Verify all tabs show dashboard

**Test Steps:**
```
1. In Tab A: Click logout
2. Expected in Tab A:
   - Immediate redirect to /sign-in
   - Redux state cleared
   - RTK Query cache cleared

3. Expected in Tab B & C (within 1 second):
   - Automatic redirect to /sign-in
   - Console shows: "[AuthSync] Logout detected from another tab"
   - Redux state cleared
   - Page reloads
```

**Verification Checklist:**
- [ ] Tab A redirects immediately
- [ ] Tab B & C redirect within 1 second
- [ ] All tabs show sign-in page
- [ ] No errors in console (any tab)
- [ ] BroadcastChannel message logged
- [ ] localStorage fallback works (disable BroadcastChannel to test)

**Browser Support Test:**
```
Chrome: ✅ BroadcastChannel supported
Firefox: ✅ BroadcastChannel supported
Safari: ✅ BroadcastChannel supported (v15.4+)
Edge: ✅ BroadcastChannel supported
IE11: ❌ Fallback to localStorage events
```

---

### Test 3.2: Login Synchronization

**Objective:** Verify login in one tab updates all tabs

**Setup:**
1. Open 3 tabs, all logged out
2. Tabs show /sign-in page

**Test Steps:**
```
1. In Tab A: Login via Clerk
2. Expected in Tab A:
   - Dashboard loads
   - User context populated

3. Expected in Tab B & C (within 1 second):
   - Page reloads automatically
   - Console shows: "[AuthSync] Login detected from another tab"
   - After reload: Dashboard loads
   - User context populated
```

**Verification Checklist:**
- [ ] Tab A logs in successfully
- [ ] Tab B & C reload within 1 second
- [ ] All tabs show dashboard after reload
- [ ] All tabs have same user context
- [ ] No duplicate backend calls (check Network tab)

---

### Test 3.3: User Context Update Synchronization

**Objective:** Verify user data updates sync across tabs

**Setup:**
1. Login in 3 tabs
2. All tabs show dashboard

**Test Steps:**
```
1. Simulate user context update:
   // In Tab A console:
   window.dispatchEvent(new Event('user-context-updated'));

2. Expected in Tab B & C:
   - Console shows: "[AuthSync] User context updated in another tab"
   - Redux state updates
   - UI updates to reflect new data
```

**Verification Checklist:**
- [ ] BroadcastChannel message sent
- [ ] Other tabs receive message
- [ ] Redux state updates in all tabs
- [ ] UI refreshes in all tabs
- [ ] No full page reload (only state update)

---

### Test 3.4: Message Debouncing

**Objective:** Verify messages are debounced to prevent loops

**Setup:**
1. Open 2 tabs
2. Login in both

**Test Steps:**
```
1. In Tab A: Trigger rapid logout/login cycles
2. Monitor console in both tabs
3. Expected:
   - Messages debounced (1 second cooldown)
   - Only 1 message processed per second
   - No infinite loops
```

**Verification Checklist:**
- [ ] Messages debounced correctly
- [ ] No infinite message loops
- [ ] Console shows debounce logs
- [ ] Performance remains smooth
- [ ] No memory leaks (check DevTools Memory)

---

### Test 3.5: localStorage Fallback

**Objective:** Verify fallback works when BroadcastChannel unavailable

**Setup:**
```javascript
// In one tab console, disable BroadcastChannel:
window.BroadcastChannel = undefined;
```

**Test Steps:**
```
1. Reload page
2. Console should show: "BroadcastChannel not supported, using localStorage fallback"
3. Perform logout/login tests
4. Expected:
   - Synchronization still works
   - Uses storage events instead
   - Slightly slower (2-3 second delay)
```

**Verification Checklist:**
- [ ] Fallback activates automatically
- [ ] Console shows fallback message
- [ ] Logout sync works via localStorage
- [ ] Login sync works via localStorage
- [ ] No errors in console

---

## 📊 Performance Benchmarks

### Progressive Loading Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total loading time | < 3s | ___s | ⏳ |
| FCP (First Contentful Paint) | < 500ms | ___ms | ⏳ |
| LCP (Largest Contentful Paint) | < 3.5s | ___s | ⏳ |
| CLS (Cumulative Layout Shift) | < 0.1 | ___ | ⏳ |
| Stage transition time | < 100ms | ___ms | ⏳ |

### Skeleton Loader Benchmarks

| Component | Render Time | Animation FPS | Layout Shift |
|-----------|-------------|---------------|--------------|
| Sidebar Skeleton | < 50ms | 60fps | 0 |
| Table Skeleton | < 100ms | 60fps | 0 |
| Card Skeleton | < 30ms | 60fps | 0 |
| Full Page Skeleton | < 200ms | 60fps | 0 |

### Multi-Tab Sync Benchmarks

| Operation | Latency | Success Rate | Fallback Time |
|-----------|---------|--------------|---------------|
| Logout sync | < 1s | 100% | < 3s |
| Login sync | < 1s | 100% | < 3s |
| Context update | < 500ms | 100% | < 2s |
| Message debounce | 1s cooldown | 100% | N/A |

---

## ✅ Test Completion Checklist

### Progressive Loading
- [ ] All 4 stages display correctly
- [ ] Progress bar animates smoothly
- [ ] Timing is appropriate (< 3s total)
- [ ] Error handling works for all cases
- [ ] Performance metrics meet targets

### Skeleton Loaders
- [ ] All skeleton components render
- [ ] Layout matches final components
- [ ] No layout shift (CLS < 0.1)
- [ ] Animation is smooth (60fps)
- [ ] Transition to real content is seamless

### Multi-Tab Sync
- [ ] Logout syncs across all tabs
- [ ] Login syncs across all tabs
- [ ] User context updates sync
- [ ] Message debouncing works
- [ ] localStorage fallback works
- [ ] All browsers supported

### Performance
- [ ] FCP < 500ms
- [ ] LCP < 3.5s
- [ ] CLS < 0.1
- [ ] No memory leaks
- [ ] 60fps animations

---

## 🐛 Known Issues & Limitations

### Issue 1: localStorage Fallback Delay
**Description:** localStorage events have 2-3 second delay vs BroadcastChannel (< 1s)
**Impact:** Minor UX degradation in old browsers
**Workaround:** Acceptable trade-off for compatibility

### Issue 2: Processing Stage Artificial Delay
**Description:** 300ms setTimeout in processing stage for better UX
**Impact:** Adds 300ms to total loading time
**Rationale:** Prevents jarring instant transitions

### Issue 3: Cross-Origin Tab Sync
**Description:** BroadcastChannel doesn't work across different origins
**Impact:** Multi-tab sync only works for same origin
**Limitation:** By design, cannot sync across different domains

---

## 📝 Test Report Template

```markdown
# Prioritas 3 Test Report

**Tester:** ___________
**Date:** ___________
**Browser:** ___________
**Version:** ___________

## Progressive Loading Tests
- [ ] Test 1.1: Stage Progression - PASS/FAIL
- [ ] Test 1.2: Timing - PASS/FAIL
- [ ] Test 1.3: Error Handling - PASS/FAIL

## Skeleton Loader Tests
- [ ] Test 2.1: Full Page Skeleton - PASS/FAIL
- [ ] Test 2.2: Individual Components - PASS/FAIL
- [ ] Test 2.3: Performance Metrics - PASS/FAIL

## Multi-Tab Sync Tests
- [ ] Test 3.1: Logout Sync - PASS/FAIL
- [ ] Test 3.2: Login Sync - PASS/FAIL
- [ ] Test 3.3: Context Update - PASS/FAIL
- [ ] Test 3.4: Debouncing - PASS/FAIL
- [ ] Test 3.5: Fallback - PASS/FAIL

## Performance Benchmarks
| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| FCP | < 500ms | ___ms | □ |
| LCP | < 3.5s | ___s | □ |
| CLS | < 0.1 | ___ | □ |

## Issues Found
1. ___________________
2. ___________________
3. ___________________

## Overall Result
□ All tests passed - Ready for production
□ Minor issues - Acceptable for production
□ Major issues - Requires fixes before production
```

---

**Testing Guide Complete** ✅
**Ready for QA Team** 🚀
