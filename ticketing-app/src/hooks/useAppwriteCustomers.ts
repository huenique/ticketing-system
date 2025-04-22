import { useState, useEffect, useCallback } from "react";
import { Customer, CustomerContact } from "@/types/common";
import { customersService } from "@/services";
import { customerContactsService } from "@/services";

interface UseAppwriteCustomersProps {
  initialFetch?: boolean;
}

interface UseAppwriteCustomersReturn {
  customers: Customer[];
  isLoading: boolean;
  error: Error | null;
  fetchCustomers: () => Promise<void>;
  getCustomer: (id: string) => Promise<Customer | undefined>;
  createCustomer: (customerData: Omit<Customer, "id">) => Promise<Customer>;
  updateCustomer: (id: string, customerData: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomerContacts: (customerId: string) => Promise<CustomerContact[]>;
}

export function useAppwriteCustomers({ initialFetch = true }: UseAppwriteCustomersProps = {}): UseAppwriteCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await customersService.getAllCustomers();
      setCustomers(result as Customer[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch customers"));
      console.error("Error fetching customers:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCustomer = useCallback(async (id: string): Promise<Customer | undefined> => {
    try {
      const foundCustomer = customers.find(customer => customer.id === id);
      if (foundCustomer) return foundCustomer;
      
      // If not in local state, fetch from API
      // Note: We'd need to add a getCustomer method to the service
      return undefined;
    } catch (err) {
      console.error(`Error fetching customer ${id}:`, err);
      return undefined;
    }
  }, [customers]);

  const createCustomer = useCallback(async (customerData: Omit<Customer, "id">): Promise<Customer> => {
    try {
      // Note: We'd need to add a createCustomer method to the service
      const newCustomer = { id: `temp-${Date.now()}`, ...customerData } as Customer;
      setCustomers((prevCustomers) => [...prevCustomers, newCustomer]);
      return newCustomer;
    } catch (err) {
      console.error("Error creating customer:", err);
      throw err;
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, customerData: Partial<Customer>): Promise<Customer> => {
    try {
      // Note: We'd need to add an updateCustomer method to the service
      const customer = customers.find(c => c.id === id);
      if (!customer) throw new Error(`Customer with ID ${id} not found`);
      
      const updatedCustomer = { ...customer, ...customerData };
      setCustomers((prevCustomers) =>
        prevCustomers.map((customer) => (customer.id === id ? updatedCustomer : customer))
      );
      return updatedCustomer;
    } catch (err) {
      console.error(`Error updating customer ${id}:`, err);
      throw err;
    }
  }, [customers]);

  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    try {
      // Note: We'd need to add a deleteCustomer method to the service
      setCustomers((prevCustomers) => prevCustomers.filter((customer) => customer.id !== id));
    } catch (err) {
      console.error(`Error deleting customer ${id}:`, err);
      throw err;
    }
  }, []);

  const getCustomerContacts = useCallback(async (customerId: string): Promise<CustomerContact[]> => {
    try {
      const contacts = await customerContactsService.getContactsByCustomerId(customerId);
      return contacts as CustomerContact[];
    } catch (err) {
      console.error(`Error fetching contacts for customer ${customerId}:`, err);
      return [];
    }
  }, []);

  useEffect(() => {
    if (initialFetch) {
      fetchCustomers();
    }
  }, [fetchCustomers, initialFetch]);

  return {
    customers,
    isLoading,
    error,
    fetchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerContacts,
  };
} 