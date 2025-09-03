import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return await res.json();
  } catch (error) {
    // Handle offline scenarios
    if (!navigator.onLine) {
      // Store request for later sync if it's a mutation
      if (method !== 'GET') {
        const offlineAction = {
          url,
          method,
          headers: data ? { "Content-Type": "application/json" } : {},
          body: data ? JSON.stringify(data) : undefined,
        };
        
        const existingActions = JSON.parse(localStorage.getItem('offline_actions') || '[]');
        existingActions.push({
          ...offlineAction,
          id: `offline_${Date.now()}_${Math.random()}`,
          timestamp: Date.now()
        });
        localStorage.setItem('offline_actions', JSON.stringify(existingActions));
        
        throw new Error('Changes saved offline - will sync when connection is restored');
      }
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401 or when offline
        if (error.message.includes('401') || !navigator.onLine) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations when offline - they're stored for later sync
        if (!navigator.onLine) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
