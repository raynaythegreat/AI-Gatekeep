import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { pipeline } from "node:stream";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { homedir } from "node:os";
import {
  getPlatform,
  getArch,
  getUserBinDir,
  PlatformType,
  ArchType,
  getExecutableName,
} from "./platform";

const pipelineAsync = promisify(pipeline);

export interface InstallOptions {
  platform?: PlatformType;
  arch?: ArchType;
  onProgress?: (message: string, percent?: number) => void;
  force?: boolean;
}

export interface InstallResult {
  success: boolean;
  installedPath?: string;
  version?: string;
  error?: string;
}

// Official ngrok v3 download URLs
const NGROK_DOWNLOAD_URLS: Record<
  PlatformType,
  Record<string, string>
> = {
  linux: {
    x64: "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip",
    arm64: "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.zip",
  },
  darwin: {
    x64: "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.zip",
    arm64: "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-arm64.zip",
  },
  win32: {
    x64: "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip",
    arm64: "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip",
  },
};

// Version 2 fallback URLs (more reliable for some use cases)
const NGROK_V2_DOWNLOAD_URLS: Record<
  PlatformType,
  Record<string, string>
> = {
  linux: {
    x64: "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip",
    arm64: "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-arm64.zip",
  },
  darwin: {
    x64: "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-darwin-amd64.zip",
    arm64: "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-darwin-amd64.zip",
  },
  win32: {
    x64: "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip",
    arm64: "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip",
  },
};

function getDownloadUrl(platform: PlatformType, arch: ArchType): string {
  // Map ia32 to x64 for Windows compatibility
  const effectiveArch = platform === "win32" && arch === "ia32" ? "x64" : arch;

  // Try to get URL for exact arch, fallback to x64
  return (
    NGROK_DOWNLOAD_URLS[platform]?.[effectiveArch] ||
    NGROK_DOWNLOAD_URLS[platform]?.x64 ||
    NGROK_DOWNLOAD_URLS.linux.x64
  );
}

function getV2DownloadUrl(platform: PlatformType, arch: ArchType): string {
  const effectiveArch = platform === "win32" && arch === "ia32" ? "x64" : arch;
  return (
    NGROK_V2_DOWNLOAD_URLS[platform]?.[effectiveArch] ||
    NGROK_V2_DOWNLOAD_URLS[platform]?.x64 ||
    NGROK_V2_DOWNLOAD_URLS.linux.x64
  );
}

async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const writable = createWriteStream(destPath);
  let downloaded = 0;

  // Use Stream API to pipe the download
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          downloaded += value.length;
          if (onProgress && total > 0) {
            onProgress(Math.round((downloaded / total) * 100));
          }
          controller.enqueue(value);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  await pipelineAsync(
    Readable.fromWeb(stream as any),
    writable
  );
}

async function extractZip(
  zipPath: string,
  destDir: string,
  onProgress?: (message: string) => void
): Promise<string[]> {
  // For Node.js, we need to use a spawn approach to unzip
  const platform = process.platform;

  if (platform === "win32") {
    // Windows: use PowerShell to unzip
    return new Promise((resolve, reject) => {
      const args = [
        "-NoLogo",
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
      ];

      const child = spawn("powershell.exe", args);
      let output = "";
      let error = "";

      child.stdout?.on("data", (data) => {
        output += data.toString();
      });

      child.stderr?.on("data", (data) => {
        error += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          // List extracted files
          try {
            const files = fs.readdirSync(destDir);
            resolve(files);
          } catch {
            resolve([]);
          }
        } else {
          reject(new Error(`PowerShell unzip failed: ${error || output}`));
        }
      });

      child.on("error", reject);
    });
  }

  // Unix-like: try unzip command, fallback to Python
  return new Promise((resolve, reject) => {
    const unzipCmd = spawn("unzip", ["-o", zipPath, "-d", destDir]);

    let output = "";
    let error = "";

    unzipCmd.stdout?.on("data", (data) => {
      output += data.toString();
    });

    unzipCmd.stderr?.on("data", (data) => {
      error += data.toString();
    });

    unzipCmd.on("close", (code) => {
      if (code === 0) {
        try {
          const files = fs.readdirSync(destDir);
          resolve(files);
        } catch {
          resolve([]);
        }
      } else {
        reject(new Error(`unzip failed: ${error || output}`));
      }
    });

    unzipCmd.on("error", (err) => {
      // Try Python fallback
      const pythonScript = `
import zipfile
import sys
with zipfile.ZipFile('${zipPath}', 'r') as zip_ref:
    zip_ref.extractall('${destDir}')
print("OK")
`;
      const python = spawn("python3", ["-c", pythonScript]);

      let pyError = "";
      python.stderr?.on("data", (data) => {
        pyError += data.toString();
      });

      python.on("close", (pyCode) => {
        if (pyCode === 0) {
          try {
            const files = fs.readdirSync(destDir);
            resolve(files);
          } catch {
            resolve([]);
          }
        } else {
          reject(new Error(`unzip and python both failed: ${pyError}`));
        }
      });

      python.on("error", () => {
        reject(err);
      });
    });
  });
}

function getTempDir(): string {
  const tempDir = process.env.TMPDIR || process.env.TEMP || "/tmp";
  return tempDir;
}

async function makeExecutable(filePath: string): Promise<void> {
  if (process.platform !== "win32") {
    try {
      await fs.promises.chmod(filePath, 0o755);
    } catch {
      // Ignore permission errors
    }
  }
}

/**
 * Check if ngrok is already installed and accessible
 */
