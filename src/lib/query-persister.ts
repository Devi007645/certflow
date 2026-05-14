import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { del, get, set } from 'idb-keyval';
import { Persister } from '@tanstack/react-query-persist-client';

/**
 * Creates an IndexedDB persister for TanStack Query.
 * This allows the API cache to survive page refreshes and offline periods.
 */
export const createIDBPersister = (idbKey: string = 'react-query-cache'): Persister => {
  return {
    persistClient: async (client) => {
      await set(idbKey, client);
    },
    restoreClient: async () => {
      return await get(idbKey);
    },
    removeClient: async () => {
      await del(idbKey);
    },
  };
};

/**
 * Fallback localStorage persister
 */
export const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
});
