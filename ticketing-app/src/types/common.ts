// Common interface types based on Appwrite backend schema

export interface Status {
  id: string;
  label: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  primaryContactName: string;
  primaryContactNumber: string;
  primaryEmail: string;
  abn?: string;
}

export interface CustomerContact {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  position?: string;
  contactNumber: string;
  email: string;
} 