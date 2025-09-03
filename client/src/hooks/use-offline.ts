import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface OfflineAction {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }

    // Load offline actions from localStorage
    const savedActions = localStorage.getItem('offline_actions');
    if (savedActions) {
      setOfflineActions(JSON.parse(savedActions));
    }
  }, []);

  useEffect(() => {
    // When coming back online, sync offline actions
    if (isOnline && offlineActions.length > 0) {
      syncOfflineActions();
    }
  }, [isOnline]);

  const addOfflineAction = (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const offlineAction: OfflineAction = {
      ...action,
      id: `offline_${Date.now()}_${Math.random()}`,
      timestamp: Date.now()
    };

    const newActions = [...offlineActions, offlineAction];
    setOfflineActions(newActions);
    localStorage.setItem('offline_actions', JSON.stringify(newActions));
  };

  const syncOfflineActions = async () => {
    const actionsToSync = [...offlineActions];
    const successfulActions: string[] = [];

    for (const action of actionsToSync) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });

        if (response.ok) {
          successfulActions.push(action.id);
        }
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);
      }
    }

    if (successfulActions.length > 0) {
      const remainingActions = offlineActions.filter(
        action => !successfulActions.includes(action.id)
      );
      setOfflineActions(remainingActions);
      localStorage.setItem('offline_actions', JSON.stringify(remainingActions));
      
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
    }
  };

  const cacheData = (key: string, data: any) => {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  };

  const getCachedData = (key: string, maxAge: number = 5 * 60 * 1000) => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < maxAge) {
          return data;
        }
      }
    } catch (error) {
      console.error('Failed to get cached data:', error);
    }
    return null;
  };

  const clearCache = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  };

  return {
    isOnline,
    offlineActions,
    addOfflineAction,
    syncOfflineActions,
    cacheData,
    getCachedData,
    clearCache
  };
}