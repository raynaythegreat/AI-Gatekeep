/**
 * Detects whether the app is running in remote/mobile mode
 * based on the OS_REMOTE_MODE environment variable.
 */
export function isRemoteMode(): boolean {
  if (typeof process !== 'undefined' && process.env.OS_REMOTE_MODE === 'true') {
    return true;
  }
  return false;
}

/**
 * Gets the public URL (ngrok tunnel URL) for proxying requests.
 * Only used in remote/mobile mode.
 */
export function getPublicUrl(): string {
  return process.env.OS_PUBLIC_URL || 'http://localhost:3456';
}

/**
 * Gets the mobile password for authentication.
 * Only used in remote/mobile mode.
 */
export function getMobilePassword(): string {
  return process.env.MOBILE_PASSWORD || '';
}
