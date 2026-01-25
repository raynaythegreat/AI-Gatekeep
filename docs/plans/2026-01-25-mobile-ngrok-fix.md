# Mobile Deployment Ngrok Auto-Start Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix ngrok agent auto-start for mobile deployment in the packaged Electron desktop app

**Architecture:** Create an Electron-compatible ngrok module in the `electron/` directory that works without TypeScript path aliases, then update `electron/main.js` to enable ngrok auto-start in production builds.

**Tech Stack:** Node.js, Electron, ngrok CLI, child_process

---

## Task 1: Create Electron-Compatible Ngrok Module

**Files:**
- Create: `electron/ngrok-wrapper.js`

**Step 1: Create the ngrok wrapper module**

Create a standalone JavaScript module for ngrok operations that works in Electron's asar packaged environment:

```javascript
// electron/ngrok-wrapper.js
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Platform detection
const Platform = {
  isLinux: process.platform === 'linux',
  isMacOS: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  current: process.platform
};

function getUserBinDir() {
  const homeDir = os.homedir();
  if (Platform.isWindows) {
    return path.join(homeDir, 'AppData', 'Local', 'Programs');
  }
  return path.join(homeDir, '.local', 'bin');
}

function getNgrokExecutable() {
  const binName = Platform.isWindows ? 'ngrok.exe' : 'ngrok';
  const userBinDir = getUserBinDir();
  return path.join(userBinDir, binName);
}

async function isNgrokInstalled() {
  const ngrokPath = getNgrokExecutable();
  try {
    await fs.access(ngrokPath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function startNgrokTunnel(port, apiKey, options = {}) {
  const {
    timeout = 30000,
    logFunction = console.log
  } = options;

  const ngrokPath = getNgrokExecutable();

  // Check if ngrok is installed
  if (!(await isNgrokInstalled())) {
    return {
      success: false,
      error: 'Ngrok not installed. Please install ngrok first.'
    };
  }

  // Set environment variables for ngrok
  const env = {
    ...process.env,
    NGROK_API_KEY: apiKey || ''
  };

  // Start ngrok as detached process
  const ngrokProcess = spawn(ngrokPath, ['http', String(port), '--log=stdout'], {
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let tunnelUrl = null;
  let tunnelId = null;
  let output = '';

  // Parse ngrok output to get tunnel URL
  ngrokProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;

    // Extract tunnel URL from output
    const urlMatch = text.match(/https?:\/\/[a-z0-9\-\.]+\.ngrok(?:\-free)?\.app/);
    if (urlMatch && !tunnelUrl) {
      tunnelUrl = urlMatch[0];
    }

    if (logFunction) {
      logFunction(text.trim());
    }
  });

  ngrokProcess.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    if (logFunction) {
      logFunction('stderr: ' + text.trim());
    }
  });

  // Unref to allow parent to exit independently
  ngrokProcess.unref();

  // Wait for tunnel to be established
  const waitForTunnel = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      ngrokProcess.kill();
      reject(new Error('Ngrok tunnel start timeout'));
    }, timeout);

    const checkInterval = setInterval(() => {
      if (tunnelUrl) {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);

        // Generate tunnel ID
        tunnelId = `mobile-${Date.now()}`;

        resolve({
          success: true,
          publicUrl: tunnelUrl,
          id: tunnelId,
          pid: ngrokProcess.pid
        });
      }
    }, 500);

    ngrokProcess.on('error', (err) => {
      clearTimeout(timeoutId);
      clearInterval(checkInterval);
      reject(err);
    });

    ngrokProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
        reject(new Error(`Ngrok exited with code ${code}`));
      }
    });
  });

  try {
    const result = await waitForTunnel();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function stopNgrokTunnel(pid) {
  if (!pid) return { success: false, error: 'No PID provided' };

  try {
    process.kill(pid, 'SIGTERM');
    // Also try to kill any ngrok process on port 3456
    if (Platform.isWindows) {
      spawn('taskkill', ['/F', '/PID', String(pid)]);
    } else {
      spawn('kill', ['-9', String(pid)]);
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  startNgrokTunnel,
  stopNgrokTunnel,
  isNgrokInstalled,
  getNgrokExecutable
};
```

**Step 2: Verify module syntax**

Run: `node -c electron/ngrok-wrapper.js`
Expected: No syntax errors

**Step 3: Commit the ngrok wrapper module**

```bash
git add electron/ngrok-wrapper.js
git commit -m "feat: add Electron-compatible ngrok wrapper module

Create standalone ngrok module for Electron that works without
TypeScript path aliases. Supports auto-starting ngrok tunnels in
packaged production builds."
```

---

## Task 2: Update Electron Main Process to Use Ngrok Wrapper

