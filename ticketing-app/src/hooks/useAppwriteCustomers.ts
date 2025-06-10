import { useCallback, useEffect, useState } from "react";

import { customerContactsService } from "@/services";
import { customersService } from "@/services/customersService";
import { Customer, CustomerContact } from "@/types/common";

interface UseAppwriteCustomersProps {
  initialFetch?: boolean;
  initialLimit?: number;
}

interface UseAppwriteCustomersReturn {
  customers: Customer[];
  isLoading: boolean;
  error: Error | null;
  totalCustomers: number;
  page: number;
  limit: number;
  totalPages: number;
  fetchCustomers: (page?: number) => Promise<void>;
  setLimit: (limit: number) => void;
  getCustomer: (id: string) => Promise<Customer | undefined>;
  createCustomer: (
    customerData: Omit<Customer, "id" | "createdAt" | "updatedAt">,
  ) => Promise<Customer>;
  updateCustomer: (id: string, customerData: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomerContacts: (customerId: string) => Promise<CustomerContact[]>;
}

export function useAppwriteCustomers({
  initialFetch = true,
  initialLimit = 20,
}: UseAppwriteCustomersProps = {}): UseAppwriteCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(initialLimit);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);

  const fetchCustomers = useCallback(async (newPage?: number) => {
    setIsLoading(true);
    setError(null);
    
    const currentPage = newPage || page;
    if (newPage) setPage(newPage);
    
    const offset = (currentPage - 1) * limit;
    console.log(`fetchCustomers: Fetching page ${currentPage} with limit ${limit}, offset ${offset}`);

    try {
      const result = await customersService.getAllCustomers({ limit, offset });
      console.log(`fetchCustomers: Received ${result.customers.length} customers out of ${result.total} total`);
      setTotalCustomers(result.total);
      
      // Convert from Appwrite format to Common format
      const mappedCustomers = result.customers.map((customer) => ({
        id: customer.$id,
        name: customer.name,
        address: customer.address,
        abn: customer.abn || "",
        // Map contacts if they exist (now they're full objects, not just IDs)
        customer_contact_ids: customer.customer_contact_ids || [],
        // Also extract contacts as a convenience property
        contacts: customer.customer_contact_ids 
          ? customer.customer_contact_ids.map((contact: any) => ({
              id: contact.$id,
              customerId: customer.$id,
              first_name: contact.first_name,
              last_name: contact.last_name,
              position: contact.position || "",
              contact_number: contact.contact_number,
              email: contact.email,
              createdAt: contact.$createdAt,
              updatedAt: contact.$updatedAt,
              customer_ids: [customer.$id]
            })) as CustomerContact[]
          : [],
        createdAt: customer.$createdAt,
        updatedAt: customer.$updatedAt,
      }));
      setCustomers(mappedCustomers);
      console.log(`fetchCustomers: Successfully updated state with ${mappedCustomers.length} customers`);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch customers"));
      console.error("Error fetching customers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  // When limit changes, reset to first page and refetch
  useEffect(() => {
    console.log(`useAppwriteCustomers: Effect triggered by limit change to ${limit}`);
    if (initialFetch) {
      console.log(`useAppwriteCustomers: Setting page to 1 and fetching for limit=${limit}`);
      setPage(1);
      // Use a function reference to avoid dependency on fetchCustomers
      const offset = 0; // For page 1
      (async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          console.log(`useAppwriteCustomers effect: Fetching page 1 with limit ${limit}, offset ${offset}`);
          const result = await customersService.getAllCustomers({ limit, offset });
          console.log(`useAppwriteCustomers effect: Received ${result.customers.length} customers out of ${result.total} total`);
          setTotalCustomers(result.total);
          
          // Convert from Appwrite format to Common format
          const mappedCustomers = result.customers.map((customer) => ({
            id: customer.$id,
            name: customer.name,
            address: customer.address,
            abn: customer.abn || "",
            customer_contact_ids: customer.customer_contact_ids || [],
            contacts: customer.customer_contact_ids 
              ? customer.customer_contact_ids.map((contact: any) => ({
                  id: contact.$id,
                  customerId: customer.$id,
                  first_name: contact.first_name,
                  last_name: contact.last_name,
                  position: contact.position || "",
                  contact_number: contact.contact_number,
                  email: contact.email,
                  createdAt: contact.$createdAt,
                  updatedAt: contact.$updatedAt,
                  customer_ids: [customer.$id]
                })) as CustomerContact[]
              : [],
            createdAt: customer.$createdAt,
            updatedAt: customer.$updatedAt,
          }));
          setCustomers(mappedCustomers);
          console.log(`useAppwriteCustomers effect: Successfully updated state with ${mappedCustomers.length} customers`);
        } catch (err) {
          setError(err instanceof Error ? err : new Error("Failed to fetch customers"));
          console.error("Error fetching customers:", err);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [limit, initialFetch]);

  // Initial fetch on component mount - only run once
  useEffect(() => {
    if (initialFetch) {
      console.log(`useAppwriteCustomers: Initial mount fetch with limit=${limit}`);
      fetchCustomers();
    }
  }, []);

  const getCustomer = useCallback(
    async (id: string): Promise<Customer | undefined> => {
      try {
        const foundCustomer = customers.find((customer) => customer.id === id);
        if (foundCustomer) return foundCustomer;

        // If not in local state, fetch from API
        const customer = await customersService.getCustomer(id);
        // Convert from Appwrite format to Common format
        return {
          id: customer.$id,
          name: customer.name,
          address: customer.address,
          abn: customer.abn || "",
          // Map contacts if they exist (now they're full objects, not just IDs)
          customer_contact_ids: customer.customer_contact_ids || [],
          // Also extract contacts as a convenience property
          contacts: customer.customer_contact_ids 
            ? customer.customer_contact_ids.map((contact: any) => ({
                id: contact.$id,
                customerId: customer.$id,
                first_name: contact.first_name,
                last_name: contact.last_name,
                position: contact.position || "",
                contact_number: contact.contact_number,
                email: contact.email,
                createdAt: contact.$createdAt,
                updatedAt: contact.$updatedAt,
                customer_ids: [customer.$id]
              })) as CustomerContact[]
            : [],
          createdAt: customer.$createdAt,
          updatedAt: customer.$updatedAt,
        };
      } catch (err) {
        console.error(`Error fetching customer ${id}:`, err);
        return undefined;
      }
    },
    [customers],
  );

  const createCustomer = useCallback(
    async (customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer> => {
      try {
        const result = await customersService.createCustomer({
          name: customer.name,
          address: customer.address,
          abn: customer.abn,
        });
        return {
          id: result.$id,
          name: result.name,
          address: result.address,
          abn: result.abn || "",
          customer_contact_ids: result.customer_contact_ids || [],
          contacts: result.customer_contact_ids 
            ? result.customer_contact_ids.map((contact: any) => ({
                id: contact.$id,
                customerId: result.$id,
                first_name: contact.first_name,
                last_name: contact.last_name,
                position: contact.position || "",
                contact_number: contact.contact_number,
                email: contact.email,
                createdAt: contact.$createdAt,
                updatedAt: contact.$updatedAt,
                customer_ids: [result.$id]
              })) as CustomerContact[]
            : [],
          createdAt: result.$createdAt,
          updatedAt: result.$updatedAt,
        };
      } catch (err) {
        console.error("Error creating customer:", err);
        throw err;
      }
    },
    []
  );

  const updateCustomer = useCallback(
    async (id: string, customer: Partial<Customer>): Promise<Customer> => {
      try {
        const result = await customersService.updateCustomer(id, {
          name: customer.name,
          address: customer.address,
          abn: customer.abn,
        });
        return {
          id: result.$id,
          name: result.name,
          address: result.address,
          abn: result.abn || "",
          customer_contact_ids: result.customer_contact_ids || [],
          contacts: result.customer_contact_ids 
            ? result.customer_contact_ids.map((contact: any) => ({
                id: contact.$id,
                customerId: result.$id,
                first_name: contact.first_name,
                last_name: contact.last_name,
                position: contact.position || "",
                contact_number: contact.contact_number,
                email: contact.email,
                createdAt: contact.$createdAt,
                updatedAt: contact.$updatedAt,
                customer_ids: [result.$id]
              })) as CustomerContact[]
            : [],
          createdAt: result.$createdAt,
          updatedAt: result.$updatedAt,
        };
      } catch (err) {
        console.error("Error updating customer:", err);
        throw err;
      }
    },
    []
  );

  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    try {
      await customersService.deleteCustomer(id);
      setCustomers((prevCustomers) =>
        prevCustomers.filter((customer) => customer.id !== id),
      );
    } catch (err) {
      console.error(`Error deleting customer ${id}:`, err);
      throw err;
    }
  }, []);

  const getCustomerContacts = useCallback(
    async (customerId: string): Promise<CustomerContact[]> => {
      try {
        // Try to find the customer in the local state first
        const customer = customers.find(c => c.id === customerId);
        if (customer && customer.contacts) {
          return customer.contacts;
        }
        
        // If not found or contacts not available, fetch the customer
        const fetchedCustomer = await getCustomer(customerId);
        return fetchedCustomer?.contacts || [];
      } catch (err) {
        console.error(`Error getting contacts for customer ${customerId}:`, err);
        return [];
      }
    },
    [customers, getCustomer],
  );

  return {
    customers,
    isLoading,
    error,
    totalCustomers,
    page,
    limit,
    totalPages: Math.ceil(totalCustomers / limit),
    fetchCustomers,
    setLimit,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerContacts,
  };
}
