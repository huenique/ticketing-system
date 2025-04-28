import { useCallback, useEffect, useState } from "react";
import { Status, statusesService } from "@/services/ticketsService";

/**
 * Hook to convert between status labels and status IDs
 * This is needed since the UI works with status labels but Appwrite needs IDs
 */
export function useStatusIdFromLabel() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load all statuses when the hook mounts
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await statusesService.getAllStatuses();
        setStatuses(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load statuses"));
        console.error("Error loading statuses:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStatuses();
  }, []);

  // Convert a status label to an ID
  const getStatusIdFromLabel = useCallback(
    (label: string): string | null => {
      const status = statuses.find((s) => s.label === label);
      return status ? status.$id || status.id : null;
    },
    [statuses]
  );

  // Convert a status ID to a label
  const getStatusLabelFromId = useCallback(
    (id: string): string | null => {
      const status = statuses.find((s) => (s.$id || s.id) === id);
      return status ? status.label : null;
    },
    [statuses]
  );

  return {
    getStatusIdFromLabel,
    getStatusLabelFromId,
    loading,
    error,
    statuses
  };
} 