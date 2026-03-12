import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Dynamically import localforage only on web to avoid native crashing
let localForage: typeof import('localforage') | null = null;
if (Platform.OS === 'web') {
  localForage = require('localforage');
  localForage?.config({
    name: 'SmokePace',
    storeName: 'app_data',
    description: 'Persistent robust storage for PWA'
  });
}

/**
 * StorageService
 * Provides a unified, robust storage interface.
 * Web -> Uses IndexedDB via localForage (to survive cache clearing on PWA). 
 * Native -> Falls back to standard AsyncStorage.
 */
class StorageService {
  constructor() {
    this.requestPersistentStorage();
  }

  /**
   * Tries to ensure the browser won't arbitrarily clear our storage.
   */
  private async requestPersistentStorage() {
    if (Platform.OS === 'web' && navigator && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        console.log(`PWA Persistent Storage Granted: ${isPersisted}`);
      } catch (e) {
        console.warn('Could not request persistent storage', e);
      }
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && localForage) {
        await localForage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (e) {
      console.error(`StorageService [setItem] error for key ${key}`, e);
      throw e;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && localForage) {
        const item = await localForage.getItem<string>(key);
        // Fallback to AsyncStorage if we were migrating from an old version on Web
        if (item === null) {
          const oldItem = await AsyncStorage.getItem(key);
          if (oldItem !== null) {
            // Migrate
            await localForage.setItem(key, oldItem);
            return oldItem;
          }
        }
        return item;
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (e) {
      console.error(`StorageService [getItem] error for key ${key}`, e);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      if (Platform.OS === 'web' && localForage) {
        await localForage.removeItem(key);
      }
    } catch (e) {
      console.error(`StorageService [removeItem] error for key ${key}`, e);
      throw e;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      if (Platform.OS === 'web' && localForage) {
        await localForage.clear();
      }
    } catch (e) {
      console.error(`StorageService [clear] error`, e);
      throw e;
    }
  }
}

export const storage = new StorageService();
