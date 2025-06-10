import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Assignee } from "@/types/tickets";

interface AssigneeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  newAssignee: Assignee;
  setNewAssignee: (assignee: Assignee) => void;
  users: any[];
  isLoadingUsers: boolean;
  assignees: Assignee[];
}

const AssigneeDialog: React.FC<AssigneeDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  newAssignee,
  setNewAssignee,
  users,
  isLoadingUsers,
  assignees,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Work Description
            </label>
            <Input
              type="text"
              value={newAssignee.workDescription}
              onChange={(e) =>
                setNewAssignee({
                  ...newAssignee,
                  workDescription: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            {(() => {
              // Find the lowest available priority (starting from 1)
              const assignedPriorities = assignees
                .map(a => parseInt(a.priority || '0', 10))
                .filter(n => !isNaN(n));
              let nextPriority = 1;
              while (assignedPriorities.includes(nextPriority)) {
                nextPriority++;
              }
              // If the newAssignee priority is not set or is already taken, set it to nextPriority
              if (!newAssignee.priority || assignedPriorities.includes(parseInt(newAssignee.priority, 10))) {
                setNewAssignee({
                  ...newAssignee,
                  priority: String(nextPriority),
                });
              }
              return (
                <select
                  value={newAssignee.priority || String(nextPriority)}
                  onChange={(e) =>
                    setNewAssignee({
                      ...newAssignee,
                      priority: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value={String(nextPriority)}>{nextPriority}</option>
                </select>
              );
            })()}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Time
            </label>
            <Input
              type="number"
              value={newAssignee.totalHours}
              onChange={(e) =>
                setNewAssignee({
                  ...newAssignee,
                  totalHours: e.target.value,
                })
              }
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Est. Time
            </label>
            <Input
              type="number"
              value={newAssignee.estTime}
              onChange={(e) =>
                setNewAssignee({
                  ...newAssignee,
                  estTime: e.target.value,
                })
              }
              step="0.1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssigneeDialog; 