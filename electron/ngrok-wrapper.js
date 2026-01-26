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

async function isNgrokConfigured() {
  const ngrokPath = getNgrokExecutable();
  const configPath = path.join(os.homedir(), '.config', 'ngrok', 'ngrok.yml');
  try {
    await fs.access(configPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function configureNgrokAuthtoken(apiKey) {
  if (!apiKey || apiKey.trim().length < 10) {
    return {
      success: false,
      error: 'Invalid API key for authtoken configuration'
    };
  }

  const ngrokPath = getNgrokExecutable();

  return new Promise((resolve) => {
    const configProcess = spawn(ngrokPath, ['config', 'add-authtoken', apiKey.trim()], {
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
        resolve({ success: true, output: output.trim() });
      } else {
        resolve({
          success: false,
          error: error || output || 'Failed to configure ngrok authtoken'
        });
      }
    });

    configProcess.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to run ngrok config: ${err.message}`
      });
    });
  });
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
      error: 'Ngrok not installed. Please install ngrok first. Download from https://ngrok.com/download'
    };
  }

  // Validate API key if provided
  if (!apiKey || apiKey.trim().length < 10) {
    return {
      success: false,
      error: 'Ngrok API key is required. Please add your ngrok API key in Settings.\n\nGet your API key from: https://dashboard.ngrok.com/api-keys'
    };
  }

  const trimmedApiKey = apiKey.trim();

  // Step 1: Configure ngrok authtoken if not already configured
  const isConfigured = await isNgrokConfigured();
  if (!isConfigured) {
    logFunction('Configuring ngrok authtoken...');
    const configResult = await configureNgrokAuthtoken(trimmedApiKey);

    if (!configResult.success) {
      return {
        success: false,
        error: `Failed to configure ngrok: ${configResult.error}\n\nPlease verify your ngrok API key is correct. Get it from: https://dashboard.ngrok.com/api-keys`
      };
    }
    logFunction('✓ ngrok authtoken configured successfully');
  } else {
    logFunction('ngrok already configured, skipping authtoken setup');
  }

  // Step 2: Start ngrok tunnel
  logFunction(`Starting ngrok tunnel for port ${port}...`);

  // Set environment variables for ngrok
  const env = {
    ...process.env,
    NGROK_API_KEY: trimmedApiKey
  };

  // Start ngrok as detached process with proper authentication
  const ngrokArgs = ['http', String(port), '--log=stdout'];

  const ngrokProcess = spawn(ngrokPath, ngrokArgs, {
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let tunnelUrl = null;
  let tunnelId = null;
  let output = '';
  let hasError = false;
  let errorMessages = [];

  // Parse ngrok output to get tunnel URL
  ngrokProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;

    // Extract tunnel URL from output - support multiple formats
    const urlMatches = output.match(/https?:\/\/[a-z0-9\-]+\.ngrok(?:-free)?\.app/g);
    if (urlMatches && urlMatches.length > 0) {
      // Use the most recent URL
      tunnelUrl = urlMatches[urlMatches.length - 1];
    }

    // Check for authentication errors
    if (text.includes('authentication') || text.includes('401') || text.includes('403') || text.includes('invalid')) {
      hasError = true;
      errorMessages.push(text.trim());
    }

    if (logFunction) {
      logFunction(text.trim());
    }
  });

  ngrokProcess.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    
    // Log stderr but don't treat all as errors
    if (logFunction) {
      logFunction('stderr: ' + text.trim());
    }
    
    // Check for critical errors
    if (text.includes('error') || text.includes('failed') || text.includes('401') || text.includes('403')) {
      hasError = true;
      errorMessages.push(text.trim());
    }
  });

  // Unref to allow parent to exit independently
  ngrokProcess.unref();

  // Wait for tunnel to be established
  const waitForTunnel = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      ngrokProcess.kill();
      let errorMsg = 'Ngrok tunnel start timeout';
      
      if (hasError && errorMessages.length > 0) {
        errorMsg += `: ${errorMessages.join(', ')}`;
      }
      
      if (!tunnelUrl) {
        errorMsg += '. No tunnel URL found. Check ngrok logs for details.';
      }
      
      reject(new Error(errorMsg));
    }, timeout);

    const checkInterval = setInterval(() => {
      if (tunnelUrl) {
        // Check if we have critical errors
        if (hasError && errorMessages.some(msg => 
          msg.includes('401') || msg.includes('403') || msg.includes('authentication')
        )) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          reject(new Error(`Ngrok authentication error: ${errorMessages.join(', ')}`));
          return;
        }
        
        // Successful tunnel
        if (hasError && errorMessages.length > 0) {
          logFunction(`Warning: ngrok started with some errors: ${errorMessages.join(', ')}`);
        }
        
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
      reject(new Error(`Failed to start ngrok process: ${err.message}`));
    });

    ngrokProcess.on('exit', (code) => {
      if (code && code !== 0 && code !== null) {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
        let errorMsg = `Ngrok exited with code ${code}`;
        
        if (hasError && errorMessages.length > 0) {
          errorMsg += `. Errors: ${errorMessages.join(', ')}`;
        }
        
        if (!tunnelUrl) {
          errorMsg += '. No tunnel URL was found.';
        }
        
        reject(new Error(errorMsg));
      }
    });
  });

  try {
    const result = await waitForTunnel;
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
  isNgrokConfigured,
  configureNgrokAuthtoken,
  getNgrokExecutable
};
