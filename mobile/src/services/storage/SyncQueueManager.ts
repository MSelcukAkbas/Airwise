import { storage } from './StorageService';

/**
 * Type of actions that can be queued for synchronization when offline
 */
export type SyncActionType = 'PROFILE_UPDATE' | 'LOG_SMOKE' | 'TASK_COMPLETE' | 'RESET_JOURNEY';

export interface SyncOperation {
  id: string;
  type: SyncActionType;
  payload: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = '@smokepace_offline_sync_queue';

/**
 * SyncQueueManager
 * 
 * An offline-first structural manager.
 * Whenever a user takes an action (e.g. logs a smoke), we record it in local storage using StorageService.
 * We also queue the action here.
 * 
 * When the app connects to the internet (or via a scheduled background task), 
 * this manager sweeps the queue and pushes actions sequentially to the backend server.
 */
class SyncQueueManager {
  
  /**
   * Enqueue a new operation to eventually push to the server.
   * This is called by AppContext right *after* local state is successfully updated.
   */
  async enqueueOperation(type: SyncActionType, payload: any): Promise<void> {
    try {
      const queueRaw = await storage.getItem(SYNC_QUEUE_KEY);
      const queue: SyncOperation[] = queueRaw ? JSON.parse(queueRaw) : [];
      
      const operation: SyncOperation = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        payload,
        timestamp: Date.now(),
      };
      
      queue.push(operation);
      await storage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      
      // Attempt to sync immediately if online (fire and forget)
      this.attemptSync();
    } catch (error) {
      console.error('Failed to enqueue sync operation', error);
    }
  }

  /**
   * Attempts to empty the queue and send to the backend.
   * Note: This is a structural placeholder ready for the actual Express/REST integration.
   */
  async attemptSync() {
    // 1. Check network status (e.g., using `expo-network` or `navigator.onLine` in web)
    const isOnline = true; // Placeholder
    if (!isOnline) {
      console.log('Sync deferred: Device is offline.');
      return;
    }

    try {
      const queueRaw = await storage.getItem(SYNC_QUEUE_KEY);
      if (!queueRaw) return;
      
      let queue: SyncOperation[] = JSON.parse(queueRaw);
      if (queue.length === 0) return;

      console.log(`Attempting to sync ${queue.length} operations to backend...`);

      // 2. Iterate through queue and hit the Backend APIs individually or in bulk.
      for (const op of queue) {
         // e.g. await apiClient.post('/sync', op);
         console.log('-> Synced operation:', op.type);
      }

      // 3. Keep only items that failed (or clear the entire queue if successful)
      queue = []; 

      await storage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
       console.error('Sync process interrupted or failed', error);
       // The operations are retained in the queue list securely in indexedDB for the next retry.
    }
  }
}

export const syncQueue = new SyncQueueManager();
