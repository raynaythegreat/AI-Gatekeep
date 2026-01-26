# Mobile Integration & Model Selector Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix model selector dropdown positioning, ensure mobile deployment works end-to-end, add retry functionality to settings, and deploy mobile app to Vercel.

**Architecture:**
1. Model selector: Use React Portal + auto-detect viewport position to dropdown intelligently
2. Mobile deployment: Leverage existing ngrok-wrapper.js and app/api/mobile/deploy/route.ts, fix repository casing
3. Settings: Add retry buttons and connection status indicators
4. Deployment: Use VercelService to deploy from raynaythegreat/OS-Athena-Mobile

**Tech Stack:** React/Next.js (TSX), TypeScript, Electron, ngrok CLI, Vercel API, GitHub API

---

## Task 1: Fix Model Selector Dropdown Positioning

**Issue:** Dropdown opens downward (`top-full`) but user wants smart auto-positioning.

**Files:**
- Modify: `components/chat/ModelSelector.tsx`
- Create: `components/chat/useDropdownPosition.ts` (new hook)

**Step 1: Create useDropdownPosition hook**

```typescript
// components/chat/useDropdownPosition.ts
import { useState, useEffect, useRef } from 'react';

interface Position {
  top?: string;
  bottom?: string;
  maxHeight: string;
}

export function useDropdownPosition(triggerRef: React.RefObject<HTMLButtonElement>, isOpen: boolean) {
  const [position, setPosition] = useState<Position>({ top: '100%', maxHeight: '400px' });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const dropdownHeight = 400; // max-height

    // Prefer downward if enough space, otherwise go up
    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      setPosition({ top: 'calc(100% + 8px)', maxHeight: `${Math.min(spaceBelow - 16, 400)}px` });
    } else {
      setPosition({ bottom: 'calc(100% + 8px)', maxHeight: `${Math.min(spaceAbove - 16, 400)}px` });
    }
  }, [isOpen, triggerRef]);

  return position;
}
```

**Step 2: Update ModelSelector to use positioning hook**

In `components/chat/ModelSelector.tsx`:

1. Add import at top:
```typescript
import { useDropdownPosition } from './useDropdownPosition';
```

2. Add ref to button (around line 329):
```typescript
const triggerButtonRef = useRef<HTMLButtonElement>(null);
```

3. Use hook (after line 84):
```typescript
const dropdownPosition = useDropdownPosition(triggerButtonRef, isOpen);
```

4. Update button ref (line 329):
```typescript
<button
  ref={triggerButtonRef}
  onClick={() => setIsOpen(!isOpen)}
  // ... rest of button props
>
```

5. Update dropdown container styles (line 353):
```tsx
{isOpen && (
  <div
    className="absolute left-0 w-80 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl z-50 animate-in fade-in duration-200"
    style={{
      top: dropdownPosition.top,
      bottom: dropdownPosition.bottom,
      maxHeight: dropdownPosition.maxHeight
    }}
  >
```

6. Update scroll container (line 365):
```tsx
<div className="overflow-y-auto p-2" style={{ maxHeight: dropdownPosition.maxHeight }}>
```

**Step 3: Test model selector**

```bash
# Run the app
npm run dev:electron

# Manual test:
# 1. Click model selector button near top of screen
# 2. Dropdown should open DOWNWARD
# 3. Click model selector near bottom of screen
# 4. Dropdown should open UPWARD
```

**Step 4: Commit**

```bash
git add components/chat/ModelSelector.tsx components/chat/useDropdownPosition.ts
git commit -m "feat: add smart auto-positioning for model selector dropdown

- Creates useDropdownPosition hook for intelligent positioning
- Detects available space and opens upward/downward accordingly
- Prevents dropdown from being cut off at viewport edges"
```

---

## Task 2: Fix Mobile Repository Casing

