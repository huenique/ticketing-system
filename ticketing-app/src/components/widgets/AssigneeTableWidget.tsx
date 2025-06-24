import React from "react";
import { Assignee, TimeEntry } from "@/types/tickets";
import useUserStore from "@/stores/userStore";
import TimeEntryDialog from "./TimeEntryDialog";
import AssigneeDialog from "./AssigneeDialog";

interface AssigneeTableWidgetProps {
  assignees: Assignee[];
  users: any[];
  isLoadingUsers: boolean;
  showAssigneeForm: boolean;
  setShowAssigneeForm?: (show: boolean) => void;
  newAssignee: Assignee;
  setNewAssignee: (assignee: Assignee) => void;
  handleAddAssignee?: () => void;
  handleRemoveAssignee?: (id: string) => void;
  handleUpdateAssignee?: (id: string, field: string, value: string) => void;
  handleAddTimeEntry?: (assigneeId: string, userId?: string, timeEntryData?: Partial<TimeEntry>) => void;
  markAssigneeCompleted?: (id: string, completed: boolean) => void;
}

const AssigneeTableWidget: React.FC<AssigneeTableWidgetProps> = ({
  assignees,
  users,
  isLoadingUsers,
  showAssigneeForm,
  setShowAssigneeForm,
  newAssignee,
  setNewAssignee,
  handleAddAssignee,
  handleRemoveAssignee,
  handleUpdateAssignee,
  handleAddTimeEntry,
  markAssigneeCompleted,
}) => {
  const { currentUser } = useUserStore();
  const [isTimeEntryDialogOpen, setIsTimeEntryDialogOpen] = React.useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedAssigneeName, setSelectedAssigneeName] = React.useState("");

  // Helper function to determine if current user can edit an assignee record
  const canEditAssignee = (assignee: Assignee): boolean => {
    if (!currentUser) return false;
    // Admin can edit all records
    if (currentUser.role === "admin") return true;
    // Regular users can only edit their own records
    return assignee.name === currentUser.name;
  };

  const handleNewTimeEntry = (timeEntryData: Partial<TimeEntry>) => {
    // Create a new time entry with the form data
    const newTimeEntry: Partial<TimeEntry> = {
      ...timeEntryData,
      id: `temp_${Date.now()}`,
      assigneeId: selectedAssigneeId,
      user_id: selectedUserId,
      assigneeName: selectedAssigneeName
    };

    // Call the original handleAddTimeEntry with the complete time entry data
    if (handleAddTimeEntry) {
      handleAddTimeEntry(selectedAssigneeId, selectedUserId, newTimeEntry);
    }
  };

  const handleMarkAssigneeCompleted = (assigneeId: string, completed: boolean) => {
    const targetAssignee = assignees.find(a => (a.id || `index-${assignees.indexOf(a)}`) === assigneeId);
    if (!targetAssignee || !handleUpdateAssignee || !markAssigneeCompleted) return;

    if (completed) {
      // Marking as done: set priority to 0 and adjust other priorities
      const currentPriority = parseInt(targetAssignee.priority || "5", 10);
      
      // First, update all assignees with higher priorities (decrease by 1)
      assignees.forEach((assignee, index) => {
        const assigneeIdForUpdate = assignee.id || `index-${index}`;
        const assigneePriority = parseInt(assignee.priority || "5", 10);
        
        if (assigneeIdForUpdate !== assigneeId && assigneePriority > currentPriority && !assignee.is_done) {
          handleUpdateAssignee(assigneeIdForUpdate, "priority", String(assigneePriority - 1));
        }
      });
      
      // Set the target assignee's priority to 0
      handleUpdateAssignee(assigneeId, "priority", "0");
    } else {
      // Unmarking as done: find the highest priority among active items and set to that + 1
      const activePriorities = assignees
        .filter(a => !a.is_done && (a.id || `index-${assignees.indexOf(a)}`) !== assigneeId)
        .map(a => parseInt(a.priority || "1", 10));
      
      const maxActivePriority = activePriorities.length > 0 ? Math.max(...activePriorities) : 0;
      handleUpdateAssignee(assigneeId, "priority", String(maxActivePriority + 1));
    }

    // Finally, mark the assignee as completed/uncompleted
    markAssigneeCompleted(assigneeId, completed);
  };

  return (
    <div className="overflow-auto">
      <div className="mb-3 flex justify-end items-center">
        {currentUser?.role !== "user" && setShowAssigneeForm && (
          <button
            onClick={() => setShowAssigneeForm(!showAssigneeForm)}
            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
          >
            Add Member
          </button>
        )}
      </div>

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
                  Actual Time
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
                  // Sort by completion status first (active items first, then completed)
                  if (a.is_done !== b.is_done) {
                    return a.is_done ? 1 : -1;
                  }
                  
                  // For items with the same completion status, sort by priority
                  const priorityA = parseInt(a.priority || "5", 10);
                  const priorityB = parseInt(b.priority || "5", 10);
                  
                  // If both are done (priority 0), maintain current order
                  if (a.is_done && b.is_done) return 0;
                  
                  // Otherwise sort numerically (lowest priority number first)
                  return priorityA - priorityB;
                })
                .map((assignee, index) => (
                  <tr
                    key={`assignee-${assignee.id || `index-${index}`}-${index}`}
                    className={
                      assignee.is_done ? "opacity-60 bg-neutral-50" : ""
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={assignee.name}
                        onChange={(e) =>
                          handleUpdateAssignee &&
                          canEditAssignee(assignee) &&
                          handleUpdateAssignee(
                            assignee.id || `index-${index}`,
                            "name",
                            e.target.value,
                          )
                        }
                        disabled={assignee.is_done || !canEditAssignee(assignee)}
                        className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.is_done || !canEditAssignee(assignee) ? "text-neutral-500 cursor-not-allowed" : ""}`}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={assignee.workDescription}
                        onChange={(e) =>
                          handleUpdateAssignee &&
                          canEditAssignee(assignee) &&
                          handleUpdateAssignee(
                            assignee.id || `index-${index}`,
                            "workDescription",
                            e.target.value,
                          )
                        }
                        disabled={assignee.is_done || !canEditAssignee(assignee)}
                        className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.is_done || !canEditAssignee(assignee) ? "text-neutral-500 cursor-not-allowed" : ""}`}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {assignee.is_done ? (
                        <span className="text-neutral-500">Done</span>
                      ) : (
                        (() => {
                          // Only show priority options for active (non-done) assignees
                          const activePriorities = assignees
                            .filter(a => !a.is_done)
                            .map(a => a.priority)
                            .filter(Boolean);
                          // Add the next available priority
                          const nextPriority = String(assignees.filter(a => !a.is_done).length + 1);
                          if (!activePriorities.includes(nextPriority)) {
                            activePriorities.push(nextPriority);
                          }
                          // Ensure the current assignee's priority is present
                          if (assignee.priority && !activePriorities.includes(assignee.priority)) {
                            activePriorities.push(assignee.priority);
                          }
                          // Remove duplicates and sort numerically
                          const uniqueSorted = Array.from(new Set(activePriorities)).sort((a, b) => Number(a) - Number(b));
                          return (
                            <select
                              value={assignee.priority || "5"}
                              onChange={(e) =>
                                handleUpdateAssignee &&
                                canEditAssignee(assignee) &&
                                handleUpdateAssignee(
                                  assignee.id || `index-${index}`,
                                  "priority",
                                  e.target.value,
                                )
                              }
                              disabled={assignee.is_done || !canEditAssignee(assignee)}
                              className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.is_done || !canEditAssignee(assignee) ? "text-neutral-500 cursor-not-allowed" : ""}`}
                            >
                              {uniqueSorted.map((priority) => (
                                <option key={priority} value={priority}>
                                  {priority}
                                </option>
                              ))}
                            </select>
                          );
                        })()
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={assignee.totalHours}
                        onChange={(e) =>
                          handleUpdateAssignee &&
                          canEditAssignee(assignee) &&
                          handleUpdateAssignee(
                            assignee.id || `index-${index}`,
                            "totalHours",
                            e.target.value,
                          )
                        }
                        disabled={assignee.is_done || !canEditAssignee(assignee)}
                        className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.is_done || !canEditAssignee(assignee) ? "text-neutral-500 cursor-not-allowed" : ""}`}
                        step="0.1"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={assignee.estTime}
                        onChange={(e) =>
                          handleUpdateAssignee &&
                          canEditAssignee(assignee) &&
                          handleUpdateAssignee(assignee.id || `index-${index}`, "estTime", e.target.value)
                        }
                        disabled={assignee.is_done || !canEditAssignee(assignee)}
                        className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.is_done || !canEditAssignee(assignee) ? "text-neutral-500 cursor-not-allowed" : ""}`}
                        step="0.1"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      {/* Show buttons based on user and role validation */}
                      {currentUser && (
                        <>
                          {/* Admin can see all actions regardless of assignee */}
                          {currentUser.role === "admin" && (
                            <>
                              {handleAddTimeEntry && (
                                <button
                                  onClick={() => {
                                    setSelectedAssigneeId(assignee.id || `index-${index}`);
                                    setSelectedUserId(assignee.user_id || "");
                                    setSelectedAssigneeName(assignee.name || "");
                                    setIsTimeEntryDialogOpen(true);
                                  }}
                                  disabled={assignee.is_done}
                                  className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white ${assignee.is_done ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"} focus:outline-none mr-2`}
                                  title={assignee.is_done ? "Cannot add time entry to completed task" : "Add time entry"}
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
                              )}
                              <button
                                onClick={() =>
                                  handleMarkAssigneeCompleted(
                                    assignee.id || `index-${index}`,
                                    !assignee.is_done,
                                  )
                                }
                                className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white ${assignee.is_done ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 hover:bg-gray-500"} focus:outline-none mr-2`}
                                title={
                                  assignee.is_done
                                    ? "Mark as Not Done"
                                    : "Mark as Done"
                                }
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
                              {handleRemoveAssignee && (
                                <button
                                  onClick={() =>
                                    handleRemoveAssignee(assignee.id || `index-${index}`)
                                  }
                                  disabled={assignee.is_done}
                                  className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white ${assignee.is_done ? "bg-gray-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"} focus:outline-none`}
                                  title={assignee.is_done ? "Cannot remove completed task" : "Remove assignee"}
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
                              )}
                            </>
                          )}

                          {/* Regular user can only see time entry and mark as done for their own entries */}
                          {currentUser.role === "user" &&
                            assignee.name === currentUser.name && (
                              <>
                                {handleAddTimeEntry && (
                                  <button
                                    onClick={() => {
                                      setSelectedAssigneeId(assignee.id || `index-${index}`);
                                      setSelectedUserId(assignee.user_id || "");
                                      setSelectedAssigneeName(assignee.name || "");
                                      setIsTimeEntryDialogOpen(true);
                                    }}
                                    disabled={assignee.is_done}
                                    className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white ${assignee.is_done ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"} focus:outline-none mr-2`}
                                    title={assignee.is_done ? "Cannot add time entry to completed task" : "Add time entry"}
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
                                )}
                                <button
                                  onClick={() =>
                                    handleMarkAssigneeCompleted(
                                      assignee.id || `index-${index}`,
                                      !assignee.is_done,
                                    )
                                  }
                                  className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white ${assignee.is_done ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 hover:bg-gray-500"} focus:outline-none mr-2`}
                                  title={
                                    assignee.is_done
                                      ? "Mark as Not Done"
                                      : "Mark as Done"
                                  }
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
                              </>
                            )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-6 text-neutral-500">
          No team members assigned to this task. Click "Add Member" to assign
          team members.
        </div>
      )}

      <TimeEntryDialog
        open={isTimeEntryDialogOpen}
        onOpenChange={setIsTimeEntryDialogOpen}
        onSubmit={handleNewTimeEntry}
        assigneeName={selectedAssigneeName}
      />

      {setShowAssigneeForm && handleAddAssignee && (
        <AssigneeDialog
          open={showAssigneeForm}
          onOpenChange={setShowAssigneeForm}
          onSubmit={handleAddAssignee}
          newAssignee={newAssignee}
          setNewAssignee={setNewAssignee}
          users={users}
          isLoadingUsers={isLoadingUsers}
          assignees={assignees}
        />
      )}
    </div>
  );
};

export default AssigneeTableWidget;