**Files:**
- Modify: `electron/main.js`

**Step 1: Add ngrok wrapper import at top of file**

Find the `require` statements at the top of `electron/main.js` (around line 7) and add:

```javascript
const ngrokWrapper = require('./ngrok-wrapper');
```

**Step 2: Update Phase 1 - Auto-Start Ngrok CLI Agent**

Find the Phase 1 section (around line 471-519) and replace the entire `if (isDev)` block with:

```javascript
  // ==================================================
  // Phase 1: Auto-Start Ngrok CLI Agent
  // ==================================================
  try {
    log('Initializing ngrok tunnel auto-start...');

    // Try to get API key from encrypted storage
    let ngrokApiKey;
    try {
      const encryptedKeys = await loadEncryptedKeys();
      if (encryptedKeys['NGROK_API_KEY']) {
        // Decrypt the key using safeStorage
        if (safeStorage.isEncryptionAvailable()) {
          const buffer = Buffer.from(encryptedKeys['NGROK_API_KEY'], 'base64');
          ngrokApiKey = safeStorage.decryptString(buffer);
          log('Retrieved ngrok API key from secure storage');
        }
      }
    } catch (keyError) {
      log(`Could not retrieve ngrok API key: ${keyError.message}`, 'WARN');
    }

    // Check if ngrok is installed
    const isInstalled = await ngrokWrapper.isNgrokInstalled();
    if (!isInstalled) {
      log('Ngrok CLI not found. Auto-start skipped - install ngrok to enable mobile deployment', 'WARN');
    } else {
      // Auto-start ngrok tunnel
      const ngrokResult = await ngrokWrapper.startNgrokTunnel(3456, ngrokApiKey, {
        timeout: 20000,
        logFunction: (msg) => log(`ngrok: ${msg}`)
      });

      if (ngrokResult.success && ngrokResult.publicUrl) {
        log(`✓ ngrok tunnel active: ${ngrokResult.publicUrl}`);
        if (ngrokResult.pid) {
          // Store PID for cleanup
          global.ngrokPid = ngrokResult.pid;
        }
      } else if (ngrokResult.error) {
        log(`ngrok auto-start failed: ${ngrokResult.error}`, 'WARN');
        log('App will continue without ngrok - you can start it manually from Settings', 'WARN');
      }
    }
  } catch (ngrokError) {
    log(`ngrok initialization error: ${ngrokError.message}`, 'WARN');
    log('App will continue without ngrok tunnel', 'WARN');
  }
```

**Step 3: Remove Phase 2 - Mobile Tunnel Activation**

Find the Phase 2 section (around line 521-560) and remove the entire `if (isDev)` block. Replace with:

```javascript
  // ==================================================
  // Phase 2: Mobile Tunnel Activation (handled by API)
  // ==================================================
  // Mobile tunnel activation is now handled by the API routes
  // when user deploys from the Mobile page
  log('Mobile tunnel activation ready - deploy from Mobile page when needed', 'INFO');
```

**Step 4: Add ngrok cleanup on app quit**

Find the app quit handler (around line 580) and add ngrok cleanup:

```javascript
  // Kill ngrok tunnel if running
  if (global.ngrokPid) {
    try {
      await ngrokWrapper.stopNgrokTunnel(global.ngrokPid);
      log('Ngrok tunnel stopped', 'INFO');
    } catch (err) {
      log(`Failed to stop ngrok: ${err.message}`, 'WARN');
    }
  }
```

**Step 5: Commit the electron main changes**

```bash
git add electron/main.js
git commit -m "feat: enable ngrok auto-start in packaged Electron app

Use electron/ngrok-wrapper module instead of TypeScript path aliases.
Ngrok now auto-starts in both dev and production builds when CLI
is installed. Added cleanup on app quit."
```

---

## Task 3: Update Mobile Deploy API to Use Ngrok Wrapper

**Files:**
- Modify: `app/api/mobile/deploy/route.ts`

**Step 1: Ensure API uses ngrok tunnel correctly**

The current implementation uses `ensureNgrokTunnel` from `@/lib/ngrok`. Verify the tunnel creation still works correctly. The API route should already be functional as it runs server-side with proper TypeScript compilation.

**Step 2: Test the deploy endpoint**

Run: `npm run dev`

In another terminal:
```bash
curl -X POST http://localhost:3456/api/mobile/status \
  -H "Content-Type: application/json" \
  -H "x-mobile-active: true"
```

Expected: JSON response with tunnel status

---

## Task 4: Verify Ngrok Status Display in UI

**Files:**
- Check: `components/mobile/NgrokQuickStatus.tsx`
- Check: `components/settings/NgrokStatusCard.tsx`

**Step 1: Verify NgrokQuickStatus component displays correctly**

