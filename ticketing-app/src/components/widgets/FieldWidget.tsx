import React from "react";
import { toast } from "sonner";
import { Widget, TicketForm, Row } from "../../types/tickets";
import StatusWidget from "./StatusWidget";
import { Textarea } from "@/components/ui/textarea";
import { PartsWidget } from "@/features/widgets/components/PartsWidget";

interface FieldWidgetProps {
  widget: Widget;
  ticketForm: TicketForm;
  currentTicket?: Row | null;
  handleFieldChange: (field: string, value: string) => void;
  setTicketForm?: (form: TicketForm) => void;
  isAdmin?: boolean;
}

const FieldWidget: React.FC<FieldWidgetProps> = ({
  widget,
  ticketForm,
  currentTicket,
  handleFieldChange,
  setTicketForm,
  isAdmin = true,
}) => {
  // Based on the field type, render the appropriate input
  switch (widget.fieldType) {
    case "select":
      // Check if this is a status field to use our StatusWidget
      if (widget.field === "status") {
        // Extract status from the form data
        const statusValue = typeof ticketForm[widget.field as keyof typeof ticketForm] === "string" 
            ? ticketForm[widget.field as keyof typeof ticketForm] as string
            : typeof ticketForm[widget.field as keyof typeof ticketForm] === "number"
              ? (ticketForm[widget.field as keyof typeof ticketForm] as number).toString()
              : (widget.value as string) || "";
              
        console.log("Rendering status widget with value:", {
          statusValue,
          ticketFormStatus: ticketForm.status,
          widgetValue: widget.value,
          isAdmin: isAdmin
        });
        
        return (
          <div className="h-full flex items-center">
            <StatusWidget
              value={statusValue}
              isAdmin={isAdmin}
              onChange={(value, fieldName) => {
                console.log("Status widget onChange called with:", { value, fieldName, isAdmin });
                // Call handleFieldChange with the appropriate field name based on user role
                const targetFieldName = fieldName || widget.field || "";
                handleFieldChange(targetFieldName, value);

                // Also update the ticketForm state directly to ensure it's saved
                if (setTicketForm) {
                  setTicketForm({ ...ticketForm, status: value, status_id: value });
                }
              }}
            />
          </div>
        );
      }
      // Use default select for non-status fields
      return (
        <div className="h-full flex items-center">
          <select
            id={widget.field}
            value={
              typeof ticketForm[widget.field as keyof typeof ticketForm] ===
              "undefined"
                ? (widget.value as string) || ""
                : String(ticketForm[widget.field as keyof typeof ticketForm] || "")
            }
            onChange={(e) => handleFieldChange(widget.field || "", e.target.value)}
            className="block w-full rounded-md border border-neutral-300 py-1 px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
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

      if (currentTicket && widget.type === "field_customer_name") {
        displayValue = currentTicket.cells["col-3"] || "";
      } else if (
        currentTicket &&
        widget.type === "field_last_modified"
      ) {
        displayValue = currentTicket.cells["col-10"] || "";
      } else if (currentTicket && widget.type === "field_date_created") {
        displayValue = currentTicket.cells["col-2"] || "";
      }

      return (
        <div className="py-1 px-2 h-full flex items-center bg-neutral-50 rounded-md border border-neutral-200 overflow-auto text-sm">
          {displayValue}
        </div>
      );
    }

    case "number":
      // Check if this is a billable hours or total hours field
      if (widget.field === "billableHours") {
        return (
          <div className="h-full flex items-center">
            <input
              type="number"
              id={widget.field}
              value={ticketForm.billableHours === null || ticketForm.billableHours === undefined ? '' : ticketForm.billableHours}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                
                // Call handleFieldChange to update the form state with string value
                handleFieldChange(widget.field || "", e.target.value === null ? '' : e.target.value);
                
                // Also update the ticketForm state directly
                if (setTicketForm) {
                  setTicketForm({
                    ...ticketForm,
                    billableHours: value
                  });
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  toast.error("Billable Hours cannot be empty", {
                    description: "Please enter a valid number",
                    duration: 3000
                  });
                }
              }}
              className="block w-full rounded-md border border-neutral-300 py-1 px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              step="0.1"
              required
            />
          </div>
        );
      } else if (widget.field === "totalHours") {
        return (
          <div className="h-full flex items-center">
            <input
              type="number"
              id={widget.field}
              value={ticketForm.totalHours === null || ticketForm.totalHours === undefined ? '' : ticketForm.totalHours}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                
                // Call handleFieldChange to update the form state with string value
                handleFieldChange(widget.field || "", e.target.value === null ? '' : e.target.value);
                
                // Also update the ticketForm state directly
                if (setTicketForm) {
                  setTicketForm({
                    ...ticketForm,
                    totalHours: value
                  });
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  toast.error("Total Hours cannot be empty", {
                    description: "Please enter a valid number",
                    duration: 3000
                  });
                }
              }}
              className="block w-full rounded-md border border-neutral-300 py-1 px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              step="0.1"
              required
            />
          </div>
        );
      } else {
        // Default number input for other fields
        return (
          <div className="h-full flex items-center">
            <input
              type="number"
              id={widget.field}
              value={
                typeof ticketForm[widget.field as keyof typeof ticketForm] ===
                "undefined"
                  ? (widget.value as string) || ""
                  : ticketForm[widget.field as keyof typeof ticketForm] === null
                    ? ""
                    : String(ticketForm[widget.field as keyof typeof ticketForm] || "")
              }
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value;
                handleFieldChange(widget.field || "", value === null ? '' : value);
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  toast.error(`${widget.title} cannot be empty`, {
                    description: "Please enter a valid number",
                    duration: 3000
                  });
                }
              }}
              className="block w-full rounded-md border border-neutral-300 py-1 px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              step="0.1"
              required
            />
          </div>
        );
      }

    case "textarea":
      return (
        <div className="h-full flex flex-col">
          <Textarea
            id={widget.field}
            value={
              (typeof widget.value === "string"
                ? widget.value
                : String(widget.value || "")) as string
            }
            onChange={(e) => handleFieldChange(widget.field || "", e.target.value)}
            className="text-sm h-full bg-gray-100"
          />
        </div>
      );

    case "parts":
      // Get parts from the current ticket's raw data
      const parts = currentTicket?.rawData?.part_ids || [];
      return (
        <div className="h-full">
          <PartsWidget parts={parts} />
        </div>
      );

    default:
      return null;
  }
};

export default FieldWidget; 