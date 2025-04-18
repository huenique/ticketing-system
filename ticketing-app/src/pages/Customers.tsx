import { Edit, Plus, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useCustomersStore, { Contact, Customer } from "@/stores/customersStore";

function Customers() {
  const {
    customers,
    updateCustomer,
    deleteCustomer,
    addCustomer,
    addContact,
    updateContact,
    deleteContact,
  } = useCustomersStore();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isContactsDialogOpen, setIsContactsDialogOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});
  const [newCustomerData, setNewCustomerData] = useState<
    Omit<Customer, "id" | "lastModified" | "contacts">
  >({
    name: "",
    address: "",
    primaryContact: "",
    primaryContactPhone: "",
    primaryEmail: "",
    abn: "",
  });

  const [newContactData, setNewContactData] = useState<
    Omit<Contact, "id" | "lastModified">
  >({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    position: "",
  });

  const [editContactFormData, setEditContactFormData] = useState<Partial<Contact>>({});

  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditFormData({
      name: customer.name,
      address: customer.address,
      primaryContact: customer.primaryContact,
      primaryContactPhone: customer.primaryContactPhone,
      primaryEmail: customer.primaryEmail,
      abn: customer.abn,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (customerId: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      deleteCustomer(customerId);
    }
  };

  const handleViewContactsClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsContactsDialogOpen(true);
  };

  const handleAddContactClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsAddContactDialogOpen(true);
  };

  const handleEditContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setEditContactFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email,
      position: contact.position,
    });
    setIsEditContactDialogOpen(true);
  };

  const handleDeleteContactClick = (contactId: string) => {
    if (
      selectedCustomer &&
      window.confirm("Are you sure you want to delete this contact?")
    ) {
      deleteContact(selectedCustomer.id, contactId);

      // Get the updated customer to refresh the contacts list
      const updatedCustomer = customers.find((c) => c.id === selectedCustomer.id);
      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
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

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer) {
      updateCustomer(selectedCustomer.id, editFormData);
      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
    }
  };

  const handleSubmitNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer(newCustomerData);
    setIsAddDialogOpen(false);
    setNewCustomerData({
      name: "",
      address: "",
      primaryContact: "",
      primaryContactPhone: "",
      primaryEmail: "",
      abn: "",
    });
  };

  const handleSubmitNewContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer) {
      addContact(selectedCustomer.id, newContactData);

      // Get the updated customer to refresh the contacts list
      const updatedCustomer = customers.find((c) => c.id === selectedCustomer.id);
      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
      }

      setIsAddContactDialogOpen(false);
      setNewContactData({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        position: "",
      });
    }
  };

  const handleSubmitEditContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer && selectedContact) {
      updateContact(selectedCustomer.id, selectedContact.id, editContactFormData);

      // Get the updated customer to refresh the contacts list
      const updatedCustomer = customers.find((c) => c.id === selectedCustomer.id);
      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
      }

      setIsEditContactDialogOpen(false);
      setSelectedContact(null);
    }
  };

  // Add this effect to keep the selectedCustomer in sync with the store
  useEffect(() => {
    if (selectedCustomer) {
      const updatedCustomer = customers.find((c) => c.id === selectedCustomer.id);
      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
      }
    }
  }, [customers, selectedCustomer]);

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
              <TableHead>Primary Contact #</TableHead>
              <TableHead>Primary Email</TableHead>
              <TableHead>ABN</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.id}</TableCell>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.address}</TableCell>
                <TableCell>{customer.primaryContact}</TableCell>
                <TableCell>{customer.primaryContactPhone}</TableCell>
                <TableCell>{customer.primaryEmail}</TableCell>
                <TableCell>{customer.abn}</TableCell>
                <TableCell>
                  <button
                    onClick={() => handleViewContactsClick(customer)}
                    className="text-blue-600 hover:underline"
                  >
                    View Contacts ({customer.contacts.length})
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAddContactClick(customer)}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="Add Contact"
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
                      onClick={() => handleDeleteClick(customer.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete Customer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Edit Customer</DialogTitle>
            <DialogDescription>
              Make changes to the customer information here. Click save when you're
              done.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium block">
                Customer Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={editFormData.name || ""}
                onChange={handleEditFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="address" className="text-sm font-medium block">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows={2}
                value={editFormData.address || ""}
                onChange={handleEditFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="primaryContact" className="text-sm font-medium block">
                Primary Contact
              </label>
              <input
                id="primaryContact"
                name="primaryContact"
                type="text"
                value={editFormData.primaryContact || ""}
                onChange={handleEditFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="primaryContactPhone"
                className="text-sm font-medium block"
              >
                Primary Contact #
              </label>
              <input
                id="primaryContactPhone"
                name="primaryContactPhone"
                type="text"
                value={editFormData.primaryContactPhone || ""}
                onChange={handleEditFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="primaryEmail" className="text-sm font-medium block">
                Primary Email
              </label>
              <input
                id="primaryEmail"
                name="primaryEmail"
                type="email"
                value={editFormData.primaryEmail || ""}
                onChange={handleEditFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="abn" className="text-sm font-medium block">
                ABN
              </label>
              <input
                id="abn"
                name="abn"
                type="text"
                value={editFormData.abn || ""}
                onChange={handleEditFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Add New Customer</DialogTitle>
            <DialogDescription>
              Fill in the customer information and click add to create a new customer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitNewCustomer} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="newName" className="text-sm font-medium block">
                Customer Name
              </label>
              <input
                id="newName"
                name="name"
                type="text"
                value={newCustomerData.name}
                onChange={handleNewCustomerFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="newAddress" className="text-sm font-medium block">
                Address
              </label>
              <textarea
                id="newAddress"
                name="address"
                rows={2}
                value={newCustomerData.address}
                onChange={handleNewCustomerFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="newPrimaryContact" className="text-sm font-medium block">
                Primary Contact
              </label>
              <input
                id="newPrimaryContact"
                name="primaryContact"
                type="text"
                value={newCustomerData.primaryContact}
                onChange={handleNewCustomerFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="newPrimaryContactPhone"
                className="text-sm font-medium block"
              >
                Primary Contact #
              </label>
              <input
                id="newPrimaryContactPhone"
                name="primaryContactPhone"
                type="text"
                value={newCustomerData.primaryContactPhone}
                onChange={handleNewCustomerFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="newPrimaryEmail" className="text-sm font-medium block">
                Primary Email
              </label>
              <input
                id="newPrimaryEmail"
                name="primaryEmail"
                type="email"
                value={newCustomerData.primaryEmail}
                onChange={handleNewCustomerFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="newABN" className="text-sm font-medium block">
                ABN
              </label>
              <input
                id="newABN"
                name="abn"
                type="text"
                value={newCustomerData.abn}
                onChange={handleNewCustomerFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Add Customer
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Contacts Dialog */}
      <Dialog open={isContactsDialogOpen} onOpenChange={setIsContactsDialogOpen}>
        <DialogContent
          className="bg-white p-6 rounded-lg border shadow-md"
          style={{ maxWidth: "90vw", width: "700px" }}
        >
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">
              Contacts for {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              View and manage contact information for this customer.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-white shadow-sm p-2 max-h-96">
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
                {selectedCustomer?.contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>{contact.firstName}</TableCell>
                    <TableCell>{contact.lastName}</TableCell>
                    <TableCell>{contact.position}</TableCell>
                    <TableCell>{contact.phone}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditContactClick(contact)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteContactClick(contact.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={() => setIsContactsDialogOpen(false)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Add New Contact</DialogTitle>
            <DialogDescription>
              Add a new contact for {selectedCustomer?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitNewContact} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="contactFirstName" className="text-sm font-medium block">
                First Name
              </label>
              <input
                id="contactFirstName"
                name="firstName"
                type="text"
                value={newContactData.firstName}
                onChange={handleNewContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contactLastName" className="text-sm font-medium block">
                Last Name
              </label>
              <input
                id="contactLastName"
                name="lastName"
                type="text"
                value={newContactData.lastName}
                onChange={handleNewContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contactPosition" className="text-sm font-medium block">
                Position
              </label>
              <input
                id="contactPosition"
                name="position"
                type="text"
                value={newContactData.position}
                onChange={handleNewContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contactPhone" className="text-sm font-medium block">
                Contact Number
              </label>
              <input
                id="contactPhone"
                name="phone"
                type="text"
                value={newContactData.phone}
                onChange={handleNewContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contactEmail" className="text-sm font-medium block">
                Email
              </label>
              <input
                id="contactEmail"
                name="email"
                type="email"
                value={newContactData.email}
                onChange={handleNewContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsAddContactDialogOpen(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Add Contact
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditContactDialogOpen} onOpenChange={setIsEditContactDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Edit Contact</DialogTitle>
            <DialogDescription>
              Edit contact information for {selectedContact?.firstName}{" "}
              {selectedContact?.lastName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEditContact} className="space-y-5">
            <div className="space-y-1">
              <label
                htmlFor="editContactFirstName"
                className="text-sm font-medium block"
              >
                First Name
              </label>
              <input
                id="editContactFirstName"
                name="firstName"
                type="text"
                value={editContactFormData.firstName || ""}
                onChange={handleEditContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="editContactLastName"
                className="text-sm font-medium block"
              >
                Last Name
              </label>
              <input
                id="editContactLastName"
                name="lastName"
                type="text"
                value={editContactFormData.lastName || ""}
                onChange={handleEditContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="editContactPosition"
                className="text-sm font-medium block"
              >
                Position
              </label>
              <input
                id="editContactPosition"
                name="position"
                type="text"
                value={editContactFormData.position || ""}
                onChange={handleEditContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="editContactPhone" className="text-sm font-medium block">
                Contact Number
              </label>
              <input
                id="editContactPhone"
                name="phone"
                type="text"
                value={editContactFormData.phone || ""}
                onChange={handleEditContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="editContactEmail" className="text-sm font-medium block">
                Email
              </label>
              <input
                id="editContactEmail"
                name="email"
                type="email"
                value={editContactFormData.email || ""}
                onChange={handleEditContactFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditContactDialogOpen(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Customers;
