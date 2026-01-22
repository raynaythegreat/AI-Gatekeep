# Electron Setup Instructions

This project has been configured to run as an Electron desktop application.

## Development

To run the app in Electron development mode:

```bash
npm install
npm run dev:electron
```

This will:
1. Start Next.js dev server on port 3000
2. Launch Electron window loading the app
3. Open DevTools for debugging

## Production Build

To build the Electron app for Linux (AppImage):

```bash
npm run build:electron
```

This will:
1. Build Next.js for production
2. Create an AppImage package in the `dist/` directory

To build specifically for Linux x64 (your ASUS Chromebook):

```bash
npm run build:linux
```

## Installing on ASUS Chromebook (Linux)

1. Copy the generated `.AppImage` file from the `dist/` directory
2. Make it executable: `chmod +x GateKeep-x.x.x-x86_64.AppImage`
3. Run it: `./GateKeep-x.x.x-x86_64.AppImage`

## Running the AppImage

For convenience, you can:
- Move the AppImage to `~/Applications/`
- Create a desktop shortcut
- Add to PATH by placing in `~/bin/`

## Key Files

- `electron/main.js` - Electron main process
- `electron/preload.js` - Preload script for IPC
- `electron-builder.yml` - Build configuration
- `lib/secureStorage.ts` - Secure storage utility (encrypts in Electron)

## API Routes

All API routes in `app/api/` are marked with `export const dynamic = 'force-dynamic'` to ensure they work correctly in Electron's main process.

## Secure Storage

The app uses Electron's `safeStorage` API for encrypting sensitive data (API keys, tokens) on supported platforms:
- macOS: Keychain Access
- Windows: DPAPI  
- Linux: libsecret / KWallet / GNOME Keyring (falls back to plaintext if unavailable)

## Environment Variables

For the Electron app, environment variables can be set in:
1. Your shell profile (`.bashrc`, `.zshrc`)
2. A `.env.local` file in the project root
3. Electron's launch environment

Required environment variables for AI providers:
- `CLAUDE_API_KEY` - Anthropic Claude
- `OPENAI_API_KEY` - OpenAI GPT models
- `GEMINI_API_KEY` - Google Gemini
- `OPENROUTER_API_KEY` - OpenRouter
- `GROQ_API_KEY` - Groq
- `OLLAMA_BASE_URL` - Local Ollama instance
- `OPENCODE_API_KEY` - OpenCode Zen
- `FIREWORKS_API_KEY` - Fireworks AI

## Troubleshooting

**App won't launch:**
- Ensure all dependencies are installed: `npm install`
- Check for missing build files in `dist/` directory

**API routes not working:**
- Verify `export const dynamic = 'force-dynamic'` is present in all API route files

**Secure storage not working:**
- On Linux, ensure libsecret is installed: `sudo apt-get install libsecret-1-dev`
- Or install GNOME Keyring/KWallet

**Chromebook sandbox issues:**
- If you get sandbox errors, you may need to run with `--no-sandbox` flag (not recommended for security)
- Or configure proper Chromebook Linux permissions
