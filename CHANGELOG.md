# Changelog

## [1.2.0] - 2026-01-22

### Major Release: Standalone Electron App with Flat Design

See full details at: https://github.com/raynaythegreat/OS-Athena/commit/80ae411

### Key Changes:
- ✅ Converted to standalone Electron app (no npm spawning)
- ✅ New flat design with bold gold accent (#FFC107)
- ✅ Removed menu bar for cleaner UI  
- ✅ Smart launcher with comprehensive logging
- ✅ Desktop integration installer for Linux
- ✅ Diagnostic tool for troubleshooting
- ✅ Fixed port 3456 (no more conflicts)
- ✅ Updated all UI components with consistent design

### Installation:
```bash
git clone https://github.com/raynaythegreat/OS-Athena.git
cd OS-Athena
npm install
npm run build
./electron/install-desktop-entry.sh
os-athena
```

See LAUNCH-GUIDE.md for complete documentation.

## [1.2.1] - 2026-01-22

### Settings Page Complete Overhaul

Major improvements to the Settings page with all API providers and modern layout.

#### New API Providers Added (6):
- ✅ **OpenRouter** - Access 100+ AI models
- ✅ **Fireworks AI** - Fast inference platform
- ✅ **Google Gemini** - Gemini Pro & Ultra
- ✅ **GitHub** - Repository management
- ✅ **Vercel** - One-click deployments  
- ✅ **Render** - Cloud deployment platform

#### Enhanced Features:
- **Auto-save Indicator** - Shows "Auto-saved" badge when keys are saved
- **Test & Save Buttons** - Automatically saves to localStorage before testing
- **Latency Display** - Shows connection speed for successful tests
- **Better Error States** - Distinguishes not_configured, error, and success
- **Security** - All keys stored locally, never sent to external servers

#### UI/UX Improvements:
- **3-Column Grid Layout** - Responsive grid for provider cards
- **Organized by Category:**
  - AI Providers (6 providers)
  - Deployment & Tools (3 providers)
  - Local Infrastructure (Ollama)
- **Visual Identification** - Emoji icons for each provider
- **Provider Descriptions** - Shows what each service offers
- **Status Color Coding:**
  - 🟢 Green: Success
  - 🟡 Yellow: Not configured
  - 🔴 Red: Error

#### Technical Improvements:
- Added test functions for all new providers
- TypeScript interfaces for type safety
- Category-based filtering and rendering
- "Test All Connections" button
- Password-type inputs for security
- Error handling for corrupted data

See full commit: https://github.com/raynaythegreat/OS-Athena/commit/20a79a7
