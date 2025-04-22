import { useState, useEffect, useCallback } from "react";
import { Status, statusesService } from "@/services/ticketsService";

interface UseAppwriteStatusesProps {
  initialFetch?: boolean;
}

interface UseAppwriteStatusesReturn {
  statuses: Status[];
  isLoading: boolean;
  error: Error | null;
  fetchStatuses: () => Promise<void>;
  getStatus: (id: string) => Promise<Status | undefined>;
  createStatus: (statusData: Omit<Status, "id">) => Promise<Status>;
  updateStatus: (id: string, statusData: Partial<Status>) => Promise<Status>;
  deleteStatus: (id: string) => Promise<void>;
}

export function useAppwriteStatuses({ initialFetch = true }: UseAppwriteStatusesProps = {}): UseAppwriteStatusesReturn {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatuses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await statusesService.getAllStatuses();
      setStatuses(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch statuses"));
      console.error("Error fetching statuses:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getStatus = useCallback(async (id: string): Promise<Status | undefined> => {
    try {
      const foundStatus = statuses.find(status => status.id === id);
      if (foundStatus) return foundStatus;
      
      // If not in local state, fetch from API
      const status = await statusesService.getStatus(id);
      return status;
    } catch (err) {
      console.error(`Error fetching status ${id}:`, err);
      return undefined;
    }
  }, [statuses]);

  const createStatus = useCallback(async (statusData: Omit<Status, "id">): Promise<Status> => {
    try {
      const newStatus = await statusesService.createStatus(statusData);
      setStatuses((prevStatuses) => [...prevStatuses, newStatus]);
      return newStatus;
    } catch (err) {
      console.error("Error creating status:", err);
      throw err;
    }
  }, []);

  const updateStatus = useCallback(async (id: string, statusData: Partial<Status>): Promise<Status> => {
    try {
      const updatedStatus = await statusesService.updateStatus(id, statusData);
      setStatuses((prevStatuses) =>
        prevStatuses.map((status) => (status.id === id ? updatedStatus : status))
      );
      return updatedStatus;
    } catch (err) {
      console.error(`Error updating status ${id}:`, err);
      throw err;
    }
  }, []);

  const deleteStatus = useCallback(async (id: string): Promise<void> => {
    try {
      await statusesService.deleteStatus(id);
      setStatuses((prevStatuses) => prevStatuses.filter((status) => status.id !== id));
    } catch (err) {
      console.error(`Error deleting status ${id}:`, err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (initialFetch) {
      fetchStatuses();
    }
  }, [fetchStatuses, initialFetch]);

  return {
    statuses,
    isLoading,
    error,
    fetchStatuses,
    getStatus,
    createStatus,
    updateStatus,
    deleteStatus,
  };
} 