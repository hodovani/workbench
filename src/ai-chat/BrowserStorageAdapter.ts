import type { StorageAdapter } from "./types";

export class BrowserStorageAdapter implements StorageAdapter {
  private storage: Storage; // window.localStorage or window.sessionStorage

  constructor(storage: Storage) {
    this.storage = storage;
  }

  public has(key: string): boolean {
    return this.storage.getItem(key) !== null;
  }
  public get(key: string): string | null {
    return this.storage.getItem(key);
  }
  public set(key: string, value: string): void {
    this.storage.setItem(key, value);
  }
  public remove(key: string): void {
    this.storage.removeItem(key);
  }
}
