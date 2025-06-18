import { useEffect, useState } from "react";

import { useSettingsStore } from "../../stores/settingsStore";
import { statusesService } from "../../services/ticketsService";

interface StatusWidgetProps {
  value?: string;
  onChange?: (value: string, fieldName?: string) => void;
  readOnly?: boolean;
  isAdmin?: boolean;
}

export default function StatusWidget({
  value = "",
  onChange,
  readOnly = false,
  isAdmin = true,
}: StatusWidgetProps) {
  const { statusOptions, fetchStatusOptions } = useSettingsStore();
  const [currentValue, setCurrentValue] = useState(value);
  const [loading, setLoading] = useState(false);

  // Update internal state when the external value changes
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  // Make sure we have status options loaded
  useEffect(() => {
    if (statusOptions.length === 0) {
      const loadStatuses = async () => {
        setLoading(true);
        try {
          await fetchStatusOptions();
          console.log("Loaded status options");
        } catch (error) {
          console.error("Failed to load status options", error);
        } finally {
          setLoading(false);
        }
      };
      loadStatuses();
    }
  }, [statusOptions.length, fetchStatusOptions]);

  // Try to load status from ID if needed
  useEffect(() => {
    const loadStatusFromId = async () => {
      if (value && !statusOptions.includes(value) && !loading) {
        try {
          console.log("Trying to load status from ID:", value);
          const status = await statusesService.getStatus(value);
          if (status && status.label) {
            console.log("Found status label:", status.label);
            // Update the internal value with the label
            setCurrentValue(status.label);
            // Inform parent of the label change with the appropriate field name
            if (onChange) {
              const fieldName = isAdmin ? 'status_id' : 'task_status_id';
              onChange(status.label, fieldName);
            }
          }
        } catch (error) {
          console.error("Error loading status from ID:", error);
        }
      }
    };

    loadStatusFromId();
  }, [value, statusOptions, onChange, loading, isAdmin]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLabel = e.target.value;
    setCurrentValue(newLabel);
    
    // Find the status ID for the selected label
    try {
      const allStatuses = await statusesService.getAllStatuses();
      const selectedStatus = allStatuses.find(status => status.label === newLabel);
      
      if (selectedStatus) {
        // Store both the label and ID, with the appropriate field name based on user role
        if (onChange) {
          const fieldName = isAdmin ? 'status_id' : 'task_status_id';
          console.log(`StatusWidget: Updating ${fieldName} for ${isAdmin ? 'admin' : 'non-admin'} user`);
          onChange(newLabel, fieldName);
        }
      }
    } catch (error) {
      console.error("Error finding status ID:", error);
      // Still update the label even if we can't find the ID
      if (onChange) {
        const fieldName = isAdmin ? 'status_id' : 'task_status_id';
        onChange(newLabel, fieldName);
      }
    }
  };

  // If the current value isn't in the options, default to the first option
  useEffect(() => {
    if (
      currentValue &&
      !statusOptions.includes(currentValue) &&
      statusOptions.length > 0 &&
      !loading
    ) {
      console.log(`Status '${currentValue}' not found in options. Defaulting to first option.`);
      setCurrentValue(statusOptions[0]);
      if (onChange) {
        const fieldName = isAdmin ? 'status_id' : 'task_status_id';
        onChange(statusOptions[0], fieldName);
      }
    }
  }, [statusOptions, currentValue, onChange, loading, isAdmin]);

  if (readOnly) {
    return (
      <div className="p-2 rounded-md bg-neutral-100 text-neutral-800">
        {currentValue || "Not set"}
      </div>
    );
  }

  return (
    <select
      value={currentValue}
      onChange={handleChange}
      className="w-full p-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled={readOnly || loading}
    >
      {(statusOptions.length === 0 || loading) && (
        <option value="">Loading status options...</option>
      )}

      {statusOptions.length > 0 && !loading && !statusOptions.includes(currentValue) && (
        <option value={currentValue}>{currentValue || "N/A"}</option>
      )}

      {statusOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
