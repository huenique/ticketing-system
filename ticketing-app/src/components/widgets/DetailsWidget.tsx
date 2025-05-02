import React from "react";
import { toast } from "sonner";
import { TicketForm, Row } from "../../types/tickets";
import StatusWidget from "./StatusWidget";

interface DetailsWidgetProps {
  ticketForm: TicketForm;
  currentTicket?: Row | null;
  setTicketForm: (form: TicketForm) => void;
  handleFieldChange: (fieldName: string, value: string) => void;
}

const DetailsWidget: React.FC<DetailsWidgetProps> = ({
  ticketForm,
  currentTicket,
  setTicketForm,
  handleFieldChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="h-[38px]">
          <StatusWidget
            value={ticketForm.status}
            onChange={(value) => {
              // Update the form state
              setTicketForm({ ...ticketForm, status: value });

              // Call handleFieldChange to ensure the status is updated in the widget
              handleFieldChange("status", value);
            }}
          />
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
              value={ticketForm.billableHours === null || ticketForm.billableHours === undefined ? '' : ticketForm.billableHours}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                
                // Call handleFieldChange to update the form state with string value
                handleFieldChange("billableHours", e.target.value === null ? '' : e.target.value);
                
                // Also update the ticketForm state directly
                setTicketForm({
                  ...ticketForm,
                  billableHours: value
                });
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  toast.error("Billable Hours cannot be empty", {
                    description: "Please enter a valid number",
                    duration: 3000
                  });
                }
              }}
              className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              step="0.1"
              required
            />
          </div>
          <div className="h-[38px]">
            <input
              type="number"
              id="totalHours"
              value={ticketForm.totalHours === null || ticketForm.totalHours === undefined ? '' : ticketForm.totalHours}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                
                // Call handleFieldChange to update the form state with string value
                handleFieldChange("totalHours", e.target.value === null ? '' : e.target.value);
                
                // Also update the ticketForm state directly
                setTicketForm({
                  ...ticketForm,
                  totalHours: value
                });
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  toast.error("Total Hours cannot be empty", {
                    description: "Please enter a valid number",
                    duration: 3000
                  });
                }
              }}
              className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              step="0.1"
              required
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
};

export default DetailsWidget; 