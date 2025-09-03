import { storage } from "./storage";

class CleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  start() {
    console.log("🧹 Starting cleanup service - checking every 24 hours for completed todos");
    
    // Run cleanup immediately on start
    this.runCleanup();
    
    // Schedule regular cleanup every 24 hours
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("🧹 Cleanup service stopped");
    }
  }

  private async runCleanup() {
    try {
      const cleanedCount = await storage.cleanupCompletedTodos();
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} completed todos (older than 24 hours)`);
      } else {
        console.log("🧹 No completed todos to clean up");
      }
    } catch (error) {
      console.error("🧹 Error during cleanup:", error);
    }
  }

  // Method to manually trigger cleanup (useful for testing)
  async manualCleanup(): Promise<number> {
    return this.runCleanup();
  }
}

export const cleanupService = new CleanupService();