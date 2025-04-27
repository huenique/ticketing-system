import { useCallback, useEffect, useState } from "react";

import { customerContactsService } from "@/services";
import { customersService } from "@/services/customersService";
import { Customer, CustomerContact } from "@/types/common";

interface UseAppwriteCustomersProps {
  initialFetch?: boolean;
}

interface UseAppwriteCustomersReturn {
  customers: Customer[];
  isLoading: boolean;
  error: Error | null;
  fetchCustomers: () => Promise<void>;
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
}: UseAppwriteCustomersProps = {}): UseAppwriteCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await customersService.getAllCustomers();
      // Convert from Appwrite format to Common format
      const mappedCustomers = result.map((customer) => ({
        id: customer.$id,
        name: customer.name,
        address: customer.address,
        primary_contact_name: customer.primary_contact_name,
        primary_contact_number: customer.primary_contact_number,
        primary_email: customer.primary_email,
        abn: customer.abn || "",
        createdAt: customer.$createdAt,
        updatedAt: customer.$updatedAt,
      }));
      setCustomers(mappedCustomers);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch customers"));
      console.error("Error fetching customers:", err);
    } finally {
      setIsLoading(false);
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
        const contacts =
          await customerContactsService.getContactsByCustomerId(customerId);
        return contacts;
      } catch (err) {
        console.error(`Error fetching contacts for customer ${customerId}:`, err);
        return [];
      }
    },
    [],
  );

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
