import { useCallback, useEffect, useState } from "react";
import { partsService, Part } from "@/services/partsService";

interface UseServerPaginatedPartsProps {
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

export function useServerPaginatedParts({
  initialPage = 1,
  initialPageSize = 10,
  initialSearchTerm = "",
  searchField = "description"
}: UseServerPaginatedPartsProps = {}) {
  // State for parts data
  const [parts, setParts] = useState<Part[]>([]);
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

  // Function to fetch parts with search and pagination
  const fetchParts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the searchParts method from partsService
      const result = await partsService.searchParts(
        searchTerm,
        searchField,
        pagination.currentPage,
        pagination.pageSize
      );

      // Update the parts state
      setParts(result.parts);
      
      // Update pagination information
      setPagination(prev => ({
        ...prev,
        pageCount: Math.max(1, Math.ceil(result.total / prev.pageSize)),
        totalItems: result.total
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch parts"));
      console.error("Error fetching parts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, searchField, pagination.currentPage, pagination.pageSize]);

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

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
    parts,
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
    refreshParts: fetchParts
  };
} 