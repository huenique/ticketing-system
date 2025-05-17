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
        primary_contact_name: customer.primary_contact_name,
        primary_contact_number: customer.primary_contact_number,
        primary_email: customer.primary_email,
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
            primary_contact_name: customer.primary_contact_name,
            primary_contact_number: customer.primary_contact_number,
            primary_email: customer.primary_email,
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
          })) as any;
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
          primary_contact_name: customer.primary_contact_name,
          primary_contact_number: customer.primary_contact_number,
          primary_email: customer.primary_email,
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
    async (
      customerData: Omit<Customer, "id" | "createdAt" | "updatedAt">,
    ): Promise<Customer> => {
      try {
        // Convert from Common format to Appwrite format
        const appwriteData = {
          name: customerData.name,
          address: customerData.address,
          primary_contact_name: customerData.primary_contact_name,
          primary_contact_number: customerData.primary_contact_number,
          primary_email: customerData.primary_email,
          abn: customerData.abn || "",
          customer_contact_ids: customerData.customer_contact_ids || [], // Initialize as empty array
        };

        const newCustomer = await customersService.createCustomer(appwriteData);

        // Convert back to Common format
        const commonCustomer = {
          id: newCustomer.$id,
          name: newCustomer.name,
          address: newCustomer.address,
          primary_contact_name: newCustomer.primary_contact_name,
          primary_contact_number: newCustomer.primary_contact_number,
          primary_email: newCustomer.primary_email,
          abn: newCustomer.abn || "",
          customer_contact_ids: newCustomer.customer_contact_ids 
            ? newCustomer.customer_contact_ids.map((id: any) => 
                typeof id === 'string' ? id : id.$id
              )
            : [],
          createdAt: newCustomer.$createdAt,
          updatedAt: newCustomer.$updatedAt,
        };

        setCustomers((prevCustomers) => [...prevCustomers, commonCustomer]);
        return commonCustomer;
      } catch (err) {
        console.error("Error creating customer:", err);
        throw err;
      }
    },
    [],
  );

  const updateCustomer = useCallback(
    async (id: string, customerData: Partial<Customer>): Promise<Customer> => {
      try {
        // Convert from Common format to Appwrite format
        const appwriteData: any = {};

        if (customerData.name !== undefined) appwriteData.name = customerData.name;
        if (customerData.address !== undefined)
          appwriteData.address = customerData.address;
        if (customerData.primary_contact_name !== undefined)
          appwriteData.primary_contact_name = customerData.primary_contact_name;
        if (customerData.primary_contact_number !== undefined)
          appwriteData.primary_contact_number = customerData.primary_contact_number;
        if (customerData.primary_email !== undefined)
          appwriteData.primary_email = customerData.primary_email;
        if (customerData.abn !== undefined) appwriteData.abn = customerData.abn;
        if (customerData.customer_contact_ids !== undefined) 
          appwriteData.customer_contact_ids = customerData.customer_contact_ids;

        const updatedCustomer = await customersService.updateCustomer(id, appwriteData);

        // Convert back to Common format
        const commonCustomer = {
          id: updatedCustomer.$id,
          name: updatedCustomer.name,
          address: updatedCustomer.address,
          primary_contact_name: updatedCustomer.primary_contact_name,
          primary_contact_number: updatedCustomer.primary_contact_number,
          primary_email: updatedCustomer.primary_email,
          abn: updatedCustomer.abn || "",
          customer_contact_ids: updatedCustomer.customer_contact_ids 
            ? updatedCustomer.customer_contact_ids.map((id: any) => 
                typeof id === 'string' ? id : id.$id
              )
            : [],
          createdAt: updatedCustomer.$createdAt,
          updatedAt: updatedCustomer.$updatedAt,
        };

        setCustomers((prevCustomers) =>
          prevCustomers.map((customer) =>
            customer.id === id ? commonCustomer : customer,
          ),
        );
        return commonCustomer;
      } catch (err) {
        console.error(`Error updating customer ${id}:`, err);
        throw err;
      }
    },
    [],
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
