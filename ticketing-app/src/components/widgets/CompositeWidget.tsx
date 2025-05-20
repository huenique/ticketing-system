import React from "react";
import { Widget, TicketForm, Row } from "../../types/tickets";
import FieldWidget from "./FieldWidget";

interface CompositeWidgetProps {
  widgets: Widget[];
  ticketForm: TicketForm;
  currentTicket?: Row | null;
  handleFieldChange: (fieldName: string, value: string, widgetId?: string) => void;
  setTicketForm?: (form: TicketForm) => void;
  title?: string;
}

const CompositeWidget: React.FC<CompositeWidgetProps> = ({
  widgets,
  ticketForm,
  currentTicket,
  handleFieldChange,
  setTicketForm,
  title
}) => {
  if (!widgets || widgets.length === 0) {
    return null;
  }

  // Determine the grid layout based on the number of widgets
  const getGridCols = () => {
    const count = widgets.length;
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    if (count === 4) return "grid-cols-2";
    return "grid-cols-2"; // Default to 2 columns for larger groups
  };

  // Calculate span for each item
  const getColSpan = (index: number) => {
    const count = widgets.length;
    // For 3 items, make the third item full width
    if (count === 3 && index === 2) return "col-span-3";
    // For 5 items, make the fifth item full width
    if (count === 5 && index === 4) return "col-span-2";
    return "col-span-1";
  };

  return (
    <div className="h-full w-full">
      {title && (
        <h4 className="text-xs font-medium text-neutral-500 mb-1">{title}</h4>
      )}
      <div className={`grid ${getGridCols()} gap-2`}>
        {widgets.map((widget, index) => (
          <div key={widget.id} className={getColSpan(index)}>
            <div className="text-xs font-medium text-neutral-500 mb-0.5">{widget.title}</div>
            <FieldWidget
              widget={widget}
              ticketForm={ticketForm}
              currentTicket={currentTicket}
              handleFieldChange={handleFieldChange}
              setTicketForm={setTicketForm}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompositeWidget; 