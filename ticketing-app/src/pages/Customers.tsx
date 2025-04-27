import { Edit, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAppwriteCustomers } from "@/hooks/useAppwriteCustomers";
import {
  Customer as AppwriteCustomer,
  CustomerContact,
  customersService,
} from "@/services/customersService";
import { Customer as CommonCustomer } from "@/types/common";

function Customers() {
  const {
    customers,
    isLoading: loading,
    error,
    fetchCustomers,
    createCustomer: addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useAppwriteCustomers();

  type Contact = CustomerContact;
  // Use a union type to handle both formats of Customer
  type CustomerType = CommonCustomer | AppwriteCustomer;

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isContactsDialogOpen, setIsContactsDialogOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<Error | null>(null);
  const [appwriteContacts, setAppwriteContacts] = useState<CustomerContact[]>([]);

  // Define simplified types for form data
  type CustomerFormData = {
    name: string;
    address: string;
    primary_contact_name: string;
    primary_contact_number: string;
    primary_email: string;
    abn: string;
  };

  type ContactFormData = {
    first_name: string;
    last_name: string;
    contact_number: string;
    email: string;
    position: string;
    customerId: string;
  };

  // Helper function to get customer ID regardless of type
  const getCustomerId = (customer: CustomerType): string => {
    // Check if it's an Appwrite customer (has $id)
    if ("$id" in customer) {
      return customer.$id;
    }
    // Otherwise assume it's a common Customer type
    return customer.id;
  };

  const [editFormData, setEditFormData] = useState<Partial<CustomerFormData>>({});
  const [newCustomerData, setNewCustomerData] = useState<CustomerFormData>({
    name: "",
    address: "",
    primary_contact_name: "",
    primary_contact_number: "",
    primary_email: "",
    abn: "",
  });

  const [newContactData, setNewContactData] = useState<ContactFormData>({
    first_name: "",
    last_name: "",
    contact_number: "",
    email: "",
    position: "",
    customerId: "",
  });

  const [editContactFormData, setEditContactFormData] = useState<
    Partial<ContactFormData>
  >({});

  // Fetch customers when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchCustomers();
      } catch (err) {
        console.error("Error loading customers data:", err);
      }
    };

    loadData();
  }, [fetchCustomers]);

  // Function to handle contact operations
  const addContact = async (
    customerId: string,
    contactData: Omit<ContactFormData, "customerId">,
  ) => {
    try {
      console.log(`Adding contact for customer ID: ${customerId}`);

      // Format the data for Appwrite
      const appwriteContactData = {
        customer_id: customerId,
        first_name: contactData.first_name,
        last_name: contactData.last_name,
        position: contactData.position || "",
        contact_number: contactData.contact_number,
        email: contactData.email,
      };

      console.log("Contact data to send:", appwriteContactData);
      const result = await customersService.createCustomerContact(appwriteContactData);
      console.log("Contact created successfully:", result);

      await fetchCustomerContacts(customerId);
    } catch (error) {
      console.error("Error adding contact:", error);
      throw error;
    }
  };

  const updateContact = async (
    contactId: string,
    updates: Partial<ContactFormData>,
  ) => {
    try {
      console.log(`Updating contact with ID: ${contactId}`, updates);

      // Format the data for Appwrite
      const appwriteContactData: any = {
        first_name: updates.first_name,
        last_name: updates.last_name,
        position: updates.position || "",
        contact_number: updates.contact_number,
        email: updates.email,
      };

      // Remove undefined values
      Object.keys(appwriteContactData).forEach(
        (key) =>
          appwriteContactData[key] === undefined && delete appwriteContactData[key],
      );

      console.log("Contact update data to send:", appwriteContactData);
      const result = await customersService.updateCustomerContact(
        contactId,
        appwriteContactData,
      );
      console.log("Contact updated successfully:", result);

      if (selectedCustomer) {
        await fetchCustomerContacts(getCustomerId(selectedCustomer));
      }
    } catch (error) {
      console.error("Error updating contact:", error);
      throw error;
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      await customersService.deleteCustomerContact(contactId);
      if (selectedCustomer) {
        await fetchCustomerContacts(getCustomerId(selectedCustomer));
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
      throw error;
    }
  };

  // Update the fetchCustomerContacts function with better logging
  const fetchCustomerContacts = async (customerId: string) => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      console.log(`Fetching contacts for customer ID: ${customerId}`);
      const contacts = await customersService.getCustomerContacts(customerId);
      console.log(`Retrieved ${contacts.length} contacts:`, contacts);
      setAppwriteContacts(contacts);
      setSelectedContacts(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setContactsError(
        error instanceof Error ? error : new Error("Failed to fetch contacts"),
      );
    } finally {
      setContactsLoading(false);
    }
  };

  const handleEditClick = (customer: CustomerType) => {
    setSelectedCustomer(customer);
    setEditFormData({
      name: customer.name,
      address: customer.address,
      primary_contact_name: customer.primary_contact_name,
      primary_contact_number: customer.primary_contact_number,
      primary_email: customer.primary_email,
      abn: customer.abn,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (customerId: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      await deleteCustomer(customerId);
    }
  };

  const handleViewContactsClick = (customer: CustomerType) => {
    setSelectedCustomer(customer);
    setIsContactsDialogOpen(true);

    // Get customer ID using the helper function
    const customerId = getCustomerId(customer);

    // Fetch the contacts from Appwrite collection
    fetchCustomerContacts(customerId);
  };

  const handleAddContactClick = (customer: CustomerType) => {
    setSelectedCustomer(customer);
    // Get customer ID using the helper function
    const customerId = getCustomerId(customer);

    setNewContactData((prev) => ({
      ...prev,
      customerId,
    }));
    setIsAddContactDialogOpen(true);
  };

  const handleEditContactClick = (contact: Contact) => {
    console.log("Edit contact:", contact);
    setSelectedContact(contact);
    setEditContactFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      contact_number: contact.contact_number,
      email: contact.email,
      position: contact.position || "",
    });
    setIsEditContactDialogOpen(true);
  };

  const handleDeleteContactClick = async (contactId: string) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      if (selectedCustomer) {
        await deleteContact(contactId);
        // Contacts will be refreshed by the deleteContact function
      }
    }
  };

  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNewCustomerFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setNewCustomerData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNewContactFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setNewContactData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditContactFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEditContactFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer) {
      await updateCustomer(getCustomerId(selectedCustomer), editFormData);
      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
    }
  };

  const handleSubmitNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCustomer(newCustomerData);
    setIsAddDialogOpen(false);
    setNewCustomerData({
      name: "",
      address: "",
      primary_contact_name: "",
      primary_contact_number: "",
      primary_email: "",
      abn: "",
    });
  };

  const handleSubmitNewContactToAppwrite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCustomer) {
      try {
        // Get customer ID using the helper function
        const customerId = getCustomerId(selectedCustomer);

        await addContact(customerId, {
          first_name: newContactData.first_name,
          last_name: newContactData.last_name,
          contact_number: newContactData.contact_number,
          email: newContactData.email,
          position: newContactData.position,
        });

        setIsAddContactDialogOpen(false);
        setNewContactData({
          first_name: "",
          last_name: "",
          contact_number: "",
          email: "",
          position: "",
          customerId: customerId,
        });
      } catch (error) {
        console.error("Error adding contact:", error);
        toast.error("Failed to add contact. Please try again.");
      }
    }
  };

  const handleSubmitEditContactToAppwrite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedContact) {
      try {
        const contactId = selectedContact.$id;
        await updateContact(contactId, editContactFormData);

        setIsEditContactDialogOpen(false);
        setSelectedContact(null);
        setEditContactFormData({});
      } catch (error) {
        console.error("Error updating contact:", error);
        toast.error("Failed to update contact. Please try again.");
      }
    }
  };

  const handleDeleteContactFromAppwrite = async (contactId: string) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      try {
        await deleteContact(contactId);

        // Update the UI
        setAppwriteContacts((prev) => prev.filter((c) => c.$id !== contactId));
        setSelectedContacts((prev) => prev.filter((c) => c.$id !== contactId));
      } catch (error) {
        console.error("Error deleting contact:", error);
        toast.error("Failed to delete contact. Please try again.");
      }
    }
  };

  // Helper function to get updated timestamp regardless of customer type
  const getUpdatedTimestamp = (customer: CustomerType): string | undefined => {
    if ("$updatedAt" in customer) {
      return customer.$updatedAt;
    }
    return customer.updatedAt;
  };

  // Helper function to format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading customers...</h2>
          <p className="text-neutral-500">Please wait while we fetch the data.</p>
        </div>
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">
            Error loading customers
          </h2>
          <p className="text-neutral-500 mb-4">{error.message}</p>
          <button
            onClick={() => fetchCustomers()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-neutral-500">
            Manage your customers and their contact information
          </p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Primary Contact Number</TableHead>
              <TableHead>Primary Email</TableHead>
              <TableHead>ABN</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow key="empty-customers">
                <TableCell colSpan={9} className="text-center py-4 text-neutral-500">
                  No customers found. Add a new customer to get started.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={getCustomerId(customer)}>
                  <TableCell>{getCustomerId(customer)}</TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.address}</TableCell>
                  <TableCell>{customer.primary_contact_name}</TableCell>
                  <TableCell>{customer.primary_contact_number}</TableCell>
                  <TableCell>{customer.primary_email}</TableCell>
                  <TableCell>{customer.abn || "N/A"}</TableCell>
                  <TableCell>{formatDate(getUpdatedTimestamp(customer))}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewContactsClick(customer)}
                        className="p-1 text-gray-600 hover:text-gray-800"
                        title="View Contacts"
                      >
                        <UserPlus size={16} />
                      </button>
                      <button
                        onClick={() => handleEditClick(customer)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Edit Customer"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(getCustomerId(customer))}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete Customer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information. Click save when done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right text-sm font-medium">
                  Company Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={editFormData.name || ""}
                  onChange={handleEditFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="address" className="text-right text-sm font-medium">
                  Address
                </label>
                <Textarea
                  id="address"
                  name="address"
                  value={editFormData.address || ""}
                  onChange={handleEditFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="primary_contact_name"
                  className="text-right text-sm font-medium"
                >
                  Primary Contact
                </label>
                <Input
                  id="primary_contact_name"
                  name="primary_contact_name"
                  value={editFormData.primary_contact_name || ""}
                  onChange={handleEditFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="primary_contact_number"
                  className="text-right text-sm font-medium"
                >
                  Contact Number
                </label>
                <Input
                  id="primary_contact_number"
                  name="primary_contact_number"
                  value={editFormData.primary_contact_number || ""}
                  onChange={handleEditFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="primary_email"
                  className="text-right text-sm font-medium"
                >
                  Email
                </label>
                <Input
                  id="primary_email"
                  name="primary_email"
                  value={editFormData.primary_email || ""}
                  onChange={handleEditFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="abn" className="text-right text-sm font-medium">
                  ABN
                </label>
                <Input
                  id="abn"
                  name="abn"
                  value={editFormData.abn || ""}
                  onChange={handleEditFormChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter customer details. Click add when done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitNewCustomer}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right text-sm font-medium">
                  Company Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={newCustomerData.name}
                  onChange={handleNewCustomerFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="address" className="text-right text-sm font-medium">
                  Address
                </label>
                <Textarea
                  id="address"
                  name="address"
                  value={newCustomerData.address}
                  onChange={handleNewCustomerFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="primary_contact_name"
                  className="text-right text-sm font-medium"
                >
                  Primary Contact
                </label>
                <Input
                  id="primary_contact_name"
                  name="primary_contact_name"
                  value={newCustomerData.primary_contact_name}
                  onChange={handleNewCustomerFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="primary_contact_number"
                  className="text-right text-sm font-medium"
                >
                  Contact Number
                </label>
                <Input
                  id="primary_contact_number"
                  name="primary_contact_number"
                  value={newCustomerData.primary_contact_number}
                  onChange={handleNewCustomerFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="primary_email"
                  className="text-right text-sm font-medium"
                >
                  Email
                </label>
                <Input
                  id="primary_email"
                  name="primary_email"
                  value={newCustomerData.primary_email}
                  onChange={handleNewCustomerFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="abn" className="text-right text-sm font-medium">
                  ABN
                </label>
                <Input
                  id="abn"
                  name="abn"
                  value={newCustomerData.abn}
                  onChange={handleNewCustomerFormChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Add Customer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Contacts Dialog */}
      <Dialog open={isContactsDialogOpen} onOpenChange={setIsContactsDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Contacts for {selectedCustomer?.name}</DialogTitle>
            <DialogDescription>
              View and manage contacts for this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium">Contacts</h3>
              {selectedCustomer && (
                <button
                  onClick={() => handleAddContactClick(selectedCustomer)}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white"
                >
                  <Plus size={14} />
                  Add Contact
                </button>
              )}
            </div>

            {contactsLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-500">Loading contacts...</span>
              </div>
            ) : contactsError ? (
              <div className="text-center py-8 text-red-500">
                <p>Error loading contacts: {contactsError.message}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() =>
                    selectedCustomer &&
                    fetchCustomerContacts(getCustomerId(selectedCustomer))
                  }
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Contact Number</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appwriteContacts.length === 0 ? (
                    <TableRow key="empty-contacts">
                      <TableCell
                        colSpan={6}
                        className="text-center py-4 text-neutral-500"
                      >
                        No contacts found for this customer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    appwriteContacts.map((contact) => (
                      <TableRow key={contact.$id}>
                        <TableCell>{contact.first_name}</TableCell>
                        <TableCell>{contact.last_name}</TableCell>
                        <TableCell>{contact.position}</TableCell>
                        <TableCell>{contact.contact_number}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditContactClick(contact)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Edit Contact"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteContactFromAppwrite(contact.$id)
                              }
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Delete Contact"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsContactsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Enter contact details for {selectedCustomer?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitNewContactToAppwrite}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="first_name" className="text-right text-sm font-medium">
                  First Name
                </label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={newContactData.first_name}
                  onChange={handleNewContactFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="last_name" className="text-right text-sm font-medium">
                  Last Name
                </label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={newContactData.last_name}
                  onChange={handleNewContactFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="position" className="text-right text-sm font-medium">
                  Position
                </label>
                <Input
                  id="position"
                  name="position"
                  value={newContactData.position}
                  onChange={handleNewContactFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="contact_number"
                  className="text-right text-sm font-medium"
                >
                  Contact Number
                </label>
                <Input
                  id="contact_number"
                  name="contact_number"
                  value={newContactData.contact_number}
                  onChange={handleNewContactFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  value={newContactData.email}
                  onChange={handleNewContactFormChange}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Add Contact</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditContactDialogOpen} onOpenChange={setIsEditContactDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact details for {selectedCustomer?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEditContactToAppwrite}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="first_name" className="text-right text-sm font-medium">
                  First Name
                </label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={editContactFormData.first_name || ""}
                  onChange={handleEditContactFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="last_name" className="text-right text-sm font-medium">
                  Last Name
                </label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={editContactFormData.last_name || ""}
                  onChange={handleEditContactFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="position" className="text-right text-sm font-medium">
                  Position
                </label>
                <Input
                  id="position"
                  name="position"
                  value={editContactFormData.position || ""}
                  onChange={handleEditContactFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="contact_number"
                  className="text-right text-sm font-medium"
                >
                  Contact Number
                </label>
                <Input
                  id="contact_number"
                  name="contact_number"
                  value={editContactFormData.contact_number || ""}
                  onChange={handleEditContactFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  value={editContactFormData.email || ""}
                  onChange={handleEditContactFormChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Customers;
