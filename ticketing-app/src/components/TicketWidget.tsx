import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import useUserStore from "../stores/userStore";
import { Assignee, Row, TicketForm, TimeEntry, Widget } from "../types/tickets";
import { usersService } from "../services/usersService";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WIDGET_TYPES } from "@/constants/tickets";

// Import all the widget components
import WidgetHeader from "./widgets/WidgetHeader";
import FieldWidget from "./widgets/FieldWidget";
import AssigneeTableWidget from "./widgets/AssigneeTableWidget";
import TimeEntriesWidget from "./widgets/TimeEntriesWidget";
import DetailsWidget from "./widgets/DetailsWidget";
import TimeEntriesCardWidget from "./widgets/TimeEntriesCardWidget";
import AttachmentsWidget from "./widgets/AttachmentsWidget";
import CompositeWidget from "./widgets/CompositeWidget";

interface TicketWidgetProps {
  widget: Widget;
  ticketForm: TicketForm;
  currentTicket?: Row | null;
  handleFieldChange: (fieldName: string, value: string, widgetId?: string) => void;
  toggleWidgetCollapse: (widgetId: string) => void;
  removeWidget: (widgetId: string) => void;
  updateWidgetTitle?: (widgetId: string, newTitle: string) => void;
  isAdmin?: boolean;
  onPartsUpdate?: () => void; // Callback to refresh ticket data when parts are added

  // Additional props for specific widget types
  assignees?: Assignee[];
  timeEntries?: TimeEntry[];
  uploadedImages?: string[];
  handleAddAssignee?: () => void;
  handleRemoveAssignee?: (id: string) => void;
  handleUpdateAssignee?: (id: string, field: string, value: string) => void;
  handleAddTimeEntry?: (assigneeId: string, userId?: string) => void;
  handleRemoveTimeEntry?: (id: string) => void;
  handleUpdateTimeEntry?: (id: string, field: string, value: string) => void;
  setTicketForm?: (form: TicketForm) => void;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setUploadedImages?: (images: string[]) => void;
  showAssigneeForm?: boolean;
  setShowAssigneeForm?: (show: boolean) => void;
  newAssignee?: unknown;
  setNewAssignee?: (assignee: Assignee) => void;
  isEditMode?: boolean;
  markAssigneeCompleted?: (id: string, completed: boolean) => void;
}

