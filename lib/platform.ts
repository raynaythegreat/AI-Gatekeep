import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export const Platform = {
  isLinux: process.platform === "linux",
  isMacOS: process.platform === "darwin",
  isWindows: process.platform === "win32",
  current: process.platform as "linux" | "darwin" | "win32" | "unknown",
};

export type PlatformType = "linux" | "darwin" | "win32";
export type ArchType = "x64" | "arm64" | "ia32" | "unknown";

export function getPlatform(): PlatformType {
  const p = process.platform;
  if (p === "linux" || p === "darwin" || p === "win32") {
    return p;
  }
  return "linux"; // Default fallback
}

export function getArch(): ArchType {
  const a = process.arch;
  if (a === "x64" || a === "arm64" || a === "ia32") {
    return a;
  }
  return "x64"; // Default fallback
}

/**
 * Split PATH environment variable based on platform
 */
export function splitPath(value: string | undefined): string[] {
  if (!value) return [];

  const separator = Platform.isWindows ? ";" : ":";
  return value
    .split(separator)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Join path entries with the correct separator for the platform
 */
export function joinPathEntries(entries: string[]): string {
  const separator = Platform.isWindows ? ";" : ":";
  return entries.join(separator);
}

/**
 * Get default binary directories for the current platform
 */
export function getDefaultBinDirs(): string[] {
  if (Platform.isWindows) {
    const localAppData = process.env.LOCALAPPDATA || "";
    const appData = process.env.APPDATA || "";
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 =
      process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

    return [
      path.join(localAppData, "Programs"),
      path.join(appData, "npm"),
      path.join(programFiles, "Git", "bin"),
      path.join(programFiles, "ngrok"),
      path.join(programFilesX86, "Git", "bin"),
      "C:\\Program Files\\Git\\usr\\bin",
      "C:\\Program Files\\Git\\bin",
    ].filter(Boolean);
  }

  // Unix-like (Linux, macOS)
  const homeDir = process.env.HOME || "";
  return [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    homeDir ? path.join(homeDir, ".local", "bin") : "",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ].filter(Boolean);
}

/**
 * Get the user-local bin directory for installing binaries
 */
export function getUserBinDir(): string {
  if (Platform.isWindows) {
    const localAppData = process.env.LOCALAPPDATA || "";
    return path.join(localAppData, "Programs");
  }

  // Unix-like: use ~/.local/bin
  const homeDir = process.env.HOME || "";
  return homeDir ? path.join(homeDir, ".local", "bin") : "/usr/local/bin";
}

/**
 * Kill processes using a specific port (platform-aware)
 */
export async function killPort(port: number): Promise<void> {
  if (Platform.isWindows) {
    try {
      // Windows: use netstat and taskkill
      const { stdout } = await execAsync(
        `netstat -ano | findstr :${port} | findstr LISTENING`
      );
      const lines = stdout.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
          await execAsync(`taskkill /F /PID ${pid}`).catch(() => {
            // Ignore errors if process already terminated
          });
        }
      }
    } catch {
      // Ignore errors - port may not be in use
    }
  } else {
    // Unix-like: try fuser, lsof, or lsof + kill
    const commands = [
      `fuser -k ${port}/tcp 2>/dev/null || true`,
      `lsof -ti:${port} | xargs -r kill -9 2>/dev/null || true`,
    ];

    for (const cmd of commands) {
      try {
        await execAsync(cmd);
      } catch {
        // Continue to next command
      }
    }
  }
}

/**
 * Kill a process by PID (platform-aware)
 */
export async function killPid(pid: number, signal = "SIGTERM"): Promise<void> {
  if (Platform.isWindows) {
    try {
      await execAsync(`taskkill /F /PID ${pid}`);
    } catch {
      // Process may already be terminated
    }
  } else {
    try {
      await execAsync(`kill -${signal} ${pid} 2>/dev/null || true`);
    } catch {
      // Process may already be terminated
    }
  }
}

/**
 * Find process IDs using a specific port (platform-aware)
 */
