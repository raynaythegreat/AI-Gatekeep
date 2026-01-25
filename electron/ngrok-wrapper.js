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
