import { useCallback } from "react";

import useCustomersStore, {
  Customer,
  CustomerContact,
  CustomerContactInput,
  CustomerInput,
} from "@/stores/customersStore";

interface UseCustomersProps {
  initialFetch?: boolean;
}

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: Error | null;
  fetchCustomers: () => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;
  createCustomer: (customerData: CustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, customerData: Partial<CustomerInput>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  fetchCustomerContacts: (customerId: string) => Promise<void>;
  getCustomerContacts: (customerId: string) => CustomerContact[];
  addCustomerContact: (contactData: CustomerContactInput) => Promise<void>;
  updateCustomerContact: (
    id: string,
    updates: Partial<CustomerContactInput>,
  ) => Promise<void>;
  deleteCustomerContact: (id: string) => Promise<void>;
}

export function useCustomers({
  initialFetch = true,
}: UseCustomersProps = {}): UseCustomersReturn {
  const {
    customers,
    loading,
    error,
    fetchCustomers,
    fetchCustomerContacts,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addCustomerContact,
    updateCustomerContact,
    deleteCustomerContact,
    getCustomerContacts,
  } = useCustomersStore();

  // Wrap the initial fetch in a callback
  const initialFetchCallback = useCallback(async () => {
    if (initialFetch) {
      await fetchCustomers();
    }
  }, [fetchCustomers, initialFetch]);

  // Call the initial fetch when the hook is first used
  initialFetchCallback();

  // Helper function to get a customer by ID
  const getCustomer = useCallback(
    (id: string): Customer | undefined => {
      return customers.find((customer) => customer.$id === id);
    },
    [customers],
  );

  // Return the values and functions
  return {
    customers,
    loading,
    error,
    fetchCustomers,
    getCustomer,
    createCustomer: addCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomerContacts,
    getCustomerContacts,
    addCustomerContact,
    updateCustomerContact,
    deleteCustomerContact,
  };
}

export default useCustomers;
