# OS Athena: Desktop-Mobile Hub Integration & Bug Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix model selector button not responding, restore API key/provider functionality, ensure desktop is the central hub for all operations with seamless mobile sync.

**Architecture:** Fix root cause of click handler failure, restore API key loading/sync, implement proper desktop-mobile data synchronization using Electron IPC and ngrok tunnel.

**Tech Stack:** React/Next.js (TSX), TypeScript, Electron IPC, SecureStorage, Ngrok, React State Management

---

## Part 1: Fix Model Selector Click Handler

**Root Cause:** The ModelSelector component's button onClick handler is not being called, preventing dropdown from opening.

**Files:**
- Modify: `components/chat/ChatInterface.tsx:1278-1310` (ModelSelector component)

**Investigation:**
The ModelSelector button has an onClick handler but it's not being called. This could be due to:
1. Parent element intercepting clicks
2. Event propagation issues
3. Missing ref attachment

**Step 1: Add console.log to verify click handler is attached**
```tsx
function ModelSelector({ modelName, onToggleDropdown, dropdownOpen, children }: ModelSelectorProps) {
  return (
    <div className="relative flex-1 min-w-[120px] sm:min-w-[140px] flex-shrink-0">
      <button
        onClick={(e) => {
          console.log('ModelSelector button clicked', modelName); // DEBUG
          e.preventDefault();
          e.stopPropagation();
          onToggleDropdown();
        }}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border-2 bg-surface-100 dark:bg-surface-900 border-blue-500/40 text-blue-700 dark:text-blue-200 hover:border-blue-500/60 hover:shadow-flat transition-all duration-150"
        title={modelName}
      >
```

**Step 2: Run app and test if console.log appears**
Run: `npm run dev:electron`
Expected: Console shows "ModelSelector button clicked" when button is clicked

**Step 3: Remove debug log after verification**
```tsx
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  onToggleDropdown();
}}
```

**Step 4: Verify dropdown opens**
- Click model selector button
- Expected: Dropdown appears with list of models

**Step 5: Commit**
```bash
git add components/chat/ChatInterface.tsx
git commit -m "fix: ensure model selector button click handler works"
```

---

## Part 2: Fix API Key Loading from SecureStorage

**Root Cause:** API keys might not be properly loaded from Electron secure storage or passed to Next.js server.

**Files:**
- Modify: `electron/main.js:805-826` (loadDecryptedApiKeys function)
- Check: `lib/secureStorage.ts:48-66` (electronGetKeys function)

**Step 1: Add logging to track key loading**
```javascript
async function loadDecryptedApiKeys() {
  try {
    const encryptedKeys = await loadEncryptedKeys();
    console.log('[loadDecryptedApiKeys] Encrypted keys loaded:', Object.keys(encryptedKeys));

    const decryptedKeys = {};

    for (const [key, value] of Object.entries(encryptedKeys)) {
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(value, 'base64');
          const decryptedValue = safeStorage.decryptString(buffer);
          decryptedKeys[key] = decryptedValue;
          console.log(`[loadDecryptedApiKeys] Decrypted ${key}: ${decryptedValue ? 'Success' : 'Empty'}`);
        } catch (decryptError) {
          console.error(`[loadDecryptedApiKeys] Failed to decrypt key ${key}:`, decryptError.message);
        }
      }
    }

    console.log('[loadDecryptedApiKeys] Returning', Object.keys(decryptedKeys), 'keys');
    return decryptedKeys;
  } catch (error) {
    console.error('[loadDecryptedApiKeys] Failed to load API keys:', error);
    return {};
  }
}
```

**Step 2: Add logging to electronGetKeys in secureStorage.ts**
```typescript
async function electronGetKeys(): Promise<Partial<ApiKeys>> {
  try {
    const result = await window.api!.apiKeys.get();
    console.log('[electronGetKeys] API result:', result);

    if (!result.success || !result.keys) {
      console.warn('[electronGetKeys] No keys returned from API');
      return {};
    }

    const keys = result.keys;
    const mappedKeys: Partial<ApiKeys> = {};
    Object.entries(API_KEY_MAP).forEach(([key, envKey]) => {
      if (keys[envKey]) {
        mappedKeys[key as keyof ApiKeys] = keys[envKey];
        console.log(`[electronGetKeys] Mapped ${key} -> ${envKey}`);
      }
    });

    console.log('[electronGetKeys] Mapped keys:', Object.keys(mappedKeys));
    return mappedKeys;
  } catch (error) {
    console.error('[electronGetKeys] Failed to load API keys from Electron storage:', error);
    return {};
  }
}
```

