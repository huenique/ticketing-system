// Common interface types based on Appwrite backend schema

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  abn?: string;
  customer_contact_ids?: any[];
  contacts?: CustomerContact[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerContact {
  id: string;
  customer_ids: string[];
  first_name: string;
  last_name: string;
  position?: string;
  contact_number: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Status {
  id: string;
  label: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  customerId: string;
  statusId: string;
  description: string;
  billable_hours?: number;
  total_hours?: number;
  assigneeIds: string[];
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  // Populated fields
  customer?: Customer;
  status?: Status;
  assignees?: User[];
}

export interface CustomerType extends Customer {
  contacts?: CustomerContact[];
}

export interface NewCustomer {
  name: string;
  address: string;
  abn?: string;
}