**Issue:** Modal uses incorrect casing `Raynaythegreat/OS-Athena-Mobile`, should be `raynaythegreat/OS-Athena-Mobile`.

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx`

**Step 1: Update default repository (line 59 and 104)**

```typescript
const [repository, setRepository] = useState(preForkedRepo || 'raynaythegreat/OS-Athena-Mobile');
```

And (line 104):
```typescript
setRepository(preForkedRepo || 'raynaythegreat/OS-Athena-Mobile');
```

**Step 2: Update fork detection (line 120)**

```typescript
const fork = await github.findForkOfRepository('raynaythegreat/OS-Athena-Mobile');
```

**Step 3: Test**

```bash
# Open mobile deployment modal
# Verify default repo shows as raynaythegreat/OS-Athena-Mobile
```

**Step 4: Commit**

```bash
git add components/settings/MobileDeploymentModal.tsx
git commit -m "fix: correct mobile repository casing to raynaythegreat/OS-Athena-Mobile"
```

---

## Task 3: Verify Ngrok Auto-Start Integration

**Files:**
- Verify: `electron/main.js`
- Verify: `lib/ngrok.ts`
- Verify: `electron/ngrok-wrapper.js`

**Step 1: Check electron/main.js has ngrok auto-start**

The main.js should already have this from previous work. Verify:
- `ngrokWrapper` is imported
- `autoStartNgrokForElectron()` is called on app ready
- ngrok is cleaned up on app quit

**Step 2: Verify lib/ngrok.ts ensureNgrokTunnel function**

```typescript
// Should have this export
export async function ensureNgrokTunnel(port: number, apiKey?: string): Promise<{
  success: boolean;
  publicUrl?: string;
  tunnelId?: string;
  error?: string;
}>
```

**Step 3: Test ngrok auto-start**

```bash
# Kill any existing ngrok processes
pkill ngrok || true

# Build and run app
npm run build
npm run start

# Check if ngrok tunnel is created automatically
# Should see ngrok process running
curl http://localhost:4551/api/tunnels  # ngrok API
```

**Step 4: If working, no commit needed. If fixes needed, commit:**

```bash
git add electron/main.js lib/ngrok.ts
git commit -m "fix: ensure ngrok tunnel auto-starts on app launch"
```

---

## Task 4: Add Retry Buttons to Settings Connection Status

**Files:**
- Modify: `components/settings/SettingsPage.tsx`

**Step 1: Add retry function (after existing test functions)**

Find the connection status section (around line 400-450) and add:

```typescript
// Add retry function for failed providers
const retryFailedConnections = async () => {
  const failedProviders = Object.entries(testResults)
    .filter(([_, result]) => result.status === 'error' || result.status === 'not_configured')
    .map(([provider, _]) => provider);

  for (const provider of failedProviders) {
    await testProvider(provider as any);
  }
};
```

**Step 2: Update connection status header to include retry button**

Find where it says "Connection Status" and add button nearby:

```tsx
<div className="flex items-center justify-between mb-4">
  <h3 className="text-lg font-bold">Connection Status</h3>
  <button
    onClick={retryFailedConnections}
    disabled={testing === 'all'}
    className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-1"
  >
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-4H6a2 2 0 00-2 2v-6h12a2 2 0 002 2 12 0 00-16 0 0 008 0zm0 8a8 8 0 0118 0 8 8 0 0118 0z" />
    </svg>
    Retry Failed
  </button>
</div>
```

**Step 3: Test**

```bash
# Open Settings
# Remove an API key to make it fail
# Click "Retry Failed" button
# Should re-test only failed providers
```

**Step 4: Commit**

```bash
git add components/settings/SettingsPage.tsx
git commit -m "feat: add retry button for failed API connections in Settings"
```

---

## Task 5: Add Troubleshooting Tips to Settings

**Files:**
- Modify: `components/settings/SettingsPage.tsx`

**Step 1: Add troubleshooting section after connection status**

```tsx
{/* Troubleshooting Section */}
<div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
  <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Troubleshooting
  </h4>
  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
    <li>• <strong>Ngrok tunnel fails?</strong> Ensure ngrok CLI is installed and API key is valid.</li>
    <li>• <strong>Vercel deployment fails?</strong> Check that the repository exists and is connected to Vercel.</li>
    <li>• <strong>GitHub operations fail?</strong> Verify token has repo permissions.</li>
    <li>• <strong>Connection lost?</strong> Click "Retry Failed" to re-test all connections.</li>
  </ul>