export async function findPidsByPort(port: number): Promise<number[]> {
  const pids: number[] = [];

  if (Platform.isWindows) {
    try {
      const { stdout } = await execAsync(
        `netstat -ano | findstr :${port} | findstr LISTENING`
      );
      const lines = stdout.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
          pids.push(parseInt(pid, 10));
        }
      }
    } catch {
      // Port may not be in use
    }
  } else {
    // Try lsof first, then fuser
    try {
      const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null`);
      const lines = stdout.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        const pid = parseInt(line.trim(), 10);
        if (!isNaN(pid)) {
          pids.push(pid);
        }
      }
    } catch {
      try {
        // Fallback to fuser
        const { stdout } = await execAsync(`fuser ${port}/tcp 2>/dev/null`);
        const match = stdout.match(/(\d+)/g);
        if (match) {
          pids.push(...match.map((p) => parseInt(p, 10)));
        }
      } catch {
        // Port not in use
      }
    }
  }

  return pids;
}

/**
 * Kill processes matching a pattern (platform-aware)
 */
export async function killProcessPattern(
  pattern: string
): Promise<number[]> {
  const killedPids: number[] = [];

  if (Platform.isWindows) {
    try {
      // Windows: use wmic or tasklist
      const { stdout } = await execAsync(
        `wmic process where "commandline like '%${pattern}%'" get processid /value`
      );
      const lines = stdout.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        const match = line.match(/ProcessId=(\d+)/i);
        if (match) {
          const pid = parseInt(match[1], 10);
          await killPid(pid);
          killedPids.push(pid);
        }
      }
    } catch {
      // No matching processes
    }
  } else {
    // Unix-like: use pkill
    try {
      await execAsync(`pkill -f "${pattern}" 2>/dev/null || true`);
    } catch {
      // No matching processes
    }
  }

  return killedPids;
}

/**
 * Get the executable name for a command (platform-aware)
 */
export function getExecutableName(command: string): string {
  if (Platform.isWindows) {
    // Windows executables typically have .exe extension
    if (!command.toLowerCase().endsWith(".exe")) {
      return `${command}.exe`;
    }
  }
  return command;
}

/**
 * Check if a path is executable (platform-aware)
 */
export function isExecutablePath(filePath: string): boolean {
  // On Windows, check if file has executable extension
  if (Platform.isWindows) {
    const ext = path.extname(filePath).toLowerCase();
    return [".exe", ".bat", ".cmd", ".ps1"].includes(ext);
  }

  // On Unix, check if path has executable bit
  try {
    const fs = require("fs");
    const stats = fs.statSync(filePath);
    return !!(stats.mode & parseInt("0100", 8)); // Execute bit for owner
  } catch {
    return false;
  }
}

// ============================================================================
// Client-Side Platform Detection (Browser/Electron)
// ============================================================================

/**
 * Check if running in Electron environment
 */
export const isElectron = typeof window !== 'undefined' &&
                         !!window.api?.apiKeys;

/**
 * Check if running on a mobile device
 */
export const isMobile = typeof window !== 'undefined' &&
                       /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/**
 * Check if running on desktop (Electron or non-mobile web)
 */
export const isDesktop = isElectron || (!isMobile && typeof window !== 'undefined');

/**
 * Get the current platform type (client-side)
 */
export function getClientPlatform(): 'electron' | 'mobile' | 'web' {
  if (isElectron) return 'electron';
  if (isMobile) return 'mobile';
  return 'web';
}

/**
 * Check if the app is running in development mode (client-side)
 */
export const isDevelopment = typeof window !== 'undefined' &&
                            (window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname === '');

/**
 * Get operating system from browser (client-side)
 */
export function getBrowserOS(): 'linux' | 'macos' | 'windows' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('linux')) return 'linux';
  if (userAgent.includes('mac') || userAgent.includes('os x')) return 'macos';
  if (userAgent.includes('win')) return 'windows';

  return 'unknown';
}

/**
 * Check if file access should be available (Electron only)
 */
export const hasFileAccess = isElectron;

/**
 * Check if GitHub integration is available (has native API access)
 */
export const hasNativeGitHub = isElectron;

/**
 * Platform-specific feature flags (client-side)
 */
export const platformFeatures = {
  fileAccess: hasFileAccess,
  nativeGitHub: hasNativeGitHub,
  ngrokTunnel: isElectron, // Ngrok tunneling only works in Electron
  persistentStorage: isElectron, // Only Electron has secure persistent storage
  deployment: true, // Deployment works on all platforms
  mobileTunnel: isElectron, // Mobile tunnel creation is Electron-only
};
