/**
 * TorahLocalDB - IndexedDB wrapper for offline-first caching
 * Stores sefarim data, user data, and commentaries locally
 */

const DB_NAME = 'torah_local_db';
const DB_VERSION = 3;

interface StoredSefer {
  seferId: number;
  data: any;
  timestamp: number;
  sizeMB: number;
}

class TorahLocalDB {
  private db: IDBDatabase | null = null;
  private isAvailable = false;

  async init(): Promise<void> {
    if (this.db) return;
    
    return new Promise((resolve) => {
      try {
        if (!window.indexedDB) {
          console.warn('[TorahDB] IndexedDB not available');
          resolve();
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.warn('[TorahDB] Failed to open database');
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Sefarim store
          if (!db.objectStoreNames.contains('sefarim')) {
            db.createObjectStore('sefarim', { keyPath: 'seferId' });
          }
          
          // Metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
          
          // User data store (highlights, notes, bookmarks, etc.)
          if (!db.objectStoreNames.contains('user_data')) {
            db.createObjectStore('user_data', { keyPath: 'key' });
          }
          
          // Commentaries store
          if (!db.objectStoreNames.contains('commentaries')) {
            db.createObjectStore('commentaries', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.isAvailable = true;
          console.log('[TorahDB] Database initialized');
          resolve();
        };
      } catch (e) {
        console.warn('[TorahDB] Init error:', e);
        resolve();
      }
    });
  }

  // ===== SEFARIM =====

  async getSefer(seferId: number): Promise<any | null> {
    if (!this.isAvailable || !this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('sefarim', 'readonly');
        const store = tx.objectStore('sefarim');
        const request = store.get(seferId);

        request.onsuccess = () => {
          const result = request.result as StoredSefer | undefined;
          resolve(result?.data ?? null);
        };

        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async saveSefer(seferId: number, data: any): Promise<void> {
    if (!this.isAvailable || !this.db) return;

    return new Promise((resolve) => {
      try {
        const jsonStr = JSON.stringify(data);
        const sizeMB = jsonStr.length / (1024 * 1024);

        const tx = this.db!.transaction('sefarim', 'readwrite');
        const store = tx.objectStore('sefarim');
        store.put({
          seferId,
          data,
          timestamp: Date.now(),
          sizeMB: Math.round(sizeMB * 10) / 10,
        } as StoredSefer);

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getStoredSefarim(): Promise<{ seferId: number; timestamp: number; sizeMB: number }[]> {
    if (!this.isAvailable || !this.db) return [];

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('sefarim', 'readonly');
        const store = tx.objectStore('sefarim');
        const request = store.getAll();

        request.onsuccess = () => {
          const results = (request.result as StoredSefer[]).map(({ seferId, timestamp, sizeMB }) => ({
            seferId,
            timestamp,
            sizeMB,
          }));
          resolve(results);
        };

        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async clearSefarim(): Promise<void> {
    if (!this.isAvailable || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('sefarim', 'readwrite');
        tx.objectStore('sefarim').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // ===== USER DATA =====

  async getUserData(key: string): Promise<any | null> {
    if (!this.isAvailable || !this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('user_data', 'readonly');
        const store = tx.objectStore('user_data');
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result?.data ?? null);
        };

        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async saveUserData(key: string, data: any): Promise<void> {
    if (!this.isAvailable || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('user_data', 'readwrite');
        const store = tx.objectStore('user_data');
        store.put({ key, data, timestamp: Date.now() });

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async hasUserData(key: string): Promise<boolean> {
    if (!this.isAvailable || !this.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('user_data', 'readonly');
        const store = tx.objectStore('user_data');
        const request = store.get(key);

        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async clearUserData(): Promise<void> {
    if (!this.isAvailable || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('user_data', 'readwrite');
        tx.objectStore('user_data').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // ===== COMMENTARIES =====

  async getCommentary(key: string): Promise<any | null> {
    if (!this.isAvailable || !this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('commentaries', 'readonly');
        const store = tx.objectStore('commentaries');
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result?.data ?? null);
        };

        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async saveCommentary(key: string, data: any): Promise<void> {
    if (!this.isAvailable || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('commentaries', 'readwrite');
        const store = tx.objectStore('commentaries');
        store.put({ key, data, timestamp: Date.now() });

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getCommentaryCount(): Promise<number> {
    if (!this.isAvailable || !this.db) return 0;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('commentaries', 'readonly');
        const store = tx.objectStore('commentaries');
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }

  async clearCommentaries(): Promise<void> {
    if (!this.isAvailable || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('commentaries', 'readwrite');
        tx.objectStore('commentaries').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // ===== GENERAL =====

  async getTotalSize(): Promise<number> {
    if (!this.isAvailable || !this.db) return 0;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('sefarim', 'readonly');
        const store = tx.objectStore('sefarim');
        const request = store.getAll();

        request.onsuccess = () => {
          const total = (request.result as StoredSefer[]).reduce((sum, s) => sum + (s.sizeMB || 0), 0);
          resolve(total);
        };

        request.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }

  async clearAll(): Promise<void> {
    if (!this.isAvailable || !this.db) return;

    await Promise.all([
      this.clearSefarim(),
      this.clearUserData(),
      this.clearCommentaries(),
    ]);
  }
}

export const torahDB = new TorahLocalDB();
