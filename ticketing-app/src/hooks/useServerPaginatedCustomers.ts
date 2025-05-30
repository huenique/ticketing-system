import { useCallback, useEffect, useState } from "react";
import { customersService } from "@/services/customersService";
import { Customer } from "@/types/common";

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

interface UseServerPaginatedCustomersOptions {
  initialPage?: number;
  pageSize?: number;
  initialSearchTerm?: string;
  initialSearchField?: string;
}

export const useServerPaginatedCustomers = (options: UseServerPaginatedCustomersOptions = {}) => {
  const {
    initialPage = 1,
    pageSize = 10,
    initialSearchTerm = '',
    initialSearchField = 'all'  // Changed default to 'all'
  } = options;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [searchField, setSearchField] = useState(initialSearchField);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: initialPage,
    pageSize: pageSize,
    totalPages: 0,
    totalItems: 0
  });

  // Available search fields for the UI
  const searchFields = [
    { id: 'all', label: 'All Fields' },
    { id: 'name', label: 'Customer Name' },
    { id: 'address', label: 'Address' },
    { id: 'primary_contact_name', label: 'Contact Name' },
    { id: 'primary_email', label: 'Email' },
    { id: 'abn', label: 'ABN' }
  ];

  // Function to fetch customers with search and pagination
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the searchCustomers method from customersService
      const result = await customersService.searchCustomers(
        searchTerm,
        searchField,
        pagination.currentPage,
        pagination.pageSize
      );

      // Convert from Appwrite format to Common format
      const mappedCustomers = result.customers.map((customer) => ({
        id: customer.$id,
        name: customer.name,
        address: customer.address,
        primary_contact_name: customer.primary_contact_name,
        primary_contact_number: customer.primary_contact_number,
        primary_email: customer.primary_email,
        abn: customer.abn || '',
        customer_contact_ids: customer.customer_contact_ids || [],
        contacts: [], // Initialize empty contacts array
        createdAt: customer.$createdAt,
        updatedAt: customer.$updatedAt
      }));

      setCustomers(mappedCustomers);
      setPagination((prev) => ({
        ...prev,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / pagination.pageSize)
      }));
    } catch (err) {
      const error = err as Error;
      
      // More specific error message for fulltext index errors
      if (error.message.includes('fulltext index')) {
        let fieldName = searchField === 'all' ? 'multiple fields' : searchField;
        setError(new Error(`Search failed: No fulltext index for ${fieldName}. Using fallback search with limited results.`));
      } else {
        setError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, searchField, pagination.currentPage, pagination.pageSize]);

  // Fetch customers when pagination, search term, or search field changes
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Function to change the current page
  const goToPage = (page: number) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: page
    }));
  };

  // Function to change the page size
  const changePageSize = (newPageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1 // Reset to first page when changing page size
    }));
  };

  // Function to update the search term
  const updateSearch = (term: string, field: string = searchField) => {
    setSearchTerm(term);
    setSearchField(field);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on new search
  };

  return {
    customers,
    isLoading,
    error,
    pagination,
    searchTerm,
    searchField,
    searchFields,
    goToPage,
    updateSearch,
    changePageSize,
    refresh: fetchCustomers
  };
}; 