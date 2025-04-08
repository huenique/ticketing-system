import React, { useState } from "react";

import { WIDGET_TYPES } from "../constants/tickets";
import { cn } from "../lib/utils";
import { Assignee, Row, TicketForm, TimeEntry, Widget } from "../types/tickets";

interface TicketWidgetProps {
  widget: Widget;
  ticketForm: TicketForm;
  currentTicket?: Row | null;
  handleFieldChange: (fieldName: string, value: string, widgetId?: string) => void;
  toggleWidgetCollapse: (widgetId: string) => void;
  removeWidget: (widgetId: string) => void;
  updateWidgetTitle?: (widgetId: string, newTitle: string) => void;

  // Additional props for specific widget types
  assignees?: Assignee[];
  timeEntries?: TimeEntry[];
  uploadedImages?: string[];
  handleAddAssignee?: () => void;
  handleRemoveAssignee?: (id: string) => void;
  handleUpdateAssignee?: (id: string, field: string, value: string) => void;
  handleAddTimeEntry?: (assigneeId: string) => void;
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
}: TicketWidgetProps & {
  newAssignee: Assignee;
  setNewAssignee: (assignee: Assignee) => void;
}) {
  // State for title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(widget.title || "Widget");

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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableTitle(e.target.value);
  };

  const handleTitleSave = () => {
    if (updateWidgetTitle) {
      updateWidgetTitle(widget.id, editableTitle);
      setIsEditingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setEditableTitle(widget.title || "Widget");
      setIsEditingTitle(false);
    }
  };

  const renderWidgetContent = () => {
    if (widget.collapsed) return null;

    // First check if it's an individual field widget
    if (widget.fieldType) {
      switch (widget.fieldType) {
        case "select":
          return (
            <div className="h-full flex items-center">
              <select
                id={widget.field}
                value={
                  ticketForm[widget.field as keyof typeof ticketForm] || widget.value
                }
                onChange={(e) => handleFieldChange(widget.field || "", e.target.value)}
                className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="New">New</option>
                <option value="Awaiting Customer Response">
                  Awaiting Customer Response
                </option>
                <option value="Awaiting Parts">Awaiting Parts</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
          );

        case "text-readonly": {
          // Determine the correct value to display based on the widget type
          let displayValue = widget.value;

          if (currentTicket && widget.type === WIDGET_TYPES.FIELD_CUSTOMER_NAME) {
            displayValue = currentTicket.cells["col-3"] || "";
          } else if (
            currentTicket &&
            widget.type === WIDGET_TYPES.FIELD_LAST_MODIFIED
          ) {
            displayValue = currentTicket.cells["col-10"] || "";
          } else if (currentTicket && widget.type === WIDGET_TYPES.FIELD_DATE_CREATED) {
            displayValue = currentTicket.cells["col-2"] || "";
          }

          return (
            <div className="py-2 px-3 h-full flex items-center bg-neutral-50 rounded-md border border-neutral-200 overflow-auto">
              {displayValue}
            </div>
          );
        }

        case "number":
          return (
            <div className="h-full flex items-center">
              <input
                type="number"
                id={widget.field}
                value={
                  ticketForm[widget.field as keyof typeof ticketForm] || widget.value
                }
                onChange={(e) => handleFieldChange(widget.field || "", e.target.value)}
                className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                step="0.1"
                min="0"
              />
            </div>
          );

        case "textarea":
          return (
            <div className="h-full flex flex-col">
              <textarea
                id={widget.field}
                value={
                  ticketForm[widget.field as keyof typeof ticketForm] || widget.value
                }
                onChange={(e) => handleFieldChange(widget.field || "", e.target.value)}
                className="block w-full h-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm resize-none"
              />
            </div>
          );

        case "table":
          // Handle the assignee table and time entries table
          if (widget.type === "field_assignee_table") {
            // Return an individual assignee table widget
            return (
              <div className="overflow-auto">
                <div className="mb-3 flex justify-end items-center">
                  {setShowAssigneeForm && (
                    <button
                      onClick={() => setShowAssigneeForm(!showAssigneeForm)}
                      className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                    >
                      {showAssigneeForm ? "Cancel" : "Add Member"}
                    </button>
                  )}
                </div>

                {showAssigneeForm &&
                  setNewAssignee &&
                  newAssignee &&
                  handleAddAssignee && (
                    <div className="mb-4 p-4 border rounded-lg bg-neutral-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Name
                          </label>
                          <input
                            type="text"
                            value={newAssignee.name}
                            onChange={(e) =>
                              setNewAssignee({ ...newAssignee, name: e.target.value })
                            }
                            className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                          />
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
                            <option value="1">1 - Highest</option>
                            <option value="2">2 - High</option>
                            <option value="3">3 - Medium</option>
                            <option value="4">4 - Low</option>
                            <option value="5">5 - Lowest</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Total Hours
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
                            min="0"
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
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleAddAssignee}
                          className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                        >
                          Add Member
                        </button>
                      </div>
                    </div>
                  )}

                {assignees?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Work Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Priority
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Est. Time
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {assignees
                          .slice()
                          .sort((a, b) => {
                            // Sort by priority (lowest number first)
                            const priorityA = parseInt(a.priority || "5");
                            const priorityB = parseInt(b.priority || "5");
                            return priorityA - priorityB;
                          })
                          .map((assignee) => (
                          <tr key={assignee.id} className={assignee.completed ? "opacity-60 bg-neutral-50" : ""}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="text"
                                value={assignee.name}
                                onChange={(e) =>
                                  handleUpdateAssignee &&
                                  handleUpdateAssignee(
                                    assignee.id,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.completed ? "text-neutral-500" : ""}`}
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="text"
                                value={assignee.workDescription}
                                onChange={(e) =>
                                  handleUpdateAssignee &&
                                  handleUpdateAssignee(
                                    assignee.id,
                                    "workDescription",
                                    e.target.value,
                                  )
                                }
                                className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.completed ? "text-neutral-500" : ""}`}
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={assignee.priority || "5"}
                                onChange={(e) =>
                                  handleUpdateAssignee &&
                                  handleUpdateAssignee(
                                    assignee.id,
                                    "priority",
                                    e.target.value,
                                  )
                                }
                                className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.completed ? "text-neutral-500" : ""}`}
                              >
                                <option value="1">1 - Highest</option>
                                <option value="2">2 - High</option>
                                <option value="3">3 - Medium</option>
                                <option value="4">4 - Low</option>
                                <option value="5">5 - Lowest</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="number"
                                value={assignee.totalHours}
                                onChange={(e) =>
                                  handleUpdateAssignee &&
                                  handleUpdateAssignee(
                                    assignee.id,
                                    "totalHours",
                                    e.target.value,
                                  )
                                }
                                className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.completed ? "text-neutral-500" : ""}`}
                                step="0.1"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="number"
                                value={assignee.estTime}
                                onChange={(e) =>
                                  handleUpdateAssignee &&
                                  handleUpdateAssignee(
                                    assignee.id,
                                    "estTime",
                                    e.target.value,
                                  )
                                }
                                className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.completed ? "text-neutral-500" : ""}`}
                                step="0.1"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                {handleAddTimeEntry && (
                                  <button
                                    onClick={() => handleAddTimeEntry(assignee.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Add Time Entry"
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
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  </button>
                                )}
                                {markAssigneeCompleted && (
                                  <button
                                    onClick={() => 
                                      markAssigneeCompleted && markAssigneeCompleted(assignee.id, !assignee.completed)
                                    }
                                    className={`${assignee.completed ? "text-green-600 hover:text-green-800" : "text-gray-500 hover:text-gray-700"}`}
                                    title={assignee.completed ? "Mark as Not Done" : "Mark as Done"}
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
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </button>
                                )}
                                {handleRemoveAssignee && (
                                  <button
                                    onClick={() => handleRemoveAssignee(assignee.id)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Remove Assignee"
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
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-neutral-500 text-sm bg-neutral-50 rounded-md">
                    No team members assigned yet.
                  </div>
                )}
              </div>
            );
          } else if (widget.type === "field_time_entries_table") {
            // Return an individual time entries table widget
            return (
              <div className="overflow-auto">
                {timeEntries?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Assignee
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Start Time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Stop Time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Duration (hrs)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Remarks
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {timeEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {entry.assigneeName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="text"
                                value={entry.startTime}
                                onChange={(e) =>
                                  handleUpdateTimeEntry &&
                                  handleUpdateTimeEntry(
                                    entry.id,
                                    "startTime",
                                    e.target.value,
                                  )
                                }
                                className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="text"
                                value={entry.stopTime}
                                onChange={(e) =>
                                  handleUpdateTimeEntry &&
                                  handleUpdateTimeEntry(
                                    entry.id,
                                    "stopTime",
                                    e.target.value,
                                  )
                                }
                                className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="text"
                                value={entry.duration}
                                onChange={(e) =>
                                  handleUpdateTimeEntry &&
                                  handleUpdateTimeEntry(
                                    entry.id,
                                    "duration",
                                    e.target.value,
                                  )
                                }
                                className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                                readOnly
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {entry.dateCreated}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="text"
                                value={entry.remarks}
                                onChange={(e) =>
                                  handleUpdateTimeEntry &&
                                  handleUpdateTimeEntry(
                                    entry.id,
                                    "remarks",
                                    e.target.value,
                                  )
                                }
                                className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              {handleRemoveTimeEntry && (
                                <button
                                  onClick={() => handleRemoveTimeEntry(entry.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Remove Time Entry"
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-neutral-500 text-sm bg-neutral-50 rounded-md">
                    No time entries recorded yet.
                  </div>
                )}
              </div>
            );
          }
          return null;

        case "gallery":
          if (widget.type === "field_attachments_gallery") {
            // Return an attachment/images gallery widget
            return (
              <div className="overflow-auto">
                <div className="mb-3 flex justify-end items-center">
                  <div>
                    <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-100">
                      Upload Files
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        onChange={handleImageUpload}
                        accept="image/*"
                      />
                    </label>
                  </div>
                </div>

                {uploadedImages && uploadedImages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Uploaded ${index + 1}`}
                          className="h-40 w-full object-cover rounded-md"
                        />
                        <button
                          onClick={() =>
                            setUploadedImages &&
                            setUploadedImages(
                              uploadedImages.filter((_, i) => i !== index),
                            )
                          }
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                          title="Remove Image"
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
                ) : (
                  <div className="text-center py-8 text-neutral-500 text-sm bg-neutral-50 rounded-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 mx-auto mb-2 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    No images uploaded yet.
                  </div>
                )}
              </div>
            );
          }
          return null;
      }
    }

    // If not an individual field, fall back to the original widget types
    switch (widget.type) {
      case "details":
        if (!setTicketForm) return null;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-[38px]">
                <select
                  id="status"
                  value={ticketForm.status}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, status: e.target.value })
                  }
                  className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="New">New</option>
                  <option value="Awaiting Customer Response">
                    Awaiting Customer Response
                  </option>
                  <option value="Awaiting Parts">Awaiting Parts</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>

              <div>
                <div className="py-2 px-3 h-[38px] bg-neutral-50 rounded-md border border-neutral-200 overflow-auto">
                  {currentTicket?.cells["col-3"]}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="py-2 px-3 h-[38px] bg-neutral-50 rounded-md border border-neutral-200 overflow-auto">
                    {currentTicket?.cells["col-2"]}
                  </div>
                </div>
                <div>
                  <div className="py-2 px-3 h-[38px] bg-neutral-50 rounded-md border border-neutral-200 overflow-auto">
                    {currentTicket?.cells["col-10"]}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="h-[38px]">
                  <input
                    type="number"
                    id="billableHours"
                    value={ticketForm.billableHours}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, billableHours: e.target.value })
                    }
                    className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="h-[38px]">
                  <input
                    type="number"
                    id="totalHours"
                    value={ticketForm.totalHours}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, totalHours: e.target.value })
                    }
                    className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <textarea
                  id="description"
                  value={ticketForm.description}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, description: e.target.value })
                  }
                  rows={5}
                  className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
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
            {showAssigneeForm && (
              <div className="mb-4 p-4 border rounded-lg bg-neutral-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newAssignee.name}
                      onChange={(e) =>
                        setNewAssignee({ ...newAssignee, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    />
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
                      <option value="1">1 - Highest</option>
                      <option value="2">2 - High</option>
                      <option value="3">3 - Medium</option>
                      <option value="4">4 - Low</option>
                      <option value="5">5 - Lowest</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">
                      Total Hours
                    </label>
                    <input
                      type="number"
                      value={newAssignee.totalHours}
                      onChange={(e) =>
                        setNewAssignee({ ...newAssignee, totalHours: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      step="0.1"
                      min="0"
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
                        setNewAssignee({ ...newAssignee, estTime: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      step="0.1"
                      min="0"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => setShowAssigneeForm(false)}
                    className="px-3 py-1.5 border border-neutral-300 rounded-md text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddAssignee}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between mb-3">
              <div></div>
              <button
                onClick={() => setShowAssigneeForm(true)}
                className="flex items-center rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
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
            </div>

            {/* Assignees table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Work Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Est. Time
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {assignees.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-4 text-center text-sm text-neutral-500"
                      >
                        No team members assigned yet
                      </td>
                    </tr>
                  )}
                  {assignees.map((assignee) => (
                    <tr key={assignee.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="text"
                          value={assignee.name}
                          onChange={(e) =>
                            handleUpdateAssignee(assignee.id, "name", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="text"
                          value={assignee.workDescription}
                          onChange={(e) =>
                            handleUpdateAssignee(
                              assignee.id,
                              "workDescription",
                              e.target.value,
                            )
                          }
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <select
                          value={assignee.priority || "5"}
                          onChange={(e) =>
                            handleUpdateAssignee(
                              assignee.id,
                              "priority",
                              e.target.value,
                            )
                          }
                          className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                        >
                          <option value="1">1 - Highest</option>
                          <option value="2">2 - High</option>
                          <option value="3">3 - Medium</option>
                          <option value="4">4 - Low</option>
                          <option value="5">5 - Lowest</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="number"
                          value={assignee.totalHours}
                          onChange={(e) =>
                            handleUpdateAssignee(
                              assignee.id,
                              "totalHours",
                              e.target.value,
                            )
                          }
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                          step="0.1"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="number"
                          value={assignee.estTime}
                          onChange={(e) =>
                            handleUpdateAssignee(assignee.id, "estTime", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                          step="0.1"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleAddTimeEntry(assignee.id)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none mr-2"
                          title="Add time entry"
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
                              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveAssignee(assignee.id)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                          title="Remove assignee"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "time_entries":
        if (!handleUpdateTimeEntry || !handleRemoveTimeEntry) {
          return null;
        }

        return (
          <div>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Stop Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Remarks
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {timeEntries.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-4 text-center text-sm text-neutral-500"
                      >
                        No time entries recorded yet
                      </td>
                    </tr>
                  )}
                  {timeEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.assigneeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="time"
                          value={entry.startTime}
                          onChange={(e) =>
                            handleUpdateTimeEntry(entry.id, "startTime", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="time"
                          value={entry.stopTime}
                          onChange={(e) =>
                            handleUpdateTimeEntry(entry.id, "stopTime", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.duration} hrs
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.dateCreated}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="text"
                          value={entry.remarks}
                          onChange={(e) =>
                            handleUpdateTimeEntry(entry.id, "remarks", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                          placeholder="Add remarks..."
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleRemoveTimeEntry(entry.id)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                          title="Remove time entry"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                <label className="cursor-pointer rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600">
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
                    <div key={index} className="relative group">
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
      {/* Widget header for dragging and controls */}
      <div
        className={cn(
          "bg-neutral-50 border-b border-neutral-200 p-2 flex items-center justify-between",
          isEditMode ? "react-grid-dragHandle" : "",
        )}
      >
        <h3 className="text-sm font-medium text-neutral-700 truncate flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={editableTitle}
              onChange={handleTitleChange}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="w-auto min-w-[100px] inline-block border border-neutral-300 rounded-md py-1 px-2 text-xs focus:outline-none focus:ring-blue-500"
              autoFocus
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              style={{ width: `${Math.max(100, editableTitle.length * 8)}px` }}
            />
          ) : (
            <span
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (isEditMode && updateWidgetTitle) {
                  setIsEditingTitle(true);
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className={cn(
                "py-1 px-1 rounded",
                isEditMode && updateWidgetTitle
                  ? "cursor-pointer hover:bg-neutral-100 hover:text-blue-600"
                  : "",
              )}
            >
              {widget.title || "Widget"}
            </span>
          )}
        </h3>

        {isEditMode && (
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={() => toggleWidgetCollapse(widget.id)}
              className="h-5 w-5 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
              title={widget.collapsed ? "Expand" : "Collapse"}
            >
              {widget.collapsed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={handleRemoveClick}
              className="h-5 w-5 flex items-center justify-center rounded-full text-neutral-500 hover:bg-red-100 hover:text-red-500"
              title="Remove Widget"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
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
        )}
      </div>

      {/* Widget content - adjust to fill remaining height */}
      <div
        className={cn(
          "p-3 flex-1 overflow-y-auto",
          widget.collapsed ? "hidden" : "flex flex-col h-full",
        )}
      >
        {renderWidgetContent()}
      </div>
    </div>
  );
}

export default TicketWidget;
