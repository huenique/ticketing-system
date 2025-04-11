import { create } from "zustand";
import { nanoid } from "nanoid";

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  position: string;
  lastModified: string;
};

export type Customer = {
  id: string;
  name: string;
  address: string;
  primaryContact: string;
  primaryContactPhone: string;
  primaryEmail: string;
  abn: string;
  contacts: Contact[];
  lastModified: string;
};

type CustomersStore = {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, "id" | "lastModified" | "contacts">) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addContact: (customerId: string, contact: Omit<Contact, "id" | "lastModified">) => void;
  updateContact: (customerId: string, contactId: string, updates: Partial<Contact>) => void;
  deleteContact: (customerId: string, contactId: string) => void;
};

const useCustomersStore = create<CustomersStore>((set) => ({
  customers: [
    {
      id: "CUS-001",
      name: "Acme Corporation",
      address: "123 Business St, Sydney NSW 2000",
      primaryContact: "John Smith",
      primaryContactPhone: "0412 345 678",
      primaryEmail: "john@acme.com",
      abn: "12345678901",
      contacts: [
        {
          id: "CON-001",
          firstName: "John",
          lastName: "Smith",
          phone: "0412 345 678",
          email: "john@acme.com",
          position: "CEO",
          lastModified: new Date().toISOString(),
        },
        {
          id: "CON-002",
          firstName: "Jane",
          lastName: "Doe",
          phone: "0423 456 789",
          email: "jane@acme.com",
          position: "CTO",
          lastModified: new Date().toISOString(),
        },
      ],
      lastModified: new Date().toISOString(),
    },
    {
      id: "CUS-002",
      name: "Tech Solutions Ltd",
      address: "456 Technology Ave, Melbourne VIC 3000",
      primaryContact: "Sarah Johnson",
      primaryContactPhone: "0434 567 890",
      primaryEmail: "sarah@techsolutions.com",
      abn: "23456789012",
      contacts: [
        {
          id: "CON-003",
          firstName: "Sarah",
          lastName: "Johnson",
          phone: "0434 567 890",
          email: "sarah@techsolutions.com",
          position: "Manager",
          lastModified: new Date().toISOString(),
        },
      ],
      lastModified: new Date().toISOString(),
    },
  ],

  addCustomer: (customer) => {
    set((state) => ({
      customers: [
        ...state.customers,
        {
          ...customer,
          id: `CUS-${nanoid(6)}`,
          contacts: [],
          lastModified: new Date().toISOString(),
        },
      ],
    }));
  },

  updateCustomer: (id, updates) => {
    set((state) => ({
      customers: state.customers.map((customer) => {
        if (customer.id === id) {
          return {
            ...customer,
            ...updates,
            lastModified: new Date().toISOString(),
          };
        }
        return customer;
      }),
    }));
  },

  deleteCustomer: (id) => {
    set((state) => ({
      customers: state.customers.filter((customer) => customer.id !== id),
    }));
  },

  addContact: (customerId, contact) => {
    set((state) => ({
      customers: state.customers.map((customer) => {
        if (customer.id === customerId) {
          return {
            ...customer,
            contacts: [
              ...customer.contacts,
              {
                ...contact,
                id: `CON-${nanoid(6)}`,
                lastModified: new Date().toISOString(),
              },
            ],
            lastModified: new Date().toISOString(),
          };
        }
        return customer;
      }),
    }));
  },

  updateContact: (customerId, contactId, updates) => {
    set((state) => ({
      customers: state.customers.map((customer) => {
        if (customer.id === customerId) {
          return {
            ...customer,
            contacts: customer.contacts.map((contact) => {
              if (contact.id === contactId) {
                return {
                  ...contact,
                  ...updates,
                  lastModified: new Date().toISOString(),
                };
              }
              return contact;
            }),
            lastModified: new Date().toISOString(),
          };
        }
        return customer;
      }),
    }));
  },

  deleteContact: (customerId, contactId) => {
    set((state) => ({
      customers: state.customers.map((customer) => {
        if (customer.id === customerId) {
          return {
            ...customer,
            contacts: customer.contacts.filter(
              (contact) => contact.id !== contactId
            ),
            lastModified: new Date().toISOString(),
          };
        }
        return customer;
      }),
    }));
  },
}));

export default useCustomersStore; 