export async function checkNgrokInstalled(): Promise<{
  installed: boolean;
  path?: string;
  version?: string;
}> {
  const { resolveCommand } = await import("./command");
  const ngrokPath = resolveCommand("ngrok");

  if (!ngrokPath) {
    return { installed: false };
  }

  try {
    // Try to get version
    const version = await getNgrokVersion(ngrokPath);
    return { installed: true, path: ngrokPath, version };
  } catch {
    return { installed: true, path: ngrokPath };
  }
}

/**
 * Get the version of installed ngrok
 */
async function getNgrokVersion(ngrokPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(ngrokPath, ["version"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout?.on("data", (data) => {
      output += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0 && output) {
        const match = output.match(/ngrok version (\d+\.\d+\.\d+)/);
        if (match) {
          resolve(match[1]);
        } else {
          resolve(output.trim().split("\n")[0]);
        }
      } else {
        reject(new Error("Failed to get version"));
      }
    });

    child.on("error", reject);
  });
}

/**
 * Install ngrok to the user's local bin directory
 */
export async function installNgrok(options: InstallOptions = {}): Promise<InstallResult> {
  const { onProgress, force = false } = options;
  const platform = options.platform || getPlatform();
  const arch = options.arch || getArch();

  try {
    onProgress?.("Checking for existing ngrok installation...", 0);

    // Check if already installed
    if (!force) {
      const existing = await checkNgrokInstalled();
      if (existing.installed) {
        onProgress?.(`ngrok already installed at ${existing.path}`, 100);
        return {
          success: true,
          installedPath: existing.path,
          version: existing.version,
        };
      }
    }

    onProgress?.("Determining download URL...", 5);

    // Get download URL
    const downloadUrl = getDownloadUrl(platform, arch);
    const v2Url = getV2DownloadUrl(platform, arch);

    onProgress?.(`Downloading ngrok for ${platform}-${arch}...`, 10);

    // Create temp directory for download
    const tempDir = getTempDir();
    const zipFileName = `ngrok-${platform}-${arch}.zip`;
    const zipPath = path.join(tempDir, zipFileName);
    const extractDir = path.join(tempDir, `ngrok-extract-${Date.now()}`);

    // Ensure extract directory exists
    await fs.promises.mkdir(extractDir, { recursive: true });

    // Download with progress tracking
    let downloadedBytes = 0;
    await downloadFile(downloadUrl, zipPath, (percent) => {
      onProgress?.(`Downloading ngrok... ${percent}%`, 10 + (percent * 0.6));
    }).catch(async (err) => {
      // Try v2 as fallback
      onProgress?.("V3 download failed, trying V2...", 70);
      await downloadFile(v2Url, zipPath, (percent) => {
        onProgress?.(`Downloading ngrok V2... ${percent}%`, 70 + (percent * 0.2));
      });
    });

    onProgress?.("Extracting ngrok...", 90);

    // Extract zip
    await extractZip(zipPath, extractDir);

    // Find the ngrok binary
    const binaryName = platform === "win32" ? "ngrok.exe" : "ngrok";
    const extractedPath = path.join(extractDir, binaryName);

    if (!fs.existsSync(extractedPath)) {
      // Try listing files to find the binary
      const files = fs.readdirSync(extractDir);
      const found = files.find((f) => f.startsWith("ngrok"));
      if (!found) {
        throw new Error("ngrok binary not found in extracted archive");
      }
    }

    // Ensure binary is executable
    await makeExecutable(extractedPath);

    onProgress?.("Installing ngrok to user bin directory...", 95);

    // Get user bin directory
    const userBinDir = getUserBinDir();

    // Ensure bin directory exists
    await fs.promises.mkdir(userBinDir, { recursive: true });

    // Install path
    const installPath = path.join(userBinDir, binaryName);

    // Copy binary to install location
    await fs.promises.copyFile(extractedPath, installPath);
    await makeExecutable(installPath);

    // Clean up temp files
    try {
      await fs.promises.unlink(zipPath);
      await fs.promises.rm(extractDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Get version
    let version: string | undefined;
    try {
      version = await getNgrokVersion(installPath);
    } catch {
      // Ignore version check errors
    }

    onProgress?.("ngrok installation complete!", 100);

    return {
      success: true,
      installedPath: installPath,
      version,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    onProgress?.(`Installation failed: ${errorMessage}`, 0);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get manual installation instructions for the current platform
 */
export function getNgrokInstallInstructions(): string {
  const platform = getPlatform();

  if (platform === "win32") {
    return `
1. Download ngrok from: https://ngrok.com/download
2. Extract the downloaded zip file
3. Move ngrok.exe to a folder in your PATH (e.g., C:\\Users\\YourName\\AppData\\Local\\Programs)
4. Restart your terminal/command prompt
    `.trim();
  }

  if (platform === "darwin") {
    return `
1. Download ngrok: brew install ngrok  # if using Homebrew
   OR download from: https://ngrok.com/download
2. If using the zip file:
   - Unzip the download
   - Move ngrok to /usr/local/bin: sudo mv ngrok /usr/local/bin/
   - Make it executable: chmod +x /usr/local/bin/ngrok
3. Or install to ~/.local/bin:
   - mkdir -p ~/.local/bin
   - mv ngrok ~/.local/bin/
   - chmod +x ~/.local/bin/ngrok
   - Add to PATH in ~/.zshrc or ~/.bashrc: export PATH="$HOME/.local/bin:$PATH"
    `.trim();
  }

  // Linux
  return `
1. Download ngrok:
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok

   OR download directly:
   curl -O https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip
   unzip ngrok-v3-stable-linux-amd64.zip
   sudo mv ngrok /usr/local/bin/
   sudo chmod +x /usr/local/bin/ngrok

2. Or install to ~/.local/bin:
   mkdir -p ~/.local/bin
   mv ngrok ~/.local/bin/
   chmod +x ~/.local/bin/ngrok
   export PATH="$HOME/.local/bin:$PATH"
  `.trim();
}
