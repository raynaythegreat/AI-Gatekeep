class SecureStorage {
  private isElectron(): boolean {
    return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
  }

  async setItem(key: string, value: string, isSensitive = false): Promise<void> {
    if (!this.isElectron()) {
      localStorage.setItem(key, value);
      return;
    }

    if (isSensitive) {
      try {
        const encrypted = await window.electronAPI.encryptValue(value);
        localStorage.setItem(key, encrypted);
      } catch (error) {
        console.error('Encryption failed:', error);
        localStorage.setItem(key, value);
      }
    } else {
      localStorage.setItem(key, value);
    }
  }

  async getItem(key: string, isSensitive = false): Promise<string | null> {
    if (!this.isElectron()) {
      return localStorage.getItem(key);
    }

    const value = localStorage.getItem(key);
    if (!value) return null;

    if (isSensitive) {
      try {
        const decrypted = await window.electronAPI.decryptValue(value);
        return decrypted;
      } catch (error) {
        console.error('Decryption failed:', error);
        return value;
      }
    }

    return value;
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}

export const secureStorage = new SecureStorage();
