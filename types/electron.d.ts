export interface ElectronAPI {
  encryptValue: (value: string) => Promise<string>;
  decryptValue: (encryptedValue: string) => Promise<string | null>;
  getAppVersion: () => Promise<string>;
  getAppPath: (name: string) => Promise<string>;
  onMessage: (callback: (event: any, message: any) => void) => void;
  sendMessage: (channel: string, data: any) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