function TicketWidget({
  widget,
  ticketForm,
  currentTicket,
  handleFieldChange,
  toggleWidgetCollapse,
  removeWidget,
  updateWidgetTitle,
  assignees = [],
  timeEntries = [],
  uploadedImages = [],
  handleAddAssignee,
  handleRemoveAssignee,
  handleUpdateAssignee,
  handleAddTimeEntry,
  handleRemoveTimeEntry,
  handleUpdateTimeEntry,
  setTicketForm,
  handleImageUpload,
  setUploadedImages,
  showAssigneeForm = false,
  setShowAssigneeForm,
  newAssignee,
  setNewAssignee,
  isEditMode = true,
  markAssigneeCompleted,
  isAdmin,
  onPartsUpdate,
}: TicketWidgetProps & {
  newAssignee: Assignee;
  setNewAssignee: (assignee: Assignee) => void;
}) {
  const { currentUser } = useUserStore();
  
  // State for users dropdown
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // State for parts dialog
  const [isPartsDialogOpen, setIsPartsDialogOpen] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const usersList = await usersService.getAllUsers();
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Function to handle remove click with extra measures to prevent drag
  const handleRemoveClick = (e: React.MouseEvent) => {
    // These two lines are crucial to prevent the drag behavior
    e.stopPropagation();
    e.preventDefault();

    // Remove the widget
    removeWidget(widget.id);

    // Return false to further prevent default behaviors
    return false;
  };

  // Add Attachment button logic for Attachments widget
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Determine if this is the Attachments widget
  const isAttachmentsWidget = widget.type === "field_attachments_gallery";
  
  // Determine if this is the Parts widget
  const isPartsWidget = widget.type === WIDGET_TYPES.FIELD_PARTS;

  // Only for Attachments widget: render Add Attachment button as action
  const addAttachmentAction = isAttachmentsWidget && handleImageUpload ? (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        multiple
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleTriggerFileInput}
              aria-label="Add Attachment"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Add Attachment</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  ) : null;

  // Debug logging for parts widget
  if (isPartsWidget) {
    console.log("Parts widget detected:", {
      widgetType: widget.type,
      isAdmin,
      hasTicketId: !!currentTicket?.id,
      ticketId: currentTicket?.id
    });
  }

  // Only for Parts widget: render Add Parts button as action
  const addPartsAction = isPartsWidget && !isAdmin && currentTicket?.id ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsPartsDialogOpen(true)}
            aria-label="Add Parts"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Add Parts</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;

  // Determine which action to show
  const widgetAction = addAttachmentAction || addPartsAction;

  const renderWidgetContent = () => {
    if (widget.collapsed) return null;

    // Check for composite widget types
    if (widget.type === "composite" && widget.children && widget.children.length > 0) {
      return (
        <CompositeWidget
          widgets={widget.children}
          ticketForm={ticketForm}
          currentTicket={currentTicket}
          handleFieldChange={handleFieldChange}
          setTicketForm={setTicketForm}
          title={widget.groupTitle}
        />
      );
    }

    // First check if it's an individual field widget
    if (widget.fieldType) {
      // Handle table-type fields specifically
      if (widget.fieldType === "table") {
        // Handle the assignee table and time entries table
        if (widget.type === "field_assignee_table") {   
          return (
            <AssigneeTableWidget
              assignees={assignees}
              users={users}
              isLoadingUsers={isLoadingUsers}
              showAssigneeForm={showAssigneeForm}
              setShowAssigneeForm={setShowAssigneeForm}
              newAssignee={newAssignee}
              setNewAssignee={setNewAssignee}
              handleAddAssignee={handleAddAssignee}
              handleRemoveAssignee={handleRemoveAssignee}
              handleUpdateAssignee={handleUpdateAssignee}
              handleAddTimeEntry={handleAddTimeEntry}
              markAssigneeCompleted={markAssigneeCompleted}
            />
          );
        } else if (widget.type === "field_time_entries_table") {
          return (
            <TimeEntriesWidget
              timeEntries={timeEntries}
              handleUpdateTimeEntry={handleUpdateTimeEntry}
              handleRemoveTimeEntry={handleRemoveTimeEntry}
            />
          );
        }
      } else if (widget.fieldType === "gallery" && widget.type === "field_attachments_gallery") {
        // Check if we have the necessary props
        if (!uploadedImages || !handleImageUpload || !setUploadedImages) {
          return (
            <div className="p-4 text-center text-neutral-500">
              Attachments widget requires additional configuration
            </div>
          );
        }

        // Handle removing an attachment
        const handleRemoveAttachment = (fileId: string) => {
          if (setUploadedImages) {
            setUploadedImages(
              uploadedImages.filter((id) => id !== fileId)
            );
            
            // Also update the ticket form
            if (setTicketForm && ticketForm.attachments) {
              setTicketForm({
                ...ticketForm,
                attachments: ticketForm.attachments.filter((id: string) => id !== fileId)
              });
            }
          }
        };

        // Determine if any files are currently uploading
        const isUploading = uploadedImages.some(id => id === "uploading...");
        
        // Get the attachments from the ticket form
        const attachments = ticketForm.attachments || [];
        
        return (
          <div className="h-full">
            <AttachmentsWidget
              attachments={attachments}
              onAddAttachments={handleImageUpload}
              onRemoveAttachment={handleRemoveAttachment}
              isReadOnly={!isEditMode}
              isUploading={isUploading}
              uploadProgress={60} // This would ideally be dynamic based on actual upload progress
            />
          </div>
        );
      } else {
        // For standard field types, use the FieldWidget component
        return (
          <FieldWidget
            widget={widget}
            ticketForm={ticketForm}
            currentTicket={currentTicket}
            handleFieldChange={handleFieldChange}
            setTicketForm={setTicketForm}
            isAdmin={isAdmin}
            onPartsUpdate={onPartsUpdate}
            isPartsDialogOpen={isPartsDialogOpen}
            setIsPartsDialogOpen={setIsPartsDialogOpen}
          />
        );
      }
    }

    // If not an individual field, fall back to the original widget types
    switch (widget.type) {
      case "details":
        if (!setTicketForm) return null;
        return (
          <DetailsWidget
            ticketForm={ticketForm}
            currentTicket={currentTicket}
            setTicketForm={setTicketForm}
            handleFieldChange={handleFieldChange}
            isAdmin={isAdmin}
          />
        );

      case "assignees":
        if (
          !setShowAssigneeForm ||
          !handleAddAssignee ||
          !setNewAssignee ||
          !newAssignee ||
          !handleUpdateAssignee ||
          !handleRemoveAssignee ||
          !handleAddTimeEntry
        ) {
          return null;
        }

        return (
          <div>
            {/* Form to add a new assignee */}
            {showAssigneeForm &&
              currentUser?.role !== "user" &&
              setNewAssignee &&
              newAssignee &&
              handleAddAssignee && (
                <div className="mb-4 p-4 border rounded-lg bg-neutral-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">
                        Name
                      </label>
                      {isLoadingUsers ? (
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          Loading users...
                        </div>
                      ) : (
                        <select
                          value={newAssignee.name}
                          onChange={(e) => {
                            const selectedUser = users.find(user => 
                              `${user.first_name} ${user.last_name}` === e.target.value
                            );
                            
                            setNewAssignee({ 
                              ...newAssignee, 
                              name: e.target.value,
                              user_id: selectedUser?.$id || ""
                            });
                          }}
                          className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="">Select a user</option>
                          {users.map((user) => (
                            <option 
                              key={user.$id} 
                              value={`${user.first_name} ${user.last_name}`}
                            >
                              {user.first_name} {user.last_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">
                        Work Description
                      </label>
                      <input
                        type="text"
                        value={newAssignee.workDescription}
                        onChange={(e) =>
                          setNewAssignee({
                            ...newAssignee,
                            workDescription: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">
                        Priority
                      </label>
                      <select
                        value={newAssignee.priority || "3"}
                        onChange={(e) =>
                          setNewAssignee({
                            ...newAssignee,
                            priority: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      >
                        {Array.from(
                          { length: Math.max(1, assignees.length + 1) },
                          (_, i) => (
                            <option key={i + 1} value={String(i + 1)}>
                              {i + 1}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">
                        Actual Time
                      </label>
                      <input
                        type="number"
                        value={newAssignee.totalHours}
                        onChange={(e) =>
                          setNewAssignee({
                            ...newAssignee,
                            totalHours: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">
                        Est. Time
                      </label>
                      <input
                        type="number"
                        value={newAssignee.estTime}
                        onChange={(e) =>
                          setNewAssignee({
                            ...newAssignee,
                            estTime: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        step="0.1"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => setShowAssigneeForm(false)}
                      className="px-3 py-1.5 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddAssignee}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

            <div className="flex justify-between mb-3">
              <div></div>
              {currentUser?.role !== "user" && (
                <button
                  onClick={() => setShowAssigneeForm(true)}
                  className="flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  title="Add assignee"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Team Member
                </button>
              )}
            </div>

            {/* Assignees table */}
            <div className="border rounded-lg overflow-hidden">
              <AssigneeTableWidget
                assignees={assignees}
                users={users}
                isLoadingUsers={isLoadingUsers}
                showAssigneeForm={false} // We're showing it separately above
                setShowAssigneeForm={setShowAssigneeForm}
                newAssignee={newAssignee}
                setNewAssignee={setNewAssignee}
                handleAddAssignee={handleAddAssignee}
                handleRemoveAssignee={handleRemoveAssignee}
                handleUpdateAssignee={handleUpdateAssignee}
                handleAddTimeEntry={handleAddTimeEntry}
                markAssigneeCompleted={markAssigneeCompleted}
              />
            </div>
          </div>
        );

      case "time_entries":
        if (!handleUpdateTimeEntry || !handleRemoveTimeEntry || !handleAddTimeEntry) {
          return null;
        }

        return (
          <TimeEntriesCardWidget
            timeEntries={timeEntries}
            handleUpdateTimeEntry={handleUpdateTimeEntry}
            handleRemoveTimeEntry={handleRemoveTimeEntry}
            handleAddTimeEntry={handleAddTimeEntry}
          />
        );

      case "attachments":
        if (!handleImageUpload || !setUploadedImages) {
          return null;
        }

        return (
          <div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-neutral-700">
                  Upload Images or Files
                </label>
                <label className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <span className="flex items-center">
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
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                  />
                </label>
              </div>

              {uploadedImages.length === 0 ? (
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mx-auto h-12 w-12 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-neutral-500">
                    Drag and drop files here or click the upload button
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {uploadedImages.map((image, index) => (
                    <div key={`image-${index}-${image}`} className="relative group">
                      <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden border border-neutral-200">
                        <img
                          src={image}
                          alt={`Uploaded image ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <button
                        onClick={() =>
                          setUploadedImages(
                            uploadedImages.filter((_, i) => i !== index),
                          )
                        }
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-opacity"
                        title="Remove image"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
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
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="py-4 text-center text-neutral-500">
            No content for this widget type
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full bg-white rounded-lg border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
      {/* Use the WidgetHeader component */}
      <WidgetHeader
        widget={widget}
        isEditMode={isEditMode}
        updateWidgetTitle={updateWidgetTitle}
        toggleWidgetCollapse={toggleWidgetCollapse}
        handleRemoveClick={handleRemoveClick}
        action={widgetAction}
      />

      {/* Widget content - adjust to fill remaining height */}
      <div
        className={cn(
          "p-2 flex-1 overflow-y-auto",
          widget.collapsed ? "hidden" : "flex flex-col h-full",
        )}
      >
        {renderWidgetContent()}
      </div>
    </div>
  );
}

export default TicketWidget;