The `NgrokQuickStatus` component should show:
- Current ngrok status (running/stopped)
- Instructions if ngrok is not installed

**Step 2: Add ngrok CLI installation instructions**

If not already present, add a clear instruction in the UI for installing ngrok CLI.

---

## Task 5: Test Mobile Deployment Flow

**Step 1: Start the Electron app**

```bash
./dist/OS\ Athena-1.3.0.AppImage
```

**Step 2: Verify ngrok auto-start**

Check the logs for:
```
Initializing ngrok tunnel auto-start...
✓ ngrok tunnel active: https://xxxx.ngrok.app
```

**Step 3: Navigate to Mobile page**

Click on the "Mobile" tab in the sidebar.

**Step 4: Verify prerequisites**

The page should show:
- ✓ Ngrok API Key configured (if key exists)
- ✓ Vercel API Key configured (if key exists)
- ✓ GitHub Token configured (if key exists)

**Step 5: Deploy mobile version**

1. Click "Launch Mobile Version" button
2. Verify the repository defaults to `Raynaythegreat/OS-Athena-Mobile`
3. Enter a password (min 4 characters)
4. Click "Launch Mobile Version"

**Step 6: Verify deployment success**

The deployment should:
- Create ngrok tunnel (or use existing one)
- Deploy to Vercel with tunnel URL in environment variables
- Open the deployed mobile URL in a new tab
- Show the mobile URL in the UI

**Step 7: Test mobile access**

1. Copy the tunnel URL
2. Open on mobile device or test in mobile browser view
3. Verify the mobile app connects to local OS Athena

---

## Task 6: Update Mobile Deployment Modal Defaults

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx`

**Step 1: Update default repository**

Find line 59 and update the default repository:

```typescript
const [repository, setRepository] = useState(preForkedRepo || 'raynaythegreat/OS-Athena-Mobile');
```

**Step 2: Commit the change**

```bash
git add components/settings/MobileDeploymentModal.tsx
git commit -m "fix: use correct default repository for mobile deployment

Update default repo to raynaythegreat/OS-Athena-Mobile (lowercase 'r')
to match the actual GitHub repository."
```

---

## Task 7: Rebuild and Package Desktop App

**Step 1: Build the production app**

```bash
npm run build:linux
```

**Step 2: Verify build succeeds**

Expected: `dist/OS Athena-1.3.0.AppImage` created successfully

**Step 3: Test the packaged app**

```bash
./dist/OS\ Athena-1.3.0.AppImage
```

Verify:
- App starts without ngrok import errors
- Logs show ngrok initialization (if installed)
- Mobile deployment works

---

## Task 8: Final Testing and Validation

**Step 1: Full mobile deployment test**

1. Start fresh Electron app
2. Configure API keys in Settings (Ngrok, Vercel, GitHub)
3. Navigate to Mobile page
4. Click "Launch Mobile Version"
5. Use repository: `raynaythegreat/OS-Athena-Mobile`
6. Enter password and deploy

**Step 2: Verify tunnel auto-connect**

On the deployed mobile site:
- Verify it shows the local OS Athena interface
- Verify chat functionality works through the tunnel
- Verify responses are processed locally

**Step 3: Test tunnel recovery**

1. Close and reopen the Electron app
2. Navigate to Mobile page
3. Verify tunnel status is shown correctly
4. If tunnel is lost, verify recovery works

**Step 4: Create summary of changes**

```bash
git add -A
git commit -m "feat: complete ngrok auto-start fix for mobile deployment

- Created electron/ngrok-wrapper.js for Electron-compatible ngrok operations
- Updated electron/main.js to use wrapper instead of TypeScript path aliases
- Ngrok now auto-starts in both dev and production builds
- Added ngrok cleanup on app quit
- Mobile deployment now works in packaged desktop app
- Updated default repository to raynaythegreat/OS-Athena-Mobile

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing all tasks:

- [ ] Ngrok wrapper module created without errors
- [ ] Electron app starts without ngrok import errors in production
- [ ] Ngrok auto-starts when CLI is installed
- [ ] Mobile deployment modal shows correct default repository
- [ ] Mobile deployment to Vercel succeeds
- [ ] Tunnel URL is correctly passed to Vercel environment
- [ ] Mobile site loads and connects to local OS Athena
- [ ] Chat functionality works through tunnel
- [ ] Tunnel recovery works if connection is lost
- [ ] App cleanup stops ngrok on quit
- [ ] Packaged app works correctly

---

## Files Modified

1. **Created:** `electron/ngrok-wrapper.js` - Electron-compatible ngrok module
2. **Modified:** `electron/main.js` - Use ngrok wrapper, enable production auto-start
3. **Modified:** `components/settings/MobileDeploymentModal.tsx` - Default repository fix
