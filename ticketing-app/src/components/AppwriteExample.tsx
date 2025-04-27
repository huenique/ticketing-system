import { Loader2 } from "lucide-react";
import { useState } from "react";

import { useAppwriteCustomers, useAppwriteTickets } from "@/hooks";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export default function AppwriteExample() {
  const {
    tickets,
    isLoading: ticketsLoading,
    error: ticketsError,
    fetchTickets,
  } = useAppwriteTickets();
  const {
    customers,
    isLoading: customersLoading,
    error: customersError,
    fetchCustomers,
    getCustomerContacts,
  } = useAppwriteCustomers();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const handleCustomerClick = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setLoadingContacts(true);
    try {
      const customerContacts = await getCustomerContacts(customerId);
      setContacts(customerContacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoadingContacts(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Appwrite Integration Example</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tickets Section */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>Fetch and display tickets from Appwrite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={() => fetchTickets()} disabled={ticketsLoading}>
                {ticketsLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Refresh Tickets"
                )}
              </Button>

              {ticketsError && (
                <div className="text-red-500">Error: {ticketsError.message}</div>
              )}

              <div className="border rounded-md p-4 max-h-80 overflow-y-auto">
                {ticketsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : tickets.length > 0 ? (
                  <ul className="space-y-2">
                    {tickets.map((ticket) => (
                      <li key={ticket.id} className="p-2 border-b last:border-0">
                        <div className="font-medium">Ticket #{ticket.id}</div>
                        <div className="text-sm text-gray-500">
                          {ticket.description}
                        </div>
                        <div className="text-xs text-gray-400">
                          Customer: {ticket.customerId} | Status: {ticket.statusId}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center text-gray-500 py-4">No tickets found</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers Section */}
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Fetch and display customers from Appwrite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={() => fetchCustomers()} disabled={customersLoading}>
                {customersLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Refresh Customers"
                )}
              </Button>

              {customersError && (
                <div className="text-red-500">Error: {customersError.message}</div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="border rounded-md p-4 max-h-40 overflow-y-auto">
                  {customersLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : customers.length > 0 ? (
                    <ul className="space-y-2">
                      {customers.map((customer) => (
                        <li
                          key={customer.id}
                          className={`p-2 border-b last:border-0 cursor-pointer hover:bg-gray-50 ${
                            selectedCustomerId === customer.id ? "bg-blue-50" : ""
                          }`}
                          onClick={() => handleCustomerClick(customer.id)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-gray-400">
                            Contact: {customer.primaryContactName}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No customers found
                    </div>
                  )}
                </div>

                {/* Contacts for selected customer */}
                <div className="border rounded-md p-4 max-h-40 overflow-y-auto">
                  <h3 className="text-sm font-medium mb-2">Contacts</h3>
                  {loadingContacts ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : selectedCustomerId ? (
                    contacts.length > 0 ? (
                      <ul className="space-y-2">
                        {contacts.map((contact) => (
                          <li key={contact.id} className="p-2 border-b last:border-0">
                            <div className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </div>
                            <div className="text-xs text-gray-400">
                              {contact.email} | {contact.contactNumber}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        No contacts found
                      </div>
                    )
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      Select a customer to view contacts
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
