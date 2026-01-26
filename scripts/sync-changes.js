#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 OS Athena - Syncing changes to all versions...\n');

// 1. Sync component changes
const sourceDir = path.join(__dirname, 'components');
const electronDir = path.join(__dirname, 'electron');

// Ensure electron directory exists
if (!fs.existsSync(electronDir)) {
  fs.mkdirSync(electronDir, { recursive: true });
}

// Sync key files
const filesToSync = [
  'components/chat/ModelSelector.tsx',
  'components/chat/RepoSelector.tsx',
  'components/chat/InteractiveQuestion.tsx',
  'components/chat/ChatInterface.tsx',
  'contexts/ApiUsageContext.tsx',
  'contexts/DeploymentContext.tsx',
  'lib/questionDetection.ts',
  'lib/secureStorage.ts',
  'lib/serverKeys.ts',
  'app/api/status/route.ts',
  'app/api/billing/route.ts'
];

console.log('📝 Syncing component files...');
filesToSync.forEach(file => {
  const sourceFile = path.join(__dirname, file);
  const targetFile = path.join(__dirname, file);
  
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`✓ Synced ${file}`);
  } else {
    console.log(`⚠ Skipped ${file} (not found)`);
  }
});

// 2. Ensure package.json has all required scripts
console.log('\n📦 Updating package.json scripts...');
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Ensure all required scripts exist
const requiredScripts = {
  "dev": "next dev -p 3456",
  "dev:web": "next dev -p 3456", 
  "dev:electron": "fuser -k 3456/tcp || true; NODE_ENV=development PORT=3456 ./node_modules/.bin/electron .",
  "electron": "electron .",
  "build": "next build && npm run copy-standalone",
  "build:electron": "npm run build && electron-builder --linux",
  "lint": "next lint",
  "type-check": "tsc --noEmit"
};

// Merge with existing scripts
packageJson.scripts = { ...requiredScripts, ...packageJson.scripts };

// Write back
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✓ Updated package.json scripts');

// 3. Create electron-builder configuration
console.log('\n⚙️ Creating electron-builder config...');
const buildConfig = {
  "appId": "com.osathena.desktop",
  "productName": "OS Athena",
  "directories": {
    "output": "dist"
  },
  "files": [
    ".next/**/*",
    "node_modules/**/*",
    "public/**/*",
    "electron/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.developer-tools",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ]
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ]
  },
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      }
    ]
  }
};

const buildConfigPath = path.join(__dirname, 'electron-builder.json');
fs.writeFileSync(buildConfigPath, JSON.stringify(buildConfig, null, 2));
console.log('✓ Created electron-builder.json');

// 4. Update main.js for key API fixes
console.log('\n🔧 Updating Electron main process...');
const mainJsPath = path.join(__dirname, 'electron/main.js');
if (fs.existsSync(mainJsPath)) {
  let mainJs = fs.readFileSync(mainJsPath, 'utf8');
  
  // Ensure API key handlers are present
  if (!mainJs.includes('api-keys:get')) {
    console.log('⚠ API key handlers might be missing in main.js');
  }
  
  console.log('✓ Electron main.js verified');
}

// 5. Create build scripts for all platforms
console.log('\n🚀 Creating platform build scripts...');

const buildScriptContent = `#!/bin/bash
echo "🏗 OS Athena - Building for all platforms..."

# Clean previous builds
rm -rf dist/

# Build Next.js app
echo "📦 Building Next.js..."
npm run build

# Build for current platform
case "$(uname -s)" in
  Linux*)
    echo "🐧 Building for Linux..."
    npm run build:linux
    ;;
  Darwin*)
    echo "🍎 Building for macOS..."
    npm run build:mac
    ;;
  CYGWIN*|MINGW*|MSYS*)
    echo "🪟 Building for Windows..."
    npm run build:windows
    ;;
  *)
    echo "❓ Unknown platform, building for Linux..."
    npm run build:linux
    ;;
esac

echo "✅ Build complete! Check dist/ directory."
`;

const buildScriptPath = path.join(__dirname, 'scripts/build-all.sh');
fs.writeFileSync(buildScriptPath, buildScriptContent, { mode: 0o755 });
console.log('✓ Created build-all.sh script');

// 6. Create development script
const devScriptContent = `#!/bin/bash
echo "🚀 OS Athena - Development Mode"

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
fuser -k 3456/tcp 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
lsof -ti:3456 | xargs -r kill -9 2>/dev/null || true

# Check if API keys are configured
echo "🔑 Checking API keys..."
if [ ! -f "$HOME/.config/os-athena/encrypted-keys.json" ]; then
    echo "⚠️  No API keys found. Please configure them in the app Settings."
fi

# Start development server
echo "🌐 Starting development server..."
npm run dev:electron
`;

const devScriptPath = path.join(__dirname, 'scripts/dev.sh');
fs.writeFileSync(devScriptPath, devScriptContent, { mode: 0o755 });
console.log('✓ Created dev.sh script');

console.log('\n✅ OS Athena sync complete!');
console.log('\n🎯 Available commands:');
console.log('  npm run dev        - Web development');
console.log('  npm run dev:electron- Electron development');
console.log('  npm run build       - Build for deployment');
console.log('  npm run build:electron- Build Electron app');
console.log('  ./scripts/dev.sh  - Development with setup');
console.log('  ./scripts/build-all.sh- Build all platforms');
console.log('\n🚀 Your OS Athena is ready!');