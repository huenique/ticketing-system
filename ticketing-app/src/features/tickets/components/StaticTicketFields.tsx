import React, { useEffect, useState } from 'react';
import { Row } from '../../../types/tickets';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';

interface StaticTicketFieldsProps {
  currentTicket: Row;
  handleFieldChange?: (field: string, value: string) => void;
}

const StaticTicketFields: React.FC<StaticTicketFieldsProps> = ({ currentTicket, handleFieldChange }) => {
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>(currentTicket?.cells["col-7"] || "N/A");

  useEffect(() => {
    // Update current status when ticket changes
    setCurrentStatus(currentTicket?.cells["col-7"] || "N/A");
  }, [currentTicket]);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await databases.listDocuments(
          import.meta.env.VITE_APPWRITE_DATABASE_ID,
          'statuses',
          [
            Query.orderAsc('label')
          ]
        );
        let statuses = response.documents.map(doc => doc.label);
        // Always include currentStatus (even if 'N/A' or empty)
        if (currentStatus && !statuses.includes(currentStatus)) {
          statuses = [currentStatus, ...statuses];
        } else if (!currentStatus && !statuses.includes('N/A')) {
          statuses = ['N/A', ...statuses];
        }
        setStatusOptions(statuses);
      } catch (error) {
        console.error('Error fetching statuses:', error);
        let fallbackStatuses = [
          "Completed",
          "Awaiting for Parts",
          "New",
          "Open",
          "Awaiting Customer Response",
          "Declined",
          "In Progress"
        ];
        if (currentStatus && !fallbackStatuses.includes(currentStatus)) {
          fallbackStatuses = [currentStatus, ...fallbackStatuses];
        } else if (!currentStatus && !fallbackStatuses.includes('N/A')) {
          fallbackStatuses = ['N/A', ...fallbackStatuses];
        }
        setStatusOptions(fallbackStatuses);
      }
    };
    fetchStatuses();
  }, [currentStatus]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setCurrentStatus(newStatus);
    handleFieldChange?.("status", newStatus);
  };

  // Get total hours directly from the ticket cells
  const totalHours = currentTicket?.cells["col-8"] || "0.0";

  return (
    <div className="grid grid-cols-3 gap-2 mb-2 p-2 bg-neutral-50 rounded-lg text-sm">
      <div className="flex items-center gap-1">
        <span className="text-neutral-500">Status:</span>
        <select
          value={currentStatus}
          onChange={handleStatusChange}
          className="font-medium bg-transparent focus:ring-0 p-0 text-sm border-2 border-neutral-200 rounded-md"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-neutral-500">Customer:</span>
        <span className="font-medium">{currentTicket?.cells["col-3"] || ""}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-neutral-500">Created:</span>
        <span className="font-medium">{currentTicket?.cells["col-2"] || ""}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-neutral-500">Modified:</span>
        <span className="font-medium">{currentTicket?.cells["col-10"] || ""}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-neutral-500">Billable:</span>
        <span className="font-medium">{currentTicket?.cells["col-9"] || "0.0"}h</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-neutral-500">Total:</span>
        <span className="font-medium">{totalHours}h</span>
      </div>
    </div>
  );
};

export default StaticTicketFields; 