</div>
```

**Step 2: Test**

```bash
# Verify troubleshooting section appears in Settings
# Check dark/light mode styling
```

**Step 3: Commit**

```bash
git add components/settings/SettingsPage.tsx
git commit -m "feat: add troubleshooting tips to Settings page"
```

---

## Task 6: Verify All API Providers Work

**Files:**
- Verify: `services/apiTester.ts`
- Verify: `app/api/test-key/route.ts`

**Step 1: Verify all providers have test methods**

In `services/apiTester.ts`, check these exist:
```typescript
static testAnthropic(apiKey)
static testOpenAI(apiKey)
static testGroq(apiKey)
static testGemini(apiKey)
static testOpenRouter(apiKey)
static testFireworks(apiKey)
static testMistral(apiKey)
static testRender(apiKey)
static testNgrok(apiKey)
static testZai(apiKey)
```

**Step 2: Verify route has all cases**

In `app/api/test-key/route.ts`, verify switch has:
- anthropic
- openai
- groq
- gemini
- openrouter
- fireworks
- mistral
- render
- ngrok
- zai

**Step 3: Test each provider**

```bash
# For each configured provider in Settings:
# 1. Click "Test" button
# 2. Should show green checkmark with "Connected" or "Configured"
# 3. Test error handling with invalid key
```

**Step 4: If any missing, add and commit:**

```bash
git add services/apiTester.ts app/api/test-key/route.ts
git commit -m "fix: ensure all API providers have test methods"
```

---

## Task 7: Deploy Mobile App to Vercel

**Goal:** Deploy the mobile webapp from raynaythegreat/OS-Athena-Mobile to Vercel.

**Prerequisites:**
- GitHub CLI installed and authenticated
- Vercel token configured
- Ngrok API key configured
- Repository raynaythegreat/OS-Athena-Mobile exists

**Step 1: Verify mobile repository exists**

```bash
gh repo view raynaythegreat/OS-Athena-Mobile
```

If error, create it:
```bash
gh repo create OS-Athena-Mobile --public --source=. --remote=origin --push
```

**Step 2: Start OS Athena app**

```bash
npm run dev:electron
# Or run built version
npm run start
```

**Step 3: In the app:**

1. Go to Settings
2. Verify API keys are configured (Ngrok, Vercel, GitHub)
3. Test each connection - all should be green
4. Go to Mobile page
5. Click "Launch Mobile Version"
6. Enter repository: `raynaythegreat/OS-Athena-Mobile`
7. Enter a password (min 4 characters)
8. Click "Launch Mobile Version"

**Step 4: Watch deployment logs**

The modal will show:
- Creating ngrok tunnel...
- Deploying to Vercel...
- Building...
- ✓ Ready

**Step 5: Verify mobile URL opens**

A new tab should open with the deployed mobile app. The mobile app should:
- Connect to your local OS Athena via ngrok tunnel
- Show password prompt
- Allow chat interaction

**Step 6: Save deployment info**

After successful deployment, note:
- Mobile URL
- Tunnel URL
- Deployment ID

**Step 7: Update README with mobile URL (if applicable)**

If deployment succeeds and you want to document:

```bash
# Edit README.md to add mobile deployment section
git add README.md
git commit -m "docs: add mobile deployment URL and instructions"
```

---

## Task 8: Final Testing and Verification

**Step 1: Test model selector**

- [ ] Click near top of screen - dropdown opens downward
- [ ] Click near bottom of screen - dropdown opens upward
- [ ] Search works
- [ ] Model selection persists
- [ ] All providers show models

**Step 2: Test mobile deployment**

- [ ] Ngrok tunnel auto-starts on app launch
- [ ] Mobile deployment modal opens
- [ ] Repository defaults to correct casing
- [ ] Deployment succeeds
- [ ] Mobile URL opens and connects
- [ ] Can chat from mobile interface

**Step 3: Test settings**

- [ ] All API providers can be tested
- [ ] Retry button works for failed connections
- [ ] Troubleshooting tips visible
- [ ] Connection status updates correctly

**Step 4: Build production version**

```bash
npm run build
npm run start  # Test production build
```

**Step 5: Final commit if any fixes needed**

```bash
git add .
git commit -m "fix: final adjustments from testing"
```

---

## Files Modified

1. `components/chat/ModelSelector.tsx` - Add smart positioning
2. `components/chat/useDropdownPosition.ts` - NEW - positioning hook
3. `components/settings/MobileDeploymentModal.tsx` - Fix repo casing
4. `components/settings/SettingsPage.tsx` - Add retry buttons and troubleshooting
5. `services/apiTester.ts` - Verify all providers
6. `app/api/test-key/route.ts` - Verify all cases

---

## Verification Checklist

- [ ] Model selector opens upward when near bottom, downward when near top
- [ ] Mobile repository name is `raynaythegreat/OS-Athena-Mobile`
- [ ] Ngrok tunnel auto-starts on app launch
- [ ] Mobile deployment to Vercel succeeds
- [ ] Mobile app connects back to local desktop via ngrok
- [ ] Settings has retry button for failed connections
- [ ] Settings has troubleshooting tips
- [ ] All API providers test successfully
- [ ] Production build works correctly

---

## Execution Order

1. Fix model selector dropdown (Task 1)
2. Fix mobile repository casing (Task 2)
3. Verify ngrok auto-start (Task 3)
4. Add retry buttons (Task 4)
5. Add troubleshooting tips (Task 5)
6. Verify all API providers (Task 6)
7. Deploy mobile to Vercel (Task 7)
8. Final testing (Task 8)
