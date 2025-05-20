import React from "react";
import { toast } from "sonner";
import { Assignee } from "../../types/tickets";
import useUserStore from "../../stores/userStore";

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
  handleAddTimeEntry?: (assigneeId: string, userId?: string) => void;
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

  return (
    <div className="overflow-auto">
      <div className="mb-3 flex justify-end items-center">
        {currentUser?.role !== "user" && setShowAssigneeForm && (
          <button
            onClick={() => setShowAssigneeForm(!showAssigneeForm)}
            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
          >
            {showAssigneeForm ? "Cancel" : "Add Member"}
          </button>
        )}
      </div>

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
                  {/* Dynamic options for the new assignee (existing count + 1 position) */}
                  {Array.from(
                    { length: assignees.length + 1 },
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
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAddAssignee}
                className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm hover:bg-primary/90"
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
                  // Sort by priority (lowest number first)
                  const priorityA = parseInt(a.priority || "5", 10);
                  const priorityB = parseInt(b.priority || "5", 10);
                  // If priorities are equal, maintain the current order
                  if (priorityA === priorityB) return 0;
                  // Otherwise sort numerically
                  return priorityA - priorityB;
                })
                .map((assignee, index) => (
                  <tr
                    key={`assignee-${assignee.id || `index-${index}`}-${index}`}
                    className={
                      assignee.completed ? "opacity-60 bg-neutral-50" : ""
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={assignee.name}
                        onChange={(e) =>
                          handleUpdateAssignee &&
                          handleUpdateAssignee(
                            assignee.id || `index-${index}`,
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
                            assignee.id || `index-${index}`,
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
                            assignee.id || `index-${index}`,
                            "priority",
                            e.target.value,
                          )
                        }
                        className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.completed ? "text-neutral-500" : ""}`}
                      >
                        {/* Dynamic options based on current number of assignees */}
                        {Array.from(
                          { length: assignees.length },
                          (_, i) => (
                            <option key={i + 1} value={String(i + 1)}>
                              {i + 1}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={assignee.totalHours}
                        onChange={(e) =>
                          handleUpdateAssignee &&
                          handleUpdateAssignee(
                            assignee.id || `index-${index}`,
                            "totalHours",
                            e.target.value,
                          )
                        }
                        className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.completed ? "text-neutral-500" : ""}`}
                        step="0.1"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={assignee.estTime}
                        onChange={(e) =>
                          handleUpdateAssignee &&
                          handleUpdateAssignee(assignee.id || `index-${index}`, "estTime", e.target.value)
                        }
                        className={`block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50 ${assignee.completed ? "text-neutral-500" : ""}`}
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
                                  onClick={() =>
                                    handleAddTimeEntry(assignee.id || `index-${index}`, assignee.user_id)
                                  }
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
                              )}
                              {markAssigneeCompleted && (
                                <button
                                  onClick={() =>
                                    markAssigneeCompleted(
                                      assignee.id || `index-${index}`,
                                      !assignee.completed,
                                    )
                                  }
                                  className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white ${assignee.completed ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 hover:bg-gray-500"} focus:outline-none mr-2`}
                                  title={
                                    assignee.completed
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
                              )}
                              {handleRemoveAssignee && (
                                <button
                                  onClick={() =>
                                    handleRemoveAssignee(assignee.id || `index-${index}`)
                                  }
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
                                      // Extract user_id from the assignee
                                      let userId = assignee.user_id;
                                      
                                      if (typeof userId === 'object' && userId !== null) {
                                        if ('$id' in userId) {
                                          userId = (userId as any).$id;
                                        } else if ('id' in userId) {
                                          userId = (userId as any).id;
                                        }
                                      }
                                      
                                      // Pass both assignee.id and the userId
                                      handleAddTimeEntry(assignee.id || `index-${index}`, userId);
                                    }}
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
                                )}
                                {markAssigneeCompleted && (
                                  <button
                                    onClick={() =>
                                      markAssigneeCompleted(
                                        assignee.id || `index-${index}`,
                                        !assignee.completed,
                                      )
                                    }
                                    className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white ${assignee.completed ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 hover:bg-gray-500"} focus:outline-none mr-2`}
                                    title={
                                      assignee.completed
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
                                )}
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
    </div>
  );
};

export default AssigneeTableWidget;