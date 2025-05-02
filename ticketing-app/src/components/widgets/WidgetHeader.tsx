import React, { useState } from "react";
import { cn } from "../../lib/utils";
import { Widget } from "../../types/tickets";

interface WidgetHeaderProps {
  widget: Widget;
  isEditMode: boolean;
  updateWidgetTitle?: (widgetId: string, newTitle: string) => void;
  toggleWidgetCollapse: (widgetId: string) => void;
  handleRemoveClick: (e: React.MouseEvent) => void;
}

const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  widget,
  isEditMode,
  updateWidgetTitle,
  toggleWidgetCollapse,
  handleRemoveClick,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(widget.title || "Widget");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableTitle(e.target.value);
  };

  const handleTitleSave = () => {
    if (updateWidgetTitle) {
      updateWidgetTitle(widget.id, editableTitle);
      setIsEditingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setEditableTitle(widget.title || "Widget");
      setIsEditingTitle(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-neutral-50 border-b border-neutral-200 p-2 flex items-center justify-between",
        isEditMode ? "react-grid-dragHandle" : "",
      )}
    >
      <h3 className="text-sm font-medium text-neutral-700 truncate flex-1">
        {isEditingTitle ? (
          <input
            type="text"
            value={editableTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="w-auto min-w-[100px] inline-block border border-neutral-300 rounded-md py-1 px-2 text-xs focus:outline-none focus:ring-blue-500"
            autoFocus
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{ width: `${Math.max(100, editableTitle.length * 8)}px` }}
          />
        ) : (
          <span
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (isEditMode && updateWidgetTitle) {
                setIsEditingTitle(true);
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className={cn(
              "py-1 px-1 rounded",
              isEditMode && updateWidgetTitle
                ? "cursor-pointer hover:bg-neutral-100 hover:text-blue-600"
                : "",
            )}
          >
            {widget.title || "Widget"}
          </span>
        )}
      </h3>

      {isEditMode && (
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => toggleWidgetCollapse(widget.id)}
            className="h-5 w-5 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
            title={widget.collapsed ? "Expand" : "Collapse"}
          >
            {widget.collapsed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
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
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
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
            )}
          </button>
          <button
            onClick={handleRemoveClick}
            className="h-5 w-5 flex items-center justify-center rounded-full text-neutral-500 hover:bg-red-100 hover:text-red-500"
            title="Remove Widget"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
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
        </div>
      )}
    </div>
  );
};

export default WidgetHeader; 