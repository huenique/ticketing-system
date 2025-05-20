import { useCallback, useEffect, useState } from "react";
import { usersService, User } from "@/services/usersService";

interface UseServerPaginatedUsersProps {
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

export function useServerPaginatedUsers({
  initialPage = 1,
  initialPageSize = 10,
  initialSearchTerm = "",
  searchField = "first_name"
}: UseServerPaginatedUsersProps = {}) {
  // State for users data
  const [users, setUsers] = useState<User[]>([]);
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

  // Function to fetch users with search and pagination
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the searchUsers method from usersService
      const result = await usersService.searchUsers(
        searchTerm,
        searchField,
        pagination.currentPage,
        pagination.pageSize
      );

      // Update the users state
      setUsers(result.users);
      
      // Update pagination information
      setPagination(prev => ({
        ...prev,
        pageCount: Math.max(1, Math.ceil(result.total / prev.pageSize)),
        totalItems: result.total
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch users"));
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, searchField, pagination.currentPage, pagination.pageSize]);

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    users,
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
    refreshUsers: fetchUsers
  };
} 