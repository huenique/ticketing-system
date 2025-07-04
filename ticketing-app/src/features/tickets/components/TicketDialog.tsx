import React, { useEffect, useState } from "react";
import { Layout, Layouts, Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { toast } from "sonner";
import { Client, Functions, ID, ExecutionMethod } from 'appwrite';
import { authService } from "@/lib/appwrite";

import useUserStore from "@/stores/userStore";
import { usersService } from "@/services/usersService";

import TicketWidget from "../../../components/TicketWidget";
import { WIDGET_TYPES } from "../../../constants/tickets";
import {
  Assignee,
  LayoutStorage,
  Row,
  Tab,
  TicketForm,
  TimeEntry,
  Widget,
} from "../../../types/tickets";
import { saveToLS } from "../../../utils/ticketUtils";
import { generateResponsiveLayouts } from "../utils/layoutUtils";
import { defaultTicketWidgets, defaultTicketLayouts } from "../../../constants/defaultLayouts";
import StaticTicketFields from './StaticTicketFields';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface TicketDialogProps {
  viewDialogOpen: boolean;
  setViewDialogOpen: (open: boolean) => void;
  currentTicket: Row | null;
  currentTicketPreset: string | undefined;
  setCurrentTicketPreset: (preset: string | undefined) => void;
  ticketForm: TicketForm;
  setTicketForm: (form: TicketForm) => void;
  uploadedImages: string[];
  setUploadedImages: (images: string[]) => void;
  assignees: Assignee[];
  setAssignees: (assignees: Assignee[]) => void;
  timeEntries: TimeEntry[];
  setTimeEntries: (entries: TimeEntry[]) => void;
  isEditLayoutMode: boolean;
  setIsEditLayoutMode: (isEdit: boolean) => void;
  showAssigneeForm: boolean;
  setShowAssigneeForm: (show: boolean) => void;
  newAssignee: Assignee;
  setNewAssignee: (assignee: Assignee) => void;
  widgets: Widget[];
  setWidgets: (widgets: Widget[]) => void;
  widgetLayouts: Layouts;
  setWidgetLayouts: (layouts: Layouts) => void;
  activeTab: string;
  tabs: Tab[];
  handleSaveTicketChanges: () => void;
  handleFieldChange: (field: string, value: string) => void;
  toggleWidgetCollapse: (widgetId: string) => void;
  addWidget: (type: string, ticket: Row) => void;
  removeWidget: (id: string) => void;
  onLayoutChange: (currentLayout: Layout[], allLayouts: Layouts) => void;
  updateWidgetTitle: (widgetId: string, newTitle: string) => void;
  handleAddAssignee: () => void;
  handleRemoveAssignee: (id: string) => void;
  handleUpdateAssignee: (id: string, field: string, value: string) => void;
  handleAddTimeEntry: (assigneeId: string) => void;
  handleRemoveTimeEntry: (id: string) => void;
  handleUpdateTimeEntry: (id: string, field: string, value: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  markAssigneeCompleted: (assigneeId: string, completed: boolean | string) => void;
  modifiedTimeEntries: Set<string>;
  usersWithAuthId?: any[]; // Optional prop for debug purposes to pass users with auth_user_id
  isAdmin?: boolean; // Add isAdmin prop to handle user role-based field updates
}

// Inside your component or function
async function fetchUserEmail(userId: string) {
  try {
    // Call the getAuthUser function
    const userEmail = await authService.getAuthUser(userId);
    
    return userEmail;
  } catch (error) {
    console.error("Failed to fetch user email:", error);
    // Handle error appropriately
  }
}

// Email Dialog Component
const EmailDialog = ({
  isOpen,
  onClose,
  ticketDetails,
  attachments = [],
  timeEntries = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  ticketDetails: Row;
  attachments?: string[];
  timeEntries?: TimeEntry[];
}) => {
  // Combine attachments from tickets and time entries
  const getAllAvailableAttachments = () => {
    const ticketAttachments = (attachments || []).map((att: any, index: number) => ({
      id: `ticket-${index}`,
      source: 'ticket',
      name: typeof att === 'string' ? `Ticket Attachment ${index + 1}` : att.name || `Ticket Attachment ${index + 1}`,
      url: typeof att === 'string' ? att : att.url,
      originalData: att
    }));

    const timeEntryAttachments: any[] = [];
    timeEntries.forEach((entry, entryIndex) => {
      if (entry.files && Array.isArray(entry.files)) {
        entry.files.forEach((file: any, fileIndex: number) => {
          timeEntryAttachments.push({
            id: `time-entry-${entryIndex}-${fileIndex}`,
            source: 'time_entry',
            name: typeof file === 'string' ? `Time Entry File ${fileIndex + 1}` : file.name || `Time Entry File ${fileIndex + 1}`,
            url: typeof file === 'string' ? file : file.url,
            originalData: file,
            entryId: entry.id,
            entryDescription: entry.remarks || `Time Entry ${entryIndex + 1}`
          });
        });
      }
    });

    return [...ticketAttachments, ...timeEntryAttachments];
  };

  const availableAttachments = getAllAvailableAttachments();

  // Initialize state with empty values
  const [emailData, setEmailData] = useState({
    to: "",
    cc: "",
    message: "",
    subject: `Ticket Details #${ticketDetails?.cells["col-1"] || ""}`,
    selectedAttachments: [] as string[] // Array of attachment IDs
  });
  
  const [isSending, setIsSending] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEmailData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttachmentToggle = (attachmentId: string) => {
    setEmailData(prev => ({
      ...prev,
      selectedAttachments: prev.selectedAttachments.includes(attachmentId)
        ? prev.selectedAttachments.filter(id => id !== attachmentId)
        : [...prev.selectedAttachments, attachmentId]
    }));
  };

  const getSelectedAttachmentsData = () => {
    return availableAttachments.filter(att => 
      emailData.selectedAttachments.includes(att.id)
    );
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailData.to || emailData.to.trim() === '') {
      toast.error("Please enter a recipient email");
      return;
    }
    
    if (!emailRegex.test(emailData.to)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // Validate CC emails if provided
    if (emailData.cc) {
      const ccEmails = emailData.cc.split(',').map(email => email.trim());
      const invalidCcEmails = ccEmails.filter(email => !emailRegex.test(email));
      if (invalidCcEmails.length > 0) {
        toast.error("Please enter valid CC email addresses");
        return;
      }
    }
    
    try {
      setIsSending(true);
      
      // Set up Appwrite client and functions
      const client = new Client()
        .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
        .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
      
      const functions = new Functions(client);
      
      // Create form data for the endpoint with proper subject
      const formData = new URLSearchParams();
      formData.append('email', emailData.to);
      formData.append('message', emailData.message);
      formData.append('subject', emailData.subject);
      
      // Add CC if provided
      if (emailData.cc) {
        formData.append('cc', emailData.cc);
      }
      
      // Process selected attachments to extract file IDs
      const selectedAttachmentsData = getSelectedAttachmentsData();
      console.log('Selected attachments data:', selectedAttachmentsData);
      
      if (selectedAttachmentsData.length > 0) {
        const fileIds = selectedAttachmentsData.map((attachmentData: any) => {
          const attachment = attachmentData.originalData;
          let extractedId = null;
          
          console.log('Processing attachment:', {
            source: attachmentData.source,
            name: attachmentData.name,
            originalData: attachment
          });
          
          if (typeof attachment === 'string') {
            // If it's a string, try to extract file ID from URL
            // URL format might be like: https://cloud.appwrite.io/v1/storage/buckets/[bucket]/files/[fileId]/view
            const urlMatch = attachment.match(/\/files\/([^\/\?]+)/);
            extractedId = urlMatch ? urlMatch[1] : attachment;
            console.log('String attachment - extracted ID:', extractedId);
          } else if (attachment && typeof attachment === 'object') {
            console.log('Object attachment properties:', Object.keys(attachment));
            
            // Check for direct file ID (most common for Appwrite uploads)
            if (attachment.$id) {
              extractedId = attachment.$id;
              console.log('Found $id:', extractedId);
            }
            // Or check if it has an id property
            else if (attachment.id) {
              extractedId = attachment.id;
              console.log('Found id:', extractedId);
            }
            // Check for fileId property (common in some file upload components)
            else if (attachment.fileId) {
              extractedId = attachment.fileId;
              console.log('Found fileId:', extractedId);
            }
            // If it's an object, check for url property and extract file ID
            else if (attachment.url) {
              const urlMatch = attachment.url.match(/\/files\/([^\/\?]+)/);
              extractedId = urlMatch ? urlMatch[1] : attachment.url;
              console.log('Extracted from URL:', extractedId);
            }
            // Or if it's a file object with a name that might be the ID
            else if (attachment.name && attachment.name.length === 20) { // Appwrite IDs are typically 20 chars
              extractedId = attachment.name;
              console.log('Using name as ID:', extractedId);
            }
            // Last resort - check if the whole object is just a file ID string
            else if (typeof attachment === 'string' && attachment.length === 20) {
              extractedId = attachment;
              console.log('Whole object is ID:', extractedId);
            }
          }
          
          console.log('Final extracted ID:', extractedId);
          return extractedId;
        }).filter((id: any) => {
          const isValid = id && typeof id === 'string' && id.length > 0;
          if (!isValid) {
            console.warn('Invalid file ID filtered out:', id);
          }
          return isValid;
        });
        
        console.log('Final file IDs to send:', fileIds);
        
        if (fileIds.length > 0) {
          formData.append('attachments', JSON.stringify(fileIds));
          console.log('Attachments added to form data:', JSON.stringify(fileIds));
        } else {
          console.warn('No valid file IDs found in attachments');
          toast.error('No valid attachments found to send');
          return;
        }
      }

      // Log the form data being sent for debugging
      console.log('Form data being sent:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
      
      // Call the function using the Appwrite SDK
      const result = await functions.createExecution(
        import.meta.env.VITE_APPWRITE_FUNCTION_ID,
        formData.toString(),
        false,
        '/',
        ExecutionMethod.POST,
        {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      );
      
      console.log('Function execution result:', result);
      
      if (result.responseStatusCode >= 200 && result.responseStatusCode < 300) {
        toast.success("Message sent successfully!");
        onClose();
      } else {
        console.error('Function execution failed:', {
          statusCode: result.responseStatusCode,
          responseBody: result.responseBody,
          logs: result.logs,
          errors: result.errors,
          duration: result.duration
        });
        
        // Try to provide more helpful error messages
        let errorMessage = `Server responded with ${result.responseStatusCode}`;
        if (result.errors) {
          errorMessage += `: ${result.errors}`;
        } else if (result.logs) {
          errorMessage += `. Check logs: ${result.logs}`;
        } else if (result.responseBody) {
          errorMessage += `: ${result.responseBody}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(`Failed to send message: ${error?.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-md bg-white/30 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Send Ticket Details</h2>
          <button onClick={onClose} className="text-neutral-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSendEmail}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send to:
            </label>
            <input
              type="email"
              name="to"
              value={emailData.to}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CC:
            </label>
            <input
              type="text"
              name="cc"
              value={emailData.cc}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter CC email addresses (comma-separated)"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject:
            </label>
            <input
              type="text"
              name="subject"
              value={emailData.subject}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message:
            </label>
            <textarea
              name="message"
              value={emailData.message}
              onChange={handleChange}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add your message here..."
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Attachments:
            </label>
            {availableAttachments.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                {availableAttachments.map((att) => {
                  return (
                    <div key={att.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`attachment-${att.id}`}
                        checked={emailData.selectedAttachments.includes(att.id)}
                        onChange={() => handleAttachmentToggle(att.id)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`attachment-${att.id}`} className="flex-1 text-sm truncate">
                        <span className="font-medium">{att.name}</span>
                        {att.source === 'time_entry' && (
                          <span className="text-gray-500 text-xs ml-1">
                            (from {att.entryDescription})
                          </span>
                        )}
                        {att.source === 'ticket' && (
                          <span className="text-gray-500 text-xs ml-1">
                            (from ticket)
                          </span>
                        )}
                      </label>
                      {att.url && (
                        <a 
                          href={att.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          View
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No attachments available</div>
            )}
          </div>

          {emailData.selectedAttachments.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selected for Email ({emailData.selectedAttachments.length}):
              </label>
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {getSelectedAttachmentsData().map((att, index) => (
                  <span key={att.id}>
                    {att.name}
                    {index < emailData.selectedAttachments.length - 1 && ', '}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md flex items-center"
            >
              {isSending ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Sending...
                </>
              ) : (
                "Send Email"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Component for Header section
const DialogHeader = ({
  currentTicket,
  currentUser,
  isEditLayoutMode,
  setIsEditLayoutMode,
  handleResetLayout,
  addWidget,
  handleDialogClose,
  openEmailDialog,
}: {
  currentTicket: Row;
  currentUser: any;
  isEditLayoutMode: boolean;
  setIsEditLayoutMode: (isEdit: boolean) => void;
  handleResetLayout: () => void;
  addWidget: (type: string, ticket: Row) => void;
  handleDialogClose: () => void;
  openEmailDialog: () => void;
}) => {
  
  return (
    <div className="flex justify-between items-center mb-2 px-4 pt-4">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            Ticket Details: {currentTicket?.cells["col-1"]}
          </h2>
          {currentUser?.role !== "admin" && currentTicket?.rawData?.status_id && (
            <span className="ml-2 px-2 py-1 mt-1 text-sm rounded-full bg-primary/10 text-primary">
              {currentTicket.rawData.status.label}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {/* Send Email Button */}
        <button
          onClick={openEmailDialog}
          className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm hover:bg-primary/20 flex items-center"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
            />
          </svg>
          Email
        </button>
        
        {/* Only show Edit Layout toggle if not a user role */}
        {currentUser?.role !== "user" && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Edit Layout</span>
            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEditLayoutMode ? "bg-primary" : "bg-secondary"}`}
              onClick={() => setIsEditLayoutMode(!isEditLayoutMode)}
            >
              <span
                className={`${
                  isEditLayoutMode ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-background transition-transform`}
              />
            </button>
          </div>
        )}

        {/* Update Reset Layout button */}
        {isEditLayoutMode && currentUser?.role !== "user" && (
          <button
            onClick={handleResetLayout}
            className="mr-2 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-sm hover:bg-red-100"
          >
            Reset Layout
          </button>
        )}

        {/* Add widget button */}
        {isEditLayoutMode && currentUser?.role !== "user" && (
          <AddWidgetDropdown currentTicket={currentTicket} addWidget={addWidget} />
        )}

        <button onClick={() => handleDialogClose()} className="text-neutral-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Component for Add Widget Dropdown
const AddWidgetDropdown = ({ currentTicket, addWidget }: { currentTicket: Row; addWidget: (type: string, ticket: Row) => void }) => (
  <div className="relative">
    <button
      className="px-2 py-1 text-xs bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 flex items-center"
      onClick={(e) => {
        const dropdown = document.getElementById("widget-dropdown");
        if (dropdown) {
          dropdown.classList.toggle("hidden");
          // Position the dropdown below the button
          const rect = e.currentTarget.getBoundingClientRect();
          dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
          dropdown.style.left = `${rect.left + window.scrollX}px`;
        }
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3 w-3 mr-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
      <span>Add Widget</span>
    </button>

    <div
      id="widget-dropdown"
      className="fixed hidden rounded-md border border-border bg-card shadow-lg z-50 w-48 max-h-80 overflow-y-auto"
    >
      <WidgetDropdownContent currentTicket={currentTicket} addWidget={addWidget} dropdownId="widget-dropdown" />
    </div>
  </div>
);

// Reusable Widget Dropdown Content
const WidgetDropdownContent = ({ 
  currentTicket, 
  addWidget, 
  dropdownId 
}: { 
  currentTicket: Row; 
  addWidget: (type: string, ticket: Row) => void; 
  dropdownId: string 
}) => (
  <div className="py-1">
    <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">
      Groups
    </div>
    {/* Widget type buttons for group widgets */}
    {[
      { type: WIDGET_TYPES.DETAILS, label: "Ticket Details" },
      { type: WIDGET_TYPES.ASSIGNEES, label: "Team Members" },
      { type: WIDGET_TYPES.TIME_ENTRIES, label: "Time Entries" },
      { type: WIDGET_TYPES.ATTACHMENTS, label: "Attachments" },
      { type: "ticket_info_composite", label: "Ticket Info Group" },
      { type: "hours_composite", label: "Hours Group" },
    ].map((item) => (
      <button
        key={item.type}
        className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
        onClick={() => {
          addWidget(item.type, currentTicket);
          document
            .getElementById(dropdownId)
            ?.classList.add("hidden");
        }}
      >
        {item.label}
      </button>
    ))}

    <div className="my-1 border-t border-neutral-200"></div>
    <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">
      Individual Fields
    </div>

    {/* Widget type buttons for field widgets */}
    {[
      { type: WIDGET_TYPES.FIELD_STATUS, label: "Status Field" },
      { type: WIDGET_TYPES.FIELD_CUSTOMER_NAME, label: "Customer Name Field" },
      { type: WIDGET_TYPES.FIELD_DATE_CREATED, label: "Date Created Field" },
      { type: WIDGET_TYPES.FIELD_LAST_MODIFIED, label: "Last Modified Field" },
      { type: WIDGET_TYPES.FIELD_BILLABLE_HOURS, label: "Billable Hours Field" },
      { type: WIDGET_TYPES.FIELD_TOTAL_HOURS, label: "Total Hours Field" },
      { type: WIDGET_TYPES.FIELD_DESCRIPTION, label: "Description Field" },
      { type: WIDGET_TYPES.FIELD_PARTS, label: "Parts Used" },
    ].map((item) => (
      <button
        key={item.type}
        className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
        onClick={() => {
          addWidget(item.type, currentTicket);
          document
            .getElementById(dropdownId)
            ?.classList.add("hidden");
        }}
      >
        {item.label}
      </button>
    ))}
  </div>
);

// Loading Indicator
const LoadingIndicator = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
      <p>Loading Engineering layout...</p>
    </div>
  </div>
);

// EmptyWidgetState component
const EmptyWidgetState = ({ currentTicket, addWidget }: { currentTicket: Row; addWidget: (type: string, ticket: Row) => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
    <div className="p-6 bg-accent/10 rounded-lg border border-dashed border-accent max-w-md">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 mx-auto text-muted-foreground mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <h3 className="text-lg font-medium text-foreground mb-2">
        Customize Your Ticket Layout
      </h3>
      <p className="text-muted-foreground mb-6">
        This ticket doesn't have any widgets yet. Add widgets to
        create your custom layout.
      </p>
      <div className="flex justify-center">
        <div className="relative">
          <button
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors flex items-center"
            onClick={(e) => {
              const dropdown = document.getElementById(
                "customize-widget-dropdown",
              );
              if (dropdown) {
                dropdown.classList.toggle("hidden");
                // Position the dropdown below the button
                const rect = e.currentTarget.getBoundingClientRect();
                dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
                dropdown.style.left = `${rect.left + window.scrollX}px`;
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Widget
          </button>

          <div
            id="customize-widget-dropdown"
            className="fixed hidden rounded-md border border-border bg-card shadow-lg z-50 w-48 text-left max-h-80 overflow-y-auto"
          >
            <WidgetDropdownContent 
              currentTicket={currentTicket} 
              addWidget={addWidget} 
              dropdownId="customize-widget-dropdown" 
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// WidgetGrid component for shared grid layout code
const WidgetGrid = ({
  widgets,
  isEditLayoutMode,
  handleLayoutChange,
  activeTab,
  tabs,
  currentTicket,
  ticketForm,
  handleFieldChange,
  toggleWidgetCollapse,
  removeWidget,
  updateWidgetTitle,
  assignees,
  timeEntries,
  uploadedImages,
  handleAddAssignee,
  handleRemoveAssignee,
  handleUpdateAssignee,
  handleAddTimeEntry,
  handleRemoveTimeEntry,
  handleUpdateTimeEntry,
  setTicketForm,
  handleImageUpload,
  setUploadedImages,
  showAssigneeForm,
  setShowAssigneeForm,
  newAssignee,
  setNewAssignee,
  markAssigneeCompleted,
  users,
  isAdmin,
}: {
  widgets: Widget[];
  isEditLayoutMode: boolean;
  handleLayoutChange: (currentLayout: Layout[], allLayouts: Layouts) => void;
  activeTab: string;
  tabs: Tab[];
  currentTicket: Row;
  ticketForm: TicketForm;
  handleFieldChange: (field: string, value: string) => void;
  toggleWidgetCollapse: (widgetId: string) => void;
  removeWidget: (id: string) => void;
  updateWidgetTitle: (widgetId: string, newTitle: string) => void;
  assignees: Assignee[];
  timeEntries: TimeEntry[];
  uploadedImages: string[];
  handleAddAssignee: () => void;
  handleRemoveAssignee: (id: string) => void;
  handleUpdateAssignee: (id: string, field: string, value: string) => void;
  handleAddTimeEntry: (assigneeId: string) => void;
  handleRemoveTimeEntry: (id: string) => void;
  handleUpdateTimeEntry: (id: string, field: string, value: string) => void;
  setTicketForm: (form: TicketForm) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setUploadedImages: (images: string[]) => void;
  showAssigneeForm: boolean;
  setShowAssigneeForm: (show: boolean) => void;
  newAssignee: Assignee;
  setNewAssignee: (assignee: Assignee) => void;
  markAssigneeCompleted: (assigneeId: string, completed: boolean | string) => void;
  users?: any[]; // Make users optional
  isAdmin?: boolean; // Add isAdmin prop to handle user role-based field updates
}) => (
  <div className="w-full relative">
    <ResponsiveGridLayout
      className={`layout ${!isEditLayoutMode ? "non-editable" : ""}`}
      layouts={generateResponsiveLayouts(
        widgets,
        activeTab,
        tabs,
        currentTicket,
      )}
      breakpoints={{
        lg: 1600,
        md: 1200,
        sm: 996,
        xs: 768,
        xxs: 480,
      }}
      cols={{ lg: 12, md: 12, sm: 12, xs: 6, xxs: 4 }}
      rowHeight={30}
      onLayoutChange={handleLayoutChange}
      isDraggable={isEditLayoutMode}
      isResizable={isEditLayoutMode}
      margin={[8, 8]}
      containerPadding={[0, 0]}
      preventCollision={false}
      compactType="vertical"
      useCSSTransforms={true}
      draggableHandle=".react-grid-dragHandle"
      // Force key refresh when widgets change to ensure layout is applied
      key={`grid-${widgets.map((w) => w.id).join("-")}`}
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={`widget-container ${!isEditLayoutMode ? "static pointer-events-auto" : ""}`}
        >
                      <TicketWidget
              widget={widget}
              ticketForm={ticketForm}
              currentTicket={currentTicket}
              handleFieldChange={handleFieldChange}
              toggleWidgetCollapse={toggleWidgetCollapse}
              removeWidget={removeWidget}
              updateWidgetTitle={updateWidgetTitle}
              assignees={assignees}
              timeEntries={timeEntries}
              uploadedImages={uploadedImages}
              handleAddAssignee={handleAddAssignee}
              handleRemoveAssignee={handleRemoveAssignee}
              handleUpdateAssignee={handleUpdateAssignee}
              handleAddTimeEntry={handleAddTimeEntry}
              handleRemoveTimeEntry={handleRemoveTimeEntry}
              handleUpdateTimeEntry={handleUpdateTimeEntry}
              setTicketForm={setTicketForm}
              handleImageUpload={handleImageUpload}
              setUploadedImages={setUploadedImages}
              showAssigneeForm={showAssigneeForm}
              setShowAssigneeForm={setShowAssigneeForm}
              newAssignee={newAssignee}
              setNewAssignee={setNewAssignee}
              isEditMode={isEditLayoutMode}
              markAssigneeCompleted={markAssigneeCompleted}
              isAdmin={isAdmin}
              onPartsUpdate={() => {
                // Refresh ticket data when parts are updated
                if (currentTicket) {
                  window.location.reload(); // Temporary solution, can be improved with proper state management
                }
              }}
            />
        </div>
      ))}
    </ResponsiveGridLayout>
  </div>
);

// Footer component
const DialogFooter = ({ 
  handleDialogClose, 
  handleSaveTicketChanges 
}: { 
  handleDialogClose: () => void;
  handleSaveTicketChanges: () => void;
}) => (
  <div className="border-t p-4 flex justify-end space-x-3">
    <button
      onClick={() => handleDialogClose()}
      className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
    >
      Cancel
    </button>
    <button
      onClick={async () => {
        await handleSaveTicketChanges();
        
        // Force the parent Tickets component to refresh with the correct workflow filter
        const currentWorkflow = localStorage.getItem("current-workflow");
        if (currentWorkflow) {
          // This timeout allows the save operation to complete before triggering a refresh
          setTimeout(() => {
            // Increment ticketsRefreshCounter in parent if possible
            if (window.parent && (window.parent as any).incrementTicketsRefreshCounter) {
              (window.parent as any).incrementTicketsRefreshCounter();
            }
          }, 100);
        }
      }}
      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
    >
      Save Changes
    </button>
  </div>
);

const TicketDialog: React.FC<TicketDialogProps> = ({
  viewDialogOpen,
  setViewDialogOpen,
  currentTicket,
  currentTicketPreset,
  setCurrentTicketPreset,
  ticketForm,
  setTicketForm,
  uploadedImages,
  setUploadedImages,
  assignees,
  timeEntries,
  isEditLayoutMode,
  setIsEditLayoutMode,
  showAssigneeForm,
  setShowAssigneeForm,
  newAssignee,
  setNewAssignee,
  widgets,
  setWidgets,
  setWidgetLayouts,
  activeTab,
  tabs,
  handleSaveTicketChanges,
  handleFieldChange,
  toggleWidgetCollapse,
  addWidget,
  removeWidget,
  onLayoutChange,
  updateWidgetTitle,
  handleAddAssignee,
  handleRemoveAssignee,
  handleUpdateAssignee,
  handleAddTimeEntry,
  handleRemoveTimeEntry,
  handleUpdateTimeEntry,
  handleImageUpload,
  markAssigneeCompleted,
  modifiedTimeEntries,
  usersWithAuthId,
  isAdmin,
}) => {
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  // State for local users if usersWithAuthId is empty
  const [localUsers, setLocalUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Get currentUser from the store to access auth_user_id
  const { currentUser } = useUserStore();

  // Helper function to check if a string looks like an email
  const isLikelyEmail = (str: string): boolean => {
    return typeof str === 'string' && str.includes('@');
  };

  // Fetch users if usersWithAuthId is empty
  useEffect(() => {
    const fetchUsers = async () => {
      // Only fetch if usersWithAuthId is empty or has no auth_user_id
      if (!usersWithAuthId || usersWithAuthId.length === 0 || 
          !usersWithAuthId.some(u => u.auth_user_id && isLikelyEmail(u.auth_user_id))) {
        setIsLoadingUsers(true);
        try {
          const usersList = await usersService.getAllUsers();
          setLocalUsers(usersList);
          
          // Check if any user has auth_user_id
          const firstUserWithAuthId = usersList.find(u => u.auth_user_id && isLikelyEmail(u.auth_user_id));
          if (firstUserWithAuthId && firstUserWithAuthId.auth_user_id) {
            setUserEmail(firstUserWithAuthId.auth_user_id || "");
          }
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setIsLoadingUsers(false);
        }
      } else if (usersWithAuthId && usersWithAuthId.length > 0) {
        // If usersWithAuthId has data, try to find auth_user_id
        const firstUserWithAuthId = usersWithAuthId.find(u => u.auth_user_id && isLikelyEmail(u.auth_user_id));
        if (firstUserWithAuthId && firstUserWithAuthId.auth_user_id) {
          setUserEmail(firstUserWithAuthId.auth_user_id || "");
        }
      }
    };

    if (viewDialogOpen) {
      fetchUsers();
    }
  }, [viewDialogOpen, usersWithAuthId]);

  // Add a function to handle layout reset
  const handleResetLayout = () => {
    // Find current tab to determine if it has Engineering preset
    const currentTabData = tabs.find((tab) => tab.id === activeTab);
    const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

    if (hasEngineeringPreset) {
      // Set default Engineering layouts
      saveToLS<{ widgets: Widget[]; layouts: Layouts }>(
        "engineering-layouts",
        { widgets: defaultTicketWidgets, layouts: defaultTicketLayouts },
      );
    } else if (currentTicket) {
      // Set default tab-specific layouts
      const tabSpecificLayoutKey = `tab-${activeTab}`;
      saveToLS<{ widgets: Widget[]; layouts: Layouts }>(
        tabSpecificLayoutKey,
        { widgets: defaultTicketWidgets, layouts: defaultTicketLayouts },
      );
    }

    // Set widgets and layouts to the default values
    setWidgets(defaultTicketWidgets);
    setWidgetLayouts(defaultTicketLayouts);
  };

  // Add a useEffect to initialize widgets when needed
  useEffect(() => {
    // Only run this effect when the dialog is open and there's a current ticket
    if (viewDialogOpen && currentTicket) {
      // Check if the Engineering preset is applied and we need to add widgets
      const hasEngineeringPreset = currentTicketPreset === "Engineering";
      
      if (hasEngineeringPreset && widgets.length === 0) {
        
        // Use default widgets and layouts from constants
        setWidgets(defaultTicketWidgets);
        setWidgetLayouts(defaultTicketLayouts);
        
        // Save the default layout to localStorage for future use
        saveToLS<{ widgets: Widget[]; layouts: Layouts }>(
          "engineering-layouts",
          { widgets: defaultTicketWidgets, layouts: defaultTicketLayouts },
        );
      }
    }
  }, [viewDialogOpen, currentTicket, currentTicketPreset, widgets.length, setWidgetLayouts, setWidgets]);

  const handleLayoutChange = (currentLayout: Layout[], allLayouts: Layouts) => {

    // Only update if there are actual layouts
    if (currentLayout.length > 0) {
      // Save the user-modified layouts using the Zustand store
      setWidgetLayouts(allLayouts);

      // Pass the layout change to the store
      onLayoutChange(currentLayout, allLayouts);

      // Close any open widget dropdowns
      const dropdowns = [
        document.getElementById("widget-dropdown"),
        document.getElementById("customize-widget-dropdown"),
      ];

      dropdowns.forEach((dropdown) => {
        if (dropdown && !dropdown.classList.contains("hidden")) {
          dropdown.classList.add("hidden");
        }
      });

      // Also save to localStorage with the complete state
      if (currentTicket && widgets.length > 0) {
        const completeState = {
          widgets: widgets,
          layouts: allLayouts,
        };

        // Find current tab to determine if it has Engineering preset
        const currentTabData = tabs.find((tab) => tab.id === activeTab);
        const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

        // Use appropriate storage key based on tab type
        const ticketId = currentTicket.cells["col-1"];
        if (hasEngineeringPreset) {
          // Save Engineering preset layouts to Engineering-specific key
          saveToLS<LayoutStorage>("engineering-layouts", completeState);
        } else {
          // Save non-Engineering layouts to tab-specific key
          const tabSpecificLayoutKey = `tab-${activeTab}`;
          saveToLS<LayoutStorage>(tabSpecificLayoutKey, completeState);
        }
      }
    }
  };

  // Add a function to handle dialog close that saves changes
  const handleDialogClose = async () => {
    // Always save changes before closing to ensure all modifications are persisted
    await handleSaveTicketChanges();
    
    // Close the dialog
    setViewDialogOpen(false);
    
    // Reset the current ticket preset
    setCurrentTicketPreset(undefined);
    
    // Trigger a refresh counter increment in the parent component
    // This ensures the tickets are filtered by workflow after closing
    if (window.parent) {
      try {
        // Try to access the parent's ticketsRefreshCounter setter
        const parentWindow = window.parent as any;
        if (parentWindow.incrementTicketsRefreshCounter) {
          parentWindow.incrementTicketsRefreshCounter();
        }
      } catch (error) {
        console.log("Could not access parent window function");
      }
    }
  };

  // Function to open email dialog with direct user email
  const openEmailDialog = () => {
    // Extract auth_user_id from usersWithAuthId if available
    if (usersWithAuthId && usersWithAuthId.length > 0) {
      for (const user of usersWithAuthId) {
        if (user && user.auth_user_id) {
          setUserEmail(user.auth_user_id);
          setIsEmailDialogOpen(true);
          return;
        }
      }
    }
    
    // Then try to extract from localUsers
    if (localUsers.length > 0) {
      for (const user of localUsers) {
        if (user && user.auth_user_id) {
          setUserEmail(user.auth_user_id);
          setIsEmailDialogOpen(true);
          return;
        }
      }
    }
    
    // If no auth_user_id is found, still open the dialog but without pre-filling
    setIsEmailDialogOpen(true);
  };

  // If there's no current ticket, render nothing
  if (!currentTicket) return null;

  // Render dialog only when it's open
  return viewDialogOpen ? (
    <div
      className="fixed inset-0 z-50 bg-white/10 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
    >
      <div className="bg-white w-full max-w-[95vw] mx-auto h-[95vh] rounded-lg shadow-lg flex flex-col">
        {/* Dialog Header */}
        <DialogHeader
          currentTicket={currentTicket}
          currentUser={currentUser}
          isEditLayoutMode={isEditLayoutMode}
          setIsEditLayoutMode={setIsEditLayoutMode}
          handleResetLayout={handleResetLayout}
          addWidget={addWidget}
          handleDialogClose={handleDialogClose}
          openEmailDialog={openEmailDialog}
        />

        <div className="flex-1 overflow-auto p-4">
          {/* Add StaticTicketFields component */}

          <StaticTicketFields 
            currentTicket={currentTicket} 
            handleFieldChange={handleFieldChange}
          />

          {(() => {
            const hasEngineeringPreset = currentTicketPreset === "Engineering";

            if (hasEngineeringPreset) {
              // Filter out the simple field widgets
              const filteredWidgets = widgets.filter(widget => 
                !['field_status', 'field_customer_name', 'field_date_created', 
                  'field_last_modified', 'field_billable_hours', 'field_total_hours']
                  .includes(widget.type)
              );

              if (filteredWidgets.length === 0) {
                return <LoadingIndicator />;
              }
              
              return (
                <WidgetGrid
                  widgets={filteredWidgets}
                  isEditLayoutMode={isEditLayoutMode}
                  handleLayoutChange={handleLayoutChange}
                  activeTab={activeTab}
                  tabs={tabs}
                  currentTicket={currentTicket}
                  ticketForm={ticketForm}
                  handleFieldChange={handleFieldChange}
                  toggleWidgetCollapse={toggleWidgetCollapse}
                  removeWidget={removeWidget}
                  updateWidgetTitle={updateWidgetTitle}
                  assignees={assignees}
                  timeEntries={timeEntries}
                  uploadedImages={uploadedImages}
                  handleAddAssignee={handleAddAssignee}
                  handleRemoveAssignee={handleRemoveAssignee}
                  handleUpdateAssignee={handleUpdateAssignee}
                  handleAddTimeEntry={handleAddTimeEntry}
                  handleRemoveTimeEntry={handleRemoveTimeEntry}
                  handleUpdateTimeEntry={handleUpdateTimeEntry}
                  setTicketForm={setTicketForm}
                  handleImageUpload={handleImageUpload}
                  setUploadedImages={setUploadedImages}
                  showAssigneeForm={showAssigneeForm}
                  setShowAssigneeForm={setShowAssigneeForm}
                  newAssignee={newAssignee}
                  setNewAssignee={setNewAssignee}
                  markAssigneeCompleted={markAssigneeCompleted}
                  users={usersWithAuthId}
                  isAdmin={isAdmin}
                />
              );
            } else {
              // For non-Engineering preset tabs, also filter out simple field widgets
              const filteredWidgets = widgets.filter(widget => 
                !['field_status', 'field_customer_name', 'field_date_created', 
                  'field_last_modified', 'field_billable_hours', 'field_total_hours']
                  .includes(widget.type)
              );

              return (
                <div className="h-full flex flex-col">
                  {filteredWidgets.length === 0 ? (
                    <EmptyWidgetState 
                      currentTicket={currentTicket} 
                      addWidget={addWidget} 
                    />
                  ) : (
                    <div className="w-full relative p-4">
                      <WidgetGrid
                        widgets={filteredWidgets}
                        isEditLayoutMode={isEditLayoutMode}
                        handleLayoutChange={handleLayoutChange}
                        activeTab={activeTab}
                        tabs={tabs}
                        currentTicket={currentTicket}
                        ticketForm={ticketForm}
                        handleFieldChange={handleFieldChange}
                        toggleWidgetCollapse={toggleWidgetCollapse}
                        removeWidget={removeWidget}
                        updateWidgetTitle={updateWidgetTitle}
                        assignees={assignees}
                        timeEntries={timeEntries}
                        uploadedImages={uploadedImages}
                        handleAddAssignee={handleAddAssignee}
                        handleRemoveAssignee={handleRemoveAssignee}
                        handleUpdateAssignee={handleUpdateAssignee}
                        handleAddTimeEntry={handleAddTimeEntry}
                        handleRemoveTimeEntry={handleRemoveTimeEntry}
                        handleUpdateTimeEntry={handleUpdateTimeEntry}
                        setTicketForm={setTicketForm}
                        handleImageUpload={handleImageUpload}
                        setUploadedImages={setUploadedImages}
                        showAssigneeForm={showAssigneeForm}
                        setShowAssigneeForm={setShowAssigneeForm}
                        newAssignee={newAssignee}
                        setNewAssignee={setNewAssignee}
                        markAssigneeCompleted={markAssigneeCompleted}
                        users={usersWithAuthId}
                        isAdmin={isAdmin}
                      />
                    </div>
                  )}
                </div>
              );
            }
          })()}
        </div>

        <DialogFooter 
          handleDialogClose={handleDialogClose}
          handleSaveTicketChanges={handleSaveTicketChanges} 
        />

        {/* Email Dialog */}
        {currentTicket && (
          <EmailDialog 
            isOpen={isEmailDialogOpen}
            onClose={() => setIsEmailDialogOpen(false)}
            ticketDetails={currentTicket}
            attachments={ticketForm.attachments || []}
            timeEntries={timeEntries}
          />
        )}
      </div>
    </div>
  ) : null;
};

export default TicketDialog;
