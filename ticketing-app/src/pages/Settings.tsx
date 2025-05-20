import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useSettingsStore } from "../stores/settingsStore";

interface StatusOptionProps {
  id: string;
  index: number;
  option: string;
  moveOption: (fromIndex: number, toIndex: number) => void;
  onRemove: (option: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

const StatusOption = ({
  option,
  index,
  moveOption,
  onRemove,
  isFirst,
  isLast,
}: StatusOptionProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    toast.custom(
      (t) => (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border-2 border-gray-300 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-lg">
            Confirm deletion
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Are you sure you want to delete the status "{option}"?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => toast.dismiss(t)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t);
                setIsDeleting(true);
                try {
                  await onRemove(option);
                  toast.success(`Status "${option}" successfully deleted`);
                } catch (error) {
                  console.error(`Failed to delete status: ${option}`, error);
                  toast.error(
                    `Failed to delete status: ${error instanceof Error ? error.message : "Unknown error"}`,
                  );
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
      },
    );
  };

  return (
    <div className="flex items-center justify-between p-3 mb-2 bg-white rounded-md border-2 border-gray-300">
      <div className="flex items-center">
        <span className="mr-2 text-gray-600 font-medium">{index + 1}.</span>
        <span className="text-gray-900 font-medium">{option}</span>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => !isFirst && moveOption(index, index - 1)}
          disabled={isFirst}
          className={`${isFirst ? "text-gray-300" : "text-gray-600 hover:text-gray-900"} p-1.5 border border-gray-300 rounded`}
          title="Move up"
          aria-label="Move up"
        >
          ▲
        </button>
        <button
          onClick={() => !isLast && moveOption(index, index + 1)}
          disabled={isLast}
          className={`${isLast ? "text-gray-300" : "text-gray-600 hover:text-gray-900"} p-1.5 border border-gray-300 rounded`}
          title="Move down"
          aria-label="Move down"
        >
          ▼
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`${isDeleting ? "text-red-300" : "text-red-600 hover:text-red-700"} p-1.5 border border-gray-300 rounded`}
          title="Remove"
          aria-label="Remove"
        >
          {isDeleting ? "..." : "🗑"}
        </button>
      </div>
    </div>
  );
};

function Settings() {
  const {
    statusOptions,
    statusesLoading,
    statusesError,
    fetchStatusOptions,
    addStatusOption,
    removeStatusOption,
    reorderStatusOptions,
    resetStatusOptions,
  } = useSettingsStore();
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    fetchStatusOptions();
  }, [fetchStatusOptions]);

  const handleAddOption = () => {
    if (newOption.trim()) {
      addStatusOption(newOption.trim());
      setNewOption("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddOption();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-700 mt-1">Configure your ticketing system preferences</p>
      </div>

      <div className="rounded-lg border-2 border-gray-300 bg-white p-6 shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Status Options</h2>
        <p className="text-gray-700 mb-5">
          Configure the available status options for the Status widget
        </p>

        <div className="mb-6">
          <div className="flex space-x-2 mb-5">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add new status option"
              className="flex-1 px-3 py-2.5 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-900"
            />
            <button
              onClick={handleAddOption}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md font-medium"
            >
              Add
            </button>
          </div>

          {statusesLoading ? (
            <div className="text-center py-8 border-2 border-gray-200 rounded-md bg-gray-50">
              <p className="text-gray-700 font-medium">Loading status options...</p>
            </div>
          ) : statusesError ? (
            <div className="text-center py-8 border-2 border-red-200 rounded-md bg-red-50">
              <p className="text-red-700 font-medium">Error loading status options.</p>
              <button
                onClick={fetchStatusOptions}
                className="mt-2 text-blue-700 hover:text-blue-800 font-medium underline"
              >
                Try Again
              </button>
            </div>
          ) : statusOptions.length === 0 ? (
            <div className="text-center py-8 border-2 border-gray-200 rounded-md bg-gray-50">
              <p className="text-gray-700 font-medium">No status options found.</p>
            </div>
          ) : (
            <div>
              {statusOptions.map((option, index) => (
                <StatusOption
                  key={`${option}-${index}`}
                  id={option}
                  index={index}
                  option={option}
                  moveOption={reorderStatusOptions}
                  onRemove={removeStatusOption}
                  isFirst={index === 0}
                  isLast={index === statusOptions.length - 1}
                />
              ))}
            </div>
          )}

          {statusOptions.length > 0 && (
            <div className="mt-5">
              <button
                onClick={resetStatusOptions}
                className="text-sm text-gray-700 hover:text-gray-900 font-medium border border-gray-300 px-3 py-1.5 rounded"
              >
                Reset to defaults
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
