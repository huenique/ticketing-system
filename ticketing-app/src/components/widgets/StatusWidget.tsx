import { useState, useEffect } from "react";
import { useSettingsStore } from "../../stores/settingsStore";

interface StatusWidgetProps {
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export default function StatusWidget({ value = "", onChange, readOnly = false }: StatusWidgetProps) {
  const { statusOptions } = useSettingsStore();
  const [currentValue, setCurrentValue] = useState(value);

  // Update internal state when the external value changes
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setCurrentValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  // If the current value isn't in the options, default to the first option
  useEffect(() => {
    if (currentValue && !statusOptions.includes(currentValue) && statusOptions.length > 0) {
      setCurrentValue(statusOptions[0]);
      if (onChange) {
        onChange(statusOptions[0]);
      }
    }
  }, [statusOptions, currentValue, onChange]);

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
      disabled={readOnly}
    >
      {statusOptions.length === 0 && (
        <option value="">No status options available</option>
      )}
      
      {statusOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
} 