import { useOffline } from "@/hooks/use-offline";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflineIndicator() {
  const { isOnline, offlineActions } = useOffline();

  if (isOnline && offlineActions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {!isOnline ? (
        <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-full shadow-lg">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline</span>
        </div>
      ) : offlineActions.length > 0 ? (
        <div className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">
            Syncing {offlineActions.length} change{offlineActions.length !== 1 ? 's' : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}