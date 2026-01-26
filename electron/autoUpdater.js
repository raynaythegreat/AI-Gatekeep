const { autoUpdater, app } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const electron = require('electron');

// Setup logging for auto-updater
const logDir = path.join(electron.app.getPath('userData'), 'logs');
const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);

  try {
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

// Configure auto-updater logger
autoUpdater.logger = {
  info: (msg) => log(`[Auto-Updater] ${msg}`, 'INFO'),
  warn: (msg) => log(`[Auto-Updater] ${msg}`, 'WARN'),
  error: (msg) => log(`[Auto-Updater] ${msg}`, 'ERROR'),
  debug: (msg) => log(`[Auto-Updater] ${msg}`, 'DEBUG'),
};

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'raynaythegreat',
  repo: 'OS-Athena',
});

/**
 * Check for updates and notify the main window
 * @param {BrowserWindow} mainWindow - The main Electron window
 */
function checkForUpdates(mainWindow) {
  log('Checking for updates...');

  autoUpdater.checkForUpdatesAndNotify();

  // Auto-check for updates every hour
  setInterval(() => {
    log('Auto-checking for updates...');
    autoUpdater.checkForUpdates();
  }, 60 * 60 * 1000); // 1 hour
}

// Event listeners for auto-updater
autoUpdater.on('checking-for-update', () => {
  log('Checking for updates...', 'INFO');
});

autoUpdater.on('update-available', (info) => {
  log(`Update available: ${info.version}`, 'INFO');
});

autoUpdater.on('update-not-available', (info) => {
  log(`No update available (current: ${info.version})`, 'INFO');
});

autoUpdater.on('error', (err) => {
  log(`Error in auto-updater: ${err.message}`, 'ERROR');
});

autoUpdater.on('download-progress', (progress) => {
  const logMessage = `Download progress: ${Math.floor(progress.percent)}% (${Math.floor(
    progress.transferred / 1000000
  )}MB / ${Math.floor(progress.total / 1000000)}MB)`;
  log(logMessage, 'INFO');
});

autoUpdater.on('update-downloaded', (info) => {
  log(`Update downloaded: ${info.version}`, 'INFO');
  // Notify the main window that an update is ready to install
  autoUpdater.emit('update-downloaded', info);

  // Prompt user to install update
  autoUpdater.quitAndInstall();
});

module.exports = { checkForUpdates };
