import { useState, useEffect } from "react";
import { toast } from "sonner";

import { useSettingsStore } from "../stores/settingsStore";

// Define types for the props
interface StatusOptionProps {
  id: string;
  index: number;
  option: string;
  moveOption: (fromIndex: number, toIndex: number) => void;
  onRemove: (option: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

// Simple status option component with up/down buttons
const StatusOption = ({
  option,
  index,
  moveOption,
  onRemove,
  isFirst,
  isLast,
}: StatusOptionProps) => {
  // Added loading state for delete operation
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    toast.custom((t) => (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Confirm deletion</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Are you sure you want to delete the status "{option}"?
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => toast.dismiss(t)}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
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
                toast.error(`Failed to delete status: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setIsDeleting(false);
              }
            }}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
    });
  };

  return (
    <div className="flex items-center justify-between p-3 mb-2 bg-white rounded-md border border-neutral-200">
      <div className="flex items-center">
        <span className="mr-2 text-neutral-400">{index + 1}.</span>
        <span>{option}</span>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => !isFirst && moveOption(index, index - 1)}
          disabled={isFirst}
          className={`${isFirst ? "text-neutral-300" : "text-neutral-500 hover:text-neutral-700"}`}
          title="Move up"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
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
        </button>
        <button
          onClick={() => !isLast && moveOption(index, index + 1)}
          disabled={isLast}
          className={`${isLast ? "text-neutral-300" : "text-neutral-500 hover:text-neutral-700"}`}
          title="Move down"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
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
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`${isDeleting ? "text-red-300" : "text-red-500 hover:text-red-700"}`}
          title="Remove"
        >
          {isDeleting ? (
            <svg 
              className="animate-spin h-5 w-5" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              ></circle>
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
          )}
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

  // Fetch statuses when component mounts
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
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-neutral-500">Configure your ticketing system preferences</p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Status Options</h2>
        <p className="text-neutral-500 mb-4">
          Configure the available status options for the Status widget
        </p>

        <div className="mb-6">
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add new status option"
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddOption}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Add
            </button>
          </div>

          {statusesLoading ? (
            <div className="text-center py-4">
              <p className="text-neutral-500">Loading status options...</p>
            </div>
          ) : statusesError ? (
            <div className="text-center py-4">
              <p className="text-red-500">Error loading status options. Using default values.</p>
              <button
                onClick={fetchStatusOptions}
                className="mt-2 text-blue-500 hover:text-blue-700"
              >
                Try Again
              </button>
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
            <div className="mt-4">
              <button
                onClick={resetStatusOptions}
                className="text-sm text-neutral-500 hover:text-neutral-700"
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