**Step 3: Start app and check logs**
Run: `npm run dev:electron`
Expected: Console logs show all API keys being loaded and decrypted

**Step 4: Verify keys are accessible via SecureStorage**
In browser console: `localStorage.getItem('api-keys')`
Expected: Returns null (keys are in Electron secure storage, not localStorage)

**Step 5: Remove debug logs after verification**
```bash
git add -u
git commit -m "fix: add debug logging for API key loading (will be removed)"
```

---

## Part 3: Add ngrok Authtoken Configuration to Settings

**Issue:** User wants to use ngrok authtoken instead of API key.

**Files:**
- Modify: `components/settings/SettingsPage.tsx` (ngrok input field)

**Step 1: Update ngrok input label and placeholder**
```tsx
{ key: 'ngrok', label: 'Ngrok Authtoken', placeholder: 'Enter ngrok authtoken (from dashboard)', icon: '🚇', category: 'deployment', description: 'Required for mobile deployment tunnel. Get from https://dashboard.ngrok.com/signup', envKey: 'NGROK_AUTHTOKEN', }
```

**Step 2: Update API_KEY_MAP in secureStorage.ts**
```typescript
const API_KEY_MAP = {
  anthropic: 'CLAUDE_API_KEY',
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  gemini: 'GEMINI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  zai: 'ZAI_API_KEY',
  nanobanana: 'NANOBANANA_API_KEY',
  ideogram: 'IDEOGRAM_API_KEY',
  github: 'GITHUB_TOKEN',
  vercel: 'VERCEL_TOKEN',
  render: 'RENDER_API_KEY',
  ollamaBaseUrl: 'OLLAMA_BASE_URL',
  ngrok: 'NGROK_AUTHTOKEN', // Changed from NGROK_API_KEY
  mobilePassword: 'MOBILE_PASSWORD',
  opencodezen: 'OPENCODE_API_KEY',
} as const;
```

**Step 3: Test ngrok save/delete**
1. Enter authtoken in Settings → ngrok field
2. Click "Save"
3. Click "Test"
4. Click "Delete API Key"
5. Expected: Authtoken saved, test passes, delete works

**Step 4: Update electron/ngrok-wrapper.js to use authtoken environment variable**
```javascript
const { spawn } = require('child_process');
const os = require('os');

function getNgrokAuthtoken() {
  return process.env.NGROK_AUTHTOKEN;
}

async function isNgrokConfigured() {
  const authtoken = getNgrokAuthtoken();
  if (!authtoken || authtoken.trim().length < 10) {
    return false;
  }
  const ngrokPath = getNgrokExecutable();
  // Check if authtoken is already configured via config file
  try {
    const configPath = path.join(os.homedir(), '.config', 'ngrok', 'ngrok.yml');
    const fs = require('fs').promises;
    await fs.access(configPath, fs.constants.R_OK);
    const data = await fs.readFile(configPath, 'utf-8');
    return data.includes('authtoken:') && data.includes(authtoken.trim());
  } catch {
    return false;
  }
}

async function configureNgrokAuthtoken() {
  const authtoken = getNgrokAuthtoken();
  if (!authtoken || authtoken.trim().length < 10) {
    return {
      success: false,
      error: 'Ngrok authtoken required. Please enter your authtoken in Settings.'
    };
  }

  const ngrokPath = getNgrokExecutable();

  return new Promise((resolve) => {
    const configProcess = spawn(ngrokPath, ['config', 'add-authtoken', authtoken.trim()], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    configProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    configProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    configProcess.on('close', (code) => {
      if (code === 0) {
        console.log('[ngrok-wrapper] Authtoken configured successfully');
        resolve({ success: true, output: output.trim() });
      } else {
        console.error('[ngrok-wrapper] Failed to configure authtoken:', error);
        resolve({
          success: false,
          error: error || output || 'Failed to configure ngrok authtoken'
        });
      }
    });

    configProcess.on('error', (err) => {
      console.error('[ngrok-wrapper] Failed to run ngrok config:', err.message);
      resolve({
        success: false,
        error: `Failed to run ngrok config: ${err.message}`
      });
    });
  });
}
```

