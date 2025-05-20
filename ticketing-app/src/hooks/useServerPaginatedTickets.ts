import { useCallback, useEffect, useState } from "react";
import { ticketsService } from "@/services";
import { Ticket } from "@/types/tickets";

interface UseServerPaginatedTicketsProps {
  initialPage?: number;
  initialPageSize?: number;
  initialSearchTerm?: string;
  searchField?: string;
}

interface PaginationState {
  currentPage: number;
  pageSize: number;
  pageCount: number;
  totalItems: number;
  pageSizeOptions: number[];
}

export function useServerPaginatedTickets({
  initialPage = 1,
  initialPageSize = 10,
  initialSearchTerm = "",
  searchField = "description"
}: UseServerPaginatedTicketsProps = {}) {
  // State for tickets data
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // State for search and pagination
  const [searchTerm, setSearchTerm] = useState<string>(initialSearchTerm);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: initialPage,
    pageSize: initialPageSize,
    pageCount: 1,
    totalItems: 0,
    pageSizeOptions: [5, 10, 20, 50, 100]
  });

  // Function to fetch tickets with search and pagination
  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the searchTickets method from ticketsService
      const result = await ticketsService.searchTickets(
        searchTerm,
        searchField,
        pagination.currentPage,
        pagination.pageSize
      );

      // Update the tickets state
      setTickets(result.tickets);
      
      // Update pagination information
      setPagination(prev => ({
        ...prev,
        pageCount: Math.max(1, Math.ceil(result.total / prev.pageSize)),
        totalItems: result.total
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch tickets"));
      console.error("Error fetching tickets:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, searchField, pagination.currentPage, pagination.pageSize]);

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Handler for page changes
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  }, []);

  // Handler for page size changes
  const handlePageSizeChange = useCallback((size: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize: size,
      currentPage: 1 // Reset to first page when changing page size
    }));
  }, []);

  // Handler for search term changes
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPagination(prev => ({
      ...prev,
      currentPage: 1 // Reset to first page when searching
    }));
  }, []);

  // Return the data and handlers
  return {
    tickets,
    isLoading,
    error,
    searchTerm,
    pagination: {
      ...pagination,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
      onSearch: handleSearch,
      isLoading
    },
    refreshTickets: fetchTickets
  };
} 