**Step 5: Test ngrok start with authtoken**
1. Add authtoken to Settings
2. Click "Start ngrok"
3. Expected: Ngrok tunnel starts successfully

**Step 6: Commit**
```bash
git add components/settings/SettingsPage.tsx lib/secureStorage.ts electron/ngrok-wrapper.js
git commit -m "feat: support ngrok authtoken in Settings for mobile deployment"
```

---

## Part 4: Implement Desktop-Mobile Chat Synchronization

**Goal:** Desktop app becomes central hub where chats are saved and accessible from mobile.

**Files:**
- Modify: `lib/chat-history.ts` (existing)
- Modify: `electron/main.js` (IPC handlers)
- Modify: `app/api/sync/chat/route.ts` (new API endpoint)

**Step 1: Ensure chat history is saved to file (already implemented)**
Check `lib/chat-history.ts`:
- `saveChatToHistory()` - saves to ~/.config/os-athena/chats.json
- `loadChatHistory()` - loads from same file
- `getChatById()` - retrieves specific chat

**Step 2: Add IPC handler to expose chat history to renderer**
```javascript
// In electron/main.js
ipcMain.handle('chat-history:get', async () => {
  try {
    const { loadChatHistory } = await import('@/lib/chat-history');
    const history = loadChatHistory();
    return { success: true, chats: history };
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chat-history:save', async (event, chatData) => {
  try {
    const { saveChatToHistory } = await import('@/lib/chat-history');
    await saveChatToHistory(chatData);
    return { success: true };
  } catch (error) {
    console.error('Failed to save chat history:', error);
    return { success: false, error: error.message };
  }
});
```

**Step 3: Update ChatHistoryContext to load from file on mount**
```typescript
// In lib/contexts/ChatHistoryContext.tsx
useEffect(() => {
  async function loadLocalHistory() {
    try {
      const { loadChatHistory } = await import('@/lib/chat-history');
      const history = loadChatHistory();
      setChats(history);
    } catch (error) {
      console.error('Failed to load chat history from file:', error);
    }
  }
  loadLocalHistory();
}, []);
```

**Step 4: Create sync API endpoint for mobile access**
Create: `app/api/sync/chat/route.ts`
```typescript
import { NextResponse } from 'next/server';

// Get all chats (accessible via ngrok tunnel)
export async function GET(request: Request) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.MOBILE_SYNC_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { loadChatHistory } = await import('@/lib/chat-history');
    const chats = loadChatHistory();

    return NextResponse.json({ success: true, chats });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load chat history' },
      { status: 500 }
    );
  }
}

// Save a chat (from mobile)
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.MOBILE_SYNC_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saveChatToHistory } = await import('@/lib/chat-history');
    const { chat } = await request.json();
    await saveChatToHistory(chat);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save chat history' },
      { status: 500 }
    );
  }
}
```

**Step 5: Set up environment variable for mobile sync**
In electron/main.js:
```javascript
// Load mobile sync token from secure storage
const mobileSyncToken = await secureStorage.getKey('mobilePassword');
process.env.MOBILE_SYNC_TOKEN = mobileSyncToken || 'default-sync-token';
```

**Step 6: Create mobile sync service**
Create: `lib/mobile-sync.ts`
```typescript
export async function syncChatToDesktop(chat: any): Promise<boolean> {
  try {
    const token = process.env.MOBILE_SYNC_TOKEN;
    if (!token) {
      console.error('MOBILE_SYNC_TOKEN not set');
      return false;
    }

    const response = await fetch('/api/sync/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ chat }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to sync chat to desktop:', error);
    return false;
  }
}

export async function loadChatsFromDesktop(): Promise<any[]> {
  try {
    const token = process.env.MOBILE_SYNC_TOKEN;
    if (!token) {
      console.error('MOBILE_SYNC_TOKEN not set');
      return [];
    }

    const response = await fetch('/api/sync/chat', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.chats || [];
  } catch (error) {
    console.error('Failed to load chats from desktop:', error);
    return [];
  }
}
```

**Step 7: Test sync from mobile**
1. Deploy mobile app
2. Open mobile app
3. Send chat message
4. Expected: Chat saved to desktop chat history file

**Step 8: Commit**
```bash
git add electron/main.js app/api/sync/chat/route.ts lib/mobile-sync.ts
git commit -m "feat: add mobile-desktop chat synchronization"
```

---

## Part 5: Fix Mobile Deployment to Use Desktop as Hub

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx`
- Modify: `app/api/mobile/deploy/route.ts`

**Step 1: Update mobile deployment to use desktop environment variables**
```typescript
// In app/api/mobile/deploy/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repository, password } = body;

    // Validate password
    const storedPassword = await secureStorage.getKey('mobilePassword');
    if (password !== storedPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Get API keys from desktop environment
    const apiKeys = {
      anthropic: process.env.CLAUDE_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      // ... other keys
    };

    // Start ngrok tunnel with authtoken
    const { ensureNgrokTunnel } = await import('@/lib/ngrok');
    const tunnelResult = await ensureNgrokTunnel(3456, process.env.NGROK_AUTHTOKEN);

    if (!tunnelResult.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to establish ngrok tunnel' },
        { status: 500 }
      );
    }

    // Deploy to Vercel using desktop environment variables
    const vercelConfig = {
      apiKeys: {
        token: process.env.VERCEL_TOKEN,
      },
    };

    // ... deployment logic

    return NextResponse.json({
      success: true,
      url: tunnelResult.publicUrl,
      // Include API keys as environment variables for mobile app
      environment: {
        ...apiKeys,
        NGROK_PUBLIC_URL: tunnelResult.publicUrl,
        DESKTOP_HUB_MODE: 'true',
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**Step 2: Test mobile deployment**
1. Open Mobile page in desktop app
2. Click "Launch Mobile Version"
3. Enter repository and password
4. Expected: Mobile app deploys with desktop API keys

**Step 3: Commit**
```bash
git add components/settings/MobileDeploymentModal.tsx app/api/mobile/deploy/route.ts
git commit -m "feat: mobile deployment uses desktop API keys and environment"
```

---

## Part 6: Add Mobile/Desktop Connection Status Indicator

**Files:**
- Modify: `components/settings/SettingsPage.tsx` (Dashboard section)

**Step 1: Add connection status card**
```tsx
<NgrokStatusCard /> // Already exists, ensure it shows proper status
```

**Step 2: Add mobile connection indicator**
```tsx
<div className="mt-4 p-4 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/10">
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${isMobileConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
    <span className="text-sm font-bold">
      {isMobileConnected ? '📱 Mobile Connected (Desktop Hub)' : '📱 Mobile Disconnected'}
    </span>
  </div>
  <p className="text-xs text-muted-foreground mt-1">
    All API keys and data are synchronized from desktop
  </p>
</div>
```

**Step 3: Test status indicator**
1. Launch mobile app
2. Check Settings → Connection Status
3. Expected: Shows connected with desktop hub status

**Step 4: Commit**
```bash
git add components/settings/SettingsPage.tsx
git commit -m "feat: add mobile-desktop connection status indicator"
```

---

## Verification Checklist

- [ ] Model selector button opens dropdown when clicked
- [ ] API keys are loaded from Electron secure storage
- [ ] Ngrok authtoken can be saved and tested in Settings
- [ ] Ngrok tunnel starts successfully with authtoken
- [ ] Chat history is saved to file on desktop
- [ ] Mobile app can sync chats to desktop
- [ ] Desktop can load chats from mobile
- [ ] Mobile deployment uses desktop API keys
- [ ] Mobile deployment shows "Desktop Hub Mode" status
- [ ] All providers work correctly with loaded API keys

---

## Execution Order

1. ~~Fix Model Selector Click Handler~~
2. ~~Fix API Key Loading from SecureStorage~~
3. ~~Add ngrok Authtoken Configuration to Settings~~
4. ~~Implement Desktop-Mobile Chat Synchronization~~
5. ~~Fix Mobile Deployment to Use Desktop as Hub~~
6. ~~Add Mobile/Desktop Connection Status Indicator~~

---

## Notes

- All API keys are stored in Electron's secure storage (keytar) and passed to Next.js server via environment variables
- Chats are saved to `~/.config/os-athena/chats.json` on desktop
- Mobile app accesses desktop data via ngrok tunnel
- Desktop acts as central hub - no need to set env variables on